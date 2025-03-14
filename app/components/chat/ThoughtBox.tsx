import { useState, type PropsWithChildren } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ThoughtBox = ({ title, children }: PropsWithChildren<{ title: string }>) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`
        bg-bolt-elements-background-depth-2
        shadow-md
        rounded-lg
        cursor-pointer
        transition-all
        duration-300
        ${isExpanded ? 'max-h-[500px]' : 'max-h-[56px]'}
        overflow-hidden
        border border-bolt-elements-borderColor
        hover:shadow-lg
        hover:border-green-500/30
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="p-4 flex items-center gap-4 rounded-lg text-bolt-elements-textSecondary font-medium leading-5 text-sm border-b border-bolt-elements-borderColor">
        <div className="i-ph:brain-thin text-2xl text-green-500" />
        <div className="flex-1">
          <span>{title}</span>
          {!isExpanded && (
            <span className="text-bolt-elements-textTertiary ml-2">- Cliquez pour développer</span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="i-ph:caret-down text-xl text-bolt-elements-textTertiary"
        />
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 pt-3 text-bolt-elements-textPrimary text-sm leading-6"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ThoughtBox;
