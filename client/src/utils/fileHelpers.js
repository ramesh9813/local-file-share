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

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif', 'heic'].includes(ext)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', '3gp'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus'].includes(ext)) {
    return 'audio';
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  
  const textExtensions = [
    'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 
    'h', 'hpp', 'cs', 'go', 'rs', 'php', 'rb', 'sql', 'sh', 'bash', 'zsh', 'yaml', 'yml', 'xml', 'log', 
    'ini', 'conf', 'config', 'env', 'toml', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'vue', 'svelte',
    'dockerfile', 'makefile', 'graphql', 'proto', 'properties', 'rst', 'tex'
  ];
  if (mimeType.startsWith('text/') || textExtensions.includes(ext)) {
    return 'text';
  }

  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return 'document';
  }
  if (['xls', 'xlsx', 'ods'].includes(ext)) {
    return 'spreadsheet';
  }
  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return 'presentation';
  }
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'].includes(ext)) {
    return 'archive';
  }

  return 'binary';
}

// USER REQUEST: Whatever file extension, ALWAYS allow preview!
export function isPreviewable(name = '', mimeType = '') {
  return true;
}
