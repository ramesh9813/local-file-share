import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getAllSavedSessions, 
  saveOrUpdateSession, 
  removeSavedSession, 
  closeSessionOnServer 
} from '../utils/sessionStorage';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState(() => getAllSavedSessions());
  const [selectedCode, setSelectedCode] = useState(() => {
    const list = getAllSavedSessions();
    return list.length > 0 ? list[0].code : null;
  });

  // Keep synced with localStorage & external events
  useEffect(() => {
    const handleUpdate = () => {
      const updated = getAllSavedSessions();
      setSessions(updated);
      setSelectedCode(prev => {
        if (!prev) return updated.length > 0 ? updated[0].code : null;
        if (!updated.some(s => s.code === prev)) {
          return updated.length > 0 ? updated[0].code : null;
        }
        return prev;
      });
    };

    window.addEventListener('sessions_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sessions_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addSession = (session) => {
    saveOrUpdateSession(session);
    setSessions(getAllSavedSessions());
    setSelectedCode(session.code);
  };

  const updateSession = (code, updatedData) => {
    const current = sessions.find(s => s.code === code);
    if (current) {
      const merged = { ...current, ...updatedData };
      saveOrUpdateSession(merged);
      setSessions(getAllSavedSessions());
    }
  };

  const closeSession = async (code) => {
    if (!code) return;
    await closeSessionOnServer(code);
    removeSavedSession(code);
    const updated = getAllSavedSessions();
    setSessions(updated);
    if (selectedCode === code) {
      setSelectedCode(updated.length > 0 ? updated[0].code : null);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        sessions,
        selectedCode,
        setSelectedCode,
        addSession,
        updateSession,
        closeSession,
        activeSessionCount: sessions.length
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessions() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessions must be used within a SessionProvider');
  }
  return context;
}
