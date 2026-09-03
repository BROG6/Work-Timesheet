import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import Auth from './Auth';
import TimesheetEntry from './TimesheetEntry';
import ManagerDashboard from './ManagerDashboard';
import { useOnlineStatus } from './useOnlineStatus'; // 1. Import hook

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isOnline = useOnlineStatus(); // 2. Listen to network status

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

  const handleSignOut = () => {
    if (!isOnline) {
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

  if (!user || !profile) {
    return <Auth />;
  }

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
        <TimesheetEntry user={user} profile={profile} />
      )}
    </div>
  );
}
