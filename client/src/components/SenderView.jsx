import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, FileText, Image as ImageIcon, Video, Music, Archive, 
  File, Trash2, Dices, Copy, Check, Users, ArrowLeft, RefreshCw, 
  Share2, PlusCircle, Wifi, Download, UserCheck, FolderPlus, Layers, QrCode 
} from 'lucide-react';
import { formatBytes, generateFourDigitCode, getFileCategory } from '../utils/fileHelpers';
import { uploadFilesWithProgress, getApiBaseUrl } from '../utils/apiClient';
import { useSessions } from '../context/SessionContext';
import { saveDownloadRecord, getSavedDownloads } from '../utils/sessionStorage';
import confetti from 'canvas-confetti';

export default function SenderView({ 
  socket, 
  networkInfo, 
  onOpenQr, 
  showToast 
}) {
  const navigate = useNavigate();
  const { 
    sessions, 
    selectedCode, 
    setSelectedCode, 
    addSession, 
    updateSession, 
    closeSession 
  } = useSessions();

  // Find currently active session based on selectedCode
  const currentSession = sessions.find(s => s.code === selectedCode) || null;

  // New Group Form state
  const [senderName, setSenderName] = useState(() => localStorage.getItem('localshare_name') || '');
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState(() => generateFourDigitCode());

  // Files state for creation
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Session-specific real-time states
  const [connectedReceivers, setConnectedReceivers] = useState([]);
  const [downloadActivities, setDownloadActivities] = useState(() => {
    return currentSession ? getSavedDownloads(currentSession.code) : [];
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Additional files dropzone for existing session
  const [isAddingMore, setIsAddingMore] = useState(false);
  const addFileInputRef = useRef(null);

  // Sync sender name to localStorage
  useEffect(() => {
    if (senderName) localStorage.setItem('localshare_name', senderName);
  }, [senderName]);

  // Keep download activities in sync when currentSession switches
  useEffect(() => {
    if (currentSession) {
      setDownloadActivities(getSavedDownloads(currentSession.code));
    } else {
      setDownloadActivities([]);
    }
  }, [currentSession?.code]);

  // Track receivers we have already greeted per session code: Map<code, Set<socketId>>
  const greetedReceiversRef = useRef(new Map());

  // Join all active rooms via Socket.IO
  useEffect(() => {
    if (!socket || sessions.length === 0) return;

    sessions.forEach(s => {
      socket.emit('join_room', {
        code: s.code,
        role: 'sender',
        name: s.senderName
      });
      socket.emit('sync_session_from_sender', {
        code: s.code,
        roomData: s
      });
    });
  }, [socket, sessions.map(s => s.code).join(',')]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    // When a receiver connects:
    const handleReceiverJoined = (data) => {
      if (!data || !data.socketId) return;

      const sessionCode = data.code || currentSession?.code;
      if (!sessionCode) return;

      // Get or create greeted set for this session code
      if (!greetedReceiversRef.current.has(sessionCode)) {
        greetedReceiversRef.current.set(sessionCode, new Set());
      }
      const setForCode = greetedReceiversRef.current.get(sessionCode);

      if (setForCode.has(data.socketId)) {
        return; // Already greeted
      }
      setForCode.add(data.socketId);

      showToast(`Receiver "${data.receiverName}" connected! Files sent.`, 'success');

      if (currentSession && currentSession.code === sessionCode) {
        setConnectedReceivers(prev => {
          if (!prev.some(r => r.socketId === data.socketId || r.name === data.receiverName)) {
            return [...prev, { socketId: data.socketId, name: data.receiverName }];
          }
          return prev;
        });
      }

      // Auto-send matching session files to this receiver
      const targetSession = sessions.find(s => s.code === sessionCode) || currentSession;
      if (targetSession) {
        socket.emit('sync_session_from_sender', {
          code: targetSession.code,
          roomData: targetSession,
          targetSocketId: data.socketId
        });
      }
    };

    const handleReceiverLeft = (data) => {
      if (data && data.receiverName) {
        showToast(`Receiver "${data.receiverName}" disconnected.`, 'info');
        setConnectedReceivers(prev => prev.filter(r => r.name !== data.receiverName && r.socketId !== data.socketId));
      }
    };

    // When receiver downloads a file:
    const handleDownloadActivity = (record) => {
      if (!record) return;
      const targetCode = record.code || currentSession?.code;
      if (!targetCode) return;

      if (currentSession && currentSession.code === targetCode) {
        setDownloadActivities(prev => {
          // Strictly prevent duplicate card if same record ID or same person & file within 10 seconds
          const isDuplicate = prev.some(existing => 
            existing.id === record.id || 
            (existing.receiverName === record.receiverName && 
             existing.fileName === record.fileName && 
             Math.abs(new Date(existing.date || 0) - new Date(record.date || 0)) < 10000)
          );

          if (isDuplicate) {
            return prev;
          }

          showToast(`"${record.receiverName}" downloaded "${record.fileName}"`, 'info');
          saveDownloadRecord(targetCode, record);
          return [record, ...prev];
        });
      } else {
        saveDownloadRecord(targetCode, record);
      }
    };

    const handleRequestSenderFiles = (data) => {
      const targetSession = sessions.find(s => s.code === data.code);
      if (targetSession) {
        socket.emit('sync_session_from_sender', {
          code: targetSession.code,
          roomData: targetSession,
          targetSocketId: data.requesterId
        });
      }
    };

    socket.on('receiver_joined', handleReceiverJoined);
    socket.on('receiver_left', handleReceiverLeft);
    socket.on('download_activity', handleDownloadActivity);
    socket.on('request_sender_files', handleRequestSenderFiles);

    return () => {
      socket.off('receiver_joined', handleReceiverJoined);
      socket.off('receiver_left', handleReceiverLeft);
      socket.off('download_activity', handleDownloadActivity);
      socket.off('request_sender_files', handleRequestSenderFiles);
    };
  }, [socket, currentSession, sessions]);

  const handleRegenerateCode = () => {
    setCode(generateFourDigitCode());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    setSelectedFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}_${f.size}`));
      const filtered = newFiles.filter(f => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...filtered];
    });
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
  };

  const totalSizeBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  // START SHARING & UPLOAD A NEW GROUP SESSION
  const handleStartSharing = async (e) => {
    e.preventDefault();

    if (!senderName.trim()) {
      showToast('Please enter your name.', 'error');
      return;
    }
    if (!groupName.trim()) {
      showToast('Please enter a group name.', 'error');
      return;
    }
    if (!/^\d{4}$/.test(code)) {
      showToast('Please provide a 4-digit numeric code.', 'error');
      return;
    }
    if (selectedFiles.length === 0) {
      showToast('Please select at least one file to share.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      const result = await uploadFilesWithProgress({
        code: code.trim(),
        groupName: groupName.trim(),
        senderName: senderName.trim(),
        files: selectedFiles,
        onProgress: (percent) => {
          setUploadProgress(percent);
        }
      });

      const sessionObj = {
        code: result.room.code,
        groupName: result.room.groupName,
        senderName: result.room.senderName,
        files: result.room.files,
        createdAt: new Date().toISOString()
      };

      // Add to multi-session context without closing existing groups
      addSession(sessionObj);

      if (socket) {
        socket.emit('join_room', {
          code: sessionObj.code,
          role: 'sender',
          name: sessionObj.senderName
        });
        socket.emit('sync_session_from_sender', {
          code: sessionObj.code,
          roomData: sessionObj
        });
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      showToast(`Group "${groupName}" created! PIN: ${code}`, 'success');
      setSelectedFiles([]);
      setGroupName('');
      setCode(generateFourDigitCode());
    } catch (err) {
      showToast(err.message || 'Failed to upload files.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Upload more files to currently viewed session
  const handleAddMoreFiles = async (e) => {
    if (!e.target.files || e.target.files.length === 0 || !currentSession) return;

    setIsAddingMore(true);
    try {
      const result = await uploadFilesWithProgress({
        code: currentSession.code,
        groupName: currentSession.groupName,
        senderName: currentSession.senderName,
        files: Array.from(e.target.files)
      });

      updateSession(currentSession.code, { files: result.room.files });

      if (socket) {
        socket.emit('sync_session_from_sender', {
          code: currentSession.code,
          roomData: { ...currentSession, files: result.room.files }
        });
      }

      showToast(`Added ${e.target.files.length} more file(s)!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add files.', 'error');
    } finally {
      setIsAddingMore(false);
      if (addFileInputRef.current) addFileInputRef.current.value = '';
    }
  };

  const handleCopyCode = () => {
    if (!currentSession) return;
    navigator.clipboard.writeText(currentSession.code);
    setCopiedCode(true);
    showToast('PIN code copied to clipboard!', 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!currentSession) return;
    const directUrl = `${window.location.origin}/receive?code=${currentSession.code}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    showToast('Direct link copied to clipboard!', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Close specific session
  const handleCloseThisSession = async () => {
    if (!currentSession) return;
    if (!window.confirm(`Are you sure you want to close "${currentSession.groupName}" (PIN ${currentSession.code})? Any connected receivers will be disconnected.`)) {
      return;
    }

    const closedName = currentSession.groupName;
    const closedCode = currentSession.code;

    await closeSession(closedCode);
    showToast(`Session "${closedName}" closed.`, 'info');
  };

  const renderFileIcon = (fileName, mimeType) => {
    const category = getFileCategory(fileName, mimeType);
    switch (category) {
      case 'image': return <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'video': return <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'audio': return <Music className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'text': return <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'archive': return <Archive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      default: return <File className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const baseUrl = getApiBaseUrl();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn py-4">
      {/* ─────────────────────────────────────────────────────────────
          MULTI-SESSION SWITCHER TAB BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
          {sessions.map((s) => {
            const isActive = currentSession?.code === s.code;
            return (
              <div key={s.code} className="inline-flex items-center rounded-xl shadow-sm overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSelectedCode(s.code)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[110px] sm:max-w-[150px]">{s.groupName}</span>
                  <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {s.code}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQr(s.code);
                  }}
                  title={`Generate Group QR for "${s.groupName}" - Scan to connect & download`}
                  className={`p-2 transition border-l border-slate-200 dark:border-slate-800 ${
                    isActive
                      ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* "+ New Group Session" Tab Button */}
          <button
            onClick={() => setSelectedCode(null)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex-shrink-0 border shadow-sm ${
              selectedCode === null
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-900 border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-850'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ New Group</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenQr(currentSession?.code || null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-300 font-semibold transition shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Group QR Code</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODE A: VIEWING AN ACTIVE GROUP SESSION DASHBOARD
         ───────────────────────────────────────────────────────────── */}
      {currentSession ? (
        <div className="space-y-5">
          {/* Top Bar for Current Session */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-normal">
              <span>Group:</span>
              <span className="font-bold text-slate-900 dark:text-white">{currentSession.groupName}</span>
            </div>

            {/* Close sending session button */}
            <button
              onClick={handleCloseThisSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-300 text-xs font-semibold transition shadow-sm"
              title="Close only this session"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Close Group</span>
            </button>
          </div>

          {/* Receiver Connection Status */}
          <div className="rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-slate-900/70 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Receiver Status
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                  {connectedReceivers.length > 0 
                    ? `${connectedReceivers.length} receiver(s) connected` 
                    : 'Waiting for receivers...'}
                </p>
              </div>
            </div>

            <div>
              {connectedReceivers.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected ({connectedReceivers.length})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                  Listening
                </span>
              )}
            </div>
          </div>

          {/* 4-Digit PIN Card */}
          <div className="rounded-3xl p-6 border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-white dark:bg-slate-900/70 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                  <Wifi className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  <span>Active Session</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {currentSession.groupName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Shared by <span className="font-semibold text-slate-700 dark:text-slate-300">{currentSession.senderName}</span>
                </p>
              </div>

              {/* 4-Digit PIN Box with Group QR Button */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  4-Digit PIN
                </span>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 px-3.5 shadow-sm">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-widest font-mono text-slate-900 dark:text-white">
                    {currentSession.code}
                  </span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={handleCopyCode}
                      title="Copy PIN"
                      className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </button>

                    <button
                      onClick={() => onOpenQr(currentSession.code)}
                      title="Group QR Code"
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center gap-1 text-xs font-semibold"
                    >
                      <QrCode className="w-4 h-4 text-white" />
                      <span>QR</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick link bar */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-normal">
                <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-mono text-indigo-600 dark:text-indigo-300 max-w-[260px] sm:max-w-md truncate">
                  {`${window.location.origin}/receive?code=${currentSession.code}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenQr(currentSession.code)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                  title="Group QR Code"
                >
                  <QrCode className="w-3 h-3 text-white" />
                  <span>QR Code</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <Copy className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Downloads List */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Downloads ({downloadActivities.length})
                  </h3>
                </div>
              </div>

              {downloadActivities.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 text-center py-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No downloads yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {downloadActivities.map((act, index) => (
                    <div 
                      key={act.id || index}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 transition flex items-center justify-between gap-3 animate-fadeIn"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {act.receiverName ? act.receiverName[0].toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={act.receiverName}>
                            {act.receiverName}
                          </p>
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-300 font-mono truncate max-w-[180px]" title={act.fileName}>
                            {act.fileName}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 flex-shrink-0">
                        {act.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Shared Files List */}
          <div className="rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-5 bg-white dark:bg-slate-900/70 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Files ({currentSession.files?.length || 0})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {formatBytes(currentSession.files?.reduce((a, f) => a + f.size, 0) || 0)}
                </p>
              </div>

              <div>
                <input
                  ref={addFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAddMoreFiles}
                />
                <button
                  disabled={isAddingMore}
                  onClick={() => addFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {isAddingMore ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" /> : <PlusCircle className="w-3.5 h-3.5 text-white" />}
                  <span>Add Files</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {currentSession.files?.map((file, idx) => (
                <div 
                  key={file.id || idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      {renderFileIcon(file.name, file.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`${baseUrl}/api/download/${currentSession.code}/${file.id}`}
                      download={file.name}
                      className="p-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 rounded-lg transition"
                      title="Download file"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            MODE B: CREATE A NEW GROUP FORM
           ───────────────────────────────────────────────────────────── */
        <div className="space-y-5">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create Share Group
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
              Set group details, 4-digit PIN, and choose files to share.
            </p>
          </div>

          <form onSubmit={handleStartSharing} className="space-y-5">
            {/* Session Inputs Card */}
            <div className="rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 space-y-5 bg-white dark:bg-slate-900/70 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                1. Session Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Input 1: Sender Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Your Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 transition font-normal"
                  />
                </div>

                {/* Input 2: Group Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Group Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Project Files"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 transition font-normal"
                  />
                </div>
              </div>

              {/* 4-Digit Code Configuration */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    4-Digit PIN <span className="text-indigo-600 dark:text-indigo-400">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                  >
                    <Dices className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Randomize
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={4}
                    required
                    pattern="[0-9]{4}"
                    placeholder="0000"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCode(val);
                    }}
                    className="w-36 px-3 py-2 text-center tracking-widest font-mono text-xl font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 transition shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* File Dropzone Card */}
            <div className="rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 space-y-5 bg-white dark:bg-slate-900/70 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  2. Files
                </h3>
                {selectedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFiles}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
                  >
                    Clear ({selectedFiles.length})
                  </button>
                )}
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-500/10 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  Drag files here, or <span className="text-indigo-600 dark:text-indigo-400 underline font-medium">browse</span>
                </p>
              </div>

              {/* Selected Files Preview List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-normal">
                    <span>{selectedFiles.length} file(s) selected</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatBytes(totalSizeBytes)}</span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={`${file.name}_${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                            {renderFileIcon(file.name, file.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {formatBytes(file.size)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900/70 shadow-sm">
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Uploading ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-white" />
                  <span>Share {selectedFiles.length} File(s)</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
