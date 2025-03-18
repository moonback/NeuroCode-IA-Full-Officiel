// Component for displaying alert messages in the chat interface
// Handles both preview and terminal execution errors with animated transitions
import { AnimatePresence, motion } from 'framer-motion';
import type { ActionAlert } from '~/types/actions';
import { classNames } from '~/utils/classNames';

// Component props interface
interface Props {
  alert: ActionAlert; // The alert object containing error details
  clearAlert: () => void; // Callback to dismiss the alert
  postMessage: (message: string) => void; // Callback to send error message to chat
}

// Main alert component with animated transitions and error handling options
export default function ChatAlert({ alert, clearAlert, postMessage }: Props) {
  // Destructure alert properties for easier access
const { description, content, source } = alert;

  // Determine if error came from preview or terminal execution
const isPreview = source === 'preview';
  // Set appropriate title based on error source
const title = isPreview ? 'Erreur de Prévisualisation' : 'Erreur de Terminal';
  // Set user-friendly error message based on error source
const message = isPreview
    ? 'Nous avons rencontré une erreur lors de l\'exécution de la prévisualisation. Souhaitez-vous que NeuroCode analyse et aide à résoudre ce problème ?'
    : 'Nous avons rencontré une erreur lors de l\'exécution des commandes du terminal. Souhaitez-vous que NeuroCode analyse et aide à résoudre ce problème ?';

  // Render animated alert component with error details and action buttons
return (
    // Animation wrapper for smooth transitions
<AnimatePresence>
      // Animated container for the alert
<motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-4 mb-2`}
      >
        // Flex container for alert content layout
<div className="flex items-start">
          // Warning icon with animation
{/* Warning icon */}
          // Animated container for the alert
<motion.div
            className="flex-shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className={`i-ph:warning-duotone text-xl text-bolt-elements-button-danger-text`}></div>
          </motion.div>
          {/* Contenu */}
          // Main content area for alert details
<div className="ml-3 flex-1">
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`text-sm font-medium text-bolt-elements-textPrimary`}
            >
              {title}
            </motion.h3>
            // Animated container for the alert
<motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`mt-2 text-sm text-bolt-elements-textSecondary`}
            >
              <p>{message}</p>
              {description && (
                <div className="text-xs text-bolt-elements-textSecondary p-2 bg-bolt-elements-background-depth-3 rounded mt-4 mb-4">
                  Erreur : {description}
                </div>
              )}
            </motion.div>

            // Action buttons for error handling
{/* Action buttons */}
            // Animated container for the alert
<motion.div
              className="mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={classNames(' flex gap-2')}>
                <button
                  onClick={() =>
                    postMessage(
                      `*Error encountered in ${isPreview ? 'preview' : 'execution'}: 
                       ${description || 'Unknown error'}*\n` +
                      `*How can I resolve this? Please provide a concise fix if possible.*\n` +
                      `\`\`\`${isPreview ? 'js' : 'sh'}\n${content}\n\`\`\`\n` +
                      `- Error type: ${title}\n`
                      
                    )
                  }
                  className={classNames(
                    `px-2 py-1.5 rounded-md text-sm font-medium`,
                    'bg-green-500/20',
                    'hover:bg-green-500/30',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500/30',
                    'text-white',
                    'flex items-center gap-1.5',
                  )}
                >
                  <div className="i-ph:chat-circle-duotone"></div>
                  Corriger le problème
                </button>
                <button
                  onClick={clearAlert}
                  className={classNames(
                    `px-2 py-1.5 rounded-md text-sm font-medium`,
                    'bg-bolt-elements-button-secondary-background',
                    'hover:bg-bolt-elements-button-secondary-backgroundHover',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-button-secondary-background',
                    'text-bolt-elements-button-secondary-text',
                  )}
                >
                  Ignorer
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
