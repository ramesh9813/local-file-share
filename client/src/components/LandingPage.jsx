import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, DownloadCloud, ShieldCheck, Zap, Wifi, 
  QrCode, ArrowRight, Lock 
} from 'lucide-react';

export default function LandingPage({ networkInfo, onOpenQr }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-12 py-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold tracking-wide shadow-sm">
          <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span>High-Speed Local LAN Transfer • Direct Router Connection</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Share files locally with <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 dark:from-indigo-400 dark:via-indigo-300 dark:to-purple-400">
            zero hassle & complete control
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
          Fast, private file transfer between any phones, tablets, or computers on your local Wi-Fi.
          Use a simple 4-digit code to connect, inspect file lists, preview media, and download individually or all at once.
        </p>

        {/* Local Network Info Pill */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-sm font-normal">
            <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-500">Local LAN IP:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-indigo-300">
              {networkInfo?.primaryIp || 'Detecting...'}:{networkInfo?.port || 5000}
            </span>
          </div>

          <button
            onClick={onOpenQr}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-xs font-semibold transition shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Show QR Code</span>
          </button>
        </div>
      </div>

      {/* Primary Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Share / Sender Card */}
        <div 
          onClick={() => navigate('/send')}
          className="group rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden flex flex-col justify-between bg-white dark:bg-slate-900/70 shadow-sm"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition"></div>

          <div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-105 transition duration-300 shadow-sm">
              <UploadCloud className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 block">
              Sender Mode
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Share Files
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-6">
              Create a secure session with your name, group name, and a 4-digit code. Drag & drop files of any format to beam across your Wi-Fi network.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 mb-8 font-normal">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Enter Sender Name & Group Name</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Generate or customize your 4-digit PIN</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Real-time notifications when receivers connect</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition">
            <span>Start Sharing Files</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
          </button>
        </div>

        {/* Receive Card */}
        <div 
          onClick={() => navigate('/receive')}
          className="group rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden flex flex-col justify-between bg-white dark:bg-slate-900/70 shadow-sm"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition"></div>

          <div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-105 transition duration-300 shadow-sm">
              <DownloadCloud className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 block">
              Receiver Mode
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Receive Files
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-6">
              Enter the 4-digit code provided by the sender. Inspect files, preview media, and choose to download individual files or all as a ZIP package.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 mb-8 font-normal">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Fast 4-digit PIN verification</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>No auto-downloads — complete user control</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                <span>Download All (ZIP) + Individual file downloads</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition">
            <span>Receive with 4-Digit Code</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
          </button>
        </div>
      </div>

      {/* Feature Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Full Gigabit LAN Speed</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-normal">Direct local router transfer without going out to slow external cloud servers.</p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Secure 4-Digit PIN</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-normal">Only devices entering the exact 4-digit code can access the shared files.</p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Manual Download Control</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-normal">Files never auto-download. Preview first, then download single files or all at once.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
