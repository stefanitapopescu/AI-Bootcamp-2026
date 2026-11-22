/**
 * Small per-browser preferences (tour seen, theme / language overrides, favorites). Stored in localStorage, with a
 * first-party cookie as a fallback for browsers that block or wipe localStorage (some in-app browsers, strict
 * private modes). Nothing is sent anywhere: the cookie only travels to this site itself.
 */
const COOKIE_DAYS = 365;

function readCookie(key: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )upt_${key}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(key: string, value: string | null) {
  const expires = value === null ? 'Thu, 01 Jan 1970 00:00:00 GMT' : new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
  document.cookie = `upt_${key}=${encodeURIComponent(value ?? '')}; expires=${expires}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}

export function getPref(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    /* storage blocked: try the cookie */
  }
  try {
    return readCookie(key);
  } catch {
    return null;
  }
}

/** Save a preference; null removes it. */
export function setPref(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked */
  }
  try {
    writeCookie(key, value);
  } catch {
    /* cookies blocked too: it only lasts for this visit */
  }
}
