import type { Message } from 'ai';
import React, { Fragment } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { useLocation } from '@remix-run/react';
import { db, chatId } from '~/lib/persistence/useChatHistory';
import { forkChat } from '~/lib/persistence/db';
import { toast } from 'react-toastify';
import WithTooltip from '~/components/ui/Tooltip';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
  onSuggestionClick?: (task: string) => void;
  onReplyClick?: (messageId: string) => void;
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [], onSuggestionClick, onReplyClick } = props;
  const location = useLocation();
  const profile = useStore(profileStore);

  const handleRewind = (messageId: string) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('rewindTo', messageId);
    window.location.search = searchParams.toString();
  };

  const handleFork = async (messageId: string) => {
    try {
      if (!db || !chatId.get()) {
        toast('La persistance du chat n\'est pas disponible');
        return;
      }

      const urlId = await forkChat(db, chatId.get()!, messageId);
      window.location.href = `/chat/${urlId}`;
    } catch (error) {
      toast('Échec de la création du fork du chat: ' + (error as Error).message);
    }
  };

  const handleReply = (messageId: string) => {
    if (onReplyClick) {
      const message = messages?.find(m => m.id === messageId);
      if (message && !message.annotations?.includes('artifact')) {
        onReplyClick(messageId);
      }
    }
  };


  const MessageActions = ({ messageId, content }: { messageId: string; content: string }) => (
    <div className="flex gap-2 flex-col lg:flex-row">
      
      <WithTooltip content="Répondre à ce message">
        <button
          onClick={() => handleReply(messageId)}
          className="i-ph:arrow-bend-up-right text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
        />
      </WithTooltip>
      <WithTooltip content="Revertir à ce message">
        <button
          onClick={() => handleRewind(messageId)}
          className="i-ph:arrow-u-up-left text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
        />
      </WithTooltip>
      <WithTooltip content="Forker le chat à partir de ce message">
        <button
          onClick={() => handleFork(messageId)}
          className="i-ph:git-fork text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
        />
      </WithTooltip>
    </div>
  );

  const UserAvatar = () => (
    <div className="absolute left-0 -translate-x-1/2">
      <div className="flex items-center justify-center w-[38px] h-[38px] overflow-hidden bg-gradient-to-br from-blue-100 to-green-100 text-gray-600 rounded-full shrink-0 shadow-sm ring-1 ring-white/20 hover:scale-105 transition-transform">
        {profile.avatar ? (
          <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="i-ph:user-fill text-xl" />
        )}
      </div>
    </div>
  );

  const AIAvatar = () => (
    <div className="absolute left-0 -translate-x-1/2">
      <div className="flex items-center justify-center w-[38px] h-[38px] overflow-hidden bg-gradient-to-br from-gray-900 to-gray-700 text-white rounded-full shrink-0 shadow-sm ring-1 ring-white/20 hover:scale-105 transition-transform">
        <div className="i-ph:robot-bold text-2xl" />
      </div>
    </div>
  );

  return (
    <div id={id} ref={ref} className={classNames('flex flex-col gap-2', props.className)}>
      {messages.length > 0
        ? messages.map((message, index) => {
            const { role, content, id: messageId, annotations } = message;
            const isUserMessage = role === 'user';
            const isFirst = index === 0;
            const isLast = index === messages.length - 1;
            const isHidden = annotations?.includes('hidden');

            if (isHidden) {
              return <Fragment key={index} />;
            }

            return (
              <div
                key={index}
                className={classNames('relative flex gap-4 pl-12 pr-4 py-4 w-full rounded-lg transition-all', {
                  'bg-bolt-elements-messages-background/50 hover:bg-bolt-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                  'bg-gradient-to-b from-bolt-elements-messages-background/50 from-30% to-transparent hover:from-bolt-elements-messages-background':
                    isStreaming && isLast,
                  'mt-2': !isFirst,
                  'border border-bolt-elements-borderColor/20': !isUserMessage,
                  'shadow-sm': isLast,
                  'ring-1 ring-white/10': true,
                  'hover:shadow-md transition-shadow duration-200': true,
                })}
              >
                {isUserMessage ? <UserAvatar /> : <AIAvatar />}
                <div className="grid grid-col-1 w-full gap-1">
                  {isUserMessage ? (
                    <UserMessage content={content} />
                  ) : (
                    <AssistantMessage
                      content={content}
                      annotations={message.annotations}
                      isLast={isLast}
                      isStreaming={isStreaming}
                      onSuggestionClick={onSuggestionClick}
                    />
                  )}
                </div>
                {!isUserMessage && (
                  <div className="flex flex-col gap-2 items-center justify-start pt-1">
                    <MessageActions messageId={messageId} content={content} />
                  </div>
                )}
              </div>
            );
          })
        : null}
      {isStreaming && (
        <div className="flex justify-center w-full mt-4">
          <div className="i-svg-spinners:3-dots-fade text-4xl text-bolt-elements-textPrimary animate-fade-in" />
        </div>
      )}
    </div>
  );
});
