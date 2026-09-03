import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  getAllSavedSessions, 
  saveOrUpdateSession, 
  removeSavedSession, 
  closeSessionOnServer 
} from '../utils/sessionStorage';
import { safeFetchJson } from '../utils/apiClient';
import { getSocket } from '../utils/socket';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState(() => getAllSavedSessions());
  const [networkSessions, setNetworkSessions] = useState([]);
  const [selectedCode, setSelectedCode] = useState(() => {
    const list = getAllSavedSessions();
    return list.length > 0 ? list[0].code : null;
  });

  // Fetch active sessions from server endpoint
  const refreshActiveSessions = useCallback(async () => {
    try {
      const data = await safeFetchJson('/api/active-sessions');
      if (data && data.success && Array.isArray(data.sessions)) {
        setNetworkSessions(data.sessions);
      }
    } catch (err) {
      console.warn('Could not fetch active sessions from server:', err);
    }
  }, []);

  // Listen to Socket.IO active_sessions_update and refresh on connect
  useEffect(() => {
    refreshActiveSessions();

    const socket = getSocket();
    const handleSessionsUpdate = (list) => {
      if (Array.isArray(list)) {
        setNetworkSessions(list);
      }
    };

    if (socket) {
      socket.on('active_sessions_update', handleSessionsUpdate);
      socket.emit('get_active_sessions');
    }

    const interval = setInterval(refreshActiveSessions, 6000);

    return () => {
      if (socket) {
        socket.off('active_sessions_update', handleSessionsUpdate);
      }
      clearInterval(interval);
    };
  }, [refreshActiveSessions]);

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
      refreshActiveSessions();
    };

    window.addEventListener('sessions_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sessions_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshActiveSessions]);

  const addSession = (session) => {
    saveOrUpdateSession(session);
    setSessions(getAllSavedSessions());
    setSelectedCode(session.code);
    refreshActiveSessions();
  };

  const updateSession = (code, updatedData) => {
    const current = sessions.find(s => s.code === code);
    if (current) {
      const merged = { ...current, ...updatedData };
      saveOrUpdateSession(merged);
      setSessions(getAllSavedSessions());
      refreshActiveSessions();
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
    refreshActiveSessions();
  };

  // Build unified active sessions list with connected: true (green) or connected: false (red)
  const networkCodesSet = new Set(networkSessions.map(ns => ns.code));

  // Combine network sessions (definitely connected) with local sessions
  const combinedMap = new Map();

  // 1. First add all verified network sessions (status: connected = true)
  for (const ns of networkSessions) {
    const localMatch = sessions.find(s => s.code === ns.code);
    combinedMap.set(ns.code, {
      code: ns.code,
      groupName: ns.groupName,
      senderName: ns.senderName || localMatch?.senderName || 'Anonymous Sender',
      files: localMatch?.files || [],
      fileCount: ns.fileCount || localMatch?.files?.length || 0,
      totalSize: ns.totalSize || (localMatch?.files ? localMatch.files.reduce((a, f) => a + (f.size || 0), 0) : 0),
      receiversCount: ns.receiversCount || 0,
      connected: true, // GREEN: verified live session
      isOwner: !!localMatch
    });
  }

  // 2. Then add local sessions that might not yet be or are no longer on server (status: connected = false)
  for (const s of sessions) {
    if (!combinedMap.has(s.code)) {
      const totalSize = s.files ? s.files.reduce((a, f) => a + (f.size || 0), 0) : 0;
      combinedMap.set(s.code, {
        code: s.code,
        groupName: s.groupName,
        senderName: s.senderName || 'Anonymous Sender',
        files: s.files || [],
        fileCount: s.files ? s.files.length : 0,
        totalSize,
        receiversCount: 0,
        connected: false, // RED: disconnected / local session not active on server
        isOwner: true
      });
    }
  }

  const allActiveSessions = Array.from(combinedMap.values());

  return (
    <SessionContext.Provider
      value={{
        sessions,
        networkSessions,
        allActiveSessions,
        selectedCode,
        setSelectedCode,
        addSession,
        updateSession,
        closeSession,
        refreshActiveSessions,
        activeSessionCount: allActiveSessions.length
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
