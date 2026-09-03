import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, FileText, Image as ImageIcon, Video, Music, Archive, 
  File, Trash2, Dices, Copy, Check, Users, ArrowLeft, RefreshCw, 
  Share2, PlusCircle, Wifi, Download, UserCheck 
} from 'lucide-react';
import { formatBytes, generateFourDigitCode, getFileCategory } from '../utils/fileHelpers';
import { uploadFilesWithProgress, getApiBaseUrl } from '../utils/apiClient';
import { 
  saveActiveSession, 
  getSavedActiveSession, 
  clearSavedActiveSession, 
  saveDownloadRecord, 
  getSavedDownloads 
} from '../utils/sessionStorage';
import confetti from 'canvas-confetti';

export default function SenderView({ 
  socket, 
  networkInfo, 
  onOpenQr, 
  showToast 
}) {
  const navigate = useNavigate();

  // Form state
  const [senderName, setSenderName] = useState(() => localStorage.getItem('localshare_name') || '');
  const [groupName, setGroupName] = useState(() => localStorage.getItem('localshare_group') || '');
  const [code, setCode] = useState(() => generateFourDigitCode());

  // Files state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Upload & Active Session state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeSession, setActiveSession] = useState(() => getSavedActiveSession());
  const [connectedReceivers, setConnectedReceivers] = useState([]);
  const [downloadActivities, setDownloadActivities] = useState(() => {
    const saved = getSavedActiveSession();
    return saved ? getSavedDownloads(saved.code) : [];
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Additional files dropzone for existing session
  const [isAddingMore, setIsAddingMore] = useState(false);
  const addFileInputRef = useRef(null);

  // Sync with local storage
  useEffect(() => {
    if (senderName) localStorage.setItem('localshare_name', senderName);
  }, [senderName]);

  useEffect(() => {
    if (groupName) localStorage.setItem('localshare_group', groupName);
  }, [groupName]);

  // Keep ref to latest activeSession to avoid listener re-binding loops
  const activeSessionRef = useRef(activeSession);
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Track receivers we have already greeted and sent files to
  const greetedReceiversRef = useRef(new Set());
  const joinedCodeRef = useRef(null);

  // When activeSession changes, sync with storage and download records
  useEffect(() => {
    if (activeSession) {
      saveActiveSession(activeSession);
      setDownloadActivities(getSavedDownloads(activeSession.code));
    }
  }, [activeSession]);

  // Socket.IO Room & Real-time Auto-Send Listeners
  useEffect(() => {
    if (!socket || !activeSession?.code) return;

    const currentCode = activeSession.code;

    // Only join room if session code changed
    if (joinedCodeRef.current !== currentCode) {
      joinedCodeRef.current = currentCode;
      greetedReceiversRef.current.clear();

      socket.emit('join_room', {
        code: currentCode,
        role: 'sender',
        name: activeSession.senderName
      });

      socket.emit('sync_session_from_sender', {
        code: currentCode,
        roomData: activeSession
      });
    }

    // When a new receiver connects with the 4-digit PIN:
    const handleReceiverJoined = (data) => {
      if (!data || !data.socketId) return;

      // DEDUPLICATE: Only notify and auto-send ONCE per receiver socketId
      if (greetedReceiversRef.current.has(data.socketId)) {
        return;
      }
      greetedReceiversRef.current.add(data.socketId);

      showToast(`Receiver "${data.receiverName}" connected! Files sent.`, 'success');

      setConnectedReceivers(prev => {
        if (!prev.some(r => r.socketId === data.socketId)) {
          return [...prev, { socketId: data.socketId, name: data.receiverName }];
        }
        return prev;
      });

      // Auto-send session and files ONCE to this newly connected receiver
      const session = activeSessionRef.current;
      if (session) {
        socket.emit('sync_session_from_sender', {
          code: session.code,
          roomData: session,
          targetSocketId: data.socketId
        });
      }
    };

    const handleReceiverLeft = (data) => {
      if (data && data.receiverName) {
        showToast(`Receiver "${data.receiverName}" disconnected.`, 'info');
        setConnectedReceivers(prev => prev.filter(r => r.name !== data.receiverName));
      }
    };

    const handleFilesUpdated = (data) => {
      if (data && data.files) {
        setActiveSession(prev => {
          if (!prev) return prev;
          if (JSON.stringify(prev.files) === JSON.stringify(data.files)) return prev;
          const updated = { ...prev, files: data.files };
          saveActiveSession(updated);
          return updated;
        });
      }
    };

    // When a receiver downloads a file:
    const handleDownloadActivity = (record) => {
      showToast(`"${record.receiverName}" downloaded "${record.fileName}"`, 'info');
      setDownloadActivities(prev => {
        const updated = [record, ...prev];
        saveDownloadRecord(currentCode, record);
        return updated;
      });
    };

    // If server requests sender's cached files
    const handleRequestSenderFiles = (data) => {
      const session = activeSessionRef.current;
      if (session && data.code === session.code) {
        socket.emit('sync_session_from_sender', {
          code: session.code,
          roomData: session,
          targetSocketId: data.requesterId
        });
      }
    };

    socket.on('receiver_joined', handleReceiverJoined);
    socket.on('receiver_left', handleReceiverLeft);
    socket.on('files_updated', handleFilesUpdated);
    socket.on('download_activity', handleDownloadActivity);
    socket.on('request_sender_files', handleRequestSenderFiles);

    return () => {
      socket.off('receiver_joined', handleReceiverJoined);
      socket.off('receiver_left', handleReceiverLeft);
      socket.off('files_updated', handleFilesUpdated);
      socket.off('download_activity', handleDownloadActivity);
      socket.off('request_sender_files', handleRequestSenderFiles);
    };
  }, [socket, activeSession?.code]);

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

  // START SHARING & UPLOAD
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

      saveActiveSession(sessionObj);
      setActiveSession(sessionObj);

      if (socket) {
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

      showToast(`Sharing session active! PIN: ${code}`, 'success');
      setSelectedFiles([]);
    } catch (err) {
      showToast(err.message || 'Failed to upload files.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddMoreFiles = async (e) => {
    if (!e.target.files || e.target.files.length === 0 || !activeSession) return;

    setIsAddingMore(true);
    try {
      const result = await uploadFilesWithProgress({
        code: activeSession.code,
        groupName: activeSession.groupName,
        senderName: activeSession.senderName,
        files: Array.from(e.target.files)
      });

      const updated = {
        ...activeSession,
        files: result.room.files
      };

      saveActiveSession(updated);
      setActiveSession(updated);

      if (socket) {
        socket.emit('sync_session_from_sender', {
          code: updated.code,
          roomData: updated
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
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast('PIN code copied to clipboard!', 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const directUrl = `${window.location.origin}/receive?code=${activeSession?.code || code}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    showToast('Direct link copied to clipboard!', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this sharing session? Receivers will no longer be able to access these files.')) {
      return;
    }

    if (activeSession) {
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/room/${activeSession.code}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Error closing room:', e);
      }
    }
    clearSavedActiveSession();
    setActiveSession(null);
    setConnectedReceivers([]);
    setDownloadActivities([]);
    showToast('Sharing session closed and cleared.', 'info');
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

  // ─────────────────────────────────────────────────────────────
  // ACTIVE SESSION DASHBOARD VIEW
  // ─────────────────────────────────────────────────────────────
  if (activeSession) {
    const sessionUrl = `${window.location.origin}/receive?code=${activeSession.code}`;
    const baseUrl = getApiBaseUrl();

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn py-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => {
              if (window.confirm('Create a new session? Your current session will remain stored in local storage until ended.')) {
                setActiveSession(null);
              }
            }}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Create Another Session
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenQr}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs text-slate-700 dark:text-slate-300 transition font-semibold shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Show QR Code</span>
            </button>
            <button
              onClick={handleEndSession}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-rose-400 text-xs font-semibold transition shadow-sm"
            >
              <span>End Session</span>
            </button>
          </div>
        </div>

        {/* Hero PIN Card */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-white dark:bg-slate-900/70 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                <span>Active Local Sharing Session (Stored in Local Storage)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {activeSession.groupName}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                Shared by <span className="font-semibold text-slate-900 dark:text-slate-200">{activeSession.senderName}</span> • Give this 4-digit code to anyone on your network
              </p>
            </div>

            {/* 4-Digit PIN Box */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Receiver 4-Digit PIN
              </span>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 px-5 shadow-sm">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-widest font-mono text-slate-900 dark:text-white">
                  {activeSession.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  title="Copy PIN"
                  className="p-2 ml-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition"
                >
                  {copiedCode ? <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Copy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick link bar */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-normal">
              <Wifi className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Direct Link:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-300 max-w-[280px] sm:max-w-md truncate">
                {sessionUrl}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Direct Link'}</span>
            </button>
          </div>
        </div>

        {/* Live Receivers Status */}
        <div className="rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-slate-900/70 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Receiver Connection Status
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                {connectedReceivers.length > 0 
                  ? `${connectedReceivers.length} receiver(s) connected • files automatically delivered` 
                  : 'Waiting for receiver to enter 4-digit PIN on this network...'}
              </p>
            </div>
          </div>

          <div>
            {connectedReceivers.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                Listening...
              </span>
            )}
          </div>
        </div>

        {/* WHO DOWNLOADED THAT FILE CARD SECTION */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900/70 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Who Downloaded Files ({downloadActivities.length})
              </h3>
            </div>
            {downloadActivities.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Live download tracking
              </span>
            )}
          </div>

          {downloadActivities.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 text-center py-6">
              <Download className="w-8 h-8 text-indigo-600/30 dark:text-indigo-400/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-white">No files have been downloaded yet</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">When a receiver downloads an individual file or ZIP, their card will appear here automatically.</p>
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

        {/* Shared Files List */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-6 bg-white dark:bg-slate-900/70 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Files in Session ({activeSession.files?.length || 0})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Total size: {formatBytes(activeSession.files?.reduce((a, f) => a + f.size, 0) || 0)}
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                {isAddingMore ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <PlusCircle className="w-4 h-4 text-white" />}
                <span>Add More Files</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
            {activeSession.files?.map((file, idx) => (
              <div 
                key={file.id || idx}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    {renderFileIcon(file.name, file.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`${baseUrl}/api/download/${activeSession.code}/${file.id}`}
                    download={file.name}
                    className="p-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition"
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
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CONFIGURATION & DROPZONE FORM VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Back to Home
        </button>

        <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 font-semibold">
          <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Local LAN Sharing</span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Share Files Locally</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
          Configure session details, generate a 4-digit PIN, and choose files to share.
        </p>
      </div>

      <form onSubmit={handleStartSharing} className="space-y-6">
        {/* Session Inputs Card */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 space-y-6 bg-white dark:bg-slate-900/70 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            1. Sender & Group Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Input 1: Sender Name */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex, MacBook Pro"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition font-normal"
              />
            </div>

            {/* Input 2: Group Name */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Group Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Team Alpha, Meeting Docs"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition font-normal"
              />
            </div>
          </div>

          {/* 4-Digit Code Configuration */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  4-Digit Security Code <span className="text-indigo-600 dark:text-indigo-400">*</span>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">The receiver must enter this code to access your files</p>
              </div>

              <button
                type="button"
                onClick={handleRegenerateCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition self-start sm:self-auto"
              >
                <Dices className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Randomize PIN
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
                className="w-44 px-4 py-3 text-center tracking-widest font-mono text-2xl font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 transition shadow-sm"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                4 numeric digits (e.g. {code || '4829'})
              </span>
            </div>
          </div>
        </div>

        {/* File Dropzone Card */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 space-y-6 bg-white dark:bg-slate-900/70 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              2. Select Files to Share
            </h3>
            {selectedFiles.length > 0 && (
              <button
                type="button"
                onClick={clearFiles}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
              >
                Clear all ({selectedFiles.length})
              </button>
            )}
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-950/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <UploadCloud className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Drag and drop files here, or <span className="text-indigo-600 dark:text-indigo-400 underline font-medium">browse</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
                Supports photos, videos, documents, zip archives, and any file format
              </p>
            </div>
          </div>

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-normal">
                <span>{selectedFiles.length} file(s) selected</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">Total: {formatBytes(totalSizeBytes)}</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}_${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                        {renderFileIcon(file.name, file.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
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
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-900 transition"
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
              <span>Uploading & preparing files for LAN transfer...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden">
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
              <UploadCloud className="w-5 h-5 text-white" />
              <span>Create Share Session ({selectedFiles.length} files)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
