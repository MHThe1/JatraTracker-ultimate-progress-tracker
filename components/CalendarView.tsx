'use client';

import { useState, useEffect, useRef } from 'react';
import type { StudySession } from '@/types';
import { getTodayDateString } from '@/lib/dateUtils';

interface CalendarViewProps {
  sessions: StudySession[];
  subjects: Array<{ 
    id: string; 
    name: string; 
    topics: Array<{ id: string; name: string }>;
    dailyMinutesGoal?: number;
    daysOfWeek?: string[];
    startDate?: string;
    finishDate?: string;
  }>;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  onSessionEdit: (session: StudySession) => void;
  onSessionDelete: (session: StudySession) => void;
}

export default function CalendarView({
  sessions,
  subjects,
  currentMonth,
  setCurrentMonth,
  selectedDate,
  setSelectedDate,
  onSessionEdit,
  onSessionDelete,
}: CalendarViewProps) {
  const sessionsListRef = useRef<HTMLDivElement>(null);
  
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

  // Get calendar days for the month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month and what day of week it is
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Days from previous month
    const days: Array<{ date: string; isCurrentMonth: boolean; day: number }> = [];
    
    // Previous month's trailing days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevMonthLastDay - i).padStart(2, '0')}`,
        isCurrentMonth: false,
        day: prevMonthLastDay - i,
      });
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: true,
        day,
      });
    }
    
    // Next month's leading days
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const remainingDays = 42 - days.length; // 6 weeks × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: `${nextMonthYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        day,
      });
    }
    
    return days;
  };

  // Get sessions for a specific date
  const getSessionsForDate = (date: string) => {
    return sessions.filter(s => s.date === date);
  };

  // Get total minutes for a date
  const getTotalMinutesForDate = (date: string) => {
    return getSessionsForDate(date).reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate daily goal for a specific date based on subjects scheduled for that day
  const getDailyGoalForDate = (date: string) => {
    const dateObj = new Date(date);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
    
    return subjects.reduce((sum, subject) => {
      // Check if subject has daily goal and is scheduled for this day
      if (subject.dailyMinutesGoal && subject.daysOfWeek && subject.daysOfWeek.length > 0) {
        // Normalize day names for comparison
        const normalizedDays = subject.daysOfWeek.map(d => 
          d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
        );
        
        if (normalizedDays.includes(dayName)) {
          // Check subject date range if set
          let isWithinRange = true;
          if (subject.startDate && date < subject.startDate) isWithinRange = false;
          if (subject.finishDate && date > subject.finishDate) isWithinRange = false;
          
          if (isWithinRange) {
            return sum + subject.dailyMinutesGoal;
          }
        }
      }
      return sum;
    }, 0);
  };

  // Calculate progress for a date based on daily goal
  const getProgressForDate = (date: string) => {
    const total = getTotalMinutesForDate(date);
    const dailyGoal = getDailyGoalForDate(date);
    
    if (dailyGoal === 0) {
      // If no goal is set for this day, don't show progress or show 0%
      return 0;
    }
    
    return Math.min((total / dailyGoal) * 100, 100);
  };

  const calendarDays = getCalendarDays();
  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  // Scroll to sessions list when a date is selected
  useEffect(() => {
    if (selectedDate && sessionsListRef.current) {
      sessionsListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 rounded-full hover:bg-white/20 transition-all"
        >
          <svg className="w-5 h-5 text-theme-card" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-bold text-theme-card">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() => changeMonth(1)}
          className="p-2 rounded-full hover:bg-white/20 transition-all"
        >
          <svg className="w-5 h-5 text-theme-card" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-4 px-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-theme-muted py-2">
            {day}
          </div>
        ))}
        {calendarDays.map((day, idx) => {
          const progress = getProgressForDate(day.date);
          const totalMinutes = getTotalMinutesForDate(day.date);
          const isToday = day.date === getTodayDateString();
          const isSelected = day.date === selectedDate;

          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
              className={`
                relative aspect-square rounded-xl overflow-hidden transition-all
                ${day.isCurrentMonth ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-40'}
                ${isToday ? 'ring-2 ring-blue-500' : ''}
                ${isSelected ? 'ring-2 ring-purple-500' : ''}
              `}
            >
              {/* Progress bar background - glass filled with water effect */}
              {progress > 0 && (
                <div className="absolute inset-0 overflow-hidden flex flex-col-reverse">
                  <div
                    className="relative w-full bg-gradient-to-t from-white/20 via-white/15 to-white/10 transition-all duration-300"
                    style={{ 
                      height: `${progress}%`,
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
                          <linearGradient id={`waveGradient-${day.date}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: "rgba(255, 255, 255, 0.3)", stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: "rgba(255, 255, 255, 0.1)", stopOpacity: 0 }} />
                          </linearGradient>
                        </defs>
                        {/* Smooth wave curve - creates the characteristic water surface */}
                        <path
                          d="M 0,25 Q 125,5 250,25 Q 375,45 500,25 Q 625,5 750,25 Q 875,45 1000,25 L 1000,100 L 0,100 Z"
                          fill={`url(#waveGradient-${day.date})`}
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
              
              {/* Day number */}
              <div className="relative z-10 flex items-center justify-center h-full flex-col">
                <span className={`text-lg font-bold ${day.isCurrentMonth ? 'text-theme-card' : 'text-theme-muted'}`}>
                  {day.day}
                </span>
                {totalMinutes > 0 && (
                  <span className="text-xs text-white font-semibold">
                    {formatTime(totalMinutes)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Date Sessions */}
      {selectedDate && (
        <div ref={sessionsListRef} className="border-t border-white/20 pt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-xl font-bold text-theme-card">
                {formatDate(selectedDate)}
              </h4>
              <p className="text-sm text-theme-muted mt-1">
                {selectedDateSessions.length} {selectedDateSessions.length === 1 ? 'session' : 'sessions'}
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-2 rounded-full hover:bg-white/20 text-theme-muted hover:text-theme-card transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {selectedDateSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-theme-muted">No sessions on this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateSessions.map((session) => (
                <div
                  key={session.id}
                  onDoubleClick={() => onSessionEdit(session)}
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
                      {session.comment && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-white/5 rounded-lg">
                          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <p className="text-xs text-theme-muted leading-relaxed">{session.comment}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onSessionEdit(session)}
                        className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 transition-all"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onSessionDelete(session)}
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
          )}
        </div>
      )}
    </div>
  );
}
