import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, DownloadCloud, ShieldCheck, Zap, Wifi, 
  QrCode, ArrowRight, Lock 
} from 'lucide-react';

export default function LandingPage({ networkInfo, onOpenQr }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-10 py-4 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold shadow-sm">
          <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span>Local LAN Transfer</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Share Files Locally
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto font-normal">
          Fast, private file transfer between devices on your local Wi-Fi.
        </p>

        {/* Local Network Info Pill */}
        <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-sm font-normal">
            <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-500">IP:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-indigo-300">
              {networkInfo?.primaryIp || 'Detecting...'}:{networkInfo?.port || 5000}
            </span>
          </div>

          <button
            onClick={onOpenQr}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-xs font-semibold transition shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>QR Code</span>
          </button>
        </div>
      </div>

      {/* Primary Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {/* Share / Sender Card */}
        <div 
          onClick={() => navigate('/send')}
          className="group rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden flex flex-col justify-between bg-white dark:bg-slate-900/70 shadow-sm"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition"></div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-105 transition duration-300 shadow-sm">
              <UploadCloud className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 block">
              Sender
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Share Files
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal mb-5 leading-relaxed">
              Drop files and share via 4-digit PIN or group QR code.
            </p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mb-6 font-normal">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Group PIN & QR Code generation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Live download notifications</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition">
            <span>Share Files</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
          </button>
        </div>

        {/* Receive Card */}
        <div 
          onClick={() => navigate('/receive')}
          className="group rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden flex flex-col justify-between bg-white dark:bg-slate-900/70 shadow-sm"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition"></div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-105 transition duration-300 shadow-sm">
              <DownloadCloud className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 block">
              Receiver
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Receive Files
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal mb-5 leading-relaxed">
              Enter the 4-digit PIN or scan QR code to download files.
            </p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mb-6 font-normal">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Preview media before downloading</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Download individually or as ZIP</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition">
            <span>Receive Files</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
          </button>
        </div>
      </div>

      {/* Feature Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Gigabit LAN Speed</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Fast direct transfer over Wi-Fi.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">4-Digit PIN Security</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Only devices with PIN can access.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">On-Demand Download</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Preview first, download on demand.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
