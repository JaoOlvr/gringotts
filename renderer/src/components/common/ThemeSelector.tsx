import React from 'react';
import { Monitor, Sun, Moon } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '../../store/useThemeStore';
import { cn } from '../../lib/utils';

interface ThemeSelectorProps {
  className?: string;
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className, compact = false }) => {
  const mode = useThemeStore((s) => s.mode);
  const setTheme = useThemeStore((s) => s.setTheme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  const options: Array<{ mode: ThemeMode; label: string; icon: React.FC<{ className?: string }>; tooltip: string }> = [
    {
      mode: 'system',
      label: 'Sistema',
      icon: Monitor,
      tooltip: 'Seguir tema do sistema operacional',
    },
    {
      mode: 'light',
      label: 'Claro',
      icon: Sun,
      tooltip: 'Modo claro permanente',
    },
    {
      mode: 'dark',
      label: 'Escuro',
      icon: Moon,
      tooltip: 'Modo escuro permanente',
    },
  ];

  return (
    <div 
      className={cn(
        "flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-2xs",
        className
      )}
      role="radiogroup"
      aria-label="Aparência do aplicativo"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = mode === opt.mode;

        return (
          <button
            key={opt.mode}
            onClick={() => setTheme(opt.mode)}
            role="radio"
            aria-checked={isSelected}
            title={opt.tooltip}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer select-none",
              isSelected
                ? "bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 shadow-xs border border-gray-200/80 dark:border-gray-600 font-semibold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-750/50 border border-transparent"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5 shrink-0", isSelected && "text-amber-500")} />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
