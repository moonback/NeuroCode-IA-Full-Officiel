import type { Message } from 'ai';
import { generateId } from './fileUtils';
import { detectProjectCommands, createCommandsMessage, escapeBoltTags } from './projectCommands';

export const createChatFromFolder = async (
  files: File[],
  binaryFiles: string[],
  folderName: string,
): Promise<Message[]> => {
  try {
    const fileArtifacts = await Promise.all(
      files.map(async (file) => {
        return new Promise<{ content: string; path: string }>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            try {
              const content = reader.result as string;
              if (!file.webkitRelativePath) {
                throw new Error('File path is missing');
              }
              const relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
              resolve({
                content,
                path: relativePath,
              });
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsText(file);
        });
      }),
    );

    const commands = await detectProjectCommands(fileArtifacts);
    const commandsMessage = createCommandsMessage(commands);

    const binaryFilesMessage = binaryFiles.length > 0
      ? `\n\nFichiers binaires ignorés (${binaryFiles.length}):\n${binaryFiles.map((f) => `- ${f}`).join('\n')}`
      : '';

    const filesMessage: Message = {
      role: 'assistant',
      content: `Importation du projet "${folderName}" terminée avec succès.${binaryFilesMessage}

<boltArtifact id="imported-files" title="Fichiers importés" type="bundled">
${fileArtifacts
  .map(
    (file) => `<boltAction type="file" filePath="${file.path}">
${escapeBoltTags(file.content)}
</boltAction>`,
  )
  .join('\n\n')}
</boltArtifact>`,
      id: generateId(),
      createdAt: new Date(),
    };

    const userMessage: Message = {
      role: 'user',
      id: generateId(),
      content: `Importe le projet "${folderName}"`,
      createdAt: new Date(),
    };

    const messages = [userMessage, filesMessage];

    if (commandsMessage) {
      messages.push({
        role: 'user',
        id: generateId(),
        content: 'Analyse le projet et effectue la Configuration des dépendances avant la préparation du démarrage de l\'application :',
      });
      messages.push(commandsMessage);
    }

    return messages;
  } catch (error) {
    console.error('Error during folder import:', error);
    throw new Error('Failed to import folder. Please check the files and try again.');
  }
};
