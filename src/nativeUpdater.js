import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import packageJson from '../package.json'; // Imports version directly

const GITHUB_REPO = 'BROG6/Work-Timesheet';

export const checkNativeAPKUpdate = async () => {
  try {
    // Use package.json version string directly
    const currentVersion = packageJson.version; 

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) return;

    const latestRelease = await response.json();
    const latestVersion = latestRelease.tag_name.replace('v', '');

    console.log(`[NativeUpdater] Local: ${currentVersion} | GitHub: ${latestVersion}`);

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

const showUpdatePrompt = (newVersion, downloadUrl) => {
  const confirmUpdate = window.confirm(
    `A new required system update (v${newVersion}) is available for SJR Timesheets.\n\nTap OK to download and update now.`
  );
  if (confirmUpdate) {
    Browser.open({ url: downloadUrl });
  }
};
