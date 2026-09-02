import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';

export default function ManagerDashboard({ companyId }) {
  const [timesheets, setTimesheets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Submitted');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, 'timesheets'),
      where('companyId', '==', companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTimesheets(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching timesheets:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const handleStatusUpdate = async (timesheetId, newStatus) => {
    try {
      const timesheetRef = doc(db, 'timesheets', timesheetId);
      await updateDoc(timesheetRef, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error updating status.");
    }
  };

  const exportToCSV = () => {
    if (filteredTimesheets.length === 0) {
      alert("No timesheets available to export.");
      return;
    }

    const headers = ["Employee Name", "Date", "Start Time", "End Time", "Break (Mins)", "Total Hours", "Status"];
    const rows = filteredTimesheets.map(t => [
      `"${t.employeeName || ''}"`,
      `"${t.date || ''}"`,
      `"${t.startTime || ''}"`,
      `"${t.endTime || ''}"`,
      t.breakMinutes || 0,
      t.totalHours || 0,
      `"${t.status || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTimesheets = timesheets.filter(t => 
    filterStatus === 'All' ? true : t.status === filterStatus
  );

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white shadow-md rounded-lg mt-4 border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-800">Company Approvals</h2>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-3 py-1 text-sm rounded-md font-medium hover:bg-green-700 transition"
          >
            📥 Export CSV
          </button>
          {['Submitted', 'Approved', 'Rejected', 'All'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-sm rounded-md border ${
                filterStatus === status 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center py-6 text-gray-500">Loading timesheets...</p>
      ) : filteredTimesheets.length === 0 ? (
        <p className="text-center py-6 text-gray-500">No entries found under this status filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-sm font-semibold text-gray-600">
                <th className="p-3">Employee</th>
                <th className="p-3">Date</th>
                <th className="p-3">Hours</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {filteredTimesheets.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{entry.employeeName}</td>
                  <td className="p-3 text-gray-600">{entry.date}</td>
                  <td className="p-3 font-semibold">{entry.totalHours} hrs</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                      entry.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      entry.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {entry.status === 'Submitted' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(entry.id, 'Approved')}
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(entry.id, 'Rejected')}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
