import { App } from '@capacitor/app';
import { FileOpener } from '@capacitor-community/file-opener';
import { Filesystem, Directory } from '@capacitor/filesystem';

const GITHUB_REPO = 'BROG6/Work-Timesheet';

export const checkNativeAPKUpdate = async () => {
  try {
    const info = await App.getInfo();
    const currentVersion = info.version; // Returns "1.0" or "1.0.0[span_0](start_span)"[span_0](end_span)

    // Fetch latest release from GitHub API
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Work-Timesheet-App',
      },
    });

    if (!response.ok) return;

    const latestRelease = await response.json();
    const latestVersion = latestRelease.tag_name.replace(/^v/, '').trim();

    // Compare dynamic native version against latest release tag
    if (isNewerVersion(latestVersion, currentVersion)) {
      const apkAsset = latestRelease.assets?.find(asset => asset.name.endsWith('.apk'));
      if (apkAsset) {
        showUpdatePrompt(latestVersion, apkAsset.browser_download_url);
      }
    }
  } catch (err) {
    console.warn('[NativeUpdater] Check failed silently:', err);
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

    // Download APK file directly to cache directory
    const downloadRes = await Filesystem.downloadFile({
      url: downloadUrl,
      path: fileName,
      directory: Directory.Cache,
    });

    // Open file with Android Package Installer
    await FileOpener.open({
      filePath: downloadRes.path,
      contentType: 'application/vnd.android.package-archive',
    });

    setTimeout(() => {
      App.exitApp();
    }, 1000);

  } catch (err) {
    console.error('[NativeUpdater] Direct install failed, falling back to external browser:', err);
    window.open(downloadUrl, '_system');
  }
};
