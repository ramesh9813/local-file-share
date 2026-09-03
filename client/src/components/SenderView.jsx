import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, FileText, Image as ImageIcon, Video, Music, Archive, 
  File, Trash2, Dices, Copy, Check, Users, ArrowLeft, RefreshCw, 
  Share2, PlusCircle, CheckCircle, Wifi, AlertCircle 
} from 'lucide-react';
import { formatBytes, generateFourDigitCode, getFileCategory } from '../utils/fileHelpers';
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

  // Upload & Session state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeSession, setActiveSession] = useState(null);
  const [connectedReceivers, setConnectedReceivers] = useState([]);
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

  // Socket.IO Room Listeners
  useEffect(() => {
    if (!socket || !activeSession) return;

    socket.emit('join_room', {
      code: activeSession.code,
      role: 'sender',
      name: activeSession.senderName
    });

    const handleReceiverJoined = (data) => {
      showToast(`Receiver "${data.receiverName}" connected!`, 'success');
      setConnectedReceivers(prev => {
        if (!prev.some(r => r.socketId === data.socketId)) {
          return [...prev, { socketId: data.socketId, name: data.receiverName }];
        }
        return prev;
      });
    };

    const handleReceiverLeft = (data) => {
      showToast(`Receiver "${data.receiverName}" left.`, 'info');
      setConnectedReceivers(prev => prev.filter(r => r.name !== data.receiverName));
    };

    const handleFilesUpdated = (data) => {
      setActiveSession(prev => ({
        ...prev,
        files: data.files
      }));
    };

    socket.on('receiver_joined', handleReceiverJoined);
    socket.on('receiver_left', handleReceiverLeft);
    socket.on('files_updated', handleFilesUpdated);

    return () => {
      socket.off('receiver_joined', handleReceiverJoined);
      socket.off('receiver_left', handleReceiverLeft);
      socket.off('files_updated', handleFilesUpdated);
    };
  }, [socket, activeSession]);

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
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('code', code.trim());
      formData.append('groupName', groupName.trim());
      formData.append('senderName', senderName.trim());

      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to upload files.');
      }

      setActiveSession({
        code: result.room.code,
        groupName: result.room.groupName,
        senderName: result.room.senderName,
        files: result.room.files
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      showToast(`Sharing session active! PIN: ${code}`, 'success');
      setSelectedFiles([]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddMoreFiles = async (e) => {
    if (!e.target.files || e.target.files.length === 0 || !activeSession) return;

    setIsAddingMore(true);
    try {
      const formData = new FormData();
      formData.append('code', activeSession.code);
      formData.append('groupName', activeSession.groupName);
      formData.append('senderName', activeSession.senderName);

      Array.from(e.target.files).forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add files');
      }

      setActiveSession(prev => ({
        ...prev,
        files: data.room.files
      }));

      showToast(`Added ${e.target.files.length} more file(s)!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
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
    if (!window.confirm('Are you sure you want to end this sharing session? Receivers will no longer be able to download these files.')) {
      return;
    }

    if (activeSession) {
      try {
        await fetch(`/api/room/${activeSession.code}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Error closing room:', e);
      }
    }
    setActiveSession(null);
    setConnectedReceivers([]);
    showToast('Sharing session closed.', 'info');
  };

  // Uniform icon renderer using text-indigo-400
  const renderFileIcon = (fileName, mimeType) => {
    const category = getFileCategory(fileName, mimeType);
    switch (category) {
      case 'image': return <ImageIcon className="w-5 h-5 text-indigo-400" />;
      case 'video': return <Video className="w-5 h-5 text-indigo-400" />;
      case 'audio': return <Music className="w-5 h-5 text-indigo-400" />;
      case 'text': return <FileText className="w-5 h-5 text-indigo-400" />;
      case 'archive': return <Archive className="w-5 h-5 text-indigo-400" />;
      default: return <File className="w-5 h-5 text-indigo-400" />;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Active Session View
  // ─────────────────────────────────────────────────────────────
  if (activeSession) {
    const sessionUrl = `${window.location.origin}/receive?code=${activeSession.code}`;

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn py-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setActiveSession(null)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            Create Another Session
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenQr}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 transition font-medium"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Show QR Code</span>
            </button>
            <button
              onClick={handleEndSession}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold transition"
            >
              <span>End Session</span>
            </button>
          </div>
        </div>

        {/* Hero PIN Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden bg-slate-900/70 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <Wifi className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Active Local Sharing Session</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {activeSession.groupName}
              </h2>
              <p className="text-sm text-slate-400 font-normal leading-relaxed">
                Shared by <span className="font-semibold text-slate-200">{activeSession.senderName}</span> • Give this 4-digit code to anyone on the same Wi-Fi
              </p>
            </div>

            {/* 4-Digit PIN Box */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Receiver 4-Digit PIN
              </span>
              <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-2xl p-3 px-5 shadow-lg">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-widest font-mono text-white">
                  {activeSession.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  title="Copy PIN"
                  className="p-2 ml-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 transition"
                >
                  {copiedCode ? <Check className="w-5 h-5 text-indigo-400" /> : <Copy className="w-5 h-5 text-indigo-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick link bar */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-normal">
              <Wifi className="w-4 h-4 text-indigo-400" />
              <span>Direct Link:</span>
              <span className="font-mono text-indigo-300 max-w-[280px] sm:max-w-md truncate">
                {sessionUrl}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-200 text-xs font-medium transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Direct Link'}</span>
            </button>
          </div>
        </div>

        {/* Live Receivers Status */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center justify-between gap-4 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Receiver Connection Status
              </h4>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                {connectedReceivers.length > 0 
                  ? `${connectedReceivers.length} receiver(s) connected and viewing files` 
                  : 'Waiting for receiver to enter 4-digit PIN on this network...'}
              </p>
            </div>
          </div>

          <div>
            {connectedReceivers.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                Listening...
              </span>
            )}
          </div>
        </div>

        {/* Shared Files List */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">
                Files in Session ({activeSession.files?.length || 0})
              </h3>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
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
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-750 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    {renderFileIcon(file.name, file.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate max-w-sm sm:max-w-md" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/download/${activeSession.code}/${file.id}`}
                    download={file.name}
                    className="p-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition"
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
  // Configuration & Dropzone Form View
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          Back to Home
        </button>

        <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 font-semibold">
          <Wifi className="w-3.5 h-3.5 text-indigo-400" />
          <span>Local LAN Sharing</span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Share Files Locally</h1>
        <p className="text-sm text-slate-400 font-normal leading-relaxed">
          Configure session details, generate a 4-digit PIN, and choose files to share.
        </p>
      </div>

      <form onSubmit={handleStartSharing} className="space-y-6">
        {/* Session Inputs Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 bg-slate-900/70">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            1. Sender & Group Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Input 1: Sender Name */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Your Name <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex, MacBook Pro"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-normal"
              />
            </div>

            {/* Input 2: Group Name */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Group Name <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Team Alpha, Meeting Docs"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-normal"
              />
            </div>
          </div>

          {/* 4-Digit Code Configuration */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  4-Digit Security Code <span className="text-indigo-400">*</span>
                </label>
                <p className="text-xs text-slate-400 font-normal">The receiver must enter this code to access your files</p>
              </div>

              <button
                type="button"
                onClick={handleRegenerateCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold transition self-start sm:self-auto"
              >
                <Dices className="w-3.5 h-3.5 text-indigo-400" />
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
                className="w-44 px-4 py-3 text-center tracking-widest font-mono text-2xl font-bold rounded-xl bg-slate-950 border border-indigo-500/50 text-white focus:outline-none focus:border-indigo-400 transition"
              />
              <span className="text-xs text-slate-400 font-normal">
                4 numeric digits (e.g. {code || '4829'})
              </span>
            </div>
          </div>
        </div>

        {/* File Dropzone Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 bg-slate-900/70">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              2. Select Files to Share
            </h3>
            {selectedFiles.length > 0 && (
              <button
                type="button"
                onClick={clearFiles}
                className="text-xs font-semibold text-slate-400 hover:text-white transition"
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
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <UploadCloud className="w-7 h-7 text-indigo-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Drag and drop files here, or <span className="text-indigo-400 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1 font-normal">
                Supports photos, videos, documents, zip archives, and any file format
              </p>
            </div>
          </div>

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-normal">
                <span>{selectedFiles.length} file(s) selected</span>
                <span className="font-mono font-medium text-slate-200">Total: {formatBytes(totalSizeBytes)}</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}_${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        {renderFileIcon(file.name, file.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
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
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4 text-indigo-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-2 bg-slate-900/70">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Uploading & preparing files for LAN transfer...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading || selectedFiles.length === 0}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Uploading Files...</span>
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
