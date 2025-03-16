import { memo } from 'react';
import { classNames } from '~/utils/classNames';

interface InstructionsModalProps {
  isOpen: boolean;
  instruction: string;
  setInstruction: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const InstructionsModal = memo(({ 
  isOpen,
  instruction, 
  setInstruction, 
  onCancel, 
  onSubmit 
}: InstructionsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-bolt-elements-background-depth-2 rounded-xl border border-bolt-elements-borderColor shadow-2xl overflow-hidden transform transition-all duration-200 ease-out scale-95 hover:scale-100">
        <div className="p-5 border-b border-bolt-elements-borderColor bg-gradient-to-r from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-3">
          <h3 className="text-lg font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
            <span className="i-ph-pencil w-5 h-5 text-bolt-elements-textSecondary" />
            Ajouter une instruction au code sélectionné
          </h3>
          <p className="text-sm text-bolt-elements-textSecondary mt-1">
            Votre instruction guidera l'IA dans l'analyse du code sélectionné
          </p>
        </div>
        <div className="p-5">
          <textarea
            className="w-full h-48 p-3 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg text-bolt-elements-textPrimary focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none placeholder:text-bolt-elements-textSecondary/50"
            placeholder="Exemple: 'Explique cette fonction' ou 'Optimise cette boucle'..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                onSubmit();
              }
            }}
          />
          <p className="text-xs text-bolt-elements-textSecondary mt-2">
            Astuce: Soyez précis pour obtenir de meilleurs résultats
          </p>
          <p className="text-xs text-bolt-elements-textSecondary mt-1">
            (Cmd/Ctrl + Enter pour envoyer)
          </p>
        </div>
        <div className="p-5 border-t border-bolt-elements-borderColor flex justify-end gap-3 bg-bolt-elements-background-depth-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg bg-bolt-elements-background-depth-1 text-bolt-elements-textSecondary hover:bg-red-500 hover:text-bolt-elements-textPrimary transition-colors flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            aria-label="Annuler"
          >
            <span className="i-ph-x w-4 h-4" />
            Annuler
          </button>
          <button
            onClick={onSubmit}
            className={classNames(
              "px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 hover:scale-[1.02] active:scale-95",
              instruction.trim() 
                ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" 
                : "bg-bolt-elements-background-depth-1 text-bolt-elements-textTertiary cursor-not-allowed"
            )}
            disabled={!instruction.trim()}
            aria-label="Envoyer au chat"
          >
            <span className="i-ph:chat-circle-text-duotone w-4 h-4" />
            Envoyer au chat
          </button>
        </div>
      </div>
    </div>
  );
});