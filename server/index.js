import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import archiver from 'archiver';
import QRCode from 'qrcode';
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable CORS for development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload directory configuration
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const code = req.body.code || req.query.code || 'default';
    const sessionDir = path.join(UPLOADS_DIR, code);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    cb(null, sessionDir);
  },
  filename: (req, file, cb) => {
    // Generate safe unique filename while preserving original extension
    const ext = path.extname(file.originalname);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const safeName = `${Date.now()}-${uniqueId}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 5 // 5GB limit per file for LAN sharing
  }
});

// In-memory room registry
// Structure:
// rooms[code] = {
//   code,
//   groupName,
//   senderName,
//   createdAt,
//   files: [{ id, originalName, storedName, size, mimeType, uploadTime, sender }],
//   receivers: [{ id, name, joinedAt }]
// }
const rooms = new Map();

// Deduplicate download events (prevents duplicate download card & double toast)
const recentDownloads = new Map();

function recordDownloadActivity(code, fileId, fileName, receiverName) {
  if (!code) return;
  const safeReceiver = receiverName || 'Anonymous Receiver';
  const dedupKey = `${code}_${fileId}_${safeReceiver}`;
  const now = Date.now();
  const lastTime = recentDownloads.get(dedupKey);

  // If identical download event occurred within last 5 seconds, ignore duplicate
  if (lastTime && (now - lastTime) < 5000) {
    return;
  }
  recentDownloads.set(dedupKey, now);

  // Periodically prune stale entries
  if (recentDownloads.size > 200) {
    for (const [k, time] of recentDownloads.entries()) {
      if (now - time > 30000) recentDownloads.delete(k);
    }
  }

  const room = rooms.get(code);
  const downloadRecord = {
    id: crypto.randomBytes(4).toString('hex'),
    code,
    fileId: fileId || 'unknown',
    fileName: fileName || 'Unknown file',
    receiverName: safeReceiver,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toISOString()
  };

  if (room) {
    if (!room.downloads) room.downloads = [];
    room.downloads.unshift(downloadRecord);
  }

  io.to(code).emit('download_activity', downloadRecord);
}

// Helper: detect all IPv4 LAN addresses
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          ip: iface.address
        });
      }
    }
  }

  // If no external IP found, fallback to localhost
  if (addresses.length === 0) {
    addresses.push({ interface: 'loopback', ip: '127.0.0.1' });
  }

  // Choose the best IP (prefer 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  let primaryIp = addresses[0].ip;
  const privateIp = addresses.find(a => 
    a.ip.startsWith('192.168.') || 
    a.ip.startsWith('10.') || 
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(a.ip)
  );
  if (privateIp) {
    primaryIp = privateIp.ip;
  }

  return { primaryIp, addresses };
}

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB
});

// Helper: get list of active sessions with sender names, group names, and connection status
function getActiveSessionsList() {
  const list = [];
  for (const [code, room] of rooms.entries()) {
    list.push({
      code: room.code,
      groupName: room.groupName,
      senderName: room.senderName || 'Anonymous Sender',
      createdAt: room.createdAt,
      fileCount: room.files ? room.files.length : 0,
      totalSize: room.files ? room.files.reduce((a, f) => a + (f.size || 0), 0) : 0,
      receiversCount: room.receivers ? room.receivers.length : 0,
      connected: true
    });
  }
  return list;
}

function broadcastActiveSessions() {
  const list = getActiveSessionsList();
  io.emit('active_sessions_update', list);
}

io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  // Emit current active sessions list on connection
  socket.emit('active_sessions_update', getActiveSessionsList());

  // Client requests list of active sessions
  socket.on('get_active_sessions', (callback) => {
    const list = getActiveSessionsList();
    if (typeof callback === 'function') callback({ success: true, sessions: list });
    socket.emit('active_sessions_update', list);
  });

  // Join a room with 4-digit code
  socket.on('join_room', ({ code, role, name }) => {
    if (!code) return;
    socket.join(code);
    socket.data = { code, role, name };

    const room = rooms.get(code);

    if (role === 'receiver') {
      let isFirstJoin = true;
      if (room) {
        const existing = room.receivers.find(r => r.socketId === socket.id || r.name === name);
        if (!existing) {
          room.receivers.push({
            socketId: socket.id,
            name: name || 'Anonymous Receiver',
            joinedAt: new Date().toISOString()
          });
        } else {
          isFirstJoin = false;
        }
      }

      // Only notify other clients (sender) in room if this socket genuinely joined for the first time
      if (isFirstJoin) {
        console.log(`[Socket] Receiver "${name}" (${socket.id}) joined room: ${code}`);
        socket.to(code).emit('receiver_joined', {
          code,
          receiverName: name || 'Anonymous Receiver',
          socketId: socket.id,
          receiversCount: room ? room.receivers.length : 1
        });
      }
    } else if (role === 'sender') {
      console.log(`[Socket] Sender "${name}" (${socket.id}) joined room: ${code}`);
    }

    // Send room status back ONLY to the joining socket
    socket.emit('room_state', {
      exists: !!room,
      room: room ? {
        code: room.code,
        groupName: room.groupName,
        senderName: room.senderName,
        files: room.files,
        receiversCount: room.receivers.length,
        downloads: room.downloads || []
      } : null
    });
  });

  // Chat/status message between sender & receiver
  socket.on('send_message', ({ code, sender, message }) => {
    if (!code || !message) return;
    io.to(code).emit('chat_message', {
      sender: sender || 'Someone',
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Client requests refresh
  socket.on('request_refresh', ({ code }) => {
    if (!code) return;
    const room = rooms.get(code);
    if (room) {
      socket.emit('room_state', {
        exists: true,
        room: {
          code: room.code,
          groupName: room.groupName,
          senderName: room.senderName,
          files: room.files,
          receiversCount: room.receivers.length,
          downloads: room.downloads || []
        }
      });
    }
  });

  // Receiver notifies that a file was downloaded
  socket.on('file_downloaded', ({ code, fileId, fileName, receiverName }) => {
    recordDownloadActivity(code, fileId, fileName, receiverName);
  });

  // Sender syncs active session directly to server / room
  socket.on('sync_session_from_sender', ({ code, roomData, targetSocketId }) => {
    if (!code || !roomData) return;
    let room = rooms.get(code);
    if (!room) {
      room = {
        code,
        groupName: roomData.groupName || 'Shared Files',
        senderName: roomData.senderName || 'Sender',
        createdAt: new Date().toISOString(),
        files: roomData.files || [],
        receivers: [],
        downloads: []
      };
      rooms.set(code, room);
    } else {
      if (roomData.files && roomData.files.length > 0) {
        room.files = roomData.files;
      }
    }

    const payload = {
      exists: true,
      room: {
        code: room.code,
        groupName: room.groupName,
        senderName: room.senderName,
        files: room.files,
        receiversCount: room.receivers.length,
        downloads: room.downloads || []
      }
    };

    if (targetSocketId) {
      io.to(targetSocketId).emit('room_state', payload);
    }
    broadcastActiveSessions();
  });

  // Receiver asks for room data via Socket.IO directly
  socket.on('get_room_data', ({ code }, callback) => {
    if (!code) return;
    const room = rooms.get(code);
    if (room && room.files && room.files.length > 0) {
      const response = {
        success: true,
        room: {
          code: room.code,
          groupName: room.groupName,
          senderName: room.senderName,
          files: room.files,
          receiversCount: room.receivers.length,
          downloads: room.downloads || []
        }
      };
      if (typeof callback === 'function') callback(response);
      socket.emit('room_data_response', response);
    } else {
      io.to(code).emit('request_sender_files', { requesterId: socket.id, code });
      const fallback = {
        success: false,
        error: `No active sharing session found for code "${code}".`
      };
      if (typeof callback === 'function') callback(fallback);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    const { code, role, name } = socket.data || {};
    if (code && rooms.has(code)) {
      const room = rooms.get(code);
      if (role === 'receiver') {
        room.receivers = room.receivers.filter(r => r.socketId !== socket.id);
        io.to(code).emit('receiver_left', {
          receiverName: name,
          receiversCount: room.receivers.length
        });
      }
    }
  });
});

// REST API Endpoints

// 1. Get Network Info (Local IP, Port, QR Code)
app.get('/api/network-info', async (req, res) => {
  try {
    const { primaryIp, addresses } = getNetworkInterfaces();
    const port = server.address() ? server.address().port : (process.env.PORT || 5000);
    const primaryUrl = `http://${primaryIp}:${port}`;

    let qrCode = '';
    try {
      qrCode = await QRCode.toDataURL(primaryUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (e) {
      console.error('QR code generation error:', e);
    }

    res.json({
      success: true,
      primaryIp,
      primaryUrl,
      port,
      addresses,
      qrCode
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Create or verify sharing room
app.post('/api/rooms/create', (req, res) => {
  const { code, groupName, senderName } = req.body;

  if (!code || !/^\d{4}$/.test(code.toString().trim())) {
    return res.status(400).json({ success: false, error: 'A valid 4-digit numeric code is required.' });
  }

  const cleanCode = code.toString().trim();
  const cleanGroupName = (groupName || 'Shared Files').trim();
  const cleanSenderName = (senderName || 'Anonymous Sender').trim();

  let room = rooms.get(cleanCode);
  if (!room) {
    room = {
      code: cleanCode,
      groupName: cleanGroupName,
      senderName: cleanSenderName,
      createdAt: new Date().toISOString(),
      files: [],
      receivers: []
    };
    rooms.set(cleanCode, room);
  } else {
    // Update metadata if re-created
    room.groupName = cleanGroupName;
    room.senderName = cleanSenderName;
  }

  res.json({
    success: true,
    room: {
      code: room.code,
      groupName: room.groupName,
      senderName: room.senderName,
      fileCount: room.files.length
    }
  });
});

// 3. Upload files to session
app.post('/api/upload', upload.array('files', 100), (req, res) => {
  try {
    const { code, groupName, senderName } = req.body;

    if (!code || !/^\d{4}$/.test(code.toString().trim())) {
      return res.status(400).json({ success: false, error: 'Valid 4-digit code required.' });
    }

    const cleanCode = code.toString().trim();
    let room = rooms.get(cleanCode);

    if (!room) {
      room = {
        code: cleanCode,
        groupName: (groupName || 'Shared Files').trim(),
        senderName: (senderName || 'Anonymous').trim(),
        createdAt: new Date().toISOString(),
        files: [],
        receivers: []
      };
      rooms.set(cleanCode, room);
    } else {
      if (groupName) room.groupName = groupName.trim();
      if (senderName) room.senderName = senderName.trim();
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files were uploaded.' });
    }

    const uploadedFiles = [];

    for (const f of req.files) {
      const fileId = crypto.randomBytes(6).toString('hex');
      const fileInfo = {
        id: fileId,
        name: Buffer.from(f.originalname, 'latin1').toString('utf8'), // handle UTF-8 names properly
        storedName: f.filename,
        size: f.size,
        mimeType: f.mimetype || 'application/octet-stream',
        uploadTime: new Date().toISOString(),
        sender: room.senderName
      };

      room.files.push(fileInfo);
      uploadedFiles.push(fileInfo);
    }

    // Broadcast file update to everyone in this room in real-time
    io.to(cleanCode).emit('files_updated', {
      code: cleanCode,
      groupName: room.groupName,
      senderName: room.senderName,
      files: room.files,
      newFiles: uploadedFiles
    });

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s).`,
      room: {
        code: room.code,
        groupName: room.groupName,
        senderName: room.senderName,
        files: room.files
      }
    });

    // Notify all clients of new/updated active session
    broadcastActiveSessions();
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get all active sessions on network (shows all send name list with connected status)
app.get('/api/active-sessions', (req, res) => {
  res.json({
    success: true,
    sessions: getActiveSessionsList()
  });
});

// 5. Get room details by 4-digit code (for receiver)
app.get('/api/room/:code', (req, res) => {
  const code = req.params.code?.trim();
  if (!code || !/^\d{4}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid 4-digit PIN code.' });
  }

  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({
      success: false,
      exists: false,
      error: `No active sharing session found for code "${code}". Make sure sender has created the session on the same network.`
    });
  }

  res.json({
    success: true,
    exists: true,
    room: {
      code: room.code,
      groupName: room.groupName,
      senderName: room.senderName,
      createdAt: room.createdAt,
      files: room.files,
      receiversCount: room.receivers.length,
      downloads: room.downloads || []
    }
  });
});

// 5. Download individual file
app.get('/api/download/:code/:fileId', (req, res) => {
  const { code, fileId } = req.params;
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).send('Session not found.');
  }

  const fileInfo = room.files.find(f => f.id === fileId);
  if (!fileInfo) {
    return res.status(404).send('File not found in this session.');
  }

  const filePath = path.join(UPLOADS_DIR, code, fileInfo.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File no longer exists on disk.');
  }

  // Track download activity with deduplication
  const receiverName = req.query.receiver || req.query.name || 'Anonymous Receiver';
  recordDownloadActivity(code, fileId, fileInfo.name, receiverName);

  res.download(filePath, fileInfo.name, (err) => {
    if (err) {
      console.error('Download error:', err);
    }
  });
});

// 6. Preview individual file inline (for ANY file extension: images, audio, video, text, code, pdf, binary)
app.get('/api/preview/:code/:fileId', (req, res) => {
  const { code, fileId } = req.params;
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).send('Session not found.');
  }

  const fileInfo = room.files.find(f => f.id === fileId);
  if (!fileInfo) {
    return res.status(404).send('File not found.');
  }

  const filePath = path.join(UPLOADS_DIR, code, fileInfo.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File no longer exists on disk.');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(fileInfo.name).toLowerCase().replace('.', '');

  // Detect MIME type accurately for any extension
  let contentType = fileInfo.mimeType;
  const textExtensions = [
    'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 
    'h', 'hpp', 'cs', 'go', 'rs', 'php', 'rb', 'sql', 'sh', 'bash', 'zsh', 'yaml', 'yml', 'xml', 'log', 
    'ini', 'conf', 'config', 'env', 'toml', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'vue', 'svelte'
  ];
  if (textExtensions.includes(ext)) {
    contentType = 'text/plain; charset=utf-8';
  } else if (ext === 'pdf') {
    contentType = 'application/pdf';
  } else if (['jpg', 'jpeg'].includes(ext)) {
    contentType = 'image/jpeg';
  } else if (ext === 'png') {
    contentType = 'image/png';
  } else if (ext === 'webp') {
    contentType = 'image/webp';
  } else if (ext === 'svg') {
    contentType = 'image/svg+xml';
  } else if (['mp4', 'm4v'].includes(ext)) {
    contentType = 'video/mp4';
  } else if (ext === 'webm') {
    contentType = 'video/webm';
  } else if (ext === 'mp3') {
    contentType = 'audio/mpeg';
  } else if (ext === 'wav') {
    contentType = 'audio/wav';
  } else if (ext === 'ogg') {
    contentType = 'audio/ogg';
  } else if (!contentType) {
    contentType = 'application/octet-stream';
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.name)}"`);
  res.setHeader('Accept-Ranges', 'bytes');

  // Support HTTP Range requests for video/audio seeking
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });
    fileStream.pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
});

// 7. Download ALL files as a ZIP archive
app.get('/api/download-all/:code', (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);

  if (!room || room.files.length === 0) {
    return res.status(404).send('No files to download.');
  }

  const receiverName = req.query.receiver || req.query.name || 'Anonymous Receiver';
  recordDownloadActivity(code, 'all', `All Files (${room.files.length} items ZIP)`, receiverName);

  const safeGroupName = room.groupName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'files';
  const zipFilename = `${safeGroupName}-${code}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  const archive = archiver('zip', {
    zlib: { level: 6 }
  });

  archive.on('error', (err) => {
    console.error('Archiver error:', err);
    res.status(500).end();
  });

  archive.pipe(res);

  for (const file of room.files) {
    const filePath = path.join(UPLOADS_DIR, code, file.storedName);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file.name });
    }
  }

  archive.finalize();
});

// 8. Delete / close session
app.delete('/api/room/:code', (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);

  if (room) {
    // Notify receivers that session ended
    io.to(code).emit('session_closed', { message: 'The sender has closed this sharing session.' });

    // Clean up files on disk
    const sessionDir = path.join(UPLOADS_DIR, code);
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Error removing session directory:', e);
      }
    }
    rooms.delete(code);
    broadcastActiveSessions();
  }

  res.json({ success: true, message: 'Session closed.' });
});

// Serve frontend production build if available
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  const { primaryIp } = getNetworkInterfaces();
  console.log(`\n======================================================`);
  console.log(`🚀 Local File Sharing Server is running!`);
  console.log(`📡 Local Network URL: http://${primaryIp}:${PORT}`);
  console.log(`💻 Localhost:         http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
