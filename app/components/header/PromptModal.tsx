import { PromptLibrary } from '~/lib/common/prompt-library';
import { Button } from '../ui/Button';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '~/lib/utils';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (promptId: string) => void;
  currentPromptId: string | null;
}

export function PromptModal({ isOpen, onClose, onSelect, currentPromptId }: PromptModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-bolt-elements-background-depth-1 rounded-xl p-6 w-full max-w-2xl border border-bolt-elements-border/50 shadow-2xl relative"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
              <div className="i-ph:file-text-duotone text-green-500 w-5 h-5" />
              Sélectionnez un prompt
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-all duration-200 text-bolt-elements-textSecondary hover:text-red-400 hover:scale-105"
              aria-label="Fermer la modale"
            >
              <div className="i-ph:x w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {PromptLibrary.getList().map(prompt => (
              <motion.button
                key={prompt.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onSelect(prompt.id);
                  onClose();
                }}
                className={cn(
                  "group p-4 rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-all duration-200 text-left border border-bolt-elements-border/30 shadow-sm",
                  {
                    "ring-2 ring-green-500 ring-offset-2": prompt.id === currentPromptId,
                  }
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-500 group-hover:bg-green-500/20 transition-colors duration-200">
                    <div className="i-ph:file-text w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-bolt-elements-textPrimary">
                      {prompt.label}
                    </h3>
                    <p className="text-sm text-bolt-elements-textSecondary/90 mt-1 leading-relaxed">
                      {prompt.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-bolt-elements-border/20">
            <Button 
              variant="secondary" 
              onClick={onClose}
              className="w-full hover:bg-bolt-elements-background-depth-3 hover:scale-[1.02] transition-all duration-200"
            >
              Fermer
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 
