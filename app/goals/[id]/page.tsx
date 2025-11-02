'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Goal, Subject, Topic, StudySession } from '@/types';
import TimerModal from '@/components/TimerModal';
import AddSessionModal from '@/components/AddSessionModal';
import SessionsModal from '@/components/SessionsModal';
import DateTimeDisplay from '@/components/DateTimeDisplay';
import SubjectSettings from '@/components/SubjectSettings';
import GoalProgress from '@/components/GoalProgress';
import GoalSettings from '@/components/GoalSettings';
import SubjectProgress from '@/components/SubjectProgress';
import ThemeToggle from '@/components/ThemeToggle';
import CalendarView from '@/components/CalendarView';

interface GoalWithDetails extends Goal {
  subjects: Array<Subject & { topics: Topic[] }>;
}

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<GoalWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [addingTopicTo, setAddingTopicTo] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [currentSubjectForTimer, setCurrentSubjectForTimer] = useState<Subject | null>(null);
  const [currentTopicForTimer, setCurrentTopicForTimer] = useState<Topic | null>(null);
  const [addSessionModalOpen, setAddSessionModalOpen] = useState(false);
  const [currentSubjectForAddSession, setCurrentSubjectForAddSession] = useState<Subject | null>(null);
  const [currentTopicForAddSession, setCurrentTopicForAddSession] = useState<Topic | null>(null);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [currentSubjectForSettings, setCurrentSubjectForSettings] = useState<Subject | null>(null);
  const [goalSettingsOpen, setGoalSettingsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Calendar and sessions state
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filteredSubjectId, setFilteredSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (goalId) {
      fetchGoal();
      fetchSessions();
    }
  }, [goalId, refreshTrigger]);
  
  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/sessions?goalId=${goalId}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchGoal = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/goals/${goalId}`);
      if (!response.ok) throw new Error('Failed to fetch goal');
      const data = await response.json();
      setGoal(data);
      return data;
    } catch (error) {
      console.error('Error fetching goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (newSubjectName.trim() && !submitting) {
      try {
        setSubmitting(true);
        const response = await fetch(`/api/goals/${goalId}/subjects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newSubjectName.trim() }),
        });

        if (!response.ok) throw new Error('Failed to create subject');

        await fetchGoal(); // Refresh goal data
        setNewSubjectName('');
        setShowAddSubject(false);
      } catch (error) {
        console.error('Error creating subject:', error);
        alert('Failed to create subject. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleAddTopic = async (subjectId: string) => {
    if (newTopicName.trim() && !submitting) {
      try {
        setSubmitting(true);
        const response = await fetch(`/api/subjects/${subjectId}/topics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newTopicName.trim() }),
        });

        if (!response.ok) throw new Error('Failed to create topic');

        await fetchGoal(); // Refresh goal data
        setNewTopicName('');
        setAddingTopicTo(null);
      } catch (error) {
        console.error('Error creating topic:', error);
        alert('Failed to create topic. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
      // Clear selected topic when collapsing
      setSelectedTopic(null);
    } else {
      newExpanded.add(subjectId);
      // Reset selected topic when expanding a subject
      setSelectedTopic(null);
    }
    setExpandedSubjects(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-gradient p-4">
        <main className="max-w-4xl mx-auto py-8">
          <div className="glass rounded-3xl p-12 text-center shadow-2xl">
            <p className="text-theme-card">Loading goal...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-theme-gradient p-4">
        <main className="max-w-4xl mx-auto py-8">
          <div className="glass rounded-3xl p-12 text-center shadow-2xl">
            <h2 className="text-2xl font-semibold text-theme-card mb-4">
              Goal not found
            </h2>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-all"
            >
              Back to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient p-4">
      <main className="max-w-[1750px] mx-auto py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-white/90 hover:text-white flex items-center gap-2 text-sm sm:text-base"
          >
            ← Back to Goals
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 mt-8">
          {/* Left column - Goal Progress and Subjects */}
          <div className="w-full lg:w-[60%]">
            <div className="mb-6">
              <GoalProgress goal={goal} subjects={goal.subjects} refreshTrigger={refreshTrigger} />
            </div>
            
            <div className="glass rounded-3xl p-4 sm:p-8 shadow-2xl mb-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-theme-card">Subjects</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setAddSessionModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-full transition-all text-xs sm:text-sm"
                title="Add Custom Session"
              >
                📝 <span className="hidden sm:inline">Add</span> Session
              </button>
              <button
                onClick={() => setGoalSettingsOpen(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-full transition-all text-xs sm:text-sm"
                title="Goal Settings"
              >
                ⚙️ <span className="hidden sm:inline">Goal</span> Settings
              </button>
              <button
                onClick={() => setShowAddSubject(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-full transition-all text-xs sm:text-base"
              >
                + Add Subject
              </button>
            </div>
          </div>

          {showAddSubject && (
            <div className="mb-6 p-4 sm:p-6 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
              <h3 className="text-lg sm:text-xl font-semibold text-theme-card mb-4">
                Add New Subject
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g., Mathematics"
                  className="flex-1 px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card placeholder-theme-muted input-theme"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubject();
                    if (e.key === 'Escape') {
                      setShowAddSubject(false);
                      setNewSubjectName('');
                    }
                  }}
                />
                <div className="flex gap-3 sm:gap-4">
                  <button
                    onClick={handleAddSubject}
                    disabled={submitting}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition-all"
                  >
                    {submitting ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSubject(false);
                      setNewSubjectName('');
                    }}
                    className="flex-1 sm:flex-none bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-3 px-6 rounded-full transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {goal.subjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-theme-muted mb-4">No subjects yet</p>
              <p className="text-theme-muted text-sm">
                Add your first subject to organize your study materials
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {goal.subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/30"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <button
                          onClick={() => toggleSubject(subject.id)}
                          className="text-theme-card hover:opacity-80 shrink-0"
                        >
                          {expandedSubjects.has(subject.id) ? '▼' : '▶'}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-theme-card">
                            {subject.name}
                          </h3>
                          <div className="flex items-center gap-2 sm:gap-4 text-theme-muted text-xs sm:text-sm flex-wrap">
                            <p>{subject.studyTime} min</p>
                            {subject.dailyMinutesGoal && (
                              <span className="text-blue-600">
                                Daily: {subject.dailyMinutesGoal} min
                              </span>
                            )}
                            {subject.daysOfWeek && subject.daysOfWeek.length > 0 && (
                              <span className="text-purple-600">
                                {subject.daysOfWeek.length} days/wk
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setCurrentSubjectForSettings(subject);
                            setSettingsModalOpen(true);
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-2 sm:px-4 rounded-full transition-all text-xs sm:text-sm"
                          title="Settings"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => {
                            // Ensure subject is expanded
                            if (!expandedSubjects.has(subject.id)) {
                              const newExpanded = new Set(expandedSubjects);
                              newExpanded.add(subject.id);
                              setExpandedSubjects(newExpanded);
                            }
                            // Toggle add topic form
                            setAddingTopicTo(addingTopicTo === subject.id ? null : subject.id);
                            setNewTopicName('');
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-2 sm:px-4 rounded-full transition-all text-xs sm:text-sm"
                        >
                          + Topic
                        </button>
                      </div>
                    </div>

                    {expandedSubjects.has(subject.id) && (
                      <div className="mt-4 pl-6 sm:pl-10 space-y-3">
                        {/* Subject Progress */}
                        <SubjectProgress
                          subject={subject}
                          goalId={goalId}
                          refreshTrigger={refreshTrigger}
                        />

                        <div className="mb-4 space-y-2">
                          <button
                            onClick={() => {
                              setCurrentSubjectForTimer(subject);
                              const topic = subject.topics.find((t) => t.id === selectedTopic);
                              setCurrentTopicForTimer(topic || null);
                              setTimerModalOpen(true);
                            }}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                            Start Study Timer
                            {selectedTopic && subject.topics.some((t) => t.id === selectedTopic) && (
                              <span className="text-xs bg-white/20 px-2 py-1 rounded">
                                {subject.topics.find((t) => t.id === selectedTopic)?.name}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setCurrentSubjectForAddSession(subject);
                              const topic = subject.topics.find((t) => t.id === selectedTopic);
                              setCurrentTopicForAddSession(topic || null);
                              setAddSessionModalOpen(true);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Session
                          </button>
                          <button
                            onClick={() => {
                              setFilteredSubjectId(subject.id);
                              setSelectedDate(null);
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            View Sessions
                          </button>
                        </div>
                        {addingTopicTo === subject.id && (
                          <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                            <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
                              <input
                                type="text"
                                value={newTopicName}
                                onChange={(e) => setNewTopicName(e.target.value)}
                                placeholder="Topic name"
                                className="flex-1 px-3 py-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-theme-card placeholder-theme-muted text-sm input-theme"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddTopic(subject.id);
                                  if (e.key === 'Escape') {
                                    setAddingTopicTo(null);
                                    setNewTopicName('');
                                  }
                                }}
                              />
                              <div className="flex gap-2 sm:gap-3">
                                <button
                                  onClick={() => handleAddTopic(subject.id)}
                                  disabled={submitting}
                                  className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-xl transition-all text-sm"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingTopicTo(null);
                                    setNewTopicName('');
                                  }}
                                  className="flex-1 sm:flex-none bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-2 px-4 rounded-xl transition-all text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {subject.topics.length === 0 ? (
                          <p className="text-theme-muted text-sm">No topics yet</p>
                        ) : (
                          <div className="space-y-2">
                            {subject.topics.map((topic) => (
                              <button
                                key={topic.id}
                                onClick={() => {
                                  if (selectedTopic === topic.id) {
                                    setSelectedTopic(null);
                                  } else {
                                    setSelectedTopic(topic.id);
                                  }
                                }}
                                className={`w-full text-left p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/30 transition-all ${
                                  selectedTopic === topic.id ? 'ring-2 ring-purple-500' : ''
                                }`}
                              >
                                <p className="font-medium text-theme-card">{topic.name}</p>
                                <p className="text-theme-muted text-xs mt-1">
                                  {topic.studyTime} minutes studied
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
            </div>
          {/* Right column - Calendar */}
          <div className="w-full lg:w-[40%]">
            <div className="sticky top-8 space-y-4">
              {/* Desktop: DateTime and Theme Toggle */}
              <div className="hidden lg:block">
                <div className="">
                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
                    <DateTimeDisplay />
                    <ThemeToggle />
                  </div>
                </div>
              </div>
              
              {/* Filter info and clear button */}
              {filteredSubjectId && (
                <div className="glass rounded-2xl p-4 shadow-xl border border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-theme-card font-medium">
                      Filtering: {goal.subjects.find(s => s.id === filteredSubjectId)?.name || 'Unknown Subject'}
                    </span>
                    <button
                      onClick={() => setFilteredSubjectId(null)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-full transition-all text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Filter
                    </button>
                  </div>
                </div>
              )}
              
              <div className="glass rounded-3xl p-4 sm:p-8 shadow-2xl">
                {/* Mobile: DateTime and Theme Toggle */}
                <div className="lg:hidden flex items-center justify-between mb-6 pb-6 border-b border-white/20">
                  <DateTimeDisplay />
                  <ThemeToggle />
                </div>
                
                <CalendarView
                  sessions={filteredSubjectId ? sessions.filter(s => s.subjectId === filteredSubjectId) : sessions}
                  subjects={goal.subjects}
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  onSessionEdit={() => {}} // Handled by SessionsModal
                  onSessionDelete={() => {}} // Handled by SessionsModal
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Timer Modal */}
      {currentSubjectForTimer && (
        <TimerModal
          isOpen={timerModalOpen}
          onClose={() => {
            setTimerModalOpen(false);
            setCurrentSubjectForTimer(null);
            setCurrentTopicForTimer(null);
          }}
          goalId={goalId}
          subjectId={currentSubjectForTimer.id}
          subjectName={currentSubjectForTimer.name}
          topicId={currentTopicForTimer?.id}
          topicName={currentTopicForTimer?.name}
          dailyGoal={currentSubjectForTimer.dailyMinutesGoal}
          onSessionComplete={() => {
            fetchGoal();
            setSelectedTopic(null);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Subject Settings Modal */}
      {currentSubjectForSettings && (
        <SubjectSettings
          subject={currentSubjectForSettings}
          onSave={async (settings) => {
            const response = await fetch(`/api/subjects/${currentSubjectForSettings.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(settings),
            });

            if (!response.ok) throw new Error('Failed to save settings');
            await fetchGoal();
          }}
          onClose={() => {
            setSettingsModalOpen(false);
            setCurrentSubjectForSettings(null);
          }}
        />
      )}

      {/* Goal Settings Modal */}
      {goal && goalSettingsOpen && (
        <GoalSettings
          goal={goal}
          onSave={async (settings) => {
            const response = await fetch(`/api/goals/${goal.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(settings),
            });

            if (!response.ok) throw new Error('Failed to save settings');
            await fetchGoal();
          }}
          onClose={() => {
            setGoalSettingsOpen(false);
          }}
        />
      )}

      {/* Add Session Modal */}
      {goal && (
        <AddSessionModal
          isOpen={addSessionModalOpen}
          onClose={() => setAddSessionModalOpen(false)}
          goalId={goalId}
          subjects={goal.subjects}
          preselectedSubjectId={currentSubjectForAddSession?.id}
          preselectedTopicId={currentTopicForAddSession?.id}
          onSessionAdded={async () => {
            await fetchGoal();
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      {/* Sessions Modal */}
      {goal && (
        <SessionsModal
          isOpen={sessionsModalOpen}
          onClose={() => setSessionsModalOpen(false)}
          goalId={goalId}
          subjects={goal.subjects}
          onSessionsChange={async () => {
            await fetchGoal();
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
