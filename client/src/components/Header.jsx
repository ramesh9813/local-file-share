import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  UploadCloud, DownloadCloud, Home, QrCode, Wifi, Menu, X, 
  Sun, Moon, Layers, Trash2, ExternalLink, PlusCircle, Copy, Check 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSessions } from '../context/SessionContext';
import { formatBytes } from '../utils/fileHelpers';

export default function Header({ networkInfo, onOpenQr }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionsDropdownOpen, setSessionsDropdownOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const { theme, toggleTheme, isDark } = useTheme();
  const { sessions, selectedCode, setSelectedCode, closeSession, activeSessionCount } = useSessions();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSessionsDropdownOpen(false);
      }
    };
    if (sessionsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sessionsDropdownOpen]);

  const navLinkClass = ({ isActive }) =>
    `px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
    }`;

  const handleOpenSession = (code) => {
    setSelectedCode(code);
    setSessionsDropdownOpen(false);
    navigate('/send');
  };

  const handleCreateNewGroup = () => {
    setSelectedCode(null);
    setSessionsDropdownOpen(false);
    navigate('/send');
  };

  const handleCopyPin = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCloseSessionClick = async (e, code, groupName) => {
    e.stopPropagation();
    if (window.confirm(`Close sharing session "${groupName}" (PIN ${code})? Connected receivers will be disconnected.`)) {
      await closeSession(code);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/90 px-4 sm:px-8 py-3 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl transition-colors duration-200 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <Link 
          to="/" 
          className="flex items-center gap-3 group transition"
          onClick={() => {
            setMobileMenuOpen(false);
            setSessionsDropdownOpen(false);
          }}
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

        {/* Right Actions: Active Sessions Dropdown, Theme Toggle, QR Code */}
        <div className="flex items-center gap-2">
          {/* USER REQUESTED: Active Sessions Dropdown Tab */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setSessionsDropdownOpen(prev => !prev)}
              aria-label="Active Sessions Dropdown"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                sessionsDropdownOpen || activeSessionCount > 0
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="View all active file sharing sessions"
            >
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Active Sessions</span>
              {activeSessionCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                  {activeSessionCount}
                </span>
              )}
            </button>

            {/* Active Sessions Dropdown Menu */}
            {sessionsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fadeIn text-left">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Active Sessions ({activeSessionCount})
                    </span>
                  </div>
                  <button
                    onClick={() => setSessionsDropdownOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto p-2 space-y-2">
                  {sessions.length === 0 ? (
                    <div className="text-center py-6 px-4 space-y-2 text-slate-500 dark:text-slate-400">
                      <Layers className="w-8 h-8 text-indigo-600/30 dark:text-indigo-400/40 mx-auto" />
                      <p className="text-xs font-semibold text-slate-800 dark:text-white">No Active Sessions</p>
                      <p className="text-[11px]">Start sharing files to create an active session.</p>
                      <button
                        onClick={handleCreateNewGroup}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-white" />
                        <span>Start New Group</span>
                      </button>
                    </div>
                  ) : (
                    sessions.map((s) => {
                      const totalBytes = s.files?.reduce((acc, f) => acc + (f.size || 0), 0) || 0;
                      const isSelected = selectedCode === s.code;

                      return (
                        <div
                          key={s.code}
                          onClick={() => handleOpenSession(s.code)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40'
                              : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {s.groupName}
                              </p>
                              {isSelected && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                              {s.files?.length || 0} files • {formatBytes(totalBytes)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* PIN Pill with Copy */}
                            <button
                              onClick={(e) => handleCopyPin(e, s.code)}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1"
                              title="Copy PIN code"
                            >
                              <span>{s.code}</span>
                              {copiedCode === s.code ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400" />
                              )}
                            </button>

                            {/* Close Session Button */}
                            <button
                              onClick={(e) => handleCloseSessionClick(e, s.code, s.groupName)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                              title="Close this sending session"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer: Create New Session */}
                {sessions.length > 0 && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={handleCreateNewGroup}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-white" />
                      <span>+ Create Another Group Session</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

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
