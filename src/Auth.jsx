import React, { useState } from 'react';
import { auth, db } from './firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export default function Auth({ user, setUser, userProfile, setUserProfile }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('worker'); // 'worker' or 'manager'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper to handle profile loading/creation/upgrading after auth
  const handleAuthSuccess = async (authUser, providedName = '', targetRole = role) => {
    const userDocRef = doc(db, 'users', authUser.uid);
    const userDoc = await getDoc(userDocRef);

    let profileData;
    if (userDoc.exists()) {
      profileData = userDoc.data();

      // If user logs in with explicit targetRole, sync it if different
      if (targetRole && profileData.role !== targetRole) {
        profileData.role = targetRole;
        await setDoc(userDocRef, { role: targetRole }, { merge: true });
      }
    } else {
      // Create profile for first-time sign ins
      profileData = {
        name: providedName || authUser.displayName || authUser.email?.split('@')[0] || 'Staff Member',
        companyCode: 'SJR Builders',
        companyId: 'SJR Builders',
        role: targetRole || 'worker',
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, profileData);
    }

    if (setUserProfile) setUserProfile(profileData);
    if (setUser) setUser(authUser);
  };

  // Toggle user role dynamically between Manager and Worker
  const handleToggleRole = async () => {
    if (!user || !userProfile) return;

    const newRole = userProfile.role === 'manager' ? 'worker' : 'manager';
    setLoading(true);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { role: newRole }, { merge: true });

      const updatedProfile = { ...userProfile, role: newRole };
      if (setUserProfile) setUserProfile(updatedProfile);
    } catch (err) {
      console.error("Error switching role:", err);
      setError("Failed to update role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle User Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await handleAuthSuccess(userCredential.user, name, role);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  // Handle User Sign In
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleAuthSuccess(userCredential.user, '', null); // Keep existing role on login
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Hybrid Google Sign-In (Native Android + Web)
  const handleGoogleSignIn = async (targetRole = 'worker') => {
    setError('');
    setLoading(true);

    try {
      let userCredential;

      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication?.idToken || googleUser.idToken;

        if (!idToken) {
          throw new Error("Failed to retrieve Google ID Token from native auth response.");
        }

        const credential = GoogleAuthProvider.credential(idToken);
        userCredential = await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        userCredential = await signInWithPopup(auth, provider);
      }

      await handleAuthSuccess(userCredential.user, '', targetRole);
    } catch (err) {
      console.error("Google sign-in error:", err);

      if (Capacitor.isNativePlatform()) {
        const fullErrorLog = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
        alert(`RAW NATIVE AUTH ERROR:\n${fullErrorLog}`);
      }

      setError(err.message ? err.message.replace('Firebase: ', '') : 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.signOut();
      }
    } catch (err) {
      console.warn("Native Google signout error:", err);
    }
    await signOut(auth);
    if (setUser) setUser(null);
    if (setUserProfile) setUserProfile(null);
  };

  if (user) {
    const isManager = userProfile?.role === 'manager';

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-800 text-white p-3 rounded-lg max-w-2xl mx-auto my-2 shadow-sm border border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Logged in as: <strong className="text-emerald-400">{user.email}</strong></span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isManager ? 'bg-amber-900/60 text-amber-300 border border-amber-700' : 'bg-slate-700 text-slate-300'}`}>
            {userProfile?.role || 'worker'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleRole}
            disabled={loading}
            className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer text-slate-200"
          >
            {loading ? "Updating..." : isManager ? "Switch to Worker Mode" : "Switch to Manager Mode"}
          </button>

          <button
            onClick={handleLogout}
            className="text-xs bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-800 px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-6 my-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">SJR Builders</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Timesheet & Site Hours Portal</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Google Sign-In Buttons */}
      <div className="space-y-2.5 mb-4">
        <button
          type="button"
          onClick={() => handleGoogleSignIn('worker')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.2v3.15C3.21 21.32 7.27 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.2C.43 8.13 0 9.83 0 12s.43 3.87 1.2 5.4l4.07-3.16z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.21 2.68 1.2 6.6l4.07 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          <span>{loading ? "Authenticating..." : "Continue with Google (Worker)"}</span>
        </button>

        <button
          type="button"
          onClick={() => handleGoogleSignIn('manager')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer text-sm border border-slate-800"
        >
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>{loading ? "Authenticating..." : "Register / Sign in as Manager"}</span>
        </button>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">or email</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>
      </div>

      <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
        {isRegistering && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Jimmy Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
          <input
            type="email"
            placeholder="worker@sjrbuilders.co.nz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        {isRegistering && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="worker">Worker / Staff Member</option>
              <option value="manager">Manager / Supervisor</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Processing..." : isRegistering ? "Register Account" : "Sign In"}
        </button>
      </form>

      <div className="mt-4 text-center border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError('');
          }}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
        >
          {isRegistering ? "Already have an account? Sign In" : "Need an account? Register here"}
        </button>
      </div>
    </div>
  );
}
