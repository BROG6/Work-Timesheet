import React, { useState } from 'react';
import { auth, db } from './firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Auth({ user, setUser, setUserProfile }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('worker'); // 'worker' or 'manager'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper to handle profile loading/creation after successful login/register
  const handleAuthSuccess = async (authUser, providedName = '') => {
    const userDocRef = doc(db, 'users', authUser.uid);
    const userDoc = await getDoc(userDocRef);

    let profileData;
    if (userDoc.exists()) {
      profileData = userDoc.data();
    } else {
      // Create a default profile if one does not exist yet (e.g. first-time Google sign-in)
      profileData = {
        name: providedName || authUser.displayName || authUser.email?.split('@')[0] || 'Staff Member',
        companyCode: 'SJR Builders',
        companyId: 'SJR Builders',
        role: role, // defaults to 'worker'
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, profileData);
    }

    setUser(authUser);
    setUserProfile(profileData);
  };

  // Handle User Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await handleAuthSuccess(userCredential.user, name);
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
      await handleAuthSuccess(userCredential.user);
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await handleAuthSuccess(userCredential.user);
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  if (user) {
    return (
      <div className="flex items-center justify-between bg-slate-800 text-white p-3 rounded-lg max-w-xl mx-auto my-2 shadow-sm">
        <span className="text-xs font-medium">Logged in as: <strong className="text-emerald-400">{user.email}</strong></span>
        <button
          onClick={handleLogout}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer"
        >
          Sign Out
        </button>
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

      {/* Google Sign-In Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
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
          <span>Continue with Google</span>
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
