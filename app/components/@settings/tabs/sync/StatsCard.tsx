import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    progress: number;
  };
  isLoading?: boolean;
}

export default function StatsCard({ icon, label, value, trend, isLoading = false }: StatsCardProps) {
  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-bolt-elements-textSecondary';
    }
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'i-ph:trend-up';
      case 'down':
        return 'i-ph:trend-down';
      default:
        return 'i-ph:minus';
    }
  };

  return (
    <motion.div
      className={classNames(
        'rounded-xl p-4',
        'bg-bolt-elements-background-depth-2',
        'hover:bg-bolt-elements-background-depth-3',
        'border border-bolt-elements-borderColor/10',
        'transition-all duration-200',
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-5 w-5 rounded-md bg-bolt-elements-borderColor/20" />
            <div className="h-4 w-16 rounded-md bg-bolt-elements-borderColor/20" />
          </div>
          <div className="h-6 w-24 rounded-md bg-bolt-elements-borderColor/20" />
          <div className="h-2 w-full rounded-full bg-bolt-elements-borderColor/20" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <motion.div
              className={classNames(icon, 'w-5 h-5 text-green-500')}
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            />
            <span className="text-sm text-bolt-elements-textSecondary">{label}</span>
          </div>

          <div className="flex items-end justify-between">
            <motion.span
              className="text-xl font-semibold text-bolt-elements-textPrimary"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {value}
            </motion.span>

            {trend && (
              <motion.div
                className="flex items-center gap-1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className={classNames(getTrendIcon(trend.direction), 'w-4 h-4', getTrendColor(trend.direction))} />
                <span className={classNames('text-sm', getTrendColor(trend.direction))}>{trend.percentage}%</span>
              </motion.div>
            )}
          </div>

          {trend && (
            <motion.div
              className="mt-3 h-1.5 rounded-full bg-bolt-elements-background-depth-3 overflow-hidden"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className={classNames(
                  'h-full rounded-full',
                  trend.direction === 'up'
                    ? 'bg-green-500'
                    : trend.direction === 'down'
                      ? 'bg-red-500'
                      : 'bg-green-500',
                )}
                initial={{ width: '0%' }}
                animate={{ width: `${trend.progress}%` }}
                transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
              />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
