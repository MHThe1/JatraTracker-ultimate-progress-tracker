'use client';

import { useState, useEffect, useRef } from 'react';
import type { StudySession } from '@/types';

interface StudyTimerProps {
  goalId: string;
  subjectId: string; // Required - timer is tied to a subject
  topicId?: string;
  onSessionComplete?: () => void;
}

export default function StudyTimer({
  goalId,
  subjectId,
  topicId,
  onSessionComplete,
}: StudyTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

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
          subjectId, // Required - timer is always tied to a subject
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

  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-theme-card">Study Timer</h3>
        <div className="text-3xl font-bold text-theme-card font-mono">
          {formatTime(elapsedSeconds)}
        </div>
      </div>
      
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={startSession}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm"
          >
            {loading ? 'Starting...' : '▶ Start'}
          </button>
        ) : (
          <button
            onClick={stopSession}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm"
          >
            {loading ? 'Stopping...' : '⏹ Stop'}
          </button>
        )}
      </div>
      {isRunning && (
        <p className="text-xs text-theme-muted mt-2 text-center">Session in progress...</p>
      )}
    </div>
  );
}
