import React, { useState, useEffect } from 'react';
import { 
  X, Download, FileText, Image as ImageIcon, Video, Music, File, 
  Archive, FileSpreadsheet, Presentation, Code, Binary, ExternalLink, 
  Copy, Check, RefreshCw, ZoomIn, ZoomOut, Info 
} from 'lucide-react';
import { formatBytes, getFileCategory } from '../utils/fileHelpers';
import { getApiBaseUrl } from '../utils/apiClient';

export default function FilePreviewModal({ isOpen, onClose, file, sessionCode, onDownload }) {
  const [textContent, setTextContent] = useState('');
  const [hexRows, setHexRows] = useState([]);
  const [isBinary, setIsBinary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'hex'

  const baseUrl = getApiBaseUrl();
  const previewUrl = file ? `${baseUrl}/api/preview/${sessionCode}/${file.id}` : '';

  useEffect(() => {
    if (!isOpen || !file) return;

    setImageScale(1);
    setTextContent('');
    setHexRows([]);
    setIsBinary(false);
    setActiveTab('preview');

    const category = getFileCategory(file.name, file.mimeType);

    // If text, document, archive, or unknown binary file, fetch content to inspect
    if (['text', 'document', 'spreadsheet', 'presentation', 'archive', 'binary'].includes(category)) {
      setLoading(true);

      fetch(previewUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const uint8 = new Uint8Array(buffer.slice(0, 32768)); // first 32KB

          // Check if buffer is predominantly printable UTF-8 / ASCII text
          let printableCount = 0;
          let hasNullByte = false;
          for (let i = 0; i < Math.min(uint8.length, 1024); i++) {
            const byte = uint8[i];
            if (byte === 0) {
              hasNullByte = true;
              break;
            }
            if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
              printableCount++;
            }
          }

          const appearsText = !hasNullByte && (printableCount / Math.min(uint8.length, 1024)) > 0.85;

          if (appearsText || category === 'text') {
            const decoder = new TextDecoder('utf-8');
            const decoded = decoder.decode(uint8);
            setTextContent(decoded);
            setIsBinary(false);
          } else {
            setIsBinary(true);
            setActiveTab('hex');
          }

          // Build Hex Rows for byte inspection (first 4KB)
          const rows = [];
          const hexSlice = uint8.slice(0, 4096);
          for (let i = 0; i < hexSlice.length; i += 16) {
            const offset = i.toString(16).padStart(8, '0').toUpperCase();
            const chunk = hexSlice.slice(i, i + 16);
            let hexStr = '';
            let asciiStr = '';

            for (let j = 0; j < 16; j++) {
              if (j < chunk.length) {
                const b = chunk[j];
                hexStr += b.toString(16).padStart(2, '0').toUpperCase() + ' ';
                asciiStr += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
              } else {
                hexStr += '   ';
              }
              if (j === 7) hexStr += ' ';
            }

            rows.push({ offset, hexStr: hexStr.trim(), asciiStr });
          }
          setHexRows(rows);
          setLoading(false);
        })
        .catch(err => {
          console.warn('Preview buffer fetch failed:', err);
          setTextContent('Preview unavailable or network error.');
          setLoading(false);
        });
    }
  }, [isOpen, file, previewUrl]);

  if (!isOpen || !file) return null;

  const category = getFileCategory(file.name, file.mimeType);
  const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(previewUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Office / Docs online embed link (if running on a public domain like Render)
  const isPublicDomain = window.location.hostname.includes('.') && !window.location.hostname.startsWith('192.168') && window.location.hostname !== 'localhost';
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              {category === 'image' && <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'video' && <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'audio' && <Music className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'pdf' && <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'text' && <Code className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'document' && <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'spreadsheet' && <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'presentation' && <Presentation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'archive' && <Archive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              {category === 'binary' && <Binary className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md" title={file.name}>
                  {file.name}
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 flex-shrink-0">
                  .{ext}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {formatBytes(file.size)} • {file.mimeType || 'Application Stream'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Direct URL copy button */}
            <button
              onClick={handleCopyLink}
              title="Copy Preview URL"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Open in New Browser Tab */}
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              title="Open raw file in new tab"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Download Button */}
            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </button>
          </div>
        </div>

        {/* View Mode Switcher for Non-Media Files */}
        {hexRows.length > 0 && (
          <div className="px-6 py-2 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {textContent ? 'Text / Code Preview' : 'Interactive Document View'}
              </button>
              <button
                onClick={() => setActiveTab('hex')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'hex'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>Hex Byte Inspector</span>
              </button>
            </div>

            {textContent && activeTab === 'preview' && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-medium"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Copied' : 'Copy All Text'}</span>
              </button>
            )}
          </div>
        )}

        {/* Main Preview Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-50 dark:bg-slate-950/40 min-h-[380px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500 text-xs py-16">
              <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span className="font-semibold">Loading file preview stream...</span>
            </div>
          ) : (
            <>
              {/* 1. IMAGE PREVIEW */}
              {category === 'image' && (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                  <div className="overflow-auto max-h-[68vh] max-w-full flex items-center justify-center">
                    <img 
                      src={previewUrl} 
                      alt={file.name} 
                      style={{ transform: `scale(${imageScale})` }}
                      className="max-h-[64vh] max-w-full object-contain rounded-xl shadow-md transition-transform duration-200"
                    />
                  </div>
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
                    <button 
                      onClick={() => setImageScale(s => Math.max(0.5, s - 0.25))}
                      className="p-1 hover:text-indigo-600 transition"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </button>
                    <span className="font-mono px-1 font-semibold">{Math.round(imageScale * 100)}%</span>
                    <button 
                      onClick={() => setImageScale(s => Math.min(3, s + 0.25))}
                      className="p-1 hover:text-indigo-600 transition"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </button>
                    <button 
                      onClick={() => setImageScale(1)}
                      className="ml-1 text-[11px] text-slate-500 hover:text-indigo-600 underline font-normal"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* 2. VIDEO PREVIEW */}
              {category === 'video' && (
                <div className="w-full max-w-3xl flex flex-col items-center">
                  <video 
                    src={previewUrl} 
                    controls 
                    autoPlay={false}
                    className="max-h-[65vh] max-w-full rounded-2xl shadow-xl bg-black border border-slate-200 dark:border-slate-800"
                  />
                </div>
              )}

              {/* 3. AUDIO PREVIEW */}
              {category === 'audio' && (
                <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-lg">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <Music className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1 truncate">{file.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-5">{formatBytes(file.size)}</p>
                  <audio src={previewUrl} controls className="w-full rounded-xl" autoPlay={false} />
                </div>
              )}

              {/* 4. PDF PREVIEW */}
              {category === 'pdf' && (
                <iframe 
                  src={previewUrl} 
                  title={file.name} 
                  className="w-full h-[68vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-inner"
                />
              )}

              {/* 5. TEXT / CODE PREVIEW */}
              {activeTab === 'preview' && (category === 'text' || textContent) && (
                <div className="w-full h-full flex flex-col">
                  <pre className="w-full h-[65vh] p-4 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {textContent || 'Empty text file'}
                  </pre>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-mono">
                    <span>{textContent.split('\n').length} lines • {textContent.length.toLocaleString()} characters</span>
                    <span>UTF-8 Document</span>
                  </div>
                </div>
              )}

              {/* 6. OFFICE DOCUMENT EMBED VIEWER */}
              {activeTab === 'preview' && !textContent && ['document', 'spreadsheet', 'presentation'].includes(category) && (
                <div className="w-full h-full flex flex-col items-center">
                  {isPublicDomain ? (
                    <iframe 
                      src={googleViewerUrl} 
                      title={file.name} 
                      className="w-full h-[65vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                    />
                  ) : (
                    <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-md my-auto">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{file.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Local LAN Office document. You can inspect its internal structure using Hex Inspector or download and open directly.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setActiveTab('hex')}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                        >
                          Hex Inspector
                        </button>
                        <button
                          onClick={() => onDownload(file)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download File
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 7. HEX BYTE INSPECTOR (For ANY file extension, archives, binaries, executables, or unknown types) */}
              {(activeTab === 'hex' || (category === 'binary' && !textContent && activeTab !== 'preview') || (category === 'archive' && activeTab !== 'preview')) && (
                <div className="w-full h-full flex flex-col space-y-3">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Binary className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-slate-900 dark:text-white">Hexadecimal Byte Stream Preview</span>
                      <span className="text-[11px] text-slate-500 font-mono">({hexRows.length * 16} bytes shown)</span>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">
                      Offset | 16-Byte Hex | ASCII
                    </span>
                  </div>

                  <div className="w-full h-[55vh] bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded-2xl overflow-auto border border-slate-800 leading-relaxed shadow-inner">
                    {hexRows.map((row, idx) => (
                      <div key={idx} className="flex gap-4 hover:bg-slate-900/80 px-1 py-0.5 rounded transition">
                        <span className="text-indigo-400 font-bold select-none">{row.offset}</span>
                        <span className="text-slate-200 tracking-wider flex-1 whitespace-pre">{row.hexStr}</span>
                        <span className="text-emerald-400 border-l border-slate-800 pl-3 select-all whitespace-pre">{row.asciiStr}</span>
                      </div>
                    ))}
                  </div>

                  {/* File Metadata Overview Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Format</span>
                      <span className="font-bold text-slate-900 dark:text-white">.{ext} File</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Exact Size</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{file.size.toLocaleString()} B</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">MIME Type</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">{file.mimeType || 'binary/octet-stream'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Action</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Ready</span>
                      </div>
                      <button
                        onClick={() => onDownload(file)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
