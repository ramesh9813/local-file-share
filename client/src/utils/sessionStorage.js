const ACTIVE_SESSION_KEY = 'localshare_active_session';
const DOWNLOAD_ACTIVITY_KEY_PREFIX = 'localshare_downloads_';

// Save active sharing session to local storage
export function saveActiveSession(sessionData) {
  try {
    if (!sessionData) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return;
    }
    const payload = {
      code: sessionData.code,
      groupName: sessionData.groupName,
      senderName: sessionData.senderName,
      files: sessionData.files || [],
      createdAt: sessionData.createdAt || new Date().toISOString()
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save session to localStorage:', e);
  }
}

// Retrieve active session from local storage
export function getSavedActiveSession() {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Clear active session
export function clearSavedActiveSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (e) {}
}

// Save download record for a session
export function saveDownloadRecord(code, record) {
  if (!code || !record) return;
  try {
    const key = `${DOWNLOAD_ACTIVITY_KEY_PREFIX}${code}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    // prepend new record
    list.unshift(record);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}
}

// Get saved download records for a session
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
