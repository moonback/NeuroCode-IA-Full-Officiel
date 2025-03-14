import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import StarterTemplates from './StarterTemplates';
import { EXAMPLE_PROMPTS, type Prompt } from './prompts';

interface ExamplePromptsProps {
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  className?: string;
  onPromptSelect?: (promptId: string) => void;
}

interface PromptButtonProps {
  prompt: Prompt;
  onClick: (event: React.UIEvent, text: string) => void;
  onPromptSelect?: (promptId: string) => void;
}

const PromptButton = React.memo(({ prompt, onClick, onPromptSelect }: PromptButtonProps) => {
  const handleClick = (event: React.UIEvent) => {
    onClick(event, prompt.text);
    onPromptSelect?.(prompt.id);
  };

  // Truncate the prompt text to show only the beginning
  const truncatedText = prompt.text.length > 50 
    ? `${prompt.text.substring(0, 50)}...` 
    : prompt.text;

  return (
    <motion.button
      key={prompt.id}
      onClick={handleClick}
      className="
        flex flex-col items-center justify-center
        border border-bolt-elements-borderColor rounded-xl
        bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
        text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
        px-4 py-3 text-sm transition-colors duration-200
        h-28
        focus:outline-none focus:ring-2 focus:ring-blue-500
      "
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400 }}
      aria-label={prompt.ariaLabel}
    >
      <span className="text-center line-clamp-3">
        {truncatedText}
      </span>
    </motion.button>
  );
});



// const ITEMS_PER_PAGE = 8; // Nombre de prompts par page

export function ExamplePrompts({ sendMessage }: { sendMessage?: (event: React.UIEvent, messageInput?: string) => void }) {
  const [showTemplates, setShowTemplates] = useState(false);

  const handleShowExamples = useCallback(() => setShowTemplates(false), []);
  const handleShowTemplates = useCallback(() => setShowTemplates(true), []);

  return (
    <div id="examples" className="relative w-full max-w-3xl mx-auto">
      <div className="flex justify-center mb-2">
        <div 
          role="tablist" 
          aria-label="Sélectionnez le type de projet"
          className="bg-bolt-elements-background-depth-2 rounded-full p-1 shadow-sm"
        >
          <button
            role="tab"
            aria-selected={!showTemplates}
            onClick={handleShowExamples}
            className={`
              px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${!showTemplates ? 
                'bg-bolt-elements-background-depth-4 text-white shadow-lg' :
                'bg-transparent text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3'
              }
            `}
          >
            Exemples prompts
          </button>
          <button
            role="tab"
            aria-selected={showTemplates}
            onClick={handleShowTemplates}
            className={`
              px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${showTemplates ? 
                'bg-bolt-elements-background-depth-4 text-white shadow-lg' :
                'bg-transparent text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3'
              }
            `}
          >
            Projets vierges
          </button>
        </div>
      </div>

      {!showTemplates && (
        <div
          className="flex flex-wrap justify-center gap-2 px-4"
          style={{
            animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
          }}
        >
          {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="border border-bolt-elements-borderColor rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary px-3 py-1 text-xs transition-theme"
            >
              {examplePrompt.text}
            </button>
          ))}
        </div>
      )}
      {showTemplates && <StarterTemplates />}
    </div>
  );
}
