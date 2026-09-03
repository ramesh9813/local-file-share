import React, { useState } from 'react';
import { X, Copy, Check, QrCode, Wifi } from 'lucide-react';

export default function QrModal({ isOpen, onClose, networkInfo, activeCode }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetUrl = activeCode 
    ? `${window.location.origin}/receive?code=${activeCode}` 
    : (networkInfo?.primaryUrl || window.location.origin);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 relative border border-slate-800 shadow-2xl bg-slate-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-indigo-400" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <QrCode className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Local Network Connect</h3>
            <p className="text-xs text-slate-400 font-normal mt-0.5">Scan to open on phone, tablet or PC</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-2xl border border-slate-800 mb-5">
          {networkInfo?.qrCode ? (
            <div className="p-2.5 bg-white rounded-xl shadow-md mb-3">
              <img 
                src={networkInfo.qrCode} 
                alt="Local Network QR Code" 
                className="w-48 h-48 object-contain rounded"
              />
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-slate-900 rounded-xl text-slate-500 text-xs mb-3 font-normal">
              QR Code generating...
            </div>
          )}
          <span className="text-xs text-slate-400 text-center flex items-center gap-1.5 font-normal">
            <Wifi className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            Scan with your phone's camera to join instantly
          </span>
        </div>

        {/* Share Link & Copy */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Local URL Address
          </label>
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-xs font-mono text-indigo-300 truncate flex-1 font-normal">
              {targetUrl}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Available LAN IPs list */}
        {networkInfo?.addresses && networkInfo.addresses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-2">
              Detected Network Interfaces:
            </span>
            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
              {networkInfo.addresses.map((addr, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-slate-850 text-slate-300">
                  <span className="text-slate-400 font-mono">{addr.interface}</span>
                  <span className="font-mono text-indigo-300">{addr.ip}:{networkInfo.port || 5000}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <p className="text-[11px] text-slate-400 text-center mt-4 font-normal">
          Both devices must be connected to the same Wi-Fi or local hotspot network.
        </p>
      </div>
    </div>
  );
}
