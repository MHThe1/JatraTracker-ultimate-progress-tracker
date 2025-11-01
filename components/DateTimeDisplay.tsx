'use client';

import { useState, useEffect } from 'react';

export default function DateTimeDisplay() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="glass rounded-2xl p-4 shadow-xl">
      <div className="text-center">
        <div className="text-sm text-theme-muted mb-1">
          {formatDate(currentDateTime)}
        </div>
        <div className="text-2xl font-bold text-theme-card font-mono">
          {formatTime(currentDateTime)}
        </div>
      </div>
    </div>
  );
}
