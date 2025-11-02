'use client';

import { useState, useEffect } from 'react';
import type { StudySession } from '@/types';
import CalendarView from './CalendarView';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  subjects: Array<{ id: string; name: string; topics: Array<{ id: string; name: string }> }>;
  onSessionsChange?: () => void;
}

type ViewMode = 'list' | 'calendar';

export default function SessionsModal({
  isOpen,
  onClose,
  goalId,
  subjects,
  onSessionsChange,
}: SessionsModalProps) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, goalId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sessions?goalId=${goalId}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSession) return;

    try {
      const response = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete session');

      setShowDeleteConfirm(false);
      setSelectedSession(null);
      await fetchSessions();
      if (onSessionsChange) {
        onSessionsChange();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
        <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/30 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-theme-card">
              Study Sessions
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-full font-semibold transition-all text-sm ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/20 text-theme-card hover:bg-white/30'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-full font-semibold transition-all text-sm ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/20 text-theme-card hover:bg-white/30'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={onClose}
                className="text-theme-muted hover:text-theme-card transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-theme-muted">Loading sessions...</div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-center">
                <div>
                  <div className="text-6xl mb-4">📚</div>
                  <p className="text-theme-muted">No study sessions yet</p>
                  <p className="text-theme-muted text-sm mt-2">
                    Start tracking your study sessions to see them here
                  </p>
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onDoubleClick={() => {
                      setSelectedSession(session);
                      setShowEditModal(true);
                    }}
                    className="group bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20 hover:border-white/30 p-4 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl font-bold text-theme-card bg-gradient-to-br from-blue-500 to-purple-600 bg-clip-text text-transparent">
                            {formatTime(session.duration)}
                          </div>
                          <div className="h-6 w-px bg-white/20" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-theme-card text-base truncate">
                              {subjects.find(s => s.id === session.subjectId)?.name || 'Unknown Subject'}
                            </div>
                            {session.topicId && (
                              <div className="text-xs text-theme-muted truncate flex items-center gap-1 mt-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                {subjects
                                  .find(s => s.id === session.subjectId)
                                  ?.topics.find(t => t.id === session.topicId)?.name || 'Unknown Topic'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-theme-muted mt-2">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(session.date)}
                          </span>
                          {session.comment && (
                            <span className="flex items-center gap-1 truncate max-w-xs" title={session.comment}>
                              <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              {session.comment}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 transition-all"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 transition-all"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <CalendarView
                sessions={sessions}
                subjects={subjects}
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onSessionEdit={(session) => {
                  setSelectedSession(session);
                  setShowEditModal(true);
                }}
                onSessionDelete={(session) => {
                  setSelectedSession(session);
                  setShowDeleteConfirm(true);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedSession && (
        <EditSessionModal
          session={selectedSession}
          subjects={subjects}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSession(null);
          }}
          onSave={async () => {
            await fetchSessions();
            if (onSessionsChange) {
              onSessionsChange();
            }
            setShowEditModal(false);
            setSelectedSession(null);
          }}
          onDelete={async () => {
            await handleDelete();
            setShowEditModal(false);
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && selectedSession && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="bg-black/50 backdrop-blur-sm fixed inset-0" />
          <div className="glass rounded-2xl p-6 shadow-2xl max-w-md w-full relative z-50">
            <h3 className="text-xl font-bold text-theme-card mb-4">Delete Session?</h3>
            <p className="text-theme-muted mb-6">
              Are you sure you want to delete this {formatTime(selectedSession.duration)} session from{' '}
              {formatDate(selectedSession.date)}? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedSession(null);
                }}
                className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-3 px-6 rounded-full transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Edit Session Modal Component
function EditSessionModal({
  session,
  subjects,
  onClose,
  onSave,
  onDelete,
}: {
  session: StudySession;
  subjects: Array<{ id: string; name: string; topics: Array<{ id: string; name: string }> }>;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const [duration, setDuration] = useState<string>(session.duration.toString());
  const [date, setDate] = useState<string>(session.date);
  const [comment, setComment] = useState<string>(session.comment || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(session.subjectId || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(session.topicId || '');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      alert('Please enter a valid duration in minutes');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: durationNum,
          date,
          comment: comment.trim() || null,
          subjectId: selectedSubjectId || null,
          topicId: selectedTopicId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update session');
      }

      onSave();
    } catch (error) {
      console.error('Error updating session:', error);
      alert('Failed to update session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 shadow-2xl max-w-md w-full relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-theme-muted hover:text-theme-card transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="text-2xl font-bold text-theme-card mb-6">Edit Session</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-card mb-2">
                Subject *
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicId('');
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

            <div>
              <label className="block text-sm font-medium text-theme-card mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-card mb-2">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-card mb-2">
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex gap-4">
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
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="w-full bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 hover:text-red-300 font-semibold py-3 px-6 rounded-full transition-all border border-red-600/30"
                >
                  Delete Session
                </button>
              )}
            </div>
          </form>

          {/* Delete Confirm Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
              <div className="bg-black/50 backdrop-blur-sm fixed inset-0" />
              <div className="glass rounded-2xl p-6 shadow-2xl max-w-md w-full relative z-50">
                <h3 className="text-xl font-bold text-theme-card mb-4">Delete Session?</h3>
                <p className="text-theme-muted mb-6">
                  Are you sure you want to delete this session? This action cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-3 px-6 rounded-full transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

