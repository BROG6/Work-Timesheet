import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

const DAYS_OF_WEEK = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];

export default function ManagerDashboard({ userProfile }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState('All');

  useEffect(() => {
    // Query all timesheet submissions for the current company
    const companyCode = userProfile?.companyCode || 'DEFAULT';
    const q = query(
      collection(db, 'timesheets'),
      where('companyCode', '==', companyCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching timesheets:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'timesheets', id), {
        status: newStatus
      });
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    }
  };

  // Get unique list of staff names for filtering
  const staffMembers = ['All', ...new Set(entries.map(e => e.userName).filter(Boolean))];

  // Filter entries by selected staff member
  const filteredEntries = selectedStaff === 'All' 
    ? entries 
    : entries.filter(e => e.userName === selectedStaff);

  // Calculate totals
  const totalTaskHours = filteredEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalTravelHours = filteredEntries.reduce((sum, e) => sum + (e.travelTime || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header & Quick Summary Stats */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manager Timesheet Portal</h1>
          <p className="text-slate-400 text-xs mt-1">Reviewing submissions for company code: <span className="text-emerald-400 font-semibold">{userProfile?.companyCode}</span></p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
            <span className="block text-xs text-slate-400 uppercase font-semibold">Total Work Hrs</span>
            <span className="text-xl font-bold text-emerald-400">{totalTaskHours.toFixed(2)}</span>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
            <span className="block text-xs text-slate-400 uppercase font-semibold">Travel Hrs</span>
            <span className="text-xl font-bold text-amber-400">{totalTravelHours.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Staff Filter Dropdown */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase">Filter Staff Member:</label>
        <select
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
        >
          {staffMembers.map(staff => (
            <option key={staff} value={staff}>{staff}</option>
          ))}
        </select>
      </div>

      {/* Time Card Entries List */}
      {loading ? (
        <div className="text-center py-8 text-slate-500 font-medium">Loading weekly time cards...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-slate-200 text-slate-500 font-medium">
          No time card entries found.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 mb-3 border-b border-slate-100 gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {entry.project || "General Project"}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg mt-1">{entry.userName}</h3>
                  <p className="text-xs text-slate-500">{entry.date}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${
                    entry.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    entry.status === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                    'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {entry.status || 'pending'}
                  </span>

                  {/* Quick Action Buttons */}
                  <button
                    onClick={() => handleStatusChange(entry.id, 'approved')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(entry.id, 'rejected')}
                    className="bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Task Details & Hours Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Category & Task</p>
                  <p className="font-bold text-slate-800">{entry.taskCategoryGroup}</p>
                  <p className="text-slate-600 font-medium">{entry.taskName}</p>
                  {entry.comments && (
                    <p className="text-xs bg-slate-50 border border-slate-200 p-2 rounded mt-2 text-slate-700 italic">
                      "{entry.comments}"
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-800 text-sm pb-1 border-b border-slate-200">
                    <span>Task Duration:</span>
                    <span className="text-emerald-700">{entry.hours} hrs</span>
                  </div>
                  {entry.travelTime > 0 && (
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Travel Time:</span>
                      <span>{entry.travelTime} hrs</span>
                    </div>
                  )}
                  {entry.timeCardDetails?.startTime && (
                    <div className="pt-1 text-slate-500 grid grid-cols-2 gap-1 text-[11px]">
                      <span>Start: {entry.timeCardDetails.startTime}</span>
                      <span>Left Site: {entry.timeCardDetails.timeLeftSite || '--'}</span>
                      <span>Returned: {entry.timeCardDetails.timeReturned || '--'}</span>
                      <span>Finished: {entry.timeCardDetails.timeFinished || '--'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
