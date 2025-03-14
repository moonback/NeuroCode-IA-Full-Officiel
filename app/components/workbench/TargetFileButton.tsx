import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';

interface TargetFileButtonProps {
  filePaths: string[];
  className?: string;
  variant?: 'icon' | 'text' | 'menu-item';
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Composant permettant de cibler un ou plusieurs fichiers dans le chat
 */
export function TargetFileButton({
  filePaths,
  className,
  variant = 'menu-item',
  onSuccess,
  onError,
}: TargetFileButtonProps) {
  if (!filePaths.length) return null;

  const handleTargetFile = () => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) {
      const error = new Error('Impossible de trouver le champ de saisie du chat');
      toast.error(`❌ ${error.message}`);
      onError?.(error);
      return;
    }
  
    try {
      // Génération des commentaires pour chaque fichier
      const fileComments = filePaths.map(path => `// ${path}`).join('\n');
  
      // Vérifier si les fichiers sont déjà ciblés
      const currentValue = textarea.value.trim();
      const alreadyTargeted = filePaths.filter(path => 
        currentValue.includes(`// ${path}`)
      );
      
      if (alreadyTargeted.length > 0) {
        // Informer l'utilisateur que certains fichiers sont déjà ciblés
        toast.info(
          alreadyTargeted.length === 1
            ? `ℹ️ Le fichier ${alreadyTargeted[0]} est déjà ciblé`
            : `ℹ️ ${alreadyTargeted.length} fichiers sont déjà ciblés`,
          { autoClose: 3000, position: 'bottom-right', theme: 'dark' }
        );
        
        // Filtrer les fichiers déjà ciblés
        const newFilePaths = filePaths.filter(path => !alreadyTargeted.includes(path));
        if (newFilePaths.length === 0) return;
        
        // Générer les commentaires pour les nouveaux fichiers uniquement
        const newFileComments = newFilePaths.map(path => `// ${path}`).join('\n');
        const newValue = currentValue ? `${currentValue}\n${newFileComments}\n` : `${newFileComments}\n`;
        textarea.value = newValue;
      } else {
        // Mise à jour du textarea avec le nouveau contenu
        const newValue = currentValue ? `${currentValue}\n${fileComments}\n` : `${fileComments}\n`;
        textarea.value = newValue;
      }
  
      // Déclenchement des événements pour mise à jour de l'état
      ['input', 'autoresize'].forEach(eventType => 
        textarea.dispatchEvent(new Event(eventType, { bubbles: true }))
      );
  
      // Focus et scroll à la fin du texte
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      textarea.scrollTop = textarea.scrollHeight;
  
      // Affichage du message de succès
      toast.success(
        filePaths.length > 1 
          ? `✅ ${filePaths.length} fichiers ajoutés au chat`
          : `✅ Fichier ciblé : ${filePaths[0]}`,
        { autoClose: 3000, position: 'bottom-right', theme: 'dark' }
      );
      
      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de l\'envoi au chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`❌ Échec de l'ajout (${errorMessage})`, {
        autoClose: 5000,
        position: 'bottom-right',
        theme: 'dark'
      });
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  
} 