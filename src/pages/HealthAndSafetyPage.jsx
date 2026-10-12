import React, { useState } from 'react';
import { SignaturePad } from '../components/SignaturePad';

export const HealthAndSafetyPage = () => {
  const [formData, setFormData] = useState({
    siteAddress: '',
    date: new Date().toISOString().split('T')[0],
    supervisor: '',
    hazards: '',
    discussionPoints: '',
    attendees: [],
  });

  const [currentAttendee, setCurrentAttendee] = useState('');
  const [currentSignature, setCurrentSignature] = useState(null);

  // Add an attendee with their signature to the list
  const handleAddAttendee = () => {
    if (!currentAttendee.trim()) {
      alert('Please enter the team member\'s name.');
      return;
    }
    if (!currentSignature) {
      alert('Please provide a signature before adding the attendee.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      attendees: [
        ...prev.attendees,
        {
          id: Date.now(),
          name: currentAttendee,
          signature: currentSignature,
        },
      ],
    }));

    // Reset input fields for the next person
    setCurrentAttendee('');
    setCurrentSignature(null);
  };

  const handleRemoveAttendee = (id) => {
    setFormData((prev) => ({
      ...prev,
      attendees: prev.attendees.filter((a) => a.id !== id),
    }));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    console.log('Health & Safety Form Data:', formData);
    alert('Health & Safety report ready for saving/exporting!');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Toolbox & Safety Briefing
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Record daily site hazards, safety discussions, and team sign-offs.
        </p>

        <form onSubmit={handleSubmitForm} className="space-y-6">
          {/* Section 1: Meeting Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site / Job Address
              </label>
              <input
                type="text"
                placeholder="e.g., 123 Main Street"
                value={formData.siteAddress}
                onChange={(e) =>
                  setFormData({ ...formData, siteAddress: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supervisor / Person Conducting Meeting
              </label>
              <input
                type="text"
                placeholder="Name"
                value={formData.supervisor}
                onChange={(e) =>
                  setFormData({ ...formData, supervisor: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Section 2: Hazards & Safety Topics */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Identified Hazards & Mitigation Controls
              </label>
              <textarea
                rows={3}
                placeholder="List any site hazards (e.g., working at height, power lines, power tools) and controls..."
                value={formData.hazards}
                onChange={(e) =>
                  setFormData({ ...formData, hazards: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Topics / Notes Discussed
              </label>
              <textarea
                rows={3}
                placeholder="Key safety messages, PPE requirements, daily tasks..."
                value={formData.discussionPoints}
                onChange={(e) =>
                  setFormData({ ...formData, discussionPoints: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Section 3: Team Attendance & Sign-off */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Team Sign-Offs
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Each attendee enters their name and signs below to acknowledge the briefing.
            </p>

            {/* Attendance Input Box */}
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Worker Name
                </label>
                <input
                  type="text"
                  placeholder="Enter worker's full name"
                  value={currentAttendee}
                  onChange={(e) => setCurrentAttendee(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signature
                </label>
                <SignaturePad
                  onSave={(dataUrl) => setCurrentSignature(dataUrl)}
                />
              </div>

              <button
                type="button"
                onClick={handleAddAttendee}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md text-sm transition-colors"
              >
                + Add Signed Attendee
              </button>
            </div>

            {/* Attendance List */}
            {formData.attendees.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Signed Attendees ({formData.attendees.length})
                </h3>
                <div className="divide-y divide-gray-200 border rounded-lg overflow-hidden bg-white">
                  {formData.attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {attendee.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <img
                          src={attendee.signature}
                          alt={`${attendee.name}'s signature`}
                          className="h-8 border border-gray-200 rounded px-1 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(attendee.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow transition-colors"
          >
            Complete Safety Briefing
          </button>
        </form>
      </div>
    </div>
  );
};
