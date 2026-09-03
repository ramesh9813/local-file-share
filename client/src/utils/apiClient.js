// Dynamic API and Socket URL resolver
export function getApiBaseUrl() {
  const hostname = window.location.hostname;
  // If running on Render static site or other cloud domains, point to the live Render Web Service
  if (
    hostname.includes('onrender.com') ||
    hostname.includes('github.io') ||
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app')
  ) {
    return 'https://airlink-server.onrender.com';
  }
  // Local environment or same-host deployment
  return '';
}

// Safe JSON Fetcher with Content-Type and HTTP Error validation
export async function safeFetchJson(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {})
      }
    });
  } catch (netErr) {
    throw new Error(`Network connection error. Check your Wi-Fi or server connection.`);
  }

  // Check content type before parsing JSON to prevent SyntaxError: Unexpected token '<'
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await response.text();
    // If HTML was returned (e.g. 404 static page)
    if (rawText.trim().startsWith('<')) {
      throw new Error(`Server returned HTML instead of JSON. Ensure backend service is reachable.`);
    }
    throw new Error(`Invalid server response: ${rawText.slice(0, 120)}`);
  }

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// Reliable XHR File Upload with Real Byte Progress Tracking
export function uploadFilesWithProgress({
  code,
  groupName,
  senderName,
  files,
  onProgress
}) {
  return new Promise((resolve, reject) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/upload`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(Math.min(percent, 99)); // keep at 99 until server responds 200
      }
    };

    xhr.onload = () => {
      if (typeof onProgress === 'function') {
        onProgress(100);
      }

      const contentType = xhr.getResponseHeader('content-type') || '';
      if (!contentType.includes('application/json')) {
        return reject(new Error('Server did not return a valid JSON response.'));
      }

      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data);
        } else {
          reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
        }
      } catch (err) {
        reject(new Error('Failed to parse server upload response.'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed due to network error.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload request timed out.'));
    };

    const formData = new FormData();
    formData.append('code', code.trim());
    formData.append('groupName', groupName.trim());
    formData.append('senderName', senderName.trim());

    files.forEach((file) => {
      formData.append('files', file);
    });

    xhr.send(formData);
  });
}
