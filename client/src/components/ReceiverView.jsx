import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  DownloadCloud, UploadCloud, Eye, Download, Archive, 
  FileText, Image as ImageIcon, Video, Music, File, 
  ArrowLeft, RefreshCw, AlertCircle, ShieldCheck, 
  Wifi, FolderDown, Users, CheckCircle2, XCircle 
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

  useEffect(() => {
    if (initialCode && /^\d{4}$/.test(initialCode)) {
      const digits = initialCode.split('');
      setPinDigits(digits);
      handleConnect(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (receiverName) {
      localStorage.setItem('localshare_recv_name', receiverName);
    }
  }, [receiverName]);

  // Track session codes for which we've already shown the initial received toast
  const receivedToastShownRef = useRef(new Set());

  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (data) => {
      if (data && data.exists && data.room) {
        setIsConnecting(false);
        setSessionData(prev => {
          if (prev && prev.code === data.room.code && JSON.stringify(prev.files) === JSON.stringify(data.room.files)) {
            return prev;
          }
          return data.room;
        });

        // Only show toast ONCE per session code
        if (!receivedToastShownRef.current.has(data.room.code)) {
          receivedToastShownRef.current.add(data.room.code);
          showToast(`Files received for session "${data.room.groupName}"!`, 'success');
        }
      }
    };

    const handleFilesUpdated = (data) => {
      if (data && data.files) {
        setSessionData(prev => {
          if (!prev) return prev;
          if (JSON.stringify(prev.files) === JSON.stringify(data.files)) return prev;
          showToast('Sender uploaded new files!', 'info');
          return {
            ...prev,
            files: data.files
          };
        });
      }
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
      setErrorMessage('');
      const nextIndex = Math.min(pasted.length, 3);
      inputRefs[nextIndex].current?.focus();
      if (pasted.length === 4) {
        handleConnect(pasted.join(''));
      }
      return;
    }

    const newDigits = [...pinDigits];
    newDigits[index] = cleanValue;
    setPinDigits(newDigits);
    setErrorMessage('');

    if (index < 3 && cleanValue) {
      inputRefs[index + 1].current?.focus();
    }

    const full = newDigits.join('');
    if (full.length === 4) {
      handleConnect(full);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const getFullPin = () => pinDigits.join('');

  const handleConnect = async (customCode) => {
    const codeToVerify = customCode || getFullPin();
    if (!/^\d{4}$/.test(codeToVerify)) {
      setErrorMessage('Please enter a complete 4-digit PIN.');
      return;
    }

    setIsConnecting(true);
    setErrorMessage('');

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

        // Join the Socket.IO room so sender can see receiver and live updates
        if (socket) {
          socket.emit('join_room', {
            code: codeToVerify,
            role: 'receiver',
            name: receiverName || 'Anonymous Receiver'
          });
        }
        return;
      }
    } catch (httpErr) {
      console.warn('HTTP fetch failed, attempting real-time Socket.IO room lookup:', httpErr.message);
    }

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

  const handleDownloadSingle = (file) => {
    const effectiveReceiver = receiverName || 'Anonymous Receiver';
    showToast(`Downloading "${file.name}"...`, 'info');

    const baseUrl = getApiBaseUrl();
    const downloadUrl = `${baseUrl}/api/download/${sessionData.code}/${file.id}?receiver=${encodeURIComponent(effectiveReceiver)}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', file.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    if (!sessionData || !sessionData.files || sessionData.files.length === 0) {
      showToast('No files available to download.', 'error');
      return;
    }

    const effectiveReceiver = receiverName || 'Anonymous Receiver';
    setIsDownloadingAll(true);
    showToast('Preparing ZIP package of all files...', 'info');

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
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Enter Another PIN
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/send')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Switch to Send Files</span>
            </button>
          </div>
        </div>

        {/* Session Info Header */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-white dark:bg-slate-900/70 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Connected to Sender • Live Transfer</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {sessionData.groupName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                Shared by <span className="font-semibold text-slate-900 dark:text-slate-200">{sessionData.senderName}</span> • <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Connected</span>
              </p>
            </div>

            {/* Prominent "DOWNLOAD ALL" Button */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                disabled={isDownloadingAll || files.length === 0}
                onClick={handleDownloadAll}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-normal">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Safe Transfer: Files are not auto-downloaded. Preview first, or download individually or all at once.</span>
            </div>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {files.length} items • {formatBytes(totalBytes)}
            </span>
          </div>
        </div>

        {/* Files Explorer / List */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900/70 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Available Files ({files.length})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Click "Download" on any file or "Preview" to inspect
            </span>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <File className="w-12 h-12 text-indigo-600/30 dark:text-indigo-400/40 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-white">No files uploaded yet in this session</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Wait for the sender to drop files into the session.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {files.map((file) => {
                const canPreview = isPreviewable(file.name, file.mimeType);

                return (
                  <div 
                    key={file.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
                        {renderFileIcon(file.name, file.mimeType)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {formatBytes(file.size)} {file.sender && `• Sent by ${file.sender}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {canPreview && (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-medium transition shadow-sm"
                          title="Preview without downloading"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Preview</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadSingle(file)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold transition hover:scale-105 active:scale-95 shadow-sm"
                        title="Download this individual file"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Back to Home
        </button>

        <button
          onClick={() => navigate('/send')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 text-xs font-semibold text-slate-700 dark:text-slate-300 transition shadow-sm"
        >
          <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Switch to Send</span>
        </button>
      </div>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 shadow-sm">
          <DownloadCloud className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Receive Files</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
          Enter the 4-digit code provided by the sender on your network.
        </p>
      </div>

      {/* 4-Digit Code Box Card */}
      <div className="rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 space-y-6 bg-white dark:bg-slate-900/70 shadow-sm">
        {/* USER REQUESTED: Connection Status Bar showing Connected (Green) or Not Connected (Red) */}
        {sessionData ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold">Status: Connected</span>
              <span className="font-normal text-emerald-600 dark:text-emerald-300">• Connected to {sessionData.senderName} ({sessionData.groupName})</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
              CONNECTED
            </span>
          </div>
        ) : isConnecting ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span className="font-bold">Status: Verifying PIN...</span>
              <span className="font-normal text-amber-600 dark:text-amber-300">• Checking sender on local network</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
              CHECKING
            </span>
          </div>
        ) : errorMessage ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="font-bold">Status: Not Connected</span>
              <span className="font-normal text-rose-600 dark:text-rose-300">• {errorMessage}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
              NOT CONNECTED
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="font-bold">Status: Not Connected</span>
              <span className="font-normal text-slate-500 dark:text-slate-400">• Enter correct 4-digit PIN to connect</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
              NOT CONNECTED
            </span>
          </div>
        )}

        <div className="space-y-4">
          <label className="block text-center text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
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
                className={`w-14 h-16 sm:w-16 sm:h-20 text-center font-mono text-3xl sm:text-4xl font-extrabold rounded-2xl transition-all duration-200 focus:outline-none ${
                  digit 
                    ? 'border-2 border-indigo-600 text-indigo-700 dark:text-white bg-indigo-50/50 dark:bg-indigo-500/10 shadow-md shadow-indigo-500/10 scale-105' 
                    : 'border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-400 focus:border-indigo-600'
                }`}
              />
            ))}
          </div>

          {/* Receiver Display Name */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Your Name <span className="text-slate-400 font-normal">(shown to sender when you connect or download)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah, iPhone 15"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-600 transition font-normal"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-slate-950 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-400 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={() => handleConnect()}
          disabled={isConnecting || getFullPin().length !== 4}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Connecting & Verifying PIN...</span>
            </>
          ) : (
            <>
              <DownloadCloud className="w-4 h-4 text-white" />
              <span>Connect & View Files</span>
            </>
          )}
        </button>

        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 font-normal">
          <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Local network peer-to-peer connection</span>
        </div>
      </div>
    </div>
  );
}
