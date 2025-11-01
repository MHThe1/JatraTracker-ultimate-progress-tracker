'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Goal, Subject } from '@/types';
import TotalProgress from '@/components/TotalProgress';
import GoalCard from '@/components/GoalCard';
import DateTimeDisplay from '@/components/DateTimeDisplay';

export default function Home() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch goals on mount
  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/goals');
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      setGoals(data);
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
        setGoals([newGoal, ...goals]);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4">
      <main className="max-w-4xl mx-auto py-8">
        <div className="flex items-start justify-between mb-12">
          <div className="text-center flex-1">
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              JatraTrack
            </h1>
            <p className="text-white/90 text-lg">
              Track your journey, build your routine
            </p>
          </div>
          <DateTimeDisplay />
        </div>

        {loading ? (
          <div className="glass rounded-3xl p-12 text-center mb-8 shadow-2xl">
            <p className="text-gray-600">Loading goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center mb-8 shadow-2xl">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              No goals yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first preparation goal to get started
            </p>
            <button
              onClick={() => setShowAddGoal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-xl"
            >
              + Create Goal
            </button>
          </div>
        ) : null}

        {showAddGoal && (
          <div className="glass rounded-3xl p-8 mb-8 shadow-2xl">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Create New Goal
            </h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="e.g., Preparation for GRE"
                className="flex-1 px-4 py-3 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGoal();
                  if (e.key === 'Escape') {
                    setShowAddGoal(false);
                    setNewGoalName('');
                  }
                }}
              />
              <button
                onClick={handleAddGoal}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition-all"
              >
                {submitting ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddGoal(false);
                  setNewGoalName('');
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-full transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {goals.length > 0 && (
          <>
            <TotalProgress goals={goals} />

            <div className="glass rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Your Goals</h2>
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full transition-all"
                >
                  + Add Goal
                </button>
              </div>
              <div className="space-y-4">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    refreshTrigger={refreshTrigger}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
