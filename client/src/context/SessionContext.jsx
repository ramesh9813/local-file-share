import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  getAllSavedSessions, 
  saveOrUpdateSession, 
  removeSavedSession, 
  closeSessionOnServer 
} from '../utils/sessionStorage';
import { safeFetchJson } from '../utils/apiClient';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState(() => getAllSavedSessions());
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [selectedCode, setSelectedCode] = useState(() => {
    const list = getAllSavedSessions();
    return list.length > 0 ? list[0].code : null;
  });

  // Verify connection status of this device's own sessions with the server
  const checkSessionStatus = useCallback(async () => {
    const current = getAllSavedSessions();
    if (current.length === 0) {
      setSessionStatuses({});
      return;
    }

    const statuses = {};
    for (const s of current) {
      try {
        const res = await safeFetchJson(`/api/room/${s.code}`);
        statuses[s.code] = !!(res && res.success && res.exists);
      } catch {
        statuses[s.code] = false;
      }
    }
    setSessionStatuses(statuses);
  }, []);

  useEffect(() => {
    checkSessionStatus();
    const interval = setInterval(checkSessionStatus, 8000);
    return () => clearInterval(interval);
  }, [checkSessionStatus]);

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
      checkSessionStatus();
    };

    window.addEventListener('sessions_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sessions_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [checkSessionStatus]);

  const addSession = (session) => {
    saveOrUpdateSession(session);
    setSessions(getAllSavedSessions());
    setSelectedCode(session.code);
    checkSessionStatus();
  };

  const updateSession = (code, updatedData) => {
    const current = sessions.find(s => s.code === code);
    if (current) {
      const merged = { ...current, ...updatedData };
      saveOrUpdateSession(merged);
      setSessions(getAllSavedSessions());
      checkSessionStatus();
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
    checkSessionStatus();
  };

  // Only sessions created on this device (never leak PIN to other devices)
  const myActiveSessions = sessions.map(s => ({
    ...s,
    connected: sessionStatuses[s.code] !== false,
    isOwner: true
  }));

  return (
    <SessionContext.Provider
      value={{
        sessions: myActiveSessions,
        allActiveSessions: myActiveSessions,
        selectedCode,
        setSelectedCode,
        addSession,
        updateSession,
        closeSession,
        refreshActiveSessions: checkSessionStatus,
        activeSessionCount: myActiveSessions.length
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
