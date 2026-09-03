import React from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, DownloadCloud, Wifi, ShieldCheck, HardDrive, QrCode, Lock, Zap } from 'lucide-react';

export default function Footer({ networkInfo, onOpenQr }) {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 text-slate-400 text-xs">
      {/* Top Feature Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 border-b border-slate-800/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Full Gigabit LAN Speed</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Direct Wi-Fi / LAN transfer with zero cloud limits or bottlenecks.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
              <Lock className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">4-Digit PIN Security</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Only devices entering the exact 4-digit session code can access files.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">No Auto-Download</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Preview first, then download all as ZIP or select individual files.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
              <HardDrive className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">100% Local Privacy</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Files stay in your local network and never leave your router.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Status */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <UploadCloud className="w-4 h-4 text-indigo-400 -rotate-45" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                AirLink LAN
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                v1.2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Professional local file sharing web application designed for fast, seamless peer-to-peer data transfers between any devices on the same Wi-Fi or Ethernet.
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Quick Navigation
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-slate-400 hover:text-white transition flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Home Landing Page
                </Link>
              </li>
              <li>
                <Link to="/send" className="text-slate-400 hover:text-white transition flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Share Files (Sender Mode)
                </Link>
              </li>
              <li>
                <Link to="/receive" className="text-slate-400 hover:text-white transition flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Receive Files (Receiver Mode)
                </Link>
              </li>
              <li>
                <button 
                  onClick={onOpenQr} 
                  className="text-slate-400 hover:text-white transition flex items-center gap-2 text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Local Network QR Code
                </button>
              </li>
            </ul>
          </div>

          {/* Network Diagnostics Card */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Local Network Status
            </h5>
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Local LAN Address:</span>
                <span className="font-mono font-semibold text-indigo-300">
                  {networkInfo?.primaryIp || '127.0.0.1'}:{networkInfo?.port || 5000}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Connection Mode:</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <Wifi className="w-3 h-3 text-indigo-400" />
                  Local Wi-Fi / LAN
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Security:</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  Isolated Session
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} AirLink LAN. Local network data transfers remain entirely private within your LAN.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>React Router v6</span>
            <span>•</span>
            <span>Tailwind CSS</span>
            <span>•</span>
            <span>Socket.IO</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
