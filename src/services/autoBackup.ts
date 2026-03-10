import { createBackupData } from './backupData';
import {
  isConnected,
  getAutoBackupEnabled,
  getLastBackupTime,
  performBackup,
  authorize,
  getClientId,
  getConnectedEmail,
} from './googleDrive';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Run on app load. If Google Drive is configured and auto-backup is enabled,
 * silently trigger a backup when > 24h since last one.
 */
export async function checkAutoBackup(): Promise<void> {
  try {
    // Need client id and a previously connected account to even try
    if (!getClientId() || !getConnectedEmail()) return;
    if (!getAutoBackupEnabled()) return;

    const last = getLastBackupTime();
    if (last && Date.now() - last < TWENTY_FOUR_HOURS) return;

    // Try to re-authorize (may show popup if token expired)
    if (!isConnected()) {
      await authorize();
    }

    const data = await createBackupData();
    const json = JSON.stringify(data);
    await performBackup(json);

    console.log('[AutoBackup] Daily backup completed');
  } catch (err) {
    // Silent failure - don't interrupt app usage
    console.warn('[AutoBackup] Failed:', err);
  }
}
