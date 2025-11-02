'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Goal, Subject, StudySession } from '@/types';
import TotalProgress from '@/components/TotalProgress';
import DateTimeDisplay from '@/components/DateTimeDisplay';
import ThemeToggle from '@/components/ThemeToggle';
import CalendarView from '@/components/CalendarView';
import AppHeader from '@/components/AppHeader';
import GoalProgress from '@/components/GoalProgress';
import { getTodayDateString } from '@/lib/dateUtils';

interface GoalWithDetails extends Goal {
  subjects: Array<Subject & { topics: Array<{ id: string; name: string; studyTime: number }> }>;
}

export default function Home() {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'total'>('day');

  // Calendar and sessions state
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filteredGoalId, setFilteredGoalId] = useState<string | null>(null);
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<StudySession | null>(null);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<StudySession | null>(null);

  // Refs for height matching
  const goalsRef = useRef<HTMLDivElement>(null);
  const remainingTasksRef = useRef<HTMLDivElement>(null);

  // Fetch goals on mount
  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger, filteredGoalId]);

  const fetchSessions = async () => {
    try {
      const url = filteredGoalId ? `/api/sessions?goalId=${filteredGoalId}` : '/api/sessions';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/goals');
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      
      // Fetch full details for each goal
      const goalsWithDetails = await Promise.all(
        data.map(async (goal: Goal) => {
          const detailResponse = await fetch(`/api/goals/${goal.id}`);
          if (detailResponse.ok) {
            return await detailResponse.json();
          }
          return goal;
        })
      );
      
      setGoals(goalsWithDetails);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (newGoalName.trim() && !submitting) {
      try {
        setSubmitting(true);
        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newGoalName.trim() }),
        });

        if (!response.ok) throw new Error('Failed to create goal');

        const newGoal = await response.json();
        // Fetch full details for the new goal
        const detailResponse = await fetch(`/api/goals/${newGoal.id}`);
        const newGoalWithDetails = detailResponse.ok ? await detailResponse.json() : newGoal;
        
        setGoals([newGoalWithDetails, ...goals]);
        setNewGoalName('');
        setShowAddGoal(false);
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error creating goal:', error);
        alert('Failed to create goal. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const handleDeleteSession = async (session: StudySession) => {
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete session');

      await fetchGoals();
      await fetchSessions();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  // Get all subjects from all goals for calendar
  const getAllSubjects = () => {
    return goals.flatMap(goal => 
      goal.subjects.map(subject => ({
        ...subject,
        goalId: goal.id,
      }))
    );
  };

  // Calculate goal progress based on view mode
  const getGoalProgress = (goal: GoalWithDetails) => {
    if (!goal.subjects || goal.subjects.length === 0) {
      return { goal: 0, studied: 0, percentage: 0 };
    }

    const goalSessions = sessions.filter(s => s.endTime && s.goalId === goal.id);
    let goalMinutes = 0;
    let studied = 0;

    switch (viewMode) {
      case 'day': {
        const today = getCurrentDay();
        const todayStr = getTodayDateString();
        goalMinutes = goal.subjects.reduce((sum, subject) => {
          if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
            return sum;
          }
          const normalizedDays = subject.daysOfWeek.map(d => 
            d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
          );
          if (normalizedDays.includes(today)) {
            let isWithinRange = true;
            if (subject.startDate && todayStr < subject.startDate) isWithinRange = false;
            if (subject.finishDate && todayStr > subject.finishDate) isWithinRange = false;
            if (isWithinRange) {
              return sum + subject.dailyMinutesGoal;
            }
          }
          return sum;
        }, 0);
        studied = goalSessions
          .filter(s => s.date === todayStr)
          .reduce((sum, s) => sum + s.duration, 0);
        break;
      }
      case 'week': {
        goalMinutes = goal.subjects.reduce((sum, subject) => {
          if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
            return sum;
          }
          return sum + (subject.dailyMinutesGoal * subject.daysOfWeek.length);
        }, 0);
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
        studied = goalSessions
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
          goal.subjects.forEach(subject => {
            if (subject.dailyMinutesGoal && subject.daysOfWeek && subject.daysOfWeek.length > 0) {
              const normalizedDays = subject.daysOfWeek.map(d => 
                d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
              );
              let isWithinRange = true;
              if (subject.startDate && dateStr < subject.startDate) isWithinRange = false;
              if (subject.finishDate && dateStr > subject.finishDate) isWithinRange = false;
              if (isWithinRange && normalizedDays.includes(dayName)) {
                totalMinutes += subject.dailyMinutesGoal;
              }
            }
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
        goalMinutes = totalMinutes;
        const startDateStr = startOfMonth.toISOString().split('T')[0];
        const endDateStr = endOfMonth.toISOString().split('T')[0];
        studied = goalSessions
          .filter(s => s.date >= startDateStr && s.date <= endDateStr)
          .reduce((sum, s) => sum + s.duration, 0);
        break;
      }
      case 'total': {
        if (goal.startDate && goal.finishDate) {
          const [startYear, startMonth, startDay] = goal.startDate.split('-').map(Number);
          const [finishYear, finishMonth, finishDay] = goal.finishDate.split('-').map(Number);
          const actualStart = new Date(startYear, startMonth - 1, startDay);
          const actualFinish = new Date(finishYear, finishMonth - 1, finishDay);
          const currentDate = new Date(actualStart);
          let totalMinutes = 0;
          while (currentDate <= actualFinish) {
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
            goal.subjects.forEach(subject => {
              if (subject.dailyMinutesGoal && subject.daysOfWeek && subject.daysOfWeek.length > 0) {
                const normalizedDays = subject.daysOfWeek.map(d => 
                  d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
                );
                if (normalizedDays.includes(dayName)) {
                  totalMinutes += subject.dailyMinutesGoal;
                }
              }
            });
            currentDate.setDate(currentDate.getDate() + 1);
          }
          goalMinutes = totalMinutes;
        } else {
          // Estimate based on weekly goal * 12 weeks
          goalMinutes = goal.subjects.reduce((sum, subject) => {
            if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
              return sum;
            }
            return sum + (subject.dailyMinutesGoal * subject.daysOfWeek.length * 12);
          }, 0);
        }
        studied = goal.totalStudyTime;
        break;
      }
    }

    const percentage = goalMinutes > 0 ? Math.min((studied / goalMinutes) * 100, 100) : 0;
    return { goal: goalMinutes, studied, percentage };
  };

  // Get current day name
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Get remaining tasks for today
  const getRemainingTasks = () => {
    const today = getCurrentDay();
    const todayStr = getTodayDateString();
    const tasks: Array<{
      goalId: string;
      goalName: string;
      subjectId: string;
      subjectName: string;
      goalMinutes: number;
      studiedMinutes: number;
      remainingMinutes: number;
    }> = [];

    goals.forEach(goal => {
      goal.subjects.forEach(subject => {
        if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
          return;
        }

        const normalizedDays = subject.daysOfWeek.map(d => 
          d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
        );

        // Check if subject is scheduled for today
        if (normalizedDays.includes(today)) {
          // Check subject date range
          let isWithinRange = true;
          if (subject.startDate && todayStr < subject.startDate) isWithinRange = false;
          if (subject.finishDate && todayStr > subject.finishDate) isWithinRange = false;

          if (isWithinRange) {
            // Calculate how much has been studied today for this subject
            const subjectSessions = sessions.filter(s => 
              s.goalId === goal.id && 
              s.subjectId === subject.id && 
              s.date === todayStr && 
              s.endTime
            );
            const studiedMinutes = subjectSessions.reduce((sum, s) => sum + s.duration, 0);
            const remainingMinutes = Math.max(0, subject.dailyMinutesGoal - studiedMinutes);

            // Only include if there's remaining time
            if (remainingMinutes > 0) {
              tasks.push({
                goalId: goal.id,
                goalName: goal.name,
                subjectId: subject.id,
                subjectName: subject.name,
                goalMinutes: subject.dailyMinutesGoal,
                studiedMinutes,
                remainingMinutes,
              });
            }
          }
        }
      });
    });

    // Sort by remaining minutes (most remaining first)
    return tasks.sort((a, b) => b.remainingMinutes - a.remainingMinutes);
  };

  const remainingTasks = getRemainingTasks();
  const totalRemainingMinutes = remainingTasks.reduce((sum, task) => sum + task.remainingMinutes, 0);

  // Match Remaining Tasks height to Goals
  useEffect(() => {
    const matchHeights = () => {
      if (goalsRef.current && remainingTasksRef.current && window.innerWidth >= 1024) {
        const goalsHeight = goalsRef.current.offsetHeight;
        remainingTasksRef.current.style.height = `${goalsHeight}px`;
      } else if (remainingTasksRef.current) {
        remainingTasksRef.current.style.height = 'auto';
      }
    };

    matchHeights();
    window.addEventListener('resize', matchHeights);
    
    // Also check after a short delay to account for content changes
    const timeoutId = setTimeout(matchHeights, 100);

    return () => {
      window.removeEventListener('resize', matchHeights);
      clearTimeout(timeoutId);
    };
  }, [goals, expandedGoals, remainingTasks, showAddGoal]);

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-gradient p-4">
        <main className="max-w-[1750px] mx-auto py-8">
          <div className="glass rounded-3xl p-12 text-center shadow-2xl">
            <p className="text-theme-card">Loading goals...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient p-4">
      <main className="max-w-[1750px] mx-auto">
        {/* Mobile: App Header */}
        <div className="lg:hidden mb-6">
          <AppHeader />
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 mt-8">
          {/* Left column - Total Progress and Goals */}
          <div className="w-full lg:w-[60%]">
            {goals.length > 0 && (
              <div className="mb-6">
                <TotalProgress 
                  goals={goals} 
                  refreshTrigger={refreshTrigger}
                />
          </div>
            )}
            
            {/* Goals and Remaining Tasks - Side by Side */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8 lg:items-start">
              {/* Goals Section - 60% of left column */}
              <div ref={goalsRef} className="w-full lg:w-[60%] glass rounded-3xl p-4 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-theme-card">Goals</h2>
                <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowAddGoal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-full transition-all text-xs sm:text-base"
            >
                    + Add Goal
            </button>
          </div>
              </div>

        {showAddGoal && (
                <div className="mb-6 p-4 sm:p-6 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
                  <h3 className="text-lg sm:text-xl font-semibold text-theme-card mb-4">
                    Add New Goal
                  </h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="e.g., Preparation for GRE"
                className="flex-1 px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card placeholder-theme-muted input-theme"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGoal();
                  if (e.key === 'Escape') {
                    setShowAddGoal(false);
                    setNewGoalName('');
                  }
                }}
              />
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={handleAddGoal}
                  disabled={submitting}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition-all"
                >
                  {submitting ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowAddGoal(false);
                    setNewGoalName('');
                  }}
                  className="flex-1 sm:flex-none bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-3 px-6 rounded-full transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

              {goals.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-theme-muted mb-4">No goals yet</p>
                  <p className="text-theme-muted text-sm">
                    Add your first goal to organize your study materials
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => {
                    const progress = getGoalProgress(goal);
                    const progressPercentage = progress.goal > 0 ? progress.percentage : 0;
                    
                    return (
                      <div
                        key={goal.id}
                        className="relative bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
                      >
                        {/* Progress bar background - glass filled with water effect */}
                        {progressPercentage > 0 && !expandedGoals.has(goal.id) && (
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
                                    <linearGradient id={`goalWaveGradient-${goal.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" style={{ stopColor: "rgba(255, 255, 255, 0.3)", stopOpacity: 1 }} />
                                      <stop offset="100%" style={{ stopColor: "rgba(255, 255, 255, 0.1)", stopOpacity: 0 }} />
                                    </linearGradient>
                                  </defs>
                                  {/* Smooth wave curve - creates the characteristic water surface */}
                                  <path
                                    d="M 0,25 Q 125,5 250,25 Q 375,45 500,25 Q 625,5 750,25 Q 875,45 1000,25 L 1000,100 L 0,100 Z"
                                    fill={`url(#goalWaveGradient-${goal.id})`}
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
                        
                        {/* Content */}
                        <div className="relative z-10 p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => toggleGoal(goal.id)}
                            className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 text-left hover:opacity-60 hover:scale-[1.02] transition-all"
                          >
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg sm:text-xl font-semibold text-theme-card">
                                {goal.name}
                              </h3>
                              <div className="flex items-center gap-2 sm:gap-4 text-theme-muted text-xs sm:text-sm flex-wrap">
                                <p>{Math.floor(goal.totalStudyTime / 60)}h {goal.totalStudyTime % 60}m studied</p>
                                {goal.startDate && (
                                  <span className="text-blue-600">
                                    Start: {new Date(goal.startDate).toLocaleDateString()}
                                  </span>
                                )}
                                {goal.finishDate && (
                                  <span className="text-purple-600">
                                    Finish: {new Date(goal.finishDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/goals/${goal.id}`);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-2 sm:px-4 rounded-full transition-all text-xs sm:text-sm"
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedGoals.has(goal.id) && (
                        <div className="relative z-10 mt-4 pl-4 sm:pl-6 pr-4 sm:pr-6 pb-4 sm:pb-6 space-y-3">
                          <GoalProgress 
                            goal={goal} 
                            subjects={goal.subjects} 
                            refreshTrigger={refreshTrigger}
                            onViewModeChange={setViewMode}
                          />
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
              </div>

              {/* Remaining Tasks Section - 40% of left column */}
              <div 
                ref={remainingTasksRef}
                className="w-full lg:w-[40%] glass rounded-3xl p-4 sm:p-8 shadow-2xl flex flex-col"
              >
                <div className="flex flex-col items-start mb-6 sm:mb-8 gap-2 shrink-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-theme-card">Remaining Tasks of the Day</h2>
                  {totalRemainingMinutes > 0 && (
                    <div className="text-base sm:text-lg font-semibold text-theme-card">
                      {formatTime(totalRemainingMinutes)} remaining
                    </div>
                  )}
                </div>

                <div 
                  className="flex-1 overflow-y-auto min-h-0"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                  } as React.CSSProperties}
                >
                  <style>{`
                    div[class*="overflow-y-auto"]::-webkit-scrollbar {
                      display: none;
                      width: 0;
                      height: 0;
                    }
                  `}</style>
                  {remainingTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-theme-muted mb-2 text-sm">No remaining tasks!</p>
                      <p className="text-theme-muted text-xs">
                        Great job completing all your scheduled subjects for today
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {remainingTasks.map((task) => (
                        <button
                          key={`${task.goalId}-${task.subjectId}`}
                          onClick={() => router.push(`/goals/${task.goalId}`)}
                          className="w-full relative bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden hover:bg-white/20 transition-all text-left"
                        >
                          <div className="relative z-10 p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-theme-card mb-1">
                                {task.subjectName}
                              </h3>
                              <p className="text-theme-muted text-xs mb-2 truncate">
                                {task.goalName}
                              </p>
                              <div className="text-xs">
                                <span className="text-orange-600 font-semibold">
                                  {formatTime(task.remainingMinutes)} remaining
                                </span>
                              </div>
                              </div>
                              <div className="shrink-0 mt-1">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                            
                            {/* Progress indicator */}
                            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                                style={{
                                  width: `${Math.min((task.studiedMinutes / task.goalMinutes) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
              {filteredGoalId && (
                <div className="glass rounded-2xl p-4 shadow-xl border border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-theme-card font-medium">
                      Filtering: {goals.find(g => g.id === filteredGoalId)?.name || 'Unknown Goal'}
                    </span>
                    <button
                      onClick={() => {
                        setFilteredGoalId(null);
                        setSelectedDate(null);
                      }}
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
                  sessions={filteredGoalId ? sessions.filter(s => s.goalId === filteredGoalId) : sessions}
                  subjects={getAllSubjects()}
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

      {/* Edit Session Modal */}
      {showEditSessionModal && selectedSessionForEdit && (
        <EditSessionModal
          session={selectedSessionForEdit}
          goals={goals}
          onClose={() => {
            setShowEditSessionModal(false);
            setSelectedSessionForEdit(null);
          }}
          onSave={async () => {
            await fetchGoals();
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
  goals,
  onClose,
  onSave,
  onDelete,
}: {
  session: StudySession;
  goals: GoalWithDetails[];
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

  // Find the goal this session belongs to
  const selectedGoal = goals.find((g) => g.id === session.goalId);
  const selectedSubject = selectedGoal?.subjects.find((s) => s.id === selectedSubjectId);

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
            {selectedGoal && (
              <div>
                <label className="block text-sm font-medium text-theme-card mb-2">
                  Goal
                </label>
                <input
                  type="text"
                  value={selectedGoal.name}
                  disabled
                  className="w-full px-4 py-3 rounded-2xl border border-white/30 bg-white/10 backdrop-blur-sm text-theme-muted input-theme cursor-not-allowed"
                />
              </div>
            )}

            {selectedGoal ? (
              selectedGoal.subjects.length > 0 ? (
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
                    {selectedGoal.subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-theme-muted text-sm">
                  This goal has no subjects yet.
                </div>
              )
            ) : (
              <div className="text-theme-muted text-sm">
                Cannot edit session. This session belongs to a goal that is no longer available.
              </div>
            )}

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
