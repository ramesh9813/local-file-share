import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { UploadCloud, DownloadCloud, Home, QrCode, Wifi, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header({ networkInfo, onOpenQr }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();

  const navLinkClass = ({ isActive }) =>
    `px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/90 px-4 sm:px-8 py-3 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl transition-colors duration-200 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <Link 
          to="/" 
          className="flex items-center gap-3 group transition"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm group-hover:border-indigo-500 transition duration-300">
            <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400 -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                AirLink
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-mono">
                LAN
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal hidden sm:block">
              Local Peer-to-Peer File Sharing
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <NavLink to="/" end className={navLinkClass}>
            <Home className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Home</span>
          </NavLink>

          <NavLink to="/send" className={navLinkClass}>
            <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Share Files</span>
          </NavLink>

          <NavLink to="/receive" className={navLinkClass}>
            <DownloadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Receive Files</span>
          </NavLink>
        </nav>

        {/* Right Actions: Theme Toggle, Local IP, QR Code */}
        <div className="flex items-center gap-2">
          {/* Light / Night Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Light and Night Mode"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Night Mode'}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Local IP Pill */}
          {networkInfo && (
            <button
              onClick={onOpenQr}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-normal transition"
              title="Click to view network info and QR code"
            >
              <Wifi className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-slate-500">IP:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-indigo-300">
                {networkInfo.primaryIp}:{networkInfo.port || 5000}
              </span>
            </button>
          )}

          {/* QR Code Button */}
          <button
            onClick={onOpenQr}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-sm"
            title="Open QR Code for Mobile Connect"
          >
            <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">QR Code</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Menu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 animate-fadeIn">
          <NavLink
            to="/"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`
            }
          >
            <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/send"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`
            }
          >
            <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Share Files (Sender)</span>
          </NavLink>

          <NavLink
            to="/receive"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`
            }
          >
            <DownloadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Receive Files (Receiver)</span>
          </NavLink>
        </div>
      )}
    </header>
  );
}
