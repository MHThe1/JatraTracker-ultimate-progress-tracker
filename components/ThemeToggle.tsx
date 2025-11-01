'use client';

import { useTheme } from '@/lib/theme';
import { useState } from 'react';
import ThemeCustomizer from './ThemeCustomizer';

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const themes = [
    { id: 'light' as const, name: 'Light', icon: '☀️' },
    { id: 'dark' as const, name: 'Dark', icon: '🌙' },
    { id: 'matte' as const, name: 'Matte', icon: '🎭' },
    { id: 'cave' as const, name: 'Cave', icon: '🕳️' },
    { id: 'dhaka' as const, name: 'Dhaka', icon: '🎨' },
    { id: 'nyc' as const, name: 'NYC', icon: '🏙️' },
    { id: 'custom' as const, name: 'Custom', icon: '⚙️' },
  ];

  const handleThemeSelect = (themeId: typeof mode) => {
    setMode(themeId);
    setIsOpen(false);
    if (themeId === 'custom') {
      setShowCustomizer(true);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="glass rounded-full p-3 hover:bg-white/30 transition-all shadow-lg hover:shadow-xl"
          aria-label="Toggle theme"
        >
          <span className="text-xl">
            {themes.find((t) => t.id === mode)?.icon || '🎨'}
          </span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 glass rounded-2xl p-2 shadow-2xl z-50 min-w-[160px] max-h-[80vh] overflow-y-auto fade-in zoom-in-95">
              {themes.map((theme) => (
                <div key={theme.id}>
                  <button
                    onClick={() => handleThemeSelect(theme.id)}
                    className={`w-full text-left px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                      mode === theme.id
                        ? 'bg-white/30 font-semibold text-theme-card'
                        : 'hover:bg-white/20 text-theme-card'
                    }`}
                  >
                    <span>{theme.icon}</span>
                    <span>{theme.name}</span>
                    {mode === theme.id && (
                      <span className="ml-auto text-xs">✓</span>
                    )}
                  </button>
                  {theme.id === 'custom' && mode === 'custom' && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowCustomizer(true);
                      }}
                      className="w-full text-left px-4 py-1.5 text-sm text-theme-muted hover:bg-white/10 rounded-xl transition-all"
                    >
                      Customize...
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showCustomizer && (
        <ThemeCustomizer onClose={() => setShowCustomizer(false)} />
      )}
    </>
  );
}

