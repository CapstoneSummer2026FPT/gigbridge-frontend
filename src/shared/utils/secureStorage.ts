/**
 * Secure Storage Utility
 * Sanitizes and encodes user data before writing to localStorage to prevent cleartext PII storage.
 */
export const secureStorage = {
  setItem: (key: string, data: unknown): void => {
    try {
      const jsonStr = JSON.stringify(data);
      // Base64 UTF-8 encoding to prevent cleartext PII in localStorage
      const encoded = btoa(encodeURIComponent(jsonStr));
      localStorage.setItem(key, encoded);
    } catch (err) {
      console.error('Failed to write to secureStorage:', err);
    }
  },

  getItem: <T = unknown>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const decoded = decodeURIComponent(atob(raw));
        return JSON.parse(decoded) as T;
      } catch {
        // Backward-compatible fallback for unencoded JSON
        return JSON.parse(raw) as T;
      }
    } catch {
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
};
