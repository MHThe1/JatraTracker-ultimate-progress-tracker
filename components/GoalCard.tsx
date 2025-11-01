'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Goal, Subject, StudySession } from '@/types';
import GoalProgress from '@/components/GoalProgress';

interface GoalCardProps {
  goal: Goal;
  refreshTrigger?: number;
}

export default function GoalCard({ goal, refreshTrigger }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [goalDetails, setGoalDetails] = useState<Goal & { subjects: Array<Subject & { topics: Array<{ id: string; name: string; studyTime: number }> }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (expanded && !goalDetails) {
      fetchGoalDetails();
    }
  }, [expanded]);

  const fetchGoalDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/goals/${goal.id}`);
      if (response.ok) {
        const data = await response.json();
        setGoalDetails(data);
      }
    } catch (error) {
      console.error('Error fetching goal details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/30">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="text-theme-card hover:opacity-80"
            >
              {expanded ? '▼' : '▶'}
            </button>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-theme-card mb-2">
                {goal.name}
              </h3>
              <div className="flex items-center gap-4 text-theme-muted text-sm">
                <p>{formatTime(goal.totalStudyTime)} studied</p>
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
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/goals/${goal.id}`);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-full transition-all text-sm"
          >
            Open
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pl-10">
            {loading ? (
              <div className="text-center py-4 text-theme-muted">Loading...</div>
            ) : goalDetails ? (
              <GoalProgress
                goal={goalDetails}
                subjects={goalDetails.subjects}
                refreshTrigger={refreshTrigger}
              />
            ) : (
              <div className="text-center py-4 text-theme-muted">Failed to load goal details</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

