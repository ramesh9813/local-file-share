import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image as ImageIcon, Video, Music, File } from 'lucide-react';
import { formatBytes, getFileCategory } from '../utils/fileHelpers';

export default function FilePreviewModal({ isOpen, onClose, file, sessionCode, onDownload }) {
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) return;

    const category = getFileCategory(file.name, file.mimeType);
    if (category === 'text') {
      setLoadingText(true);
      fetch(`/api/preview/${sessionCode}/${file.id}`)
        .then(res => res.text())
        .then(text => {
          setTextContent(text.slice(0, 50000));
          setLoadingText(false);
        })
        .catch(() => {
          setTextContent('Failed to load text preview.');
          setLoadingText(false);
        });
    }
  }, [isOpen, file, sessionCode]);

  if (!isOpen || !file) return null;

  const category = getFileCategory(file.name, file.mimeType);
  const previewUrl = `/api/preview/${sessionCode}/${file.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="glass-panel w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {category === 'image' && <ImageIcon className="w-5 h-5 text-indigo-400" />}
              {category === 'video' && <Video className="w-5 h-5 text-indigo-400" />}
              {category === 'audio' && <Music className="w-5 h-5 text-indigo-400" />}
              {category === 'text' && <FileText className="w-5 h-5 text-indigo-400" />}
              {!['image', 'video', 'audio', 'text'].includes(category) && <File className="w-5 h-5 text-indigo-400" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate max-w-md" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {formatBytes(file.size)} • {file.mimeType || 'Unknown type'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-indigo-400" />
            </button>
          </div>
        </div>

        {/* Content Preview Area */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950/40 min-h-[320px]">
          {category === 'image' && (
            <img 
              src={previewUrl} 
              alt={file.name} 
              className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-lg"
            />
          )}

          {category === 'video' && (
            <video 
              src={previewUrl} 
              controls 
              className="max-h-[65vh] max-w-full rounded-xl shadow-lg bg-black"
            />
          )}

          {category === 'audio' && (
            <div className="w-full max-w-md p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-3 truncate">{file.name}</p>
              <audio src={previewUrl} controls className="w-full" />
            </div>
          )}

          {category === 'pdf' && (
            <iframe 
              src={previewUrl} 
              title={file.name} 
              className="w-full h-[65vh] rounded-xl border border-slate-800 bg-white"
            />
          )}

          {category === 'text' && (
            loadingText ? (
              <div className="text-slate-400 text-sm animate-pulse font-normal">Loading text preview...</div>
            ) : (
              <pre className="w-full h-[60vh] p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-auto rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed">
                {textContent}
              </pre>
            )
          )}

          {!['image', 'video', 'audio', 'pdf', 'text'].includes(category) && (
            <div className="text-center py-12">
              <File className="w-14 h-14 text-indigo-400/40 mx-auto mb-3" />
              <p className="text-sm text-white font-semibold mb-1">Direct preview not available for this file type</p>
              <p className="text-xs text-slate-400 font-normal mb-4">Click download to save and open it on your device</p>
              <button
                onClick={() => onDownload(file)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
              >
                <Download className="w-4 h-4 text-white" />
                Download {file.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
