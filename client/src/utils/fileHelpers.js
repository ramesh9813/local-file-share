// Format bytes to human readable string
export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Generate a random 4-digit code (e.g. 4829)
export function generateFourDigitCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Get file category based on MIME type or extension
export function getFileCategory(name = '', mimeType = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    mimeType.startsWith('text/') ||
    ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'sh', 'xml', 'yaml', 'yml'].includes(ext)
  ) {
    return 'text';
  }
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'].includes(ext)) {
    return 'archive';
  }
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return 'document';
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return 'spreadsheet';
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return 'presentation';
  }

  return 'other';
}

// Check if file can be previewed in browser
export function isPreviewable(name = '', mimeType = '') {
  const category = getFileCategory(name, mimeType);
  return ['image', 'video', 'audio', 'pdf', 'text'].includes(category);
}
