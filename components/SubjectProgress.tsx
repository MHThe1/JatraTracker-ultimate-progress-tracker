'use client';

import { useState, useEffect } from 'react';
import type { Subject, StudySession } from '@/types';
import { getTodayDateString } from '@/lib/dateUtils';

interface SubjectProgressProps {
  subject: Subject & { topics: Array<{ id: string; name: string; studyTime: number }> };
  goalId: string;
  refreshTrigger?: number;
}

export default function SubjectProgress({ subject, goalId, refreshTrigger }: SubjectProgressProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'total'>('day');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [goalId, subject.id, refreshTrigger]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/sessions?goalId=${goalId}&subjectId=${subject.id}`);
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

  // Calculate daily goal for today
  const getDailyGoal = () => {
    if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
      return 0;
    }
    
    const today = getCurrentDay();
    const normalizedDays = subject.daysOfWeek.map(d => 
      d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
    );
    
    if (normalizedDays.includes(today)) {
      // Check subject date range
      if (subject.startDate || subject.finishDate) {
        const todayStr = getTodayDateString();
        if (subject.startDate && todayStr < subject.startDate) return 0;
        if (subject.finishDate && todayStr > subject.finishDate) return 0;
      }
      return subject.dailyMinutesGoal;
    }
    return 0;
  };

  // Calculate today's study time
  const getTodayStudyTime = () => {
    const today = getTodayDateString();
    return sessions
      .filter(s => s.date === today && s.endTime && s.subjectId === subject.id)
      .reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate weekly goal
  const getWeeklyGoal = () => {
    if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
      return 0;
    }
    return subject.dailyMinutesGoal * subject.daysOfWeek.length;
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
        if (!s.endTime || s.subjectId !== subject.id) return false;
        return s.date >= startDateStr && s.date <= endDateStr;
      })
      .reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate monthly goal
  const getMonthlyGoal = () => {
    if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
      return 0;
    }

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
        if (!s.endTime || s.subjectId !== subject.id) return false;
        return s.date >= startDateStr && s.date <= endDateStr;
      })
      .reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate total goal
  const getTotalGoal = () => {
    if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
      return 0;
    }

    if (subject.startDate && subject.finishDate) {
      const [startYear, startMonth, startDay] = subject.startDate.split('-').map(Number);
      const [finishYear, finishMonth, finishDay] = subject.finishDate.split('-').map(Number);
      
      const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      const finish = new Date(finishYear, finishMonth - 1, finishDay, 23, 59, 59, 999);
      
      let totalMinutes = 0;
      const currentDate = new Date(start);
      
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const finishDateStr = formatDate(finish);
      while (true) {
        const dateStr = formatDate(currentDate);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
        
        const normalizedDays = subject.daysOfWeek.map(d => {
          const trimmed = String(d).trim();
          return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
        });
        
        if (normalizedDays.includes(dayName)) {
          totalMinutes += subject.dailyMinutesGoal;
        }
        
        if (dateStr >= finishDateStr) break;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return totalMinutes;
    }
    
    // If no dates, estimate 12 weeks
    return getWeeklyGoal() * 12;
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
          studied: subject.studyTime,
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

  // If subject has no goals configured, don't show progress
  if (!subject.dailyMinutesGoal || !subject.daysOfWeek || subject.daysOfWeek.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-4">
      <h4 className="text-lg font-semibold text-theme-card mb-4">{subject.name} Progress</h4>

      {/* View Mode Toggles */}
      <div className="mb-4 flex gap-2 justify-center flex-wrap">
        <button
          onClick={() => setViewMode('day')}
          className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all ${
            viewMode === 'day'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white/20 text-theme-card hover:bg-white/30'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all ${
            viewMode === 'week'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white/20 text-theme-card hover:bg-white/30'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all ${
            viewMode === 'month'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white/20 text-theme-card hover:bg-white/30'
          }`}
        >
          Month
        </button>
        <button
          onClick={() => setViewMode('total')}
          className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all ${
            viewMode === 'total'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white/20 text-theme-card hover:bg-white/30'
          }`}
        >
          Total
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
          <div className="text-xs font-semibold text-theme-muted uppercase mb-1">Studied</div>
          <div className="text-xl font-bold text-theme-card">{formatTime(viewData.studied)}</div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
          <div className="text-xs font-semibold text-theme-muted uppercase mb-1">Goal</div>
          <div className="text-xl font-bold text-theme-card">
            {viewData.goal > 0 ? formatTime(viewData.goal) : '—'}
          </div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
          <div className="text-xs font-semibold text-theme-muted uppercase mb-1">Progress</div>
          <div className="text-xl font-bold text-theme-card">{progressPercentage.toFixed(0)}%</div>
        </div>
      </div>

      {/* Progress Bar */}
      {viewData.goal > 0 ? (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-theme-card">{viewData.label} Progress</span>
            <span className="text-xs text-theme-muted">
              {formatTime(viewData.studied)} / {formatTime(viewData.goal)}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-500 rounded-full flex items-center justify-end pr-2"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            >
              {progressPercentage > 15 && (
                <span className="text-xs font-bold text-white">
                  {progressPercentage.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <p className="text-theme-muted text-xs">
            Configure daily goals and days to see progress
          </p>
        </div>
      )}
    </div>
  );
}

