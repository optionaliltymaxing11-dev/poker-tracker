/**
 * Google Drive backup service using Google Identity Services (GIS).
 *
 * Uses `google.accounts.oauth2.initTokenClient` for client-side OAuth.
 * Only accesses files the app creates (drive.file scope).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Global type declarations for GIS & gapi ──────────────────────────

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
            error_callback?: (err: { type: string }) => void;
          }): { requestAccessToken(opts?: { prompt?: string }): void };
        };
      };
    };
  }
}

// ── Constants ────────────────────────────────────────────────────────

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const LS_CLIENT_ID = 'google-client-id';
const LS_CONNECTED_EMAIL = 'google-drive-email';
const LS_AUTO_BACKUP = 'google-drive-auto-backup';
const LS_LAST_BACKUP = 'lastBackupTime';

const ROOT_FOLDER_NAME = 'Poker Tracker Backups';
const DAILY_FOLDER_NAME = 'daily';
const MONTHLY_FOLDER_NAME = 'monthly';

// ── Token state (in-memory only) ─────────────────────────────────────

let accessToken: string | null = null;

// ── Script loader ────────────────────────────────────────────────────

let gisLoaded: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisLoaded;
}

// ── Public helpers ───────────────────────────────────────────────────

export function getClientId(): string | null {
  return localStorage.getItem(LS_CLIENT_ID);
}

export function setClientId(id: string): void {
  localStorage.setItem(LS_CLIENT_ID, id.trim());
}

export function removeClientId(): void {
  localStorage.removeItem(LS_CLIENT_ID);
}

export function getConnectedEmail(): string | null {
  return localStorage.getItem(LS_CONNECTED_EMAIL);
}

export function isConnected(): boolean {
  return !!accessToken;
}

export function getAutoBackupEnabled(): boolean {
  const v = localStorage.getItem(LS_AUTO_BACKUP);
  return v === null ? true : v === '1'; // default on
}

export function setAutoBackupEnabled(on: boolean): void {
  localStorage.setItem(LS_AUTO_BACKUP, on ? '1' : '0');
}

export function getLastBackupTime(): number | null {
  const v = localStorage.getItem(LS_LAST_BACKUP);
  return v ? Number(v) : null;
}

export function setLastBackupTime(ts: number): void {
  localStorage.setItem(LS_LAST_BACKUP, String(ts));
}

export function disconnect(): void {
  accessToken = null;
  localStorage.removeItem(LS_CONNECTED_EMAIL);
  localStorage.removeItem(LS_AUTO_BACKUP);
  localStorage.removeItem(LS_LAST_BACKUP);
}

// ── OAuth ────────────────────────────────────────────────────────────

export async function authorize(): Promise<string> {
  const clientId = getClientId();
  if (!clientId) throw new Error('Google Client ID not configured');

  await loadGisScript();

  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        accessToken = resp.access_token!;
        // Fetch user email
        fetchEmail().then((email) => {
          if (email) localStorage.setItem(LS_CONNECTED_EMAIL, email);
        }).catch(() => { /* ignore */ });
        resolve(accessToken);
      },
      error_callback: (err) => reject(new Error(err.type)),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

