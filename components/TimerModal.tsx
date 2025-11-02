'use client';

import { useState, useEffect, useRef } from 'react';
import type { StudySession } from '@/types';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicName?: string;
  dailyGoal?: number; // in minutes
  onSessionComplete?: () => void;
}

export default function TimerModal({
  isOpen,
  onClose,
  goalId,
  subjectId,
  subjectName,
  topicId,
  topicName,
  dailyGoal,
  onSessionComplete,
}: TimerModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [pipPosition, setPipPosition] = useState({ x: 0, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current!) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (!isOpen) {
      setIsRunning(false);
      setElapsedSeconds(0);
      setCurrentSession(null);
      startTimeRef.current = null;
      setIsPiP(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isPiP) {
      setPipPosition({ x: window.innerWidth - 320, y: 20 });
    }
  }, [isPiP]);

  // Drag handlers for PiP
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPiP || !pipRef.current) return;
    setIsDragging(true);
    const rect = pipRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !isPiP) return;
    setPipPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, isPiP]);

  const startSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId,
          subjectId,
          topicId: topicId || null,
          action: 'start',
        }),
      });

      if (!response.ok) throw new Error('Failed to start session');

      const session = await response.json();
      setCurrentSession(session);
      setIsRunning(true);
      startTimeRef.current = new Date(session.startTime).getTime();
      setElapsedSeconds(0);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start study session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          action: 'stop',
        }),
      });

      if (!response.ok) throw new Error('Failed to stop session');

      setIsRunning(false);
      setCurrentSession(null);
      startTimeRef.current = null;
      setElapsedSeconds(0);

      if (onSessionComplete) {
        onSessionComplete();
      }
      
      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error stopping session:', error);
      alert('Failed to stop study session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    if (!dailyGoal) return null;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const remaining = dailyGoal - elapsedMinutes;
    return remaining > 0 ? remaining : 0;
  };

  if (!isOpen) return null;

  const remainingMinutes = getRemainingTime();

  // Render in PiP mode
  if (isPiP) {
    return (
      <div
        ref={pipRef}
        style={{
          position: 'fixed',
          left: `${pipPosition.x}px`,
          top: `${pipPosition.y}px`,
          zIndex: 999999,
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
        }}
        className="glass rounded-2xl p-4 shadow-2xl border border-white/30 animate-in zoom-in-95 duration-300 w-80"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* PiP Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-theme-card truncate pr-2">{subjectName}</h3>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setIsPiP(false)}
              className="text-theme-muted hover:text-theme-card transition-colors"
              title="Restore"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-theme-muted hover:text-theme-card transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PiP Timer Display */}
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-theme-card mb-2 font-mono">
            {formatTime(elapsedSeconds)}
          </div>
          {dailyGoal && (
            <div className="text-xs text-theme-muted">
              {remainingMinutes !== null && remainingMinutes > 0 
                ? `Remaining: ${remainingMinutes}m`
                : 'Goal achieved! 🎉'
              }
            </div>
          )}
        </div>

        {/* PiP Progress Bar */}
        {dailyGoal && (
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                elapsedSeconds / 60 >= dailyGoal 
                  ? 'bg-green-500' 
                  : 'bg-blue-500'
              }`}
              style={{
                width: `${Math.min((elapsedSeconds / 60 / dailyGoal) * 100, 100)}%`,
              }}
            />
          </div>
        )}

        {/* PiP Control Buttons */}
        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={startSession}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-all text-sm flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              Start
            </button>
          ) : (
            <button
              onClick={stopSession}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-all text-sm flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Stop
            </button>
          )}
        </div>
      </div>
    );
  }

  // Regular modal view
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 border border-white/30">
          {/* Close button */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setIsPiP(true)}
              className="text-theme-muted hover:text-theme-card transition-colors"
              title="Picture-in-Picture"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
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

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-theme-card mb-2">{subjectName}</h2>
            {topicName && (
              <p className="text-base sm:text-lg text-theme-muted">{topicName}</p>
            )}
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-5xl sm:text-7xl font-bold text-theme-card mb-4 font-mono animate-pulse">
              {formatTime(elapsedSeconds)}
            </div>
            
            {dailyGoal && (
              <div className="mb-4">
                <div className="text-sm text-theme-muted mb-2">Daily Goal: {dailyGoal} minutes</div>
                {remainingMinutes !== null && (
                  <div className={`text-lg font-semibold ${
                    remainingMinutes > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {remainingMinutes > 0 
                      ? `Remaining: ${remainingMinutes} minutes`
                      : 'Goal achieved! 🎉'
                    }
                  </div>
                )}
              </div>
            )}

            {/* Progress bar */}
            {dailyGoal && (
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    elapsedSeconds / 60 >= dailyGoal 
                      ? 'bg-green-500' 
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min((elapsedSeconds / 60 / dailyGoal) * 100, 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {!isRunning ? (
              <button
                onClick={startSession}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-full transition-all text-lg shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Starting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    Start Session
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={stopSession}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-full transition-all text-lg shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 5.373 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Stopping...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Stop Session
                  </>
                )}
              </button>
            )}
          </div>

          {isRunning && (
            <p className="text-center text-sm text-theme-muted mt-4 animate-pulse">
              ⏱️ Session in progress...
            </p>
          )}
        </div>
      </div>
    </>
  );
}
