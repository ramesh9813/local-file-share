import { getApiBaseUrl } from './apiClient';

const ACTIVE_SESSIONS_KEY = 'localshare_active_sessions';
const LEGACY_SINGLE_KEY = 'localshare_active_session';
const DOWNLOAD_ACTIVITY_KEY_PREFIX = 'localshare_downloads_';

// Retrieve all active sharing sessions
export function getAllSavedSessions() {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSIONS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
    // Fallback: migrate legacy single active session if present
    const legacy = localStorage.getItem(LEGACY_SINGLE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed && parsed.code) {
        localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify([parsed]));
        localStorage.removeItem(LEGACY_SINGLE_KEY);
        return [parsed];
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

// Save or update an active session in the multi-session list
export function saveOrUpdateSession(sessionData) {
  if (!sessionData || !sessionData.code) return;
  try {
    const sessions = getAllSavedSessions();
    const index = sessions.findIndex(s => s.code === sessionData.code);
    const payload = {
      code: sessionData.code,
      groupName: sessionData.groupName || 'Shared Files',
      senderName: sessionData.senderName || 'Anonymous Sender',
      files: sessionData.files || [],
      createdAt: sessionData.createdAt || new Date().toISOString()
    };

    if (index >= 0) {
      sessions[index] = { ...sessions[index], ...payload };
    } else {
      sessions.unshift(payload);
    }

    localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event('sessions_updated'));
  } catch (e) {
    console.warn('Failed to save session to localStorage:', e);
  }
}

// Remove an active session from local storage
export function removeSavedSession(code) {
  if (!code) return;
  try {
    const sessions = getAllSavedSessions().filter(s => s.code !== code);
    localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.removeItem(`${DOWNLOAD_ACTIVITY_KEY_PREFIX}${code}`);
    window.dispatchEvent(new Event('sessions_updated'));
  } catch (e) {}
}

// Close session on the server via DELETE API
export async function closeSessionOnServer(code) {
  if (!code) return;
  try {
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/api/room/${code}`, {
      method: 'DELETE'
    });
  } catch (e) {
    console.warn('Failed to close room on server:', e);
  }
}

// Save download activity for a specific session code
export function saveDownloadRecord(code, record) {
  if (!code || !record) return;
  try {
    const key = `${DOWNLOAD_ACTIVITY_KEY_PREFIX}${code}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}
}

// Get saved download records for a session code
export function getSavedDownloads(code) {
  if (!code) return [];
  try {
    const key = `${DOWNLOAD_ACTIVITY_KEY_PREFIX}${code}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
