import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { ImportFolderButton } from '~/components/chat/ImportFolderButton';
import { Button } from '~/components/ui/Button';
import { classNames } from '~/utils/classNames';

type ChatData = {
  messages?: Message[]; // Standard Bolt format
  description?: string; // Optional description
};

export function ImportButtons(importChat: ((description: string, messages: Message[]) => Promise<void>) | undefined) {
  return (
    <div className="flex flex-col items-center justify-center w-auto">
      <input
        type="file"
        id="chat-import"
        className="hidden"
        accept=".json"
        onChange={async (e) => {
          const file = e.target.files?.[0];

          if (file && importChat) {
            try {
              const reader = new FileReader();

              reader.onload = async (e) => {
                try {
                  const content = e.target?.result as string;
                  const data = JSON.parse(content) as ChatData;

                  // Standard format
                  if (Array.isArray(data.messages)) {
                    await importChat(data.description || 'Imported Chat', data.messages);
                    toast('Le chat a été importé avec succès');

                    return;
                  }

                  toast('Format de fichier de chat invalide');
                } catch (error: unknown) {
                  if (error instanceof Error) {
                    toast('Impossible de parser le fichier de chat: ' + error.message);
                  } else {
                    toast('Impossible de parser le fichier de chat');
                  }
                }
              };
              reader.onerror = () => toast('Impossible de lire le fichier de chat');
              reader.readAsText(file);
            } catch (error) {
              toast(error instanceof Error ? error.message : 'Impossible d\'importer le chat');
            }
            e.target.value = ''; // Reset file input
          } else {
            toast('Quelque chose s\'est mal passé');
          }
        }}
      />
      <div className="flex flex-col items-center gap-4 max-w-2xl text-center">
        <div className="flex gap-2">
        <Button
            onClick={() => {
              const input = document.getElementById('chat-import');
              input?.click();
            }}
            variant="ghost"
            size="icon"
            className="p-0 bg-transparent hover:bg-transparent"
          >
            <span className="i-ph:upload-simple w-5 h-5 text-gray-500 dark:text-gray-500 hover:text-white" />
          </Button>
          <ImportFolderButton
            importChat={importChat}
            className={classNames(
              'gap-2 bg-[#F5F5F5] dark:bg-[#252525]',
              'text-bolt-elements-textPrimary dark:text-white',
              'hover:bg-[#E5E5E5] dark:hover:bg-[#333333]',
              'border border-[#E5E5E5] dark:border-[#333333]',
              'h-10 px-4 py-2 min-w-[120px] justify-center',
              'transition-all duration-200 ease-in-out rounded-lg',
            )}
          />
        </div>
      </div>
    </div>
  );
}
