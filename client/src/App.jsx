import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  AlertCircle, CheckCircle, Info 
} from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import SenderView from './components/SenderView';
import ReceiverView from './components/ReceiverView';
import QrModal from './components/QrModal';
import { ThemeProvider } from './context/ThemeContext';
import { SessionProvider } from './context/SessionContext';
import { getApiBaseUrl, safeFetchJson } from './utils/apiClient';

export default function App() {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Toast alert system
  const showToast = (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Fetch Local Network Information
  useEffect(() => {
    safeFetchJson('/api/network-info')
      .then(data => {
        if (data.success) {
          setNetworkInfo(data);
        }
      })
      .catch(err => {
        console.warn('Network info lookup:', err.message);
      });
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    const newSocket = io(baseUrl || undefined, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Connected to Socket server:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <SessionProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#080c14] dark:text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-indigo-600 selection:text-white relative transition-colors duration-200">
            {/* Header with React Router Navigation & Theme Switcher */}
            <Header 
              networkInfo={networkInfo} 
              onOpenQr={() => setIsQrOpen(true)} 
            />

          {/* Main Content Area Routed via React Router */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6">
            <Routes>
              <Route 
                path="/" 
                element={
                  <LandingPage 
                    networkInfo={networkInfo} 
                    onOpenQr={() => setIsQrOpen(true)} 
                  />
                } 
              />
              <Route 
                path="/send" 
                element={
                  <SenderView 
                    socket={socket} 
                    networkInfo={networkInfo} 
                    onOpenQr={() => setIsQrOpen(true)} 
                    showToast={showToast} 
                  />
                } 
              />
              <Route 
                path="/receive" 
                element={
                  <ReceiverView 
                    socket={socket} 
                    showToast={showToast} 
                  />
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Suitable Footer */}
          <Footer 
            networkInfo={networkInfo} 
            onOpenQr={() => setIsQrOpen(true)} 
          />

          {/* QR Code Modal with Instant Client-Side QR Generator */}
          <QrModal 
            isOpen={isQrOpen}
            onClose={() => setIsQrOpen(false)}
            networkInfo={networkInfo}
          />

          {/* Toast Alerts Container */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
            {toasts.map(t => (
              <div
                key={t.id}
                className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 animate-fadeIn transition-all"
              >
                {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                {t.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                {t.type === 'info' && <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                <span className="leading-snug">{t.message}</span>
              </div>
            ))}
          </div>
        </div>
      </SessionProvider>
    </BrowserRouter>
  </ThemeProvider>
  );
}
