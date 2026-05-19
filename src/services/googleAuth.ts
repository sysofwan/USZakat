/**
 * Google Identity Services (GIS) auth service.
 * Handles OAuth 2.0 token flow for Google Drive access.
 * 100% optional — app works without this.
 */
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../config/google';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const TOKEN_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';

type AuthCallback = (signedIn: boolean) => void;

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gisLoaded = false;
let pendingResolve: ((token: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;
const listeners: Set<AuthCallback> = new Set();

function notifyListeners(signedIn: boolean) {
  listeners.forEach((cb) => cb(signedIn));
}

/** Load the GIS script if not already loaded */
function loadGisScript(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)) {
      gisLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/** Initialize the token client (call after GIS loads) */
function initTokenClient() {
  if (tokenClient) return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: (response) => {
      if (response.error) {
        pendingReject?.(new Error(response.error_description || response.error));
        pendingResolve = null;
        pendingReject = null;
        return;
      }
      const token = response.access_token;
      const expiresIn = Number(response.expires_in) || 3600;
      const expiry = Date.now() + expiresIn * 1000;
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
      pendingResolve?.(token);
      pendingResolve = null;
      pendingReject = null;
      notifyListeners(true);
    },
  });
}

/** Get a valid access token, prompting sign-in if needed */
export async function getAccessToken(): Promise<string> {
  // Check for existing valid token
  const stored = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (stored && expiry && Date.now() < Number(expiry) - 60000) {
    return stored;
  }

  // Need to get a new token
  await loadGisScript();
  initTokenClient();

  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    tokenClient!.requestAccessToken({ prompt: stored ? '' : 'consent' });
  });
}

/** Sign in explicitly (shows consent if first time) */
export async function signIn(): Promise<string> {
  await loadGisScript();
  initTokenClient();

  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    tokenClient!.requestAccessToken({ prompt: '' });
  });
}

/** Sign out — revoke token and clear storage */
export function signOut() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    google.accounts.oauth2.revoke(token, () => {});
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  notifyListeners(false);
}

/** Check if user is currently signed in (has valid token) */
export function isSignedIn(): boolean {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  return !!(token && expiry && Date.now() < Number(expiry) - 60000);
}

/** Subscribe to auth state changes */
export function onAuthChange(callback: AuthCallback): () => void {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}
