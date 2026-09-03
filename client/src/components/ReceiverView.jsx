import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  DownloadCloud, UploadCloud, Eye, Download, Archive, 
  FileText, Image as ImageIcon, Video, Music, File, 
  ArrowLeft, RefreshCw, Check, AlertCircle, ShieldCheck, 
  Wifi, FolderDown 
} from 'lucide-react';
import { formatBytes, getFileCategory, isPreviewable } from '../utils/fileHelpers';
import { safeFetchJson, getApiBaseUrl } from '../utils/apiClient';
import FilePreviewModal from './FilePreviewModal';
import confetti from 'canvas-confetti';

export default function ReceiverView({ 
  socket, 
  showToast 
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  // PIN state (4 individual digits)
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [receiverName, setReceiverName] = useState(() => localStorage.getItem('localshare_recv_name') || '');
  
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionData, setSessionData] = useState(null);

  // Preview Modal
  const [previewFile, setPreviewFile] = useState(null);

  // Downloading all state
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Input refs for 4-digit boxes
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // If initialCode provided via URL (e.g. /receive?code=1234)
  useEffect(() => {
    if (initialCode && /^\d{4}$/.test(initialCode)) {
      const digits = initialCode.split('');
      setPinDigits(digits);
      handleConnect(initialCode);
    }
  }, [initialCode]);

  // Persist receiver name
  useEffect(() => {
    if (receiverName) {
      localStorage.setItem('localshare_recv_name', receiverName);
    }
  }, [receiverName]);

  // Socket listeners for real-time room updates & auto-send from sender
  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (data) => {
      if (data && data.exists && data.room) {
        setSessionData(data.room);
        setIsConnecting(false);
        showToast(`Files received for session "${data.room.groupName}"!`, 'success');
      }
    };

    const handleFilesUpdated = (data) => {
      showToast('Sender uploaded new files!', 'info');
      setSessionData(prev => ({
        ...prev,
        files: data.files
      }));
    };

    const handleSessionClosed = (data) => {
      showToast(data.message || 'Session was closed by sender.', 'error');
      setSessionData(null);
    };

    socket.on('room_state', handleRoomState);
    socket.on('files_updated', handleFilesUpdated);
    socket.on('session_closed', handleSessionClosed);

    return () => {
      socket.off('room_state', handleRoomState);
      socket.off('files_updated', handleFilesUpdated);
      socket.off('session_closed', handleSessionClosed);
    };
  }, [socket]);

  // Join room when sessionData is set
  useEffect(() => {
    if (!socket || !sessionData) return;

    socket.emit('join_room', {
      code: sessionData.code,
      role: 'receiver',
      name: receiverName || 'Anonymous Receiver'
    });
  }, [socket, sessionData, receiverName]);

  // Handle individual digit typing
  const handleDigitChange = (index, value) => {
    setErrorMessage('');
    const cleanValue = value.replace(/\D/g, '');

    if (!cleanValue) {
      const newDigits = [...pinDigits];
      newDigits[index] = '';
      setPinDigits(newDigits);
      return;
    }

    if (cleanValue.length > 1) {
      const pasted = cleanValue.slice(0, 4).split('');
      const newDigits = [...pinDigits];
      pasted.forEach((d, i) => {
        if (i < 4) newDigits[i] = d;
      });
      setPinDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 3);
      inputRefs[nextIndex].current?.focus();
      return;
    }

    const newDigits = [...pinDigits];
    newDigits[index] = cleanValue;
    setPinDigits(newDigits);

    if (index < 3 && cleanValue) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const getFullPin = () => pinDigits.join('');

  // Connect to session using 4-digit code (fixes doctype is not valid json)
  const handleConnect = async (customCode) => {
    const codeToVerify = customCode || getFullPin();
    if (!/^\d{4}$/.test(codeToVerify)) {
      setErrorMessage('Please enter a complete 4-digit PIN.');
      return;
    }

    setIsConnecting(true);
    setErrorMessage('');

    // Attempt 1: Try safe API fetch with automatic URL routing
    try {
      const data = await safeFetchJson(`/api/room/${codeToVerify}`);
      if (data && data.room) {
        setSessionData(data.room);
        showToast(`Connected to session "${data.room.groupName}"!`, 'success');
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 }
        });
        setIsConnecting(false);
        return;
      }
    } catch (httpErr) {
      console.warn('HTTP fetch failed, attempting real-time Socket.IO room lookup:', httpErr.message);
    }

    // Attempt 2: Fallback via Socket.IO directly (Peer-to-peer / Server channel)
    if (socket) {
      socket.emit('join_room', {
        code: codeToVerify,
        role: 'receiver',
        name: receiverName || 'Anonymous Receiver'
      });

      socket.emit('get_room_data', { code: codeToVerify }, (response) => {
        setIsConnecting(false);
        if (response && response.success && response.room) {
          setSessionData(response.room);
          showToast(`Connected to session "${response.room.groupName}"!`, 'success');
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.7 }
          });
        } else {
          setErrorMessage(response?.error || `No active sharing session found for code "${codeToVerify}".`);
        }
      });

      // Safety timeout
      setTimeout(() => {
        setIsConnecting(prev => {
          if (prev) {
            setErrorMessage(`No response for code "${codeToVerify}". Ensure sender is online.`);
            return false;
          }
          return false;
        });
      }, 5000);
    } else {
      setIsConnecting(false);
      setErrorMessage('Could not connect to server or peer network.');
    }
  };

  // Download Individual File & notify sender
  const handleDownloadSingle = (file) => {
    const effectiveReceiver = receiverName || 'Anonymous Receiver';
    showToast(`Downloading "${file.name}"...`, 'info');

    // Notify sender via Socket.IO: "for sender show who downloaded that file name card only"
    if (socket) {
      socket.emit('file_downloaded', {
        code: sessionData.code,
        fileId: file.id,
        fileName: file.name,
        receiverName: effectiveReceiver
      });
    }

    const baseUrl = getApiBaseUrl();
    const downloadUrl = `${baseUrl}/api/download/${sessionData.code}/${file.id}?receiver=${encodeURIComponent(effectiveReceiver)}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', file.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download ALL files as a single ZIP package & notify sender
  const handleDownloadAll = () => {
    if (!sessionData || !sessionData.files || sessionData.files.length === 0) {
      showToast('No files available to download.', 'error');
      return;
    }

    const effectiveReceiver = receiverName || 'Anonymous Receiver';
    setIsDownloadingAll(true);
    showToast('Preparing ZIP package of all files...', 'info');

    // Notify sender via Socket.IO
    if (socket) {
      socket.emit('file_downloaded', {
        code: sessionData.code,
        fileId: 'all',
        fileName: `All Files (${sessionData.files.length} items ZIP)`,
        receiverName: effectiveReceiver
      });
    }

    const baseUrl = getApiBaseUrl();
    const zipUrl = `${baseUrl}/api/download-all/${sessionData.code}?receiver=${encodeURIComponent(effectiveReceiver)}`;
    const link = document.createElement('a');
    link.href = zipUrl;
    link.setAttribute('download', `${sessionData.groupName || 'files'}-${sessionData.code}.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloadingAll(false);
      showToast('All files downloaded in ZIP archive!', 'success');
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 1500);
  };

  // Uniform icon renderer
  const renderFileIcon = (fileName, mimeType) => {
    const category = getFileCategory(fileName, mimeType);
    switch (category) {
      case 'image': return <ImageIcon className="w-5 h-5 text-indigo-400" />;
      case 'video': return <Video className="w-5 h-5 text-rose-400" />;
      case 'audio': return <Music className="w-5 h-5 text-amber-400" />;
      case 'text': return <FileText className="w-5 h-5 text-emerald-400" />;
      case 'archive': return <Archive className="w-5 h-5 text-purple-400" />;
      default: return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CONNECTED STATE: Showing list of files (NO AUTO DOWNLOAD)
  // ─────────────────────────────────────────────────────────────
  if (sessionData) {
    const files = sessionData.files || [];
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn py-4">
        {/* Navigation & Mode Switch Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setSessionData(null)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            Enter Another PIN
          </button>

          {/* User requested: allow receiver to have receiver button and send button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/send')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 text-xs font-semibold text-slate-200 transition shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              <span>Switch to Send Files</span>
            </button>
          </div>
        </div>

        {/* Session Info Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden bg-slate-900/70 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <Wifi className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Connected to Sender • Live Transfer</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {sessionData.groupName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
                Shared by <span className="font-semibold text-slate-200">{sessionData.senderName}</span> • Session Code: <span className="font-mono font-bold text-indigo-300">{sessionData.code}</span>
              </p>
            </div>

            {/* Prominent "DOWNLOAD ALL" Button */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                disabled={isDownloadingAll || files.length === 0}
                onClick={handleDownloadAll}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloadingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Zipping & Downloading...</span>
                  </>
                ) : (
                  <>
                    <FolderDown className="w-5 h-5 text-white" />
                    <span>Download All ({files.length} files • {formatBytes(totalBytes)})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-normal">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Safe Transfer: Files are not auto-downloaded. Preview first, or download individually or all at once.</span>
            </div>
            <span className="font-mono text-slate-300">
              {files.length} items • {formatBytes(totalBytes)}
            </span>
          </div>
        </div>

        {/* Files Explorer / List */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4 bg-slate-900/70">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Available Files ({files.length})
            </h3>
            <span className="text-xs text-slate-400 font-normal">
              Click "Download" on any file or "Preview" to inspect
            </span>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <File className="w-12 h-12 text-indigo-400/40 mx-auto" />
              <p className="text-sm font-semibold text-white">No files uploaded yet in this session</p>
              <p className="text-xs text-slate-400 font-normal">Wait for the sender to drop files into the session.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {files.map((file) => {
                const canPreview = isPreviewable(file.name, file.mimeType);

                return (
                  <div 
                    key={file.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition gap-4"
                  >
                    {/* File Meta */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0">
                        {renderFileIcon(file.name, file.mimeType)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate max-w-sm sm:max-w-md" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {formatBytes(file.size)} {file.sender && `• Sent by ${file.sender}`}
                        </p>
                      </div>
                    </div>

                    {/* Actions for this individual file */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Preview Button */}
                      {canPreview && (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-medium transition"
                          title="Preview without downloading"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Preview</span>
                        </button>
                      )}

                      {/* INDIVIDUAL DOWNLOAD BUTTON */}
                      <button
                        onClick={() => handleDownloadSingle(file)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold transition hover:scale-105 active:scale-95 shadow-sm"
                        title="Download this individual file"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* File Preview Modal */}
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          sessionCode={sessionData.code}
          onDownload={handleDownloadSingle}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CODE ENTRY STATE: Prompt for 4-Digit Code
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-8 animate-fadeIn py-4">
      {/* Top Header & Switch to Send button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          Back to Home
        </button>

        <button
          onClick={() => navigate('/send')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition"
        >
          <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
          <span>Switch to Send</span>
        </button>
      </div>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
          <DownloadCloud className="w-7 h-7 text-indigo-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Receive Files</h1>
        <p className="text-sm text-slate-400 font-normal leading-relaxed">
          Enter the 4-digit code provided by the sender on your network.
        </p>
      </div>

      {/* 4-Digit Code Box Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 bg-slate-900/70">
        <div className="space-y-4">
          <label className="block text-center text-xs font-bold uppercase tracking-wider text-indigo-400">
            Enter 4-Digit PIN Code
          </label>

          {/* 4 Large Digit Input Boxes */}
          <div className="flex justify-center items-center gap-3 sm:gap-4">
            {pinDigits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-14 h-16 sm:w-16 sm:h-20 text-center font-mono text-3xl sm:text-4xl font-extrabold rounded-2xl bg-slate-950 border transition-all duration-200 focus:outline-none ${
                  digit 
                    ? 'border-indigo-500 text-white shadow-lg shadow-indigo-500/10 scale-105' 
                    : 'border-slate-800 text-slate-400 focus:border-indigo-400'
                }`}
              />
            ))}
          </div>

          {/* Receiver Display Name (Optional) */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Name <span className="text-slate-500 font-normal">(shown to sender when you connect or download)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah, iPhone 15"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-normal"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-rose-500/40 text-xs text-rose-400 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={() => handleConnect()}
          disabled={isConnecting || getFullPin().length !== 4}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Connecting & Fetching Files...</span>
            </>
          ) : (
            <>
              <DownloadCloud className="w-4 h-4 text-white" />
              <span>Connect & View Files</span>
            </>
          )}
        </button>

        <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 font-normal">
          <Wifi className="w-3.5 h-3.5 text-indigo-400" />
          <span>Local network peer-to-peer connection</span>
        </div>
      </div>
    </div>
  );
}
