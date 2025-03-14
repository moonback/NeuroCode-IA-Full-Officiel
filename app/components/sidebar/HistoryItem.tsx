import { useParams } from '@remix-run/react';
import { classNames } from '~/utils/classNames';
import * as Dialog from '@radix-ui/react-dialog';
import { type ChatHistoryItem } from '~/lib/persistence';
import WithTooltip from '~/components/ui/Tooltip';
import { useEditChatDescription } from '~/lib/hooks';
import { forwardRef, type ForwardedRef } from 'react';

interface HistoryItemProps {
  item: ChatHistoryItem;
  onDelete?: (event: React.UIEvent) => void;
  onDuplicate?: (id: string) => void;
  exportChat: (id?: string) => void;
  onFavorite?: (id: string) => void;
}

export function HistoryItem({ item, onDelete, onDuplicate, exportChat, onFavorite }: HistoryItemProps) {
  const { id: urlId } = useParams();
  const isActiveChat = urlId === item.urlId;
  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription: item.description,
      customChatId: item.id,
      syncWithGlobalStore: isActiveChat,
    });

  const handleAction = (callback?: (id: string) => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    callback?.(item.id);
  };

  const baseClasses = 'group rounded-lg text-sm transition-colors overflow-hidden flex justify-between items-center px-3 py-2';
  const stateClasses = {
    'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/80 dark:hover:bg-gray-800/30': true,
    'text-gray-900 dark:text-white bg-gray-50/80 dark:bg-gray-800/30': isActiveChat,
    'bg-transparent': !!item.favorite,
  };

  return (
    <div
      className={classNames(baseClasses, stateClasses)}
      role="listitem"
      aria-label={`Chat history item: ${currentDescription}`}
    >
      {editing ? (
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            className="flex-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            autoFocus
            value={currentDescription}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            aria-label="Modifier la description du chat"
          />
          <button
            type="submit"
            className="i-ph:check h-4 w-4 text-gray-500 hover:text-green-500 transition-colors"
            onMouseDown={handleSubmit}
            aria-label="Enregistrer les modifications"
          />
        </form>
      ) : (
        <a 
          href={`/chat/${item.urlId}`} 
          className="flex w-full relative truncate block"
          aria-current={isActiveChat ? 'page' : undefined}
        >
          <WithTooltip content={currentDescription}>
            <span className="truncate pr-4">{currentDescription}</span>
          </WithTooltip>
        </a>
      )}
      
      <div className={classNames(
        'transition-colors duration-200',
        { 'bg-gray-50/80 dark:bg-gray-800/30': isActiveChat }
      )}>
        <div className={classNames(
          'flex items-center gap-2.5',
          'text-gray-400 dark:text-gray-500',
          { 'opacity-100': !!item.favorite, 'opacity-0 group-hover:opacity-100': !item.favorite },
          'transition-opacity duration-200 ease-in-out'
        )}>
          <ChatActionButton
            toolTipContent={item.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            icon={`i-ph:star${item.favorite ? '-fill' : ''} h-4 w-4`}
            className={classNames(
              'transition-colors duration-200',
              item.favorite ? 'text-yellow-500 opacity-100 dark:text-yellow-500' : 'hover:text-yellow-500 dark:hover:text-yellow-500'
            )}
            onClick={handleAction(onFavorite)}
            btnTitle={item.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          />
          <ChatActionButton
            toolTipContent="Exporter"
            icon="i-ph:download-simple h-4 w-4"
            className="hover:text-green-500 dark:hover:text-green-400 transition-colors duration-200"
            onClick={handleAction(exportChat)}
            btnTitle="Exporter le chat"
          />
          {onDuplicate && (
            <ChatActionButton
              toolTipContent="Dupliquer"
              icon="i-ph:copy h-4 w-4"
              className="hover:text-green-500 dark:hover:text-green-400 transition-colors duration-200"
              onClick={handleAction(onDuplicate)}
              btnTitle="Dupliquer le chat"
            />
          )}
          <ChatActionButton
            toolTipContent="Renommer"
            icon="i-ph:pencil-fill h-4 w-4"
            className="hover:text-green-500 dark:hover:text-green-400 transition-colors duration-200"
            onClick={(event) => {
              event.preventDefault();
              toggleEditMode();
            }}
            btnTitle="Renommer le chat"
          />
          <Dialog.Trigger asChild>
            <ChatActionButton
              toolTipContent="Supprimer"
              icon="i-ph:trash h-4 w-4"
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-500 transition-colors duration-200"
              onClick={(event) => {
                event.preventDefault();
                onDelete?.(event);
              }}
              btnTitle="Supprimer le chat"
            />
          </Dialog.Trigger>
        </div>
      </div>
    </div>
  );
}

const ChatActionButton = forwardRef(
  (
    {
      toolTipContent,
      icon,
      className,
      onClick,
      btnTitle,
    }: {
      toolTipContent: string;
      icon: string;
      className?: string;
      onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
      btnTitle?: string;
    },
    ref: ForwardedRef<HTMLButtonElement>,
  ) => {
    return (
      <WithTooltip content={toolTipContent} position="bottom" sideOffset={4}>
        <button
          ref={ref}
          type="button"
          className={`text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400 transition-colors ${icon} ${className ? className : ''}`}
          onClick={onClick}
          aria-label={btnTitle}
          title={btnTitle}
        />
      </WithTooltip>
    );
  },
);
