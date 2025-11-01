'use client';

import { useTheme } from '@/lib/theme';
import { useState, useEffect } from 'react';

interface ThemeCustomizerProps {
  onClose: () => void;
}

export default function ThemeCustomizer({ onClose }: ThemeCustomizerProps) {
  const { customColors, updateCustomColors, resetCustomColors } = useTheme();
  const [localColors, setLocalColors] = useState(customColors);

  // Sync local colors when customColors changes externally
  useEffect(() => {
    setLocalColors(customColors);
  }, [customColors]);

  const colorFields: Array<{
    key: keyof typeof customColors;
    label: string;
    description: string;
  }> = [
    { key: 'background', label: 'Background', description: 'Main page background' },
    { key: 'foreground', label: 'Foreground', description: 'Main text color' },
    { key: 'primary', label: 'Primary', description: 'Primary action color' },
    { key: 'secondary', label: 'Secondary', description: 'Secondary color' },
    { key: 'accent', label: 'Accent', description: 'Accent/highlight color' },
    { key: 'card', label: 'Card', description: 'Card background' },
    { key: 'cardForeground', label: 'Card Text', description: 'Text on cards' },
    { key: 'border', label: 'Border', description: 'Border color' },
    { key: 'muted', label: 'Muted', description: 'Muted background' },
    { key: 'mutedForeground', label: 'Muted Text', description: 'Muted text color' },
  ];

  const handleColorChange = (key: keyof typeof customColors, value: string) => {
    const updated = { ...localColors, [key]: value };
    setLocalColors(updated);
    updateCustomColors({ [key]: value });
  };

  const handleSave = () => {
    updateCustomColors(localColors);
    onClose();
  };

  const handleReset = () => {
    resetCustomColors();
    // localColors will be synced via useEffect when customColors updates
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-dark rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl zoom-in-95 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Customize Theme</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {colorFields.map((field) => (
            <div key={field.key} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-white font-semibold mb-1">
                  {field.label}
                </label>
                <p className="text-white/70 text-sm">{field.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={localColors[field.key]}
                  onChange={(e) => handleColorChange(field.key, e.target.value)}
                  className="w-16 h-16 rounded-xl border-2 border-white/30 cursor-pointer"
                />
                <input
                  type="text"
                  value={localColors[field.key]}
                  onChange={(e) => handleColorChange(field.key, e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white w-32 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition-all"
          >
            Save & Close
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-full transition-all"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-full transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

