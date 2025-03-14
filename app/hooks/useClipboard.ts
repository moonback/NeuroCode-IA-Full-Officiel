import { useCallback } from 'react';
import { toast } from 'react-toastify';

export const useClipboard = () => {
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      toast('Échec de la copie dans le presse-papiers');
    }
  }, []);

  return { copyToClipboard };
}; 
