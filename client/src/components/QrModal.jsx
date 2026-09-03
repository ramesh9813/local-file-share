import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Wifi, Download, ExternalLink, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';

export default function QrModal({ isOpen, onClose, networkInfo, activeCode }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Compute the exact URL to share
  const targetUrl = activeCode 
    ? `${window.location.origin}/receive?code=${activeCode}` 
    : (networkInfo?.primaryUrl || window.location.origin);

  useEffect(() => {
    if (!isOpen || !targetUrl) return;

    setIsGenerating(true);

    QRCode.toDataURL(targetUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.warn('Client QRCode generation error, using fallback API:', err);
        // Robust fallback to instant QR generator image service
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(targetUrl)}`;
        setQrDataUrl(fallbackUrl);
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
    link.download = `airlink-qr-${activeCode || 'lan'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 relative border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900/95 transition-colors"
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <QrCode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Connect with QR Code</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">Scan with any phone camera or tablet</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 mb-5">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 mb-3 min-w-[200px] min-h-[200px] flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 text-slate-500 text-xs py-8">
                <RefreshCw className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span>Generating QR Code...</span>
              </div>
            ) : qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Local File Share QR Code" 
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
              />
            ) : (
              <div className="text-slate-400 text-xs py-8">Unable to generate QR code</div>
            )}
          </div>

          <div className="flex items-center justify-between w-full max-w-xs text-xs text-slate-500 dark:text-slate-400 font-normal mt-1">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>Instant Wi-Fi connection</span>
            </span>
            {qrDataUrl && (
              <button
                onClick={handleDownloadQr}
                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                <Download className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Save QR</span>
              </button>
            )}
          </div>
        </div>

        {/* Share Link & Copy */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Direct Web Address
          </label>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-2">
            <span className="text-xs font-mono text-slate-700 dark:text-indigo-300 truncate flex-1 px-2 font-normal">
              {targetUrl}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Available LAN IPs list */}
        {networkInfo?.addresses && networkInfo.addresses.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Detected Network Interfaces:
            </span>
            <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
              {networkInfo.addresses.map((addr, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300">
                  <span className="font-mono text-slate-500">{addr.interface}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-300">{addr.ip}:{networkInfo.port || 5000}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-3 font-normal">
          Both sender and receiver should be connected to the same local Wi-Fi.
        </p>
      </div>
    </div>
  );
}
