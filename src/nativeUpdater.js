import { App } from '@capacitor/app';
import { FileOpener } from '@capacitor-community/file-opener';
import { Filesystem, Directory } from '@capacitor/filesystem';

const GITHUB_REPO = 'BROG6/Work-Timesheet';

export const checkNativeAPKUpdate = async () => {
  try {
    // 1. Read actual native app info directly from the running Android binary
    const info = await App.getInfo();
    const currentVersion = info.version; // Returns "1.0" or "1.0.0" from build.gradle

    alert(`[1] Native Version detected: "${currentVersion}"`);

    // 2. Fetch latest release from GitHub API with cache-busting
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest?t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'User-Agent': 'Work-Timesheet-App',
      },
    });

    if (!response.ok) {
      alert(`[2] GitHub API Error: HTTP Status ${response.status}`);
      return;
    }

    const latestRelease = await response.json();
    const latestVersion = latestRelease.tag_name.replace(/^v/, '').trim();

    const newer = isNewerVersion(latestVersion, currentVersion);
    alert(`[3] GitHub Version: "${latestVersion}"\nIs Newer? ${newer}`);

    // 3. Compare dynamic native version against latest release tag
    if (newer) {
      const apkAsset = latestRelease.assets.find(asset => asset.name.endsWith('.apk'));
      if (apkAsset) {
        alert(`[4] Found APK asset: ${apkAsset.name}\nPrompting update now...`);
        showUpdatePrompt(latestVersion, apkAsset.browser_download_url);
      } else {
        alert(`[4] ERROR: Release found (${latestVersion}), but NO .apk file attached!`);
      }
    }
  } catch (err) {
    alert(`[CATCH ERROR] ${err.message}`);
    console.warn('[NativeUpdater] Check failed:', err);
  }
};

const isNewerVersion = (latest, current) => {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);

  const maxLength = Math.max(l.length, c.length);

  for (let i = 0; i < maxLength; i++) {
    const lNum = l[i] || 0;
    const cNum = c[i] || 0;

    if (lNum > cNum) return true;
    if (lNum < cNum) return false;
  }
  return false;
};

const showUpdatePrompt = async (newVersion, downloadUrl) => {
  const confirmUpdate = window.confirm(
    `A new required system update (v${newVersion}) is available for SJR Timesheets.\n\nTap OK to download and install now.`
  );

  if (!confirmUpdate) return;

  try {
    const fileName = `update-${newVersion}.apk`;

    // 1. Download APK file directly to cache directory
    const downloadRes = await Filesystem.downloadFile({
      url: downloadUrl,
      path: fileName,
      directory: Directory.Cache,
    });

    // 2. Open file with Android Package Installer
    await FileOpener.open({
      filePath: downloadRes.path,
      contentType: 'application/vnd.android.package-archive',
    });

    // 3. Exit running process so Android performs a clean boot when re-opened
    setTimeout(() => {
      App.exitApp();
    }, 1000);

  } catch (err) {
    alert(`[INSTALL FAIL] ${err.message}`);
    console.error('[NativeUpdater] Direct install failed, falling back to external browser:', err);
    window.open(downloadUrl, '_system');
  }
};
