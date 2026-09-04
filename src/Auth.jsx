import React, { useState } from 'react';
import { auth, db } from './firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
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

  // Handle User Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Automatically default company to 'SJR Builders' and save selected role
      const profileData = {
        name: name || 'Staff Member',
        companyCode: 'SJR Builders',
        companyId: 'SJR Builders',
        role: role, // 'worker' or 'manager'
        createdAt: new Date().toISOString()
      };

      // Save user profile to Firestore
      await setDoc(doc(db, 'users', newUser.uid), profileData);

      setUser(newUser);
      setUserProfile(profileData);
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
      const loggedInUser = userCredential.user;

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      } else {
        // Fallback profile if profile document is missing
        setUserProfile({
          name: loggedInUser.email,
          companyCode: 'SJR Builders',
          companyId: 'SJR Builders',
          role: 'worker'
        });
      }

      setUser(loggedInUser);
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please check your credentials.");
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
      <div className="flex items-center justify-between bg-slate-800 text-white p-3 rounded-lg max-w-xl mx-auto my-2">
        <span className="text-xs font-medium">Logged in as: <strong className="text-emerald-400">{user.email}</strong></span>
        <button
          onClick={handleLogout}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md font-semibold transition-colors"
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
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors disabled:opacity-50"
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
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline"
        >
          {isRegistering ? "Already have an account? Sign In" : "Need an account? Register here"}
        </button>
      </div>
    </div>
  );
}
