import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Section from '../components/Section';
import { useTheme } from '../ThemeContext';
import { themes, getAccentColor } from '../themes';
import { db } from '../db/schema';
import { importSQLiteDatabase } from '../db/import';
import {
  createBackupData,
  restoreBackupData,
  downloadBackupFile,
  getDbStats,
  type BackupData,
} from '../services/backupData';
import {
  getConnectedEmail,
  isConnected,
  authorize,
  disconnect,
  getAutoBackupEnabled,
  setAutoBackupEnabled,
  getLastBackupTime,
  performBackup,
  listAllBackups,
  downloadFile,
  deleteBackupFile,
  type BackupFileInfo,
} from '../services/googleDrive';

// ── Theme Picker (unchanged) ────────────────────────────────────────

function ThemePicker() {
  const { theme: activeTheme, setTheme } = useTheme();

  const categories = [
    { label: 'Light', themes: themes.filter(t => t.category === 'light') },
    { label: 'Dark', themes: themes.filter(t => t.category === 'dark') },
    { label: 'Cypherpunk', themes: themes.filter(t => t.category === 'cypherpunk') },
  ];

  return (
    <div className="space-y-4">
      {categories.map(cat => (
        <div key={cat.label}>
          <div className="text-xs font-semibold text-theme-secondary uppercase tracking-wide mb-2">
            {cat.label}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {cat.themes.map(t => {
              const isActive = t.id === activeTheme.id;
              const accent = getAccentColor(t);
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors ${
                    isActive ? 'border-accent' : 'border-transparent'
                  }`}
                  style={{ borderColor: isActive ? accent : 'transparent' }}
                >
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden border"
                    style={{ borderColor: t.colors.border }}
                  >
                    <div
                      className="h-1/3"
                      style={{ backgroundColor: t.category === 'light' ? t.colors.primary : accent }}
                    />
                    <div
                      className="h-2/3 flex items-center justify-center"
                      style={{ backgroundColor: t.colors.bg }}
                    >
                      <div
                        className="w-4 h-2 rounded-sm"
                        style={{ backgroundColor: accent }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-medium text-center leading-tight"
                    style={{ color: isActive ? accent : undefined }}
                  >
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Backup Section ──────────────────────────────────────────────────

function BackupSection() {
  // Google Drive state
  const [connected, setConnected] = useState(isConnected());
  const [connectedEmail, setConnectedEmail] = useState(getConnectedEmail());
  const [autoBackup, setAutoBackup] = useState(getAutoBackupEnabled());
  const [lastBackup, setLastBackup] = useState(getLastBackupTime());

  // UI state
  const [backingUp, setBackingUp] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Local backup state
  const [dbStats, setDbStats] = useState<{ sessions: number; locations: number; games: number; notes: number } | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Restore confirmation
  const [confirmRestore, setConfirmRestore] = useState<{
    source: 'drive' | 'file';
    data?: BackupData;
    fileInfo?: BackupFileInfo;
    sessionCount?: number;
  } | null>(null);

  // Status messages
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getDbStats().then(setDbStats);
  }, []);

  const showStatus = useCallback((type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  }, []);

  // ── Google Drive: Connect ──

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await authorize();
      setConnected(true);
      setConnectedEmail(getConnectedEmail());
      showStatus('success', 'Connected to Google Drive');
    } catch (err) {
      showStatus('error', `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setConnected(false);
    setConnectedEmail(null);
    setLastBackup(null);
    setBackups([]);
    showStatus('success', 'Disconnected from Google Drive');
  };

  // ── Google Drive: Backup ──

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const data = await createBackupData();
      const json = JSON.stringify(data);
      await performBackup(json);
      setLastBackup(getLastBackupTime());
      showStatus('success', 'Backup completed successfully');
    } catch (err) {
      showStatus('error', `Backup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBackingUp(false);
    }
  };

  // ── Google Drive: View Backups ──

  const handleToggleBackups = async () => {
    if (showBackups) {
      setShowBackups(false);
      return;
    }
    setLoadingBackups(true);
    setShowBackups(true);
    try {
      const files = await listAllBackups();
      setBackups(files);
    } catch (err) {
      showStatus('error', `Failed to list backups: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingBackups(false);
    }
  };

  // ── Google Drive: Restore from Drive ──

  const handleRestoreFromDrive = async (file: BackupFileInfo) => {
    try {
      const content = await downloadFile(file.id);
      const data = JSON.parse(content) as BackupData;
      setConfirmRestore({
        source: 'drive',
        data,
        fileInfo: file,
        sessionCount: data.sessions?.length ?? 0,
      });
    } catch (err) {
      showStatus('error', `Failed to download: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // ── Google Drive: Delete backup ──

  const handleDeleteBackup = async (file: BackupFileInfo) => {
    if (!window.confirm(`Delete ${file.name}?`)) return;
    try {
      await deleteBackupFile(file.id);
      setBackups((prev) => prev.filter((b) => b.id !== file.id));
      showStatus('success', 'Backup deleted');
    } catch (err) {
      showStatus('error', `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // ── Local: Download ──

  const handleLocalDownload = async () => {
    const data = await createBackupData();
    downloadBackupFile(data);
  };

  // ── Local: Restore from file ──

  const handleRestoreFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      setConfirmRestore({
        source: 'file',
        data,
        sessionCount: data.sessions?.length ?? 0,
      });
    } catch {
      showStatus('error', 'Invalid backup file');
    }
    e.target.value = '';
  };

  // ── Restore confirm ──

  const handleConfirmRestore = async () => {
    if (!confirmRestore?.data) return;
    setRestoring(true);
    try {
      await restoreBackupData(confirmRestore.data);
      setConfirmRestore(null);
      showStatus('success', 'Restore complete — reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showStatus('error', `Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setRestoring(false);
    }
  };

  // ── Auto-backup toggle ──

  const handleAutoBackupToggle = () => {
    const next = !autoBackup;
    setAutoBackupEnabled(next);
    setAutoBackup(next);
  };

  // ── Helpers ──

  const formatSize = (bytes: string) => {
    const n = Number(bytes);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Status Message */}
      {statusMsg && (
        <div
          className={`p-3 rounded text-sm font-medium ${
            statusMsg.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-theme rounded-lg p-5 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-theme">Restore Backup?</h3>
            <p className="text-sm text-theme-secondary">
              This will <strong className="text-red-400">replace ALL current data</strong> with the backup.
            </p>
            {confirmRestore.fileInfo && (
              <div className="text-xs text-theme-secondary bg-hover rounded p-2">
                <p><strong>File:</strong> {confirmRestore.fileInfo.name}</p>
                <p><strong>Date:</strong> {formatDate(confirmRestore.fileInfo.date)}</p>
              </div>
            )}
            <p className="text-sm text-theme-secondary">
              Sessions in backup: <strong className="text-theme">{confirmRestore.sessionCount ?? 0}</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRestore(null)}
                className="flex-1 py-2 rounded font-semibold bg-hover text-theme border border-theme"
                disabled={restoring}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="flex-1 py-2 rounded font-semibold bg-red-600 text-white"
              >
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Google Drive ── */}
      <div>
        <h3 className="font-semibold text-theme mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.71 3.5L1.15 15l3.43 6 6.56-12.5L7.71 3.5zm1.14 0l6.56 12.5H22l-6.56-12.5H8.85zm6.14 13.5H1.57l3.43 6H18.43l-3.43-6z" opacity="0.8" />
          </svg>
          Google Drive Backup
        </h3>

        {!connected ? (
          /* Not connected - show sign in button */
          <div className="space-y-3">
            <p className="text-sm text-theme-secondary">
              Back up your data automatically to your Google Drive account.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-teal text-white py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {connecting ? 'Connecting...' : 'Sign in with Google'}
            </button>
          </div>
        ) : (
          /* Connected */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-theme-secondary">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1.5" />
                Connected{connectedEmail ? ` as ${connectedEmail}` : ''}
              </div>
              <button onClick={handleDisconnect} className="text-xs text-red-400 underline">
                Disconnect
              </button>
            </div>

            <div className="text-xs text-theme-secondary">
              Last backup: {formatTimestamp(lastBackup)}
            </div>

            {/* Auto-backup toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-theme">Auto-backup daily</span>
              <button
                onClick={handleAutoBackupToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoBackup ? 'bg-teal' : 'bg-hover border border-theme'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    autoBackup ? 'left-5.5' : 'left-0.5'
                  }`}
                  style={{ transform: autoBackup ? 'translateX(0)' : 'translateX(0)' , left: autoBackup ? '22px' : '2px' }}
                />
              </button>
            </div>

            {/* Backup Now */}
            <button
              onClick={handleBackupNow}
              disabled={backingUp}
              className="w-full bg-teal text-white py-2 rounded font-semibold disabled:opacity-50"
            >
              {backingUp ? 'Backing up...' : 'Backup Now'}
            </button>

            {/* View Backups */}
            <button
              onClick={handleToggleBackups}
              className="w-full bg-hover text-theme py-2 rounded font-semibold border border-theme"
            >
              {showBackups ? 'Hide Backups' : 'View Backups'}
            </button>

            {showBackups && (
              <div className="space-y-2">
                {loadingBackups ? (
                  <p className="text-sm text-theme-secondary text-center py-2">Loading...</p>
                ) : backups.length === 0 ? (
                  <p className="text-sm text-theme-secondary text-center py-2">No backups found</p>
                ) : (
                  backups.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between bg-hover rounded p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-theme truncate">{b.name}</p>
                        <p className="text-xs text-theme-secondary">
                          {b.folder} · {formatSize(b.size)} · {formatDate(b.date)}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2 shrink-0">
                        <button
                          onClick={() => handleRestoreFromDrive(b)}
                          className="px-2 py-1 text-xs rounded bg-teal text-white font-medium"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b)}
                          className="px-2 py-1 text-xs rounded bg-red-600/20 text-red-400 font-medium"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-theme" />

      {/* ── Local Backup ── */}
      <div>
        <h3 className="font-semibold text-theme mb-2">Local Backup</h3>

        {dbStats && (
          <div className="text-xs text-theme-secondary mb-3 bg-hover rounded p-2">
            <span>{dbStats.sessions} sessions</span>
            <span className="mx-1">·</span>
            <span>{dbStats.locations} locations</span>
            <span className="mx-1">·</span>
            <span>{dbStats.games} games</span>
            <span className="mx-1">·</span>
            <span>{dbStats.notes} notes</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleLocalDownload}
            className="w-full bg-teal text-white py-2 rounded font-semibold"
          >
            Download Backup
          </button>

          <div>
            <label className="block mb-2 font-semibold text-theme text-sm">Restore from File</label>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFromFile}
              className="block w-full text-sm text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-hover file:text-theme file:font-semibold file:border file:border-theme"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ──────────────────────────────────────────────

export default function Settings() {
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<Record<string, number> | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStats(null);

    try {
      const stats = await importSQLiteDatabase(file);
      setImportStats(stats as unknown as Record<string, number>);
      alert('Database imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import database. Please check the file and try again.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleExportCSV = async () => {
    const sessions = await db.sessions.toArray();
    const locations = await db.locations.toArray();
    const games = await db.games.toArray();
    const gameFormats = await db.game_formats.toArray();
    const blinds = await db.blinds.toArray();
    const cash = await db.cash.toArray();

    const locationMap = new Map(locations.map(l => [l.location_id!, l.location]));
    const gameMap = new Map(games.map(g => [g.game_id!, g.game]));
    const formatMap = new Map(gameFormats.map(gf => [gf.game_format_id!, gf.game_format]));
    const blindsMap = new Map(blinds.map(b => [b.blind_id!, b]));
    const cashMap = new Map(cash.map(c => [c.session_id, c.blinds]));

    let csv = 'Session ID,Start,End,Buy In,Cash Out,Profit,Location,Game,Format,Blinds,State\n';

    for (const session of sessions) {
      const blindId = cashMap.get(session.session_id!);
      const blind = blindId ? blindsMap.get(blindId) : null;
      const blindsText = blind
        ? blind.straddle > 0
          ? `$${blind.sb}/$${blind.bb}/$${blind.straddle}`
          : `$${blind.sb}/$${blind.bb}`
        : '';

      const profit = session.cash_out - session.buy_in;
      const startDate = new Date(session.start).toISOString();
      const endDate = new Date(session.end).toISOString();

      csv += [
        session.session_id,
        startDate,
        endDate,
        session.buy_in,
        session.cash_out,
        profit,
        locationMap.get(session.location) || '',
        gameMap.get(session.game) || '',
        formatMap.get(session.game_format) || '',
        blindsText,
        session.state === 0 ? 'Completed' : 'Active'
      ]
        .map(field => `"${field}"`)
        .join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-tracker-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    const data = {
      sessions: await db.sessions.toArray(),
      cash: await db.cash.toArray(),
      games: await db.games.toArray(),
      locations: await db.locations.toArray(),
      blinds: await db.blinds.toArray(),
      game_formats: await db.game_formats.toArray(),
      base_formats: await db.base_formats.toArray(),
      tournament: await db.tournament.toArray(),
      breaks: await db.breaks.toArray(),
      notes: await db.notes.toArray()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-tracker-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await db.transaction('rw', [
        db.sessions, db.cash, db.games, db.locations, db.blinds,
        db.game_formats, db.base_formats, db.tournament, db.breaks, db.notes
      ], async () => {
        await db.sessions.clear();
        await db.cash.clear();
        await db.games.clear();
        await db.locations.clear();
        await db.blinds.clear();
        await db.game_formats.clear();
        await db.base_formats.clear();
        await db.tournament.clear();
        await db.breaks.clear();
        await db.notes.clear();

        if (data.base_formats) await db.base_formats.bulkAdd(data.base_formats);
        if (data.locations) await db.locations.bulkAdd(data.locations);
        if (data.games) await db.games.bulkAdd(data.games);
        if (data.blinds) await db.blinds.bulkAdd(data.blinds);
        if (data.game_formats) await db.game_formats.bulkAdd(data.game_formats);
        if (data.sessions) await db.sessions.bulkAdd(data.sessions);
        if (data.cash) await db.cash.bulkAdd(data.cash);
        if (data.tournament) await db.tournament.bulkAdd(data.tournament);
        if (data.breaks) await db.breaks.bulkAdd(data.breaks);
        if (data.notes) await db.notes.bulkAdd(data.notes);
      });

      alert('JSON backup imported successfully!');
    } catch (error) {
      console.error('JSON import error:', error);
      alert('Failed to import JSON backup.');
    }
    e.target.value = '';
  };

  return (
    <Layout title="Settings">
      <Section title="Theme">
        <ThemePicker />
      </Section>

      <Section title="Backup">
        <BackupSection />
      </Section>

      <Section title="Import/Export">
        <div className="space-y-3">
          <div>
            <label className="block mb-2 font-semibold text-theme">Import SQLite Database</label>
            <input
              type="file"
              accept=".db"
              onChange={handleImport}
              disabled={importing}
              className="block w-full text-sm text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-teal file:text-white file:font-semibold hover:file:bg-teal-dark"
            />
            {importing && (
              <p className="mt-2 text-sm text-theme-secondary">Importing... Please wait.</p>
            )}
            {importStats && (
              <div className="mt-2 p-3 bg-hover border border-theme rounded text-sm">
                <p className="font-semibold mb-1 text-theme">Import Complete!</p>
                <ul className="text-theme-secondary space-y-1">
                  <li>Sessions: {importStats.sessions}</li>
                  <li>Locations: {importStats.locations}</li>
                  <li>Games: {importStats.games}</li>
                  <li>Blinds: {importStats.blinds}</li>
                  <li>Breaks: {importStats.breaks}</li>
                  <li>Notes: {importStats.notes}</li>
                </ul>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={handleExportCSV}
              className="w-full bg-hover text-theme py-2 rounded font-semibold border border-theme"
            >
              Export CSV
            </button>
          </div>

          <div>
            <button
              onClick={handleExportJSON}
              className="w-full bg-hover text-theme py-2 rounded font-semibold border border-theme"
            >
              Export JSON Backup
            </button>
          </div>

          <div>
            <label className="block mb-2 font-semibold text-theme">Import JSON Backup</label>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="block w-full text-sm text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-hover file:text-theme file:font-semibold file:border file:border-theme"
            />
          </div>
        </div>
      </Section>

      <Section title="About">
        <div className="space-y-2 text-sm text-theme-secondary">
          <p><strong className="text-theme">Poker Tracker PWA</strong></p>
          <p>Version 1.0.0</p>
          <p>Track your poker sessions and analyze your performance.</p>
          <p className="pt-2 text-xs">
            All data is stored locally in your browser using IndexedDB.
          </p>
        </div>
      </Section>
    </Layout>
  );
}
