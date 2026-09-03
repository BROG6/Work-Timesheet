import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import Auth from './Auth';
import TimesheetEntry from './TimesheetEntry';
import ManagerDashboard from './ManagerDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        
        // Key for local backup storage
        const storageKey = `sjr_profile_${authUser.uid}`;

        try {
          let userProfileData = null;

          // 1. Try reading from Firestore (Network or IndexedDB cache)
          try {
            const userDoc = await getDoc(doc(db, 'users', authUser.uid));
            if (userDoc.exists()) {
              userProfileData = userDoc.data();
            }
          } catch {
            // If network fails and persistent cache fails, explicitly read local cache
            const cacheDoc = await getDocFromCache(doc(db, 'users', authUser.uid));
            if (cacheDoc.exists()) {
              userProfileData = cacheDoc.data();
            }
          }

          // 2. If Firestore provided data, save to localStorage as a hard backup
          if (userProfileData) {
            setProfile(userProfileData);
            localStorage.setItem(storageKey, JSON.stringify(userProfileData));
          } else {
            // 3. Fallback: Read backup from localStorage if offline and cache missed
            const cachedBackup = localStorage.getItem(storageKey);
            if (cachedBackup) {
              setProfile(JSON.parse(cachedBackup));
            } else {
              // Minimal emergency profile using auth info so worker isn't locked out
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

  const handleSignOut = () => {
    // Optional: Warn if signing out while offline
    if (!navigator.onLine) {
      const confirmLogout = window.confirm(
        "You are currently offline. If you sign out now, you will need internet to log back in. Are you sure?"
      );
      if (!confirmLogout) return;
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

  // Auth screen only renders if no authenticated user session exists in IndexedDB
  if (!user || !profile) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Timesheet App</h1>
          <p className="text-xs text-gray-500">
            {profile.name} ({profile.role?.toUpperCase() || 'WORKER'}) — Company: {profile.companyId || 'SJR Builders'}
          </p>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 transition font-medium"
        >
          Sign Out
        </button>
      </header>

      {profile.role === 'manager' ? (
        <ManagerDashboard companyId={profile.companyId} />
      ) : (
        <TimesheetEntry user={user} userProfile={profile} />
      )}
    </div>
  );
}
