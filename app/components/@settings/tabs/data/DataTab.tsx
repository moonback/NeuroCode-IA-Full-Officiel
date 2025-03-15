import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { DialogRoot, DialogClose, Dialog, DialogTitle } from '~/components/ui/Dialog';
import { db, getAll, deleteById } from '~/lib/persistence';
import Cookies from 'js-cookie';

export default function DataTab() {
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isImportingKeys, setIsImportingKeys] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResetInlineConfirm, setShowResetInlineConfirm] = useState(false);
  const [showDeleteInlineConfirm, setShowDeleteInlineConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportAllChats = async () => {
    try {
      if (!db) {
        throw new Error('Database not initialized');
      }

      // Get all chats from IndexedDB
      const allChats = await getAll(db);
      const exportData = {
        chats: allChats,
        exportDate: new Date().toISOString(),
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bolt-chats-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Chats exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export chats');
    }
  };

  const handleExportSettings = () => {
    try {
      const settings = {
        userProfile: localStorage.getItem('bolt_user_profile'),
        settings: localStorage.getItem('bolt_settings'),
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bolt-settings-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export settings');
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const settings = JSON.parse(content);

      if (settings.userProfile) {
        localStorage.setItem('bolt_user_profile', settings.userProfile);
      }

      if (settings.settings) {
        localStorage.setItem('bolt_settings', settings.settings);
      }

      window.location.reload(); // Reload to apply settings
      toast.success('Settings imported successfully');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import settings');
    }
  };

  const handleImportAPIKeys = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsImportingKeys(true);

    try {
      const content = await file.text();
      const keys = JSON.parse(content);

      // Get existing keys from cookies
      const existingKeys = (() => {
        const storedApiKeys = Cookies.get('apiKeys');
        return storedApiKeys ? JSON.parse(storedApiKeys) : {};
      })();

      // Validate and save each key
      const newKeys = { ...existingKeys };
      Object.entries(keys).forEach(([key, value]) => {
        // Skip comment fields
        if (key.startsWith('_')) {
          return;
        }

        if (typeof value !== 'string') {
          throw new Error(`Invalid value for key: ${key}`);
        }

        /*
         * Only add non-empty keys
         * Use the key directly as it's already in the correct format
         * (e.g., "OpenAI", "Google", "Anthropic")
         */
        if (value) {
          newKeys[key] = value;
        }
      });

      // Save to cookies
      Cookies.set('apiKeys', JSON.stringify(newKeys));

      toast.success('API keys imported successfully');

      // Reload the page to apply the changes
      window.location.reload();
    } catch (error) {
      console.error('Error importing API keys:', error);
      toast.error('Failed to import API keys');
    } finally {
      setIsImportingKeys(false);

      if (apiKeyFileInputRef.current) {
        apiKeyFileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    setIsDownloadingTemplate(true);

    try {
      /*
       * Create a template with provider names as keys
       * This matches how the application stores API keys in cookies
       */
      const template = {
        Anthropic: '',
        OpenAI: '',
        Google: '',
        Groq: '',
        HuggingFace: '',
        OpenRouter: '',
        Deepseek: '',
        Mistral: '',
        OpenAILike: '',
        Together: '',
        xAI: '',
        Perplexity: '',
        Cohere: '',
        AzureOpenAI: '',
      };

      // Add a comment to explain the format
      const templateWithComment = {
        _comment:
          "Fill in your API keys for each provider. Keys will be stored with the provider name (e.g., 'OpenAI').",
        ...template,
      };

      const blob = new Blob([JSON.stringify(templateWithComment, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bolt-api-keys-template.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleResetSettings = async () => {
    setIsResetting(true);

    try {
      // Clear all stored settings from localStorage
      localStorage.removeItem('bolt_user_profile');
      localStorage.removeItem('bolt_settings');
      localStorage.removeItem('bolt_chat_history');

      // Clear all data from IndexedDB
      if (!db) {
        throw new Error('Database not initialized');
      }

      // Get all chats and delete them
      const chats = await getAll(db as IDBDatabase);
      const deletePromises = chats.map((chat) => deleteById(db as IDBDatabase, chat.id));
      await Promise.all(deletePromises);

      // Close the dialog first
      setShowResetInlineConfirm(false);

      // Then reload and show success message
      window.location.reload();
      toast.success('Settings reset successfully');
    } catch (error) {
      console.error('Reset error:', error);
      setShowResetInlineConfirm(false);
      toast.error('Failed to reset settings');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAllChats = async () => {
    setIsDeleting(true);

    try {
      // Clear chat history from localStorage
      localStorage.removeItem('bolt_chat_history');

      // Clear chats from IndexedDB
      if (!db) {
        throw new Error('Database not initialized');
      }

      // Get all chats and delete them one by one
      const chats = await getAll(db as IDBDatabase);
      const deletePromises = chats.map((chat) => deleteById(db as IDBDatabase, chat.id));
      await Promise.all(deletePromises);

      // Close the dialog first
      setShowDeleteInlineConfirm(false);

      // Then show the success message
      toast.success('L\'historique des discussions a été supprimé avec succès');
    } catch (error) {
      console.error('Delete error:', error);
      setShowDeleteInlineConfirm(false);
      toast.error('Failed to delete chat history');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeletingAll(true);

    try {
      // Clear all cookies
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }

      // Clear localStorage
      localStorage.clear();

      // Clear IndexedDB
      if (db) {
        const chats = await getAll(db as IDBDatabase);
        const deletePromises = chats.map((chat) => deleteById(db as IDBDatabase, chat.id));
        await Promise.all(deletePromises);
      }

      // Close the dialog
      setShowDeleteAllConfirm(false);

      // Reload the page
      window.location.reload();
      toast.success('Toutes les données ont été supprimées avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
      toast.error('Échec de la suppression des données');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportSettings} className="hidden" />
      {/* Dialogue de réinitialisation des paramètres */}
      <DialogRoot open={showResetInlineConfirm} onOpenChange={setShowResetInlineConfirm}>
        <Dialog showCloseButton={false} className="z-[1000]">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="i-ph:warning-circle-fill w-5 h-5 text-yellow-500" />
              <DialogTitle>Réinitialiser tous les paramètres ?</DialogTitle>
            </div>
            <p className="text-sm text-bolt-elements-textSecondary mt-2">
              Cela réinitialisera tous vos paramètres à leurs valeurs par défaut. Cette action est irréversible.
            </p>
            <div className="flex justify-end items-center gap-3 mt-6">
              <DialogClose asChild>
                <button className="px-4 py-2 rounded-lg text-sm bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white">
                  Annuler
                </button>
              </DialogClose>
              <motion.button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white dark:bg-[#1A1A1A] text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 border border-transparent hover:border-yellow-500/10 dark:hover:border-yellow-500/20"
                onClick={handleResetSettings}
                disabled={isResetting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isResetting ? (
                  <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
                ) : (
                  <div className="i-ph:arrow-counter-clockwise w-4 h-4" />
                )}
                Réinitialiser
              </motion.button>
            </div>
          </div>
        </Dialog>
      </DialogRoot>

      {/* Dialogue de confirmation de suppression */}
      <DialogRoot open={showDeleteInlineConfirm} onOpenChange={setShowDeleteInlineConfirm}>
        <Dialog showCloseButton={false} className="z-[1000]">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="i-ph:warning-circle-fill w-5 h-5 text-red-500" />
              <DialogTitle>Supprimer toutes les conversations ?</DialogTitle>
            </div>
            <p className="text-sm text-bolt-elements-textSecondary mt-2">
              Cela supprimera définitivement tout votre historique de conversation. Cette action est irréversible.
            </p>
            <div className="flex justify-end items-center gap-3 mt-6">
              <DialogClose asChild>
                <button className="px-4 py-2 rounded-lg text-sm bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white">
                  Annuler
                </button>
              </DialogClose>
              <motion.button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-500 text-sm hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeleteAllChats}
              >
                <div className="i-ph:trash w-4 h-4" />
                Supprimer tout
              </motion.button>
            </div>
          </div>
        </Dialog>
      </DialogRoot>

      {/* Dialog for deleting all data */}
      <DialogRoot open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <Dialog showCloseButton={false} className="z-[1000]">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="i-ph:warning-circle-fill w-5 h-5 text-red-500" />
              <DialogTitle>Supprimer toutes les données ?</DialogTitle>
            </div>
            <p className="text-sm text-bolt-elements-textSecondary mt-2">
              Cela supprimera définitivement toutes vos données, y compris les cookies, l'historique des conversations, et les paramètres utilisateur. Cette action est irréversible.
            </p>
            <div className="flex justify-end items-center gap-3 mt-6">
              <DialogClose asChild>
                <button className="px-4 py-2 rounded-lg text-sm bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white">
                  Annuler
                </button>
              </DialogClose>
              <motion.button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white dark:bg-[#1A1A1A] text-red-500 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-500/10 dark:hover:border-red-500/20"
                onClick={handleDeleteAllData}
                disabled={isDeletingAll}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isDeletingAll ? (
                  <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
                ) : (
                  <div className="i-ph:trash w-4 h-4" />
                )}
                Tout supprimer
              </motion.button>
            </div>
          </div>
        </Dialog>
      </DialogRoot>

      {/* Section Historique des conversations */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:chat-circle-duotone w-5 h-5 text-green-500/20" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Historique des conversations</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Exportez ou supprimez tout votre historique de conversations.</p>
        <div className="flex gap-4">
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-white text-sm hover:bg-green-500/30-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportAllChats}
          >
            <div className="i-ph:download-simple w-4 h-4" />
            Exporter les conversations
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-500 text-sm hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDeleteInlineConfirm(true)}
          >
            <div className="i-ph:trash w-4 h-4" />
            Supprimer tout
          </motion.button>
        </div>
      </motion.div>

      {/* Section Sauvegarde des paramètres */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:gear-duotone w-5 h-5 text-green-500/20" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sauvegarde des paramètres</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Exportez vos paramètres dans un fichier JSON ou importez des paramètres depuis un fichier précédemment exporté.
        </p>
        <div className="flex gap-4">
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-white text-sm hover:bg-green-500/30-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportSettings}
          >
            <div className="i-ph:download-simple w-4 h-4" />
            Exporter les paramètres
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-white text-sm hover:bg-green-500/30-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="i-ph:upload-simple w-4 h-4" />
            Importer les paramètres
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 text-yellow-600 text-sm hover:bg-yellow-100 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20 dark:text-yellow-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowResetInlineConfirm(true)}
          >
            <div className="i-ph:arrow-counter-clockwise w-4 h-4" />
            Réinitialiser
          </motion.button>
        </div>
      </motion.div>

      {/* Section Gestion des clés API */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:key-duotone w-5 h-5 text-green-500/20" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Gestion des clés API</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Importez des clés API depuis un fichier JSON ou téléchargez un modèle à remplir.
        </p>
        <div className="flex gap-4">
          <input
            ref={apiKeyFileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportAPIKeys}
            className="hidden"
          />
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-white text-sm hover:bg-green-500/30-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
          >
            {isDownloadingTemplate ? (
              <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
            ) : (
              <div className="i-ph:download-simple w-4 h-4" />
            )}
            Télécharger le modèle
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-white text-sm hover:bg-green-500/30-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => apiKeyFileInputRef.current?.click()}
            disabled={isImportingKeys}
          >
            {isImportingKeys ? (
              <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
            ) : (
              <div className="i-ph:upload-simple w-4 h-4" />
            )}
            Importer les clés API
          </motion.button>
        </div>
      </motion.div>

      {/* New section for deleting all data */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:trash-duotone w-5 h-5 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Suppression complète</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Supprimez toutes vos données, y compris les cookies, l'historique des conversations, et les paramètres utilisateur.
        </p>
        <motion.button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-500 text-sm hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDeleteAllConfirm(true)}
        >
          <div className="i-ph:trash w-4 h-4" />
          Supprimer toutes les données
        </motion.button>
      </motion.div>
    </div>
  );
}
