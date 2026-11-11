// src/App.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import Auth from './Auth';
import TimesheetEntry from './TimesheetEntry';
import ManagerDashboard from './ManagerDashboard';
import HealthAndSafetyHub from './HealthAndSafetyHub';
import ManagerHealthAndSafetyDashboard from './ManagerHealthAndSafetyDashboard';
import { useOnlineStatus } from './useOnlineStatus';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { initNotifications, checkAndSuppressDailyReminder } from './notifications';
import { checkNativeAPKUpdate } from './nativeUpdater';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('main'); // 'main' or 'hs'
  
  const isOnline = useOnlineStatus();

  // 1. App Launch Initialization (Version Check, Native APK, Capgo, and Notification Permissions)
  useEffect(() => {
    // Force-bust stale local storage/caches on app version changes WITHOUT signing users out
    const CURRENT_APP_VERSION = "1.0.128"; // Increment this whenever you push major layout changes
    const savedVersion = localStorage.getItem('sjr_app_version');
    
    if (savedVersion !== CURRENT_APP_VERSION) {
      console.log("New app version detected. Purging stale UI cache...");
      
      // Selectively clear local UI/profile cache keys, leaving Firebase Auth intact
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sjr_') && key !== 'sjr_app_version') {
          localStorage.removeItem(key);
        }
      });

      localStorage.setItem('sjr_app_version', CURRENT_APP_VERSION);
      window.location.reload();
      return;
    }

    if (Capacitor.isNativePlatform()) {
      // Confirm boot to Capgo (500ms)
      const capgoTimer = setTimeout(() => {
        CapacitorUpdater.notifyAppReady().catch((err) => {
          console.warn("Capgo notifyAppReady skipped:", err);
        });
      }, 500);

      // Initialize notifications with isolated error catching (1000ms)
      const notifyTimer = setTimeout(() => {
        Promise.resolve(initNotifications()).catch((err) => {
          console.warn("Notification init skipped/failed:", err);
        });
      }, 1000);

      // Check GitHub for new native APK update after notification prompt clears (2500ms)
      const updateTimer = setTimeout(() => {
        Promise.resolve(checkNativeAPKUpdate()).catch((err) => {
          console.warn("Native APK update check failed:", err);
        });
      }, 2500);

      return () => {
        clearTimeout(capgoTimer);
        clearTimeout(notifyTimer);
        clearTimeout(updateTimer);
      };
    }
  }, []);

  // 2. User-specific tasks (Runs when user logs in/changes)
  useEffect(() => {
    if (user?.uid) {
      checkAndSuppressDailyReminder(user.uid);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        const storageKey = `sjr_profile_${authUser.uid}`;

        try {
          let userProfileData = null;
          try {
            const userDoc = await getDoc(doc(db, 'users', authUser.uid));
            if (userDoc.exists()) userProfileData = userDoc.data();
          } catch {
            const cacheDoc = await getDocFromCache(doc(db, 'users', authUser.uid));
            if (cacheDoc.exists()) userProfileData = cacheDoc.data();
          }

          if (userProfileData) {
            setProfile(userProfileData);
            localStorage.setItem(storageKey, JSON.stringify(userProfileData));
          } else {
            const cachedBackup = localStorage.getItem(storageKey);
            if (cachedBackup) {
              setProfile(JSON.parse(cachedBackup));
            } else {
              setProfile({
                name: authUser.displayName || authUser.email?.split('@')[0] || 'Staff Member',
                role: 'worker',
                companyId: 'SJR Builders'
              });
            }
          }
        } catch (err) {
          console.warn("Offline profile fallback engaged:", err);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (!isOnline) {
      const confirmLogout = window.confirm(
        "You are currently offline. If you sign out now, you will need internet to log back in. Are you sure?"
      );
      if (!confirmLogout) return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.signOut();
      }
    } catch (err) {
      console.warn("Native Google SignOut error:", err);
    }

    signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
        Loading Timesheet Portal...
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  const isManager = profile.role === 'manager';

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="max-w-4xl mx-auto mb-3 bg-amber-500 text-slate-950 px-4 py-2 rounded-md shadow-sm text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
            </span>
            <span>Working Offline — Timesheets will automatically sync when connection is restored.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-gray-800">Timesheet App</h1>
            
            {/* Status Pill Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <p className="text-xs text-gray-500 mt-0.5">
            {profile.name} ({profile.role?.toUpperCase() || 'WORKER'}) — Company: {profile.companyId || 'SJR Builders'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={handleSignOut}
            className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 transition font-medium cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* View Switcher Toggle (Available to all roles) */}
      <div className="max-w-4xl mx-auto flex bg-slate-900 p-1.5 rounded-xl mb-4 shadow gap-1">
        <button
          type="button"
          onClick={() => setActiveView('main')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeView === 'main'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          {isManager ? '📊 Manager Dashboard' : '⏱️ Timesheet Entry'}
        </button>
        <button
          type="button"
          onClick={() => setActiveView('hs')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeView === 'hs'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          {isManager ? '🛡️ H&S Site Register' : '🛡️ Health & Safety Hub'}
        </button>
      </div>

      {/* Main Body View Rendering */}
      {activeView === 'hs' ? (
        isManager ? (
          <ManagerHealthAndSafetyDashboard />
        ) : (
          <HealthAndSafetyHub userId={user.uid} userName={profile.name} />
        )
      ) : isManager ? (
        <ManagerDashboard companyId={profile.companyId} />
      ) : (
        <TimesheetEntry user={user} userProfile={profile} />
      )}
    </div>
  );
}
