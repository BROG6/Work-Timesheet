import React, { useState } from 'react';
import { auth, db } from './firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Auth() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [companyId, setCompanyId] = useState('company_1');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });

        await setDoc(doc(db, 'users', res.user.uid), {
          uid: res.user.uid,
          name: name,
          email: email,
          role: role,
          companyId: companyId
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
        {isRegistering ? 'Create Account' : 'Timesheet Login'}
      </h2>

      {error && <div className="p-3 mb-4 bg-red-100 text-red-700 text-sm rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegistering && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Code / ID</label>
              <input 
                type="text" 
                required 
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type</label>
              <select 
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager / Admin</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <input 
            type="email" 
            required 
            className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" 
            required 
            className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
        >
          {isRegistering ? 'Register Account' : 'Log In'}
        </button>
      </form>

      <button 
        onClick={() => setIsRegistering(!isRegistering)}
        className="w-full text-center text-sm text-blue-600 mt-4 hover:underline"
      >
        {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
      </button>
    </div>
  );
}
