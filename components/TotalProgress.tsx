'use client';

import { useState, useEffect } from 'react';
import type { Goal, StudySession } from '@/types';

interface GoalWithSubjects extends Goal {
  subjects?: Array<{
    dailyMinutesGoal?: number;
    daysOfWeek?: string[];
    startDate?: string;
    finishDate?: string;
  }>;
}

interface TotalProgressProps {
  goals: GoalWithSubjects[];
  refreshTrigger?: number;
}

export default function TotalProgress({ goals, refreshTrigger }: TotalProgressProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'total'>('total');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllSessions();
  }, [refreshTrigger]);

  const fetchAllSessions = async () => {
    try {
      // Fetch sessions for all goals
      const allSessions: StudySession[] = [];
      for (const goal of goals) {
        const response = await fetch(`/api/sessions?goalId=${goal.id}`);
        if (response.ok) {
          const data = await response.json();
          allSessions.push(...data);
        }
      }
      setSessions(allSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current day name
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Calculate today's study time across all goals
  const getTodayStudyTime = () => {
    const today = new Date().toISOString().split('T')[0];
    return sessions
      .filter(s => s.date === today && s.endTime)
      .reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate this week's study time
  const getWeekStudyTime = () => {
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

    return sessions
      .filter(s => {
        if (!s.endTime) return false;
        return s.date >= startDateStr && s.date <= endDateStr;
      })
      .reduce((sum, s) => sum + s.duration, 0);
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
        return s.date >= startDateStr && s.date <= endDateStr;
      })
      .reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate total goal (sum of all goals' total goals)
  const getTotalGoal = () => {
    // This would need to calculate from each goal's subjects
    // For now, we'll need to pass this as a prop or calculate differently
    return 0; // Placeholder - will be calculated from goals
  };

  // Get goal and study time based on view mode
  const getViewData = () => {
    switch (viewMode) {
      case 'day':
        return {
          goal: 0, // Would need to calculate from all subjects across all goals
          studied: getTodayStudyTime(),
          label: 'Today',
        };
      case 'week':
        return {
          goal: 0,
          studied: getWeekStudyTime(),
          label: 'This Week',
        };
      case 'month':
        return {
          goal: 0,
          studied: getMonthStudyTime(),
          label: 'This Month',
        };
      case 'total':
        return {
          goal: goals.reduce((sum, g) => sum + g.totalStudyTime, 0), // Total goal would be sum of all goal targets
          studied: goals.reduce((sum, g) => sum + g.totalStudyTime, 0), // Total studied across all goals
          label: 'Total',
        };
    }
  };

  const viewData = getViewData();
  const progressPercentage = viewData.goal > 0
    ? Math.min((viewData.studied / viewData.goal) * 100, 100)
    : 0;

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // For total view, calculate total studied across all goals
  const totalStudied = goals.reduce((sum, g) => sum + g.totalStudyTime, 0);

  return (
    <div className="glass rounded-3xl p-8 shadow-2xl mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-800">Total Progress</h1>
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
          Day
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            viewMode === 'week'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/20 text-gray-800 hover:bg-white/30'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            viewMode === 'month'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/20 text-gray-800 hover:bg-white/30'
          }`}
        >
          Month
        </button>
        <button
          onClick={() => setViewMode('total')}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            viewMode === 'total'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/20 text-gray-800 hover:bg-white/30'
          }`}
        >
          Total
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-gray-600 uppercase">{viewData.label} Studied</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatTime(viewData.studied)}</div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-semibold text-gray-600 uppercase">Goals</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{goals.length}</div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs font-semibold text-gray-600 uppercase">Total Studied</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatTime(totalStudied)}</div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-white/30 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{goals.length}</div>
          <div className="text-xs text-gray-600 mt-1">Goals</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">
            {goals.reduce((sum, g) => sum + (g.subjects?.length || 0), 0)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Total Subjects</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{sessions.length}</div>
          <div className="text-xs text-gray-600 mt-1">Total Sessions</div>
        </div>
      </div>
    </div>
  );
}

