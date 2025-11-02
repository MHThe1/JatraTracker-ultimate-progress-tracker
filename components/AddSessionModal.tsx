'use client';

import { useState, useEffect } from 'react';
import { getTodayDateString } from '@/lib/dateUtils';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  subjects: Array<{ id: string; name: string; topics: Array<{ id: string; name: string }> }>;
  onSessionAdded?: () => void;
  preselectedSubjectId?: string;
  preselectedTopicId?: string;
}

export default function AddSessionModal({
  isOpen,
  onClose,
  goalId,
  subjects,
  onSessionAdded,
  preselectedSubjectId,
  preselectedTopicId,
}: AddSessionModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Set preselected values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (preselectedSubjectId) {
        setSelectedSubjectId(preselectedSubjectId);
      }
      if (preselectedTopicId) {
        setSelectedTopicId(preselectedTopicId);
      }
    }
  }, [isOpen, preselectedSubjectId, preselectedTopicId]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSubjectId || !duration) {
      alert('Please select a subject and enter a duration');
      return;
    }

    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      alert('Please enter a valid duration in minutes');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId,
          subjectId: selectedSubjectId,
          topicId: selectedTopicId || null,
          action: 'add',
          duration: durationNum,
          date,
          comment: comment.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add session');
      }

      // Reset form
      setSelectedSubjectId('');
      setSelectedTopicId('');
      setDuration('');
      setDate(getTodayDateString());
      setComment('');

      if (onSessionAdded) {
        onSessionAdded();
      }

      onClose();
    } catch (error: any) {
      console.error('Error adding session:', error);
      alert(error.message || 'Failed to add session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 border border-white/30">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-theme-muted hover:text-theme-card transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-theme-card mb-2">
              Add Study Session
            </h2>
            <p className="text-sm text-theme-muted">
              Record a session you missed
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-theme-card mb-2">
                Subject *
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicId(''); // Reset topic when subject changes
                }}
                className="w-full px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme"
                required
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Selection (Optional) */}
            {selectedSubject && selectedSubject.topics.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-theme-card mb-2">
                  Topic (Optional)
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-theme-card input-theme"
                >
                  <option value="">No specific topic</option>
                  {selectedSubject.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-theme-card mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme"
                placeholder="60"
                min="1"
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-theme-card mb-2">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full max-w-full min-w-0 px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme box-border"
                required
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-theme-card mb-2">
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme resize-none"
                placeholder="Add any notes about this session..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-3 px-6 rounded-full transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition-all shadow-lg"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 5.373 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 inline-block mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Session
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