/** Re-authorize silently if possible, otherwise prompt */
async function ensureToken(): Promise<string> {
  if (accessToken) {
    // Quick check - try a lightweight call
    try {
      const r = await fetch(`${DRIVE_API}/about?fields=user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) return accessToken;
    } catch { /* token expired */ }
  }
  return authorize();
}

async function fetchEmail(): Promise<string | null> {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.email ?? null;
  } catch {
    return null;
  }
}

// ── Drive helpers ────────────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  mimeType?: string;
}

async function driveGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const token = await ensureToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${DRIVE_API}${path}${qs ? '?' + qs : ''}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Drive API ${r.status}: ${await r.text()}`);
  return r.json();
}

async function driveDelete(fileId: string): Promise<void> {
  const token = await ensureToken();
  const r = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok && r.status !== 404) throw new Error(`Drive delete ${r.status}`);
}

// ── Folder management ────────────────────────────────────────────────

async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const token = await ensureToken();
  const parentQ = parentId ? ` and '${parentId}' in parents` : '';
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentQ}`;

  const list = await driveGet('/files', { q, fields: 'files(id)', pageSize: '1' });
  if (list.files?.length) return list.files[0].id;

  // Create it
  const meta: any = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];

  const r = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meta),
  });
  if (!r.ok) throw new Error(`Create folder ${r.status}: ${await r.text()}`);
  const created = await r.json();
  return created.id;
}

async function getFolderIds(): Promise<{ root: string; daily: string; monthly: string }> {
  const root = await findOrCreateFolder(ROOT_FOLDER_NAME);
  const daily = await findOrCreateFolder(DAILY_FOLDER_NAME, root);
  const monthly = await findOrCreateFolder(MONTHLY_FOLDER_NAME, root);
  return { root, daily, monthly };
}

// ── File operations ──────────────────────────────────────────────────

async function uploadFile(
  name: string,
  folderId: string,
  content: string,
  existingFileId?: string
): Promise<DriveFile> {
  const token = await ensureToken();
  const metadata: any = { name, mimeType: 'application/json' };
  if (!existingFileId) metadata.parents = [folderId];

  const boundary = '----BackupBoundary' + Date.now();
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const url = existingFileId
    ? `${DRIVE_UPLOAD}/files/${existingFileId}?uploadType=multipart&fields=id,name,size,createdTime,modifiedTime`
    : `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,size,createdTime,modifiedTime`;

  const r = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!r.ok) throw new Error(`Upload ${r.status}: ${await r.text()}`);
  return r.json();
}

async function listFiles(folderId: string): Promise<DriveFile[]> {
  const data = await driveGet('/files', {
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,size,createdTime,modifiedTime)',
    orderBy: 'name desc',
    pageSize: '100',
  });
  return data.files ?? [];
}

export async function downloadFile(fileId: string): Promise<string> {
  const token = await ensureToken();
  const r = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Download ${r.status}`);
  return r.text();
}

// ── Public backup operations ─────────────────────────────────────────

export interface BackupFileInfo {
  id: string;
  name: string;
  size: string;
  date: string;
  folder: 'daily' | 'monthly';
}

export async function listAllBackups(): Promise<BackupFileInfo[]> {
  const folders = await getFolderIds();
  const [dailyFiles, monthlyFiles] = await Promise.all([
    listFiles(folders.daily),
    listFiles(folders.monthly),
  ]);

  const toInfo = (f: DriveFile, folder: 'daily' | 'monthly'): BackupFileInfo => ({
    id: f.id,
    name: f.name,
    size: f.size ?? '0',
    date: f.modifiedTime ?? f.createdTime ?? '',
    folder,
  });

  return [
    ...dailyFiles.map((f) => toInfo(f, 'daily')),
    ...monthlyFiles.map((f) => toInfo(f, 'monthly')),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export async function performBackup(jsonContent: string): Promise<void> {
  const folders = await getFolderIds();
  const today = new Date().toISOString().slice(0, 10);
  const fileName = `backup-${today}.json`;

  // Check if today's daily backup already exists
  const dailyFiles = await listFiles(folders.daily);
  const existing = dailyFiles.find((f) => f.name === fileName);

  await uploadFile(fileName, folders.daily, jsonContent, existing?.id);

  // Monthly snapshot on 1st of month
  const dayOfMonth = new Date().getDate();
  if (dayOfMonth === 1) {
    const monthlyName = `backup-${today}.json`;
    const monthlyFiles = await listFiles(folders.monthly);
    const monthlyExists = monthlyFiles.find((f) => f.name === monthlyName);
    if (!monthlyExists) {
      await uploadFile(monthlyName, folders.monthly, jsonContent);
    }
  }

  // Cleanup: keep last 7 daily backups
  const sortedDaily = dailyFiles
    .filter((f) => f.name !== fileName)
    .sort((a, b) => (b.name > a.name ? 1 : -1));

  // We have (existing ones minus today) + today's new one = total
  // Keep last 7 including today's, so delete anything beyond index 6 of the old ones
  const toDelete = sortedDaily.slice(6);
  for (const f of toDelete) {
    await driveDelete(f.id);
  }

  setLastBackupTime(Date.now());
}

export async function deleteBackupFile(fileId: string): Promise<void> {
  await driveDelete(fileId);
}
