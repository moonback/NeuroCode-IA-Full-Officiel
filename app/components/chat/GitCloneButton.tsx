import ignore from 'ignore';
import { useGit } from '~/lib/hooks/useGit';
import type { Message } from 'ai';
import { detectProjectCommands, createCommandsMessage, escapeBoltTags } from '~/utils/projectCommands';
import { generateId } from '~/utils/fileUtils';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { LoadingOverlay } from '~/components/ui/LoadingOverlay';
import { RepositorySelectionDialog } from '~/components/@settings/tabs/connections/components/RepositorySelectionDialog';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/Button';
import type { IChatMetadata } from '~/lib/persistence/db';

const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yaml',
];

const ig = ignore().add(IGNORE_PATTERNS);

const MAX_FILE_SIZE = 500 * 1024; // 500KB limit per file (increased from 100KB)
const MAX_TOTAL_SIZE = 2 * 1024 * 1024; // 2MB total limit (increased from 500KB)

// Binary file extensions that should be skipped
const BINARY_EXTENSIONS = [
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'ico', 'heic', 'avif',
  // Audio/Video
  'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov', 'webm', 'flac', 'aac', 'mkv',
  // Archives
  'zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz',
  // Documents
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
  // Executables
  'exe', 'dll', 'so', 'dylib', 'bin', 'apk', 'dmg', 'iso',
  // Other known binary formats
  'ttf', 'otf', 'woff', 'woff2', 'eot', 'class', 'o', 'pyc', 'pyd'
];

// Function to check if a file is likely binary based on extension
const isBinaryFileByExtension = (filePath: string): boolean => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  return extension ? BINARY_EXTENSIONS.includes(extension) : false;
};

// Function to check if data is likely binary content
const isBinaryContent = (data: Uint8Array): boolean => {
  // Check a sample of the file for null bytes or other binary indicators
  const sampleSize = Math.min(1000, data.length);
  for (let i = 0; i < sampleSize; i++) {
    // Check for null bytes and other control characters (except common ones like newline, tab)
    const byte = data[i];
    if (byte === 0 || (byte < 9 && byte !== 0) || (byte > 13 && byte < 32)) {
      return true;
    }
  }
  return false;
};

interface GitCloneButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[], metadata?: IChatMetadata) => Promise<void>;
}

export default function GitCloneButton({ importChat, className }: GitCloneButtonProps) {
  const { ready, gitClone } = useGit();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClone = async (repoUrl: string) => {
    if (!ready) {
      toast.info('Git n\'est pas encore prêt');
      return;
    }

    setLoading(true);
    toast.info(`Clonage du dépôt ${repoUrl}...`);

    try {
      const { workdir, data } = await gitClone(repoUrl);
      toast.success('Référentiel cloné avec succès !');

      if (importChat) {
        const filePaths = Object.keys(data).filter((filePath) => !ig.ignores(filePath));
        const textDecoder = new TextDecoder('utf-8');

        let totalSize = 0;
        const skippedFiles: string[] = [];
        const fileContents = [];

        for (const filePath of filePaths) {
          const { data: content, encoding } = data[filePath];

          // Ignorer les fichiers binaires basés sur l'extension
          if (isBinaryFileByExtension(filePath)) {
            skippedFiles.push(`${filePath} (type de fichier binaire)`);
            continue;
          }

          try {
            // Pour le contenu Uint8Array, vérifier s'il est binaire
            if (content instanceof Uint8Array) {
              if (isBinaryContent(content)) {
                skippedFiles.push(`${filePath} (contenu binaire détecté)`);
                continue;
              }
            }

            const textContent =
              encoding === 'utf8' ? content : content instanceof Uint8Array ? textDecoder.decode(content) : '';

            if (!textContent) {
              skippedFiles.push(`${filePath} (vide ou illisible)`);
              continue;
            }

            // Vérifier la taille du fichier
            const fileSize = new TextEncoder().encode(textContent).length;

            if (fileSize > MAX_FILE_SIZE) {
              skippedFiles.push(`${filePath} (trop grand: ${Math.round(fileSize / 1024)}KB)`);
              continue;
            }

            // Vérifier la taille totale
            if (totalSize + fileSize > MAX_TOTAL_SIZE) {
              skippedFiles.push(`${filePath} (dépasserait la limite de taille totale)`);
              continue;
            }

            totalSize += fileSize;
            fileContents.push({
              path: filePath,
              content: textContent,
            });
          } catch (e: any) {
            skippedFiles.push(`${filePath} (erreur: ${e.message})`);
          }
        }

        const commands = await detectProjectCommands(fileContents);
        const commandsMessage = createCommandsMessage(commands);

        const filesMessage: Message = {
          role: 'assistant',
          content: `✅ Dépôt Git cloné avec succès: ${repoUrl}\n📁 Emplacement local: ${workdir}\n\n📊 Statistiques:\n- Fichiers importés: ${fileContents.length}\n- Fichiers ignorés: ${skippedFiles.length}\n\nStatut : Opération terminée
${
  skippedFiles.length > 0
    ? `\nFichiers ignorés (${skippedFiles.length}):
${skippedFiles.map((f) => `- ${f}`).join('\n')}`
    : ''
}

<boltArtifact id="imported-files" title="Fichiers clonés de ${repoUrl}" type="bundled">
${fileContents
  .map(
    (file) =>
      `<boltAction type="file" filePath="${file.path}">
${escapeBoltTags(file.content)}
</boltAction>`,
  )
  .join('\n')}
</boltArtifact>`,
          id: generateId(),
          createdAt: new Date(),
        };

        const messages = [filesMessage];

        if (commandsMessage) {
          messages.push(commandsMessage);
        }

        await importChat(`Projet Git:${repoUrl.split('/').slice(-1)[0]}`, messages);
      }
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
      toast.error('Échec de l\'importation du dépôt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
       <Button
        onClick={() => setIsDialogOpen(true)}
        title="Cloner un dépôt Git"
        variant="ghost"
        size="icon"
        className="p-0 hover:bg-transparent -mx-1 bg-transparent border-none text-white hover:text-white bg-bolt-elements-background-depth-3 transition-all duration-200 hover:scale-105"
        disabled={!ready || loading}
        aria-busy={loading}
      >
        {loading ? (
          <span className="i-svg-spinners:90-ring-with-bg w-5 h-5 text-bolt-elements-loader-progress animate-spin" />
        ) : (
          <span className="i-ph:git-merge w-5 h-5 text-bolt-elements-textPrimary dark:text-gray-500 hover:text-white" />
        )}
      </Button>

      <RepositorySelectionDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSelect={handleClone} />

      {loading && <LoadingOverlay message="Veuillez patienter pendant le clonage du dépôt..." />}
    </>
  );
}
