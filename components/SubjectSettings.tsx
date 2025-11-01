'use client';

import { useState } from 'react';
import type { Subject } from '@/types';

interface SubjectSettingsProps {
  subject: Subject;
  onSave: (settings: {
    dailyMinutesGoal?: number;
    daysOfWeek?: string[];
    startDate?: string;
    finishDate?: string;
  }) => Promise<void>;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function SubjectSettings({ subject, onSave, onClose }: SubjectSettingsProps) {
  const [dailyGoal, setDailyGoal] = useState<string>(subject.dailyMinutesGoal?.toString() || '');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set(subject.daysOfWeek || [])
  );
  const [startDate, setStartDate] = useState(subject.startDate || '');
  const [finishDate, setFinishDate] = useState(subject.finishDate || '');
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    const newDays = new Set(selectedDays);
    if (newDays.has(day)) {
      newDays.delete(day);
    } else {
      newDays.add(day);
    }
    setSelectedDays(newDays);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({
        dailyMinutesGoal: dailyGoal ? parseInt(dailyGoal, 10) : undefined,
        daysOfWeek: Array.from(selectedDays),
        startDate: startDate || undefined,
        finishDate: finishDate || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-8 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300 border border-white/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-6">{subject.name} Settings</h2>

          {/* Daily Goal */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Daily Study Goal (minutes)
            </label>
            <input
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
              placeholder="e.g., 60"
              className="w-full px-4 py-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {/* Days of Week */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Study Days
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day.toLowerCase())}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedDays.has(day.toLowerCase())
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/20 text-gray-800 hover:bg-white/30'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {/* Finish Date */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Finish Date
            </label>
            <input
              type="date"
              value={finishDate}
              onChange={(e) => setFinishDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition-all"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-full transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
