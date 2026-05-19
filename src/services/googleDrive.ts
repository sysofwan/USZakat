/**
 * Google Drive API service.
 * Handles file CRUD operations and Google Picker for folder selection.
 */
import { GOOGLE_API_KEY } from '../config/google';
import { getAccessToken } from './googleAuth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const PICKER_SCRIPT_URL = 'https://apis.google.com/js/api.js';

let pickerLoaded = false;

// ── Drive API helpers ────────────────────────────────────────

async function driveHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

/** List files matching a query */
export async function listFiles(query: string, spaces = 'drive'): Promise<DriveFile[]> {
  const headers = await driveHeaders();
  const params = new URLSearchParams({
    q: query,
    spaces,
    fields: 'files(id,name,modifiedTime,mimeType,size)',
    orderBy: 'modifiedTime desc',
  });
  const res = await fetch(`${DRIVE_API}/files?${params}`, { headers });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();
  return data.files || [];
}

/** Get file content as text */
export async function getFileContent(fileId: string): Promise<string> {
  const headers = await driveHeaders();
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers });
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
  return res.text();
}

/** Create or update a file in Drive */
export async function saveFile(options: {
  name: string;
  content: string | Blob;
  mimeType: string;
  folderId?: string;
  spaces?: string;
  fileId?: string; // if updating existing
}): Promise<string> {
  const { name, content, mimeType, folderId, spaces, fileId } = options;
  const headers = await driveHeaders();

  const metadata: Record<string, unknown> = { name, mimeType };
  if (folderId) metadata.parents = [folderId];
  if (spaces === 'appDataFolder') metadata.parents = ['appDataFolder'];

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', content instanceof Blob ? content : new Blob([content], { type: mimeType }));

  const url = fileId
    ? `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_API}/files?uploadType=multipart`;
  const method = fileId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { Authorization: (headers as Record<string, string>).Authorization },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive save failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

/** Delete a file */
export async function deleteFile(fileId: string): Promise<void> {
  const headers = await driveHeaders();
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, { method: 'DELETE', headers });
  if (!res.ok && res.status !== 404) throw new Error(`Drive delete failed: ${res.status}`);
}

// ── AppData folder helpers ────────────────────────────────────

const BACKUP_FILENAME = 'us-zakat-calculator-backup.json';

/** Find existing backup file in appDataFolder */
export async function findBackupFile(): Promise<DriveFile | null> {
  const files = await listFiles(`name='${BACKUP_FILENAME}'`, 'appDataFolder');
  return files.length > 0 ? files[0] : null;
}

/** Save portfolio JSON to appDataFolder */
export async function saveBackup(data: string): Promise<string> {
  const existing = await findBackupFile();
  return saveFile({
    name: BACKUP_FILENAME,
    content: data,
    mimeType: 'application/json',
    spaces: 'appDataFolder',
    fileId: existing?.id,
  });
}

/** Load portfolio JSON from appDataFolder */
export async function loadBackup(): Promise<{ content: string; modifiedTime: string } | null> {
  const file = await findBackupFile();
  if (!file) return null;
  const content = await getFileContent(file.id);
  return { content, modifiedTime: file.modifiedTime };
}

// ── Google Picker ────────────────────────────────────────────

function loadPickerScript(): Promise<void> {
  if (pickerLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${PICKER_SCRIPT_URL}"]`)) {
      pickerLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = PICKER_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      gapi.load('picker', () => {
        pickerLoaded = true;
        resolve();
      });
    };
    script.onerror = () => reject(new Error('Failed to load Google Picker'));
    document.head.appendChild(script);
  });
}

/** Open Google Picker to select a folder. Returns folder ID or null if cancelled. */
export async function pickFolder(): Promise<{ id: string; name: string } | null> {
  await loadPickerScript();
  const token = await getAccessToken();

  return new Promise((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder');

    const picker = new google.picker.PickerBuilder()
      .setAppId(GOOGLE_API_KEY.split('-')[0]) // Not needed for most cases
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_API_KEY)
      .addView(view)
      .setTitle('Select folder for Zakat reports')
      .setCallback((data: google.picker.ResponseObject) => {
        if (data.action === google.picker.Action.PICKED) {
          const folder = data.docs?.[0];
          resolve(folder ? { id: folder.id, name: folder.name ?? '' } : null);
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}

/** Save an Excel buffer to a Drive folder */
export async function saveExcelToDrive(
  buffer: ArrayBuffer,
  filename: string,
  folderId: string
): Promise<string> {
  return saveFile({
    name: filename,
    content: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    folderId,
  });
}

// ── Types ────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType: string;
  size?: string;
}
