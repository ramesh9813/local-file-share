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
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [selectedCode, setSelectedCode] = useState(() => {
    const list = getAllSavedSessions();
    return list.length > 0 ? list[0].code : null;
  });

  // Fetch public active sessions from server (session name & sender, NO PIN)
  const refreshPublicSessions = useCallback(async () => {
    try {
      const data = await safeFetchJson('/api/active-sessions');
      if (data && data.success && Array.isArray(data.sessions)) {
        setNetworkSessions(data.sessions);
      }
    } catch (err) {
      console.warn('Failed to fetch public active sessions:', err.message);
    }
  }, []);

  // Listen for real-time socket public_active_sessions updates
  useEffect(() => {
    refreshPublicSessions();

    const socket = getSocket();
    const handlePublicUpdate = (list) => {
      if (Array.isArray(list)) {
        setNetworkSessions(list);
      }
    };

    if (socket) {
      socket.on('public_active_sessions', handlePublicUpdate);
      socket.emit('get_public_active_sessions');
    }

    const interval = setInterval(refreshPublicSessions, 7000);

    return () => {
      if (socket) {
        socket.off('public_active_sessions', handlePublicUpdate);
      }
      clearInterval(interval);
    };
  }, [refreshPublicSessions]);

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
      refreshPublicSessions();
    };

    window.addEventListener('sessions_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sessions_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [checkSessionStatus, refreshPublicSessions]);

  const addSession = (session) => {
    saveOrUpdateSession(session);
    setSessions(getAllSavedSessions());
    setSelectedCode(session.code);
    checkSessionStatus();
    refreshPublicSessions();
  };

  const updateSession = (code, updatedData) => {
    const current = sessions.find(s => s.code === code);
    if (current) {
      const merged = { ...current, ...updatedData };
      saveOrUpdateSession(merged);
      setSessions(getAllSavedSessions());
      checkSessionStatus();
      refreshPublicSessions();
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
    refreshPublicSessions();
  };

  // Track sessions that this receiver has successfully unlocked with the correct PIN
  const [unlockedSessions, setUnlockedSessions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('localshare_unlocked_sessions') || '[]');
    } catch {
      return [];
    }
  });

  const markSessionUnlocked = useCallback((room) => {
    if (!room) return;
    setUnlockedSessions(prev => {
      const exists = prev.some(u => 
        (u.sessionId && room.sessionId && u.sessionId === room.sessionId) ||
        (u.groupName && room.groupName && u.groupName === room.groupName) ||
        (u.code && room.code && u.code === room.code)
      );
      if (exists) return prev;
      const next = [...prev, {
        code: room.code,
        groupName: room.groupName,
        sessionId: room.sessionId,
        senderName: room.senderName,
        unlockedAt: Date.now()
      }];
      try {
        localStorage.setItem('localshare_unlocked_sessions', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearUnlockedSession = useCallback((identifier) => {
    setUnlockedSessions(prev => {
      const next = prev.filter(u => u.code !== identifier && u.sessionId !== identifier && u.groupName !== identifier);
      try {
        localStorage.setItem('localshare_unlocked_sessions', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Build combined list for UI:
  // 1. Own sessions created on this device (shows PIN with copy button)
  // 2. Network sessions from other devices (shows Session Name & Sender, HIDES PIN)
  const ownGroupNames = new Set(sessions.map(s => s.groupName));

  const allActiveSessions = [
    // My own sessions
    ...sessions.map(s => ({
      ...s,
      isOwner: true,
      connected: sessionStatuses[s.code] !== false,
      pinProtected: false,
      isReceiverConnected: false
    })),
    // Network sessions from other devices (PIN is hidden!)
    ...networkSessions
      .filter(ns => !ownGroupNames.has(ns.groupName))
      .map(ns => {
        const matchingUnlocked = unlockedSessions.find(u => 
          (u.sessionId && ns.sessionId && u.sessionId === ns.sessionId) ||
          (u.groupName && ns.groupName && u.groupName === ns.groupName)
        );
        const isReceiverConnected = !!matchingUnlocked;

        return {
          sessionId: ns.sessionId,
          groupName: ns.groupName,
          senderName: ns.senderName,
          fileCount: ns.fileCount,
          totalSize: ns.totalSize,
          // If receiver already entered correct PIN: connected: true! Otherwise connected: false until PIN is entered
          connected: isReceiverConnected,
          isOwner: false,
          code: matchingUnlocked ? matchingUnlocked.code : null, // only available if unlocked
          pinProtected: !isReceiverConnected,
          isReceiverConnected
        };
      })
  ];

  return (
    <SessionContext.Provider
      value={{
        sessions: allActiveSessions.filter(s => s.isOwner),
        allActiveSessions,
        networkSessions: allActiveSessions.filter(s => !s.isOwner),
        selectedCode,
        setSelectedCode,
        addSession,
        updateSession,
        closeSession,
        markSessionUnlocked,
        clearUnlockedSession,
        unlockedSessions,
        refreshActiveSessions: () => {
          checkSessionStatus();
          refreshPublicSessions();
        },
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
