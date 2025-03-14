import { AnimatePresence, motion } from 'framer-motion';
import React, { useState, useCallback, useMemo } from 'react';
import type { ProgressAnnotation } from '~/types/context';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';

interface ProgressConfig {
  icon: string;
  color: string;
  bg: string;
  ring: string;
}

const STATUS_CONFIG: Record<string, ProgressConfig> = {
  'in-progress': {
    icon: 'i-ph:circle-notch-bold animate-spin',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-1 ring-emerald-500/20'
  },
  'complete': {
    icon: 'i-ph:check-circle-bold',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    ring: 'ring-1 ring-green-500/20'
  },
  'error': {
    icon: 'i-ph:warning-bold',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-1 ring-amber-500/20'
  }
};

interface ProgressItemProps {
  progress: ProgressAnnotation;
  isLastItem?: boolean;
}

const ProgressItem = React.memo(({ progress, isLastItem }: ProgressItemProps) => {
  const config = STATUS_CONFIG[progress.status || 'in-progress'];
  
  return (
    <motion.div
      className={classNames(
        "flex text-xs gap-2 items-center p-1.5 rounded-lg",
        "hover:bg-emerald-500/5 transition-colors",
        "shadow-sm",
        config.bg,
        config.ring,
        isLastItem ? "font-semibold" : "font-normal"
      )}
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
      role="status"
      aria-live={isLastItem ? "polite" : "off"}
    >
      <div className={classNames("w-5 h-5 flex items-center justify-center", config.color)}>
        <div className={config.icon} aria-hidden="true" />
      </div>
      <span className="truncate text-bolt-elements-textPrimary" title={progress.message}>
        {progress.message}
      </span>
    </motion.div>
  );
});

interface ExpandButtonProps {
  expanded: boolean;
  onClick: () => void;
}

const ExpandButton = React.memo(({ expanded, onClick }: ExpandButtonProps) => {
  return (
    <motion.button
      className={classNames(
        "p-1 rounded-lg transition-all",
        "bg-emerald-500/10 hover:bg-emerald-500/20",
        "text-emerald-400 hover:text-emerald-300",
        "focus:outline-none focus:ring-1 focus:ring-emerald-500/50",
        "relative overflow-hidden group"
      )}
      style={{ 
        boxShadow: '0 0 12px -2px rgba(16, 185, 129, 0.2)'
      }}
      onClick={onClick}
      aria-label={expanded ? 'Réduire' : 'Développer'}
      aria-expanded={expanded}
    >
      <div className={expanded ? 'i-ph:caret-up-bold text-xs' : 'i-ph:caret-down-bold text-xs'} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity bg-radial-gradient(from-60%_50% at center, #10b981, transparent)" />
    </motion.button>
  );
});

interface ProgressCompilationProps {
  data?: ProgressAnnotation[];
}

const useProgressData = (data?: ProgressAnnotation[]) => {
  return useMemo(() => {
    try {
      if (!data?.length) return [];

      const completedLabels = new Set<string>();
      const filteredProgress: ProgressAnnotation[] = [];
      const uniqueLabels = new Set<string>();

      for (let i = data.length - 1; i >= 0; i--) {
        const item = data[i];
        if (!item || !item.label) continue;
        
        if (!uniqueLabels.has(item.label)) {
          filteredProgress.unshift(item);
          uniqueLabels.add(item.label);
          if (item.status === 'complete') {
            completedLabels.add(item.label);
          }
        }
      }

      return filteredProgress.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.error('Error processing progress data:', error);
      return [];
    }
  }, [data]);
};

const useProgressPercentage = (progressList: ProgressAnnotation[]) => {
  return useMemo(() => {
    if (!progressList.length) return 0;
    try {
      const completed = progressList.filter(x => x.status === 'complete').length;
      return Math.min(100, Math.max(0, Math.round((completed / progressList.length) * 100)));
    } catch (error) {
      console.error('Error calculating progress percentage:', error);
      return 0;
    }
  }, [progressList]);
};

export default function ProgressCompilation({ data }: ProgressCompilationProps) {
  const [expanded, setExpanded] = useState(false);
  const progressList = useProgressData(data);
  const progressPercentage = useProgressPercentage(progressList);
  const lastItem = progressList[progressList.length - 1];

  if (!progressList.length) return null;

  return (
    <AnimatePresence>
      <div
        className="bg-bolt-elements-background-depth-2/90 backdrop-blur-lg border border-green-800/30 shadow-lg rounded-xl w-full max-w-chat mx-auto z-prompt p-3"
        role="progressbar"
        aria-valuenow={progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progression : ${progressPercentage}%`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center text-emerald-400 bg-emerald-500/10 rounded-lg">
            <div className="i-ph:brain-bold text-xl animate-pulse" />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="w-full bg-green-900/20 rounded-full h-2.5 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-400 via-green-400 to-green-500 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 opacity-30 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
              {progressPercentage > 10 && (
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-emerald-100 tracking-tighter transition-opacity duration-200 drop-shadow">
                  {progressPercentage}%
                </span>
              )}
            </div>

            <div className="text-white text-sm rounded-lg text-bolt-elements-item-contentAccent flex items-center gap-2">
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  {expanded ? (
                    <motion.div
                      className="space-y-1.5"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {progressList.map((x, index) => (
                        <ProgressItem 
                          key={x.label} 
                          progress={x} 
                          isLastItem={index === progressList.length - 1}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <ProgressItem progress={lastItem} isLastItem />
                  )}
                </AnimatePresence>
              </div>
              <ExpandButton expanded={expanded} onClick={() => setExpanded(v => !v)} />
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
