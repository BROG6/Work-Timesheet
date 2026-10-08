import { App } from '@capacitor/app';
import { FileOpener } from '@capawesome/capacitor-file-opener';
import { Filesystem, Directory } from '@capacitor/filesystem';
import packageJson from '../package.json';

const GITHUB_REPO = 'BROG6/Work-Timesheet';

export const checkNativeAPKUpdate = async () => {
  try {
    const currentVersion = packageJson.version;

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) return;

    const latestRelease = await response.json();
    const latestVersion = latestRelease.tag_name.replace('v', '');

    if (isNewerVersion(latestVersion, currentVersion)) {
      const apkAsset = latestRelease.assets.find(asset => asset.name.endsWith('.apk'));
      if (apkAsset) {
        showUpdatePrompt(latestVersion, apkAsset.browser_download_url);
      }
    }
  } catch (err) {
    console.warn('[NativeUpdater] Check failed:', err);
  }
};

const isNewerVersion = (latest, current) => {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
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

    // 2. Pass local APK file path directly to Android Package Installer
    await FileOpener.openFile({
      filePath: downloadRes.path,
      contentType: 'application/vnd.android.package-archive',
    });
  } catch (err) {
    console.error('[NativeUpdater] Direct install failed, falling back to external browser:', err);
    // Fallback: Open in phone's main browser (Chrome) where downloads trigger package installs
    window.open(downloadUrl, '_system');
  }
};
