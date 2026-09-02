import React, { useState } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function TimesheetEntry({ user, profile }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    const diffMs = end - start;
    if (diffMs <= 0) return 0;
    
    const diffHours = diffMs / (1000 * 60 * 60);
    const breakHours = (parseInt(breakMinutes) || 0) / 60;
    return Math.max(0, diffHours - breakHours).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const totalHours = calculateHours();

    try {
      await addDoc(collection(db, 'timesheets'), {
        userId: user.uid,
        employeeName: profile.name || user.displayName || 'Employee',
        companyId: profile.companyId,
        date,
        startTime,
        endTime,
        breakMinutes: Number(breakMinutes),
        totalHours: Number(totalHours),
        status: 'Submitted',
        createdAt: serverTimestamp()
      });
      alert('Timesheet submitted successfully!');
    } catch (err) {
      console.error('Error submitting timesheet:', err);
      alert('Failed to submit timesheet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white shadow-md rounded-lg mt-4 border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Submit Hours</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
            required 
          />
        </div>
        <div className="flex gap-2">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <input 
              type="time" 
              value={startTime} 
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
              required 
            />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <input 
              type="time" 
              value={endTime} 
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
              required 
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Break (Minutes)</label>
          <input 
            type="number" 
            value={breakMinutes} 
            onChange={(e) => setBreakMinutes(e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
            min="0"
          />
        </div>
        <div className="p-3 bg-blue-50 rounded-md border border-blue-100 text-center">
          <span className="text-sm font-medium text-gray-600">Calculated Hours: </span>
          <span className="text-lg font-bold text-blue-600">{calculateHours()} hrs</span>
        </div>
        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
        >
          {submitting ? 'Submitting...' : 'Send to Company'}
        </button>
      </form>
    </div>
  );
}
