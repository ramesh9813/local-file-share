import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Copy, Check, QrCode, Wifi, Download, ExternalLink, RefreshCw, Layers 
} from 'lucide-react';
import QRCode from 'qrcode';
import { useSessions } from '../context/SessionContext';

export default function QrModal({ isOpen, onClose, networkInfo, activeCode: propActiveCode }) {
  const { sessions, selectedCode } = useSessions();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Determine current active code (prop > selected in context > first session > null)
  const effectiveCode = propActiveCode || selectedCode || (sessions.length > 0 ? sessions[0].code : null);
  const [chosenCode, setChosenCode] = useState(effectiveCode);

  useEffect(() => {
    setChosenCode(effectiveCode);
  }, [effectiveCode, isOpen]);

  // Compute a 100% valid, accessible HTTP/HTTPS URL
  const getTargetUrl = () => {
    const { hostname, origin, port } = window.location;

    let baseUrl = origin;

    // If accessing from localhost on a developer's PC, phone needs the LAN Wi-Fi IP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (networkInfo?.primaryIp && !networkInfo.primaryIp.startsWith('10.29.') && networkInfo.primaryIp !== '127.0.0.1') {
        const portToUse = port || networkInfo.port || 5000;
        baseUrl = `http://${networkInfo.primaryIp}:${portToUse}`;
      }
    }

    // Direct receiver link with PIN query param if session code is active
    if (chosenCode && /^\d{4}$/.test(chosenCode)) {
      return `${baseUrl}/receive?code=${chosenCode}`;
    }

    return `${baseUrl}/receive`;
  };

  const targetUrl = getTargetUrl();

  // Generate QR Code with ISO compliant quiet-zone margin (4) and High error correction (H)
  useEffect(() => {
    if (!isOpen || !targetUrl) return;

    setIsGenerating(true);

    QRCode.toDataURL(targetUrl, {
      width: 360,
      margin: 4, // Strict ISO standard quiet zone for camera autofocus
      color: {
        dark: '#000000', // Pure black for max contrast
        light: '#ffffff'  // Pure white background
      },
      errorCorrectionLevel: 'H' // High 30% recovery level
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.warn('Local QRCode generator error, falling back to QR API:', err);
        const encoded = encodeURIComponent(targetUrl);
        setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=15&ecc=H&data=${encoded}`);
        setIsGenerating(false);
      });
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `airlink-qr-${chosenCode || 'receiver'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-3xl p-6 sm:p-7 relative border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 transition-colors max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <QrCode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Connect with QR Code</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">Point any smartphone camera to connect</p>
          </div>
        </div>

        {/* Session Selector if Multiple Active Sessions Exist */}
        {sessions.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Select Sharing Target:</span>
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {sessions.map((s) => (
                <button
                  key={s.code}
                  onClick={() => setChosenCode(s.code)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 flex items-center gap-1.5 border ${
                    chosenCode === s.code
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <span className="truncate max-w-[100px]">{s.groupName}</span>
                  <span className={`px-1 py-0.2 rounded font-mono text-[10px] ${
                    chosenCode === s.code ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                  }`}>
                    {s.code}
                  </span>
                </button>
              ))}

              <button
                onClick={() => setChosenCode(null)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 border ${
                  chosenCode === null
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                Receiver Page
              </button>
            </div>
          </div>
        )}

        {/* High-Contrast QR Code Card with Standard Quiet Zone */}
        <div className="flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-3 flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-xs py-16 px-12">
                <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="mt-2 font-medium">Generating QR...</span>
              </div>
            ) : qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="File Share QR Code" 
                className="w-56 h-56 object-contain rounded-lg"
              />
            ) : (
              <div className="text-slate-400 text-xs py-16 px-12">Failed to render QR</div>
            )}
          </div>

          <div className="flex items-center justify-between w-full max-w-xs text-xs text-slate-600 dark:text-slate-400 font-normal">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>
                {chosenCode ? `Autofills PIN: ${chosenCode}` : 'Opens Receive Page'}
              </span>
            </span>
            {qrDataUrl && (
              <button
                onClick={handleDownloadQr}
                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Image</span>
              </button>
            )}
          </div>
        </div>

        {/* Direct Link Box with One-Click Copy & Open */}
        <div className="space-y-1.5 mb-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Encoded Web URL
          </label>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 pr-2">
            <span className="text-xs font-mono text-slate-800 dark:text-indigo-300 truncate flex-1 px-2 font-normal select-all">
              {targetUrl}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-sm flex-shrink-0"
              title="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition flex-shrink-0"
              title="Open URL in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-normal">
          Any camera app (iPhone Camera, Google Lens, Samsung Camera) can scan this QR code directly.
        </p>
      </div>
    </div>
  );
}
