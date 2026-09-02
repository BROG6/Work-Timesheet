import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="text-center mt-20 text-gray-600 font-medium">Loading Portal...</div>;
  }

  if (!user || !profile) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Timesheet App</h1>
          <p className="text-xs text-gray-500">
            {profile.name} ({profile.role.toUpperCase()}) — Company: {profile.companyId}
          </p>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 transition"
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
