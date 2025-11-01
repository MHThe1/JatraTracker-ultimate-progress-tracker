'use client';

import { useState, useEffect } from 'react';
import type { Goal, Subject, StudySession } from '@/types';

interface GoalProgressProps {
  goal: Goal;
  subjects: Array<Subject & { topics: Array<{ id: string; name: string; studyTime: number }> }>;
  refreshTrigger?: number; // Trigger refresh when this changes
}

export default function GoalProgress({ goal, subjects, refreshTrigger }: GoalProgressProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'total'>('day');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [goal.id, refreshTrigger]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/sessions?goalId=${goal.id}`);
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
  // Get current day name (matching SubjectSettings format)
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Calculate daily goal for today based on subjects scheduled for today
  const getDailyGoal = () => {
    const today = getCurrentDay();
    return subjects.reduce((sum, subject) => {
      // Check if subject has daily goal and is scheduled for today
      if (subject.dailyMinutesGoal && subject.daysOfWeek && subject.daysOfWeek.length > 0) {
        // Normalize day names for comparison (handle both cases)
        const normalizedDays = subject.daysOfWeek.map(d => 
          d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
        );
        if (normalizedDays.includes(today)) {
          return sum + subject.dailyMinutesGoal;
        }
      }
      return sum;
    }, 0);
  };

  // Calculate today's study time
  const getTodayStudyTime = () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return sessions
      .filter(s => s.date === today && s.endTime) // Only completed sessions
      .reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate weekly goal
  const getWeeklyGoal = () => {
    return subjects.reduce((sum, subject) => {
      if (subject.dailyMinutesGoal && subject.daysOfWeek && subject.daysOfWeek.length > 0) {
        return sum + (subject.dailyMinutesGoal * subject.daysOfWeek.length);
      }
      return sum;
    }, 0);
  };

  // Calculate this week's study time
  const getWeekStudyTime = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday = 0
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];

    return sessions
      .filter(s => {
        if (!s.endTime) return false;
        // Compare date strings directly (YYYY-MM-DD format)
        return s.date >= startDateStr && s.date <= endDateStr;
      })
      .reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate monthly goal
  const getMonthlyGoal = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Calculate how many times each subject's scheduled day appears in this month
    let totalMinutes = 0;
    const currentDate = new Date(startOfMonth);
    
    while (currentDate <= endOfMonth) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
      
      subjects.forEach(subject => {
        if (subject.dailyMinutesGoal && subject.daysOfWeek && subject.daysOfWeek.length > 0) {
          // Normalize day names
          const normalizedDays = subject.daysOfWeek.map(d => 
            d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
          );
          
          // Check subject date range if set
          let isWithinSubjectRange = true;
          if (subject.startDate || subject.finishDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (subject.startDate && dateStr < subject.startDate) isWithinSubjectRange = false;
            if (subject.finishDate && dateStr > subject.finishDate) isWithinSubjectRange = false;
          }
          
          if (isWithinSubjectRange && normalizedDays.includes(dayName)) {
            totalMinutes += subject.dailyMinutesGoal;
          }
        }
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return totalMinutes;
  };

  // Calculate this month's study time
  const getMonthStudyTime = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];

    return sessions
      .filter(s => {
        if (!s.endTime) return false;
        // Compare date strings directly (YYYY-MM-DD format)
        return s.date >= startDateStr && s.date <= endDateStr;
      })
      .reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate total goal time from all subjects' daily goals
  const getTotalGoal = () => {
    if (goal.startDate && goal.finishDate) {
      // Parse dates correctly (YYYY-MM-DD format) - use local time to avoid timezone issues
      const [startYear, startMonth, startDay] = goal.startDate.split('-').map(Number);
      const [finishYear, finishMonth, finishDay] = goal.finishDate.split('-').map(Number);
      
      const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0); // Month is 0-indexed, local time
      const finish = new Date(finishYear, finishMonth - 1, finishDay, 23, 59, 59, 999);
      
      // Calculate total minutes by iterating through each day
      let totalMinutes = 0;
      const currentDate = new Date(start);
      
      // Helper to format date as YYYY-MM-DD
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Iterate through each day in the goal period (inclusive of both start and finish)
      const finishDateStr = formatDate(finish);
      while (true) {
        const dateStr = formatDate(currentDate);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
        
        subjects.forEach(subject => {
          if (subject.dailyMinutesGoal && subject.daysOfWeek && subject.daysOfWeek.length > 0) {
            // Normalize day names for comparison
            const normalizedDays = subject.daysOfWeek.map(d => {
              const trimmed = String(d).trim();
              return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
            });
            
            // Check if subject is scheduled for this day
            const isScheduledForDay = normalizedDays.includes(dayName);
            
            // Check subject date range if set (date string comparison)
            let isWithinSubjectRange = true;
            if (subject.startDate) {
              if (dateStr < subject.startDate) isWithinSubjectRange = false;
            }
            if (subject.finishDate) {
              if (dateStr > subject.finishDate) isWithinSubjectRange = false;
            }
            
            // Only count if scheduled for this day and within subject date range
            if (isScheduledForDay && isWithinSubjectRange) {
              totalMinutes += subject.dailyMinutesGoal;
            }
          }
        });
        
        // Check if we've reached the finish date
        if (dateStr >= finishDateStr) break;
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return totalMinutes;
    }
    
    // If no goal dates, calculate based on weekly goal
    // Estimate 12 weeks (~3 months) as default
    const weeklyGoal = getWeeklyGoal();
    return weeklyGoal * 12;
  };

  // Get goal and study time based on view mode
  const getViewData = () => {
    switch (viewMode) {
      case 'day':
        return {
          goal: getDailyGoal(),
          studied: getTodayStudyTime(),
          label: 'Today',
        };
      case 'week':
        return {
          goal: getWeeklyGoal(),
          studied: getWeekStudyTime(),
          label: 'This Week',
        };
      case 'month':
        return {
          goal: getMonthlyGoal(),
          studied: getMonthStudyTime(),
          label: 'This Month',
        };
      case 'total':
        return {
          goal: getTotalGoal(),
          studied: goal.totalStudyTime, // Total accumulated study time
          label: 'Total',
        };
    }
  };

  const viewData = getViewData();
  const progressPercentage = viewData.goal > 0
    ? Math.min((viewData.studied / viewData.goal) * 100, 100)
    : 0;

  // Calculate days remaining/elapsed
  const getDaysInfo = () => {
    if (!goal.startDate || !goal.finishDate) return null;

    const start = new Date(goal.startDate);
    const finish = new Date(goal.finishDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const dayProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;

    return { totalDays, elapsedDays, remainingDays, dayProgress };
  };

  const daysInfo = getDaysInfo();

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="glass rounded-3xl p-8 shadow-2xl">
      {/* Header with title and dates */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800">{goal.name}</h1>
          </div>

          {/* Dates */}
          {(goal.startDate || goal.finishDate) && (
            <div className="flex items-center gap-6 text-gray-600 text-sm ml-16">
              {goal.startDate && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Start: {new Date(goal.startDate).toLocaleDateString()}</span>
                </div>
              )}
              {goal.finishDate && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Finish: {new Date(goal.finishDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Mode Toggles */}
      <div className="mb-6 flex gap-2 justify-center flex-wrap">
        <button
          onClick={() => setViewMode('day')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            viewMode === 'day'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/20 text-gray-800 hover:bg-white/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Day
          </div>
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            viewMode === 'week'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/20 text-gray-800 hover:bg-white/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Week
          </div>
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            viewMode === 'month'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/20 text-gray-800 hover:bg-white/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Month
          </div>
        </button>
        <button
          onClick={() => setViewMode('total')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            viewMode === 'total'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/20 text-gray-800 hover:bg-white/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Total
          </div>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Studied Time */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-gray-600 uppercase">{viewData.label} Studied</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatTime(viewData.studied)}</div>
        </div>

        {/* Goal Time */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-semibold text-gray-600 uppercase">{viewData.label} Goal</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {viewData.goal > 0 ? formatTime(viewData.goal) : '—'}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs font-semibold text-gray-600 uppercase">Progress</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{progressPercentage.toFixed(0)}%</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-4 mb-6">
        {viewData.goal > 0 ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">{viewData.label} Progress</span>
              <span className="text-sm text-gray-600">
                {formatTime(viewData.studied)} / {formatTime(viewData.goal)}
                {viewMode === 'day' && (
                  <span className="ml-2 text-blue-600">
                    ({formatTime(Math.max(0, viewData.goal - viewData.studied))} remaining)
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 rounded-full flex items-center justify-end pr-3"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              >
                {progressPercentage > 15 && (
                  <span className="text-sm font-bold text-white">
                    {progressPercentage.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-gray-600 text-sm">
              {viewMode === 'day' && "No subjects scheduled for today. Set daily goals and days in subject settings."}
              {viewMode === 'week' && "Set daily goals and days for subjects to see weekly progress."}
              {viewMode === 'month' && "Set daily goals and days for subjects to see monthly progress."}
              {viewMode === 'total' && "Set daily goals and days for subjects, and goal dates to see total progress."}
            </p>
          </div>
        )}

        {/* Timeline Progress */}
        {daysInfo && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Timeline Progress</span>
              <span className="text-sm text-gray-600">
                {daysInfo.elapsedDays} / {daysInfo.totalDays} days
                {daysInfo.remainingDays > 0 && ` (${daysInfo.remainingDays} left)`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500 rounded-full flex items-center justify-end pr-2"
                style={{ width: `${Math.min(daysInfo.dayProgress, 100)}%` }}
              >
                {daysInfo.dayProgress > 10 && (
                  <span className="text-xs font-semibold text-white">
                    {daysInfo.dayProgress.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Stats */}
      <div className="mt-6 pt-6 border-t border-white/30 flex items-center justify-around">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{subjects.length}</div>
          <div className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Subjects
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">
            {subjects.reduce((sum, s) => sum + (Array.isArray(s.topics) ? s.topics.length : 0), 0)}
          </div>
          <div className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Topics
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">
            {viewData.goal > 0 ? formatTime(Math.max(0, viewData.goal - viewData.studied)) : '—'}
          </div>
          <div className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Remaining
          </div>
        </div>
      </div>
    </div>
  );
}
