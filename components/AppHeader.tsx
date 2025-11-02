'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motivationalQuotes } from '@/lib/motivationalQuotes';

export default function AppHeader() {
  const router = useRouter();
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
        setIsVisible(true);
      }, 400); // Wait for fade out before changing text
    }, 5000); // Change quote every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col">
      <button
        onClick={() => router.push('/')}
        className="text-xl sm:text-xl md:text-2xl font-bold text-white mb-1 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
      >
        JatraTracker
      </button>
      <div className="h-5 sm:h-6 flex items-center overflow-hidden">
        <p
          className={`text-sm sm:text-xs text-white/80 transition-all duration-500 ease-in-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          {motivationalQuotes[currentQuoteIndex]}
        </p>
      </div>
    </div>
  );
}

