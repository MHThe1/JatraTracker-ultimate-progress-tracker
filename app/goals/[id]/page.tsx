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
import AppHeader from '@/components/AppHeader';
import { getTodayDateString } from '@/lib/dateUtils';

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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'total'>('day');
  
  // Calendar and sessions state
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filteredSubjectId, setFilteredSubjectId] = useState<string | null>(null);
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<StudySession | null>(null);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<StudySession | null>(null);

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

  const handleDeleteSession = async (session: StudySession) => {
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete session');

      await fetchGoal();
      await fetchSessions();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
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

  // Get current day name
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Calculate subject progress based on view mode
  const getSubjectProgress = (subject: Subject) => {
    if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
      return { goal: 0, studied: 0, percentage: 0 };
    }

    let subjectGoalMinutes = 0;
    let studied = 0;

    const subjectSessions = sessions.filter(s => s.endTime && s.subjectId === subject.id);

    switch (viewMode) {
      case 'day': {
        const today = getCurrentDay();
        const normalizedDays = subject.daysOfWeek.map(d => 
          d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
        );
        if (normalizedDays.includes(today)) {
          const todayStr = getTodayDateString();
          let isWithinRange = true;
          if (subject.startDate && todayStr < subject.startDate) isWithinRange = false;
          if (subject.finishDate && todayStr > subject.finishDate) isWithinRange = false;
          if (isWithinRange) {
            subjectGoalMinutes = subject.dailyMinutesGoal;
          }
        }
        studied = subjectSessions
          .filter(s => s.date === getTodayDateString())
          .reduce((sum, s) => sum + s.duration, 0);
        break;
      }
      case 'week': {
        subjectGoalMinutes = subject.dailyMinutesGoal * subject.daysOfWeek.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        const startDateStr = startOfWeek.toISOString().split('T')[0];
        const endDateStr = endOfWeek.toISOString().split('T')[0];
        studied = subjectSessions
          .filter(s => s.date >= startDateStr && s.date <= endDateStr)
          .reduce((sum, s) => sum + s.duration, 0);
        break;
      }
      case 'month': {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        let totalMinutes = 0;
        const currentDate = new Date(startOfMonth);
        while (currentDate <= endOfMonth) {
          const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          const normalizedDays = subject.daysOfWeek.map(d => 
            d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
          );
          let isWithinRange = true;
          if (subject.startDate && dateStr < subject.startDate) isWithinRange = false;
          if (subject.finishDate && dateStr > subject.finishDate) isWithinRange = false;
          if (isWithinRange && normalizedDays.includes(dayName)) {
            totalMinutes += subject.dailyMinutesGoal;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        subjectGoalMinutes = totalMinutes;
        const startDateStr = startOfMonth.toISOString().split('T')[0];
        const endDateStr = endOfMonth.toISOString().split('T')[0];
        studied = subjectSessions
          .filter(s => s.date >= startDateStr && s.date <= endDateStr)
          .reduce((sum, s) => sum + s.duration, 0);
        break;
      }
      case 'total': {
        if (goal?.startDate && goal?.finishDate && subject.startDate && subject.finishDate) {
          const [startYear, startMonth, startDay] = goal.startDate.split('-').map(Number);
          const [finishYear, finishMonth, finishDay] = goal.finishDate.split('-').map(Number);
          const [subjStartYear, subjStartMonth, subjStartDay] = subject.startDate.split('-').map(Number);
          const [subjFinishYear, subjFinishMonth, subjFinishDay] = subject.finishDate.split('-').map(Number);
          const actualStart = new Date(Math.max(new Date(startYear, startMonth - 1, startDay).getTime(), new Date(subjStartYear, subjStartMonth - 1, subjStartDay).getTime()));
          const actualFinish = new Date(Math.min(new Date(finishYear, finishMonth - 1, finishDay).getTime(), new Date(subjFinishYear, subjFinishMonth - 1, subjFinishDay).getTime()));
          const currentDate = new Date(actualStart);
          let totalMinutes = 0;
          while (currentDate <= actualFinish) {
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
            const normalizedDays = subject.daysOfWeek.map(d => 
              d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
            );
            if (normalizedDays.includes(dayName)) {
              totalMinutes += subject.dailyMinutesGoal;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
          subjectGoalMinutes = totalMinutes;
        } else {
          subjectGoalMinutes = 0;
        }
        studied = subject.studyTime;
        break;
      }
    }

    const percentage = subjectGoalMinutes > 0 ? Math.min((studied / subjectGoalMinutes) * 100, 100) : 0;
    return { goal: subjectGoalMinutes, studied, percentage };
  };

  // Get view mode label
  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'day': return 'today';
      case 'week': return 'this week';
      case 'month': return 'this month';
      case 'total': return 'total';
    }
  };

  // Format time display for subjects
  const getSubjectTimeDisplay = (subject: Subject) => {
    const progress = getSubjectProgress(subject);
    const label = getViewModeLabel();
    
    if (progress.goal > 0 || progress.studied > 0) {
      return `${progress.studied} min${label !== 'total' ? ` ${label}` : ''}`;
    }
    
    // Fallback for subjects without goals configured
    return `${subject.studyTime} min`;
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
      <main className="max-w-[1750px] mx-auto">
        
        <div className="flex items-start justify-between gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-white/90 hover:text-white flex items-center gap-2 text-sm sm:text-base"
          >
            ← Back to Goals
          </button>

        </div>
        {/* Mobile: App Header */}
        <div className="lg:hidden mb-6">
          <AppHeader />
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 mt-8">
          {/* Left column - Goal Progress and Subjects */}
          <div className="w-full lg:w-[60%]">
            <div className="mb-6">
              <GoalProgress 
                goal={goal} 
                subjects={goal.subjects} 
                refreshTrigger={refreshTrigger}
                onSettingsClick={() => setGoalSettingsOpen(true)}
                onViewModeChange={setViewMode}
              />
            </div>
            
            <div className="glass rounded-3xl p-4 sm:p-8 shadow-2xl mb-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-theme-card">Subjects</h2>
            <div className="flex gap-2 flex-wrap">
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
              {goal.subjects.map((subject) => {
                const progress = getSubjectProgress(subject);
                const progressPercentage = progress.goal > 0 ? progress.percentage : 0;
                
                return (
                  <div
                    key={subject.id}
                    className="relative bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
                  >
                    {/* Progress bar background - glass filled with water effect */}
                    {progressPercentage > 0 && !expandedSubjects.has(subject.id) && (
                      <div className="absolute inset-0 overflow-hidden flex flex-col-reverse">
                        <div
                          className="relative w-full bg-gradient-to-t from-white/20 via-white/15 to-white/10 transition-all duration-300"
                          style={{ 
                            height: `${progressPercentage}%`,
                          }}
                        >
                          {/* Curved water surface at top using SVG */}
                          <div className="absolute -top-1 left-0 right-0 w-full h-3 overflow-visible">
                            <svg
                              className="w-full h-full"
                              viewBox="0 0 1000 100"
                              preserveAspectRatio="none"
                            >
                              <defs>
                                <linearGradient id={`waveGradient-${subject.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" style={{ stopColor: "rgba(255, 255, 255, 0.3)", stopOpacity: 1 }} />
                                  <stop offset="100%" style={{ stopColor: "rgba(255, 255, 255, 0.1)", stopOpacity: 0 }} />
                                </linearGradient>
                              </defs>
                              {/* Smooth wave curve - creates the characteristic water surface */}
                              <path
                                d="M 0,25 Q 125,5 250,25 Q 375,45 500,25 Q 625,5 750,25 Q 875,45 1000,25 L 1000,100 L 0,100 Z"
                                fill={`url(#waveGradient-${subject.id})`}
                              />
                            </svg>
                          </div>
                          {/* Depth shading at bottom */}
                          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-white/15 to-transparent"></div>
                          {/* Glossy highlight shine */}
                          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent"></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Content above progress bar */}
                    <div className="relative z-10 p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => toggleSubject(subject.id)}
                          className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 text-left hover:opacity-60 hover:scale-[1.02] transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-semibold text-theme-card">
                              {subject.name}
                            </h3>
                            <div className="flex items-center gap-2 sm:gap-4 text-theme-muted text-xs sm:text-sm flex-wrap">
                              <p>{getSubjectTimeDisplay(subject)}</p>
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
                        </button>
                        <div className="flex gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSubjectForSettings(subject);
                            setSettingsModalOpen(true);
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-2 sm:px-4 rounded-full transition-all text-xs sm:text-sm"
                          title="Settings"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
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
                    </div>

                    {expandedSubjects.has(subject.id) && (
                      <div className="relative z-10 mt-4 pl-4 sm:pl-6 pr-4 sm:pr-6 pb-4 sm:pb-6 space-y-3">
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
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setCurrentSubjectForAddSession(subject);
                                const topic = subject.topics.find((t) => t.id === selectedTopic);
                                setCurrentTopicForAddSession(topic || null);
                                setAddSessionModalOpen(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs sm:text-sm">Add Session</span>
                            </button>
                            <button
                              onClick={() => {
                                setFilteredSubjectId(subject.id);
                                setSelectedDate(null);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs sm:text-sm">View Sessions</span>
                            </button>
                          </div>
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
                );
              })}
            </div>
          )}
        </div>
            </div>
          {/* Right column - Calendar */}
          <div className="w-full lg:w-[40%]">
            <div className="sticky top-8 space-y-4">
              {/* Desktop: App Header, DateTime and Theme Toggle */}
              <div className="hidden lg:block">
                <div className="flex items-center justify-between gap-4 pl-2">
                  <AppHeader />
                  <div className="flex items-center gap-2 sm:gap-4">
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
                  onSessionEdit={(session) => {
                    setSelectedSessionForEdit(session);
                    setShowEditSessionModal(true);
                  }}
                  onSessionDelete={(session) => {
                    setSessionToDelete(session);
                    setShowDeleteConfirmModal(true);
                  }}
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
          onDelete={async () => {
            const response = await fetch(`/api/goals/${goal.id}`, {
              method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete goal');
            
            // Navigate back to home page after deletion
            router.push('/');
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

      {/* Edit Session Modal */}
      {showEditSessionModal && selectedSessionForEdit && goal && (
        <EditSessionModal
          session={selectedSessionForEdit}
          subjects={goal.subjects}
          onClose={() => {
            setShowEditSessionModal(false);
            setSelectedSessionForEdit(null);
          }}
          onSave={async () => {
            await fetchGoal();
            await fetchSessions();
            setRefreshTrigger((prev) => prev + 1);
            setShowEditSessionModal(false);
            setSelectedSessionForEdit(null);
          }}
          onDelete={async () => {
            if (selectedSessionForEdit) {
              await handleDeleteSession(selectedSessionForEdit);
            }
            setShowEditSessionModal(false);
            setSelectedSessionForEdit(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {sessionToDelete && showDeleteConfirmModal && (
        <DeleteConfirmModal
          session={sessionToDelete}
          onConfirm={async () => {
            await handleDeleteSession(sessionToDelete);
            setShowDeleteConfirmModal(false);
            setSessionToDelete(null);
          }}
          onCancel={() => {
            setShowDeleteConfirmModal(false);
            setSessionToDelete(null);
          }}
        />
      )}
    </div>
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
                className="w-full max-w-full min-w-0 px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme box-border"
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
          {showDeleteConfirm && onDelete && (
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
                    onClick={() => {
                      onDelete();
                      setShowDeleteConfirm(false);
                    }}
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

// Delete Confirmation Modal Component
function DeleteConfirmModal({
  session,
  onConfirm,
  onCancel,
}: {
  session: StudySession;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 shadow-2xl max-w-md w-full relative">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-theme-muted hover:text-theme-card transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="text-xl font-bold text-theme-card mb-4">Delete Session?</h3>
          <p className="text-theme-muted mb-6">
            Are you sure you want to delete this {formatTime(session.duration)} session from{' '}
            {formatDate(session.date)}? This action cannot be undone.
          </p>
          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-3 px-6 rounded-full transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-lg"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
