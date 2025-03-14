import { useStore } from '@nanostores/react';
import { useEditChatDescription } from '~/lib/hooks';
import { description as descriptionStore } from '~/lib/persistence';
import Tooltip from '~/components/ui/Tooltip';

export function ChatDescription() {
  const initialDescription = useStore(descriptionStore)!;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription,
      syncWithGlobalStore: true,
    });

  if (!initialDescription) {
    // doing this to prevent showing edit button until chat description is set
    return null;
  }

  return (
    <div className="flex items-center justify-center group">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 animate-fadeIn">
          <input
            type="text"
            className="bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary rounded-lg px-3 py-1.5 w-fit focus:ring-2 focus:ring-green-500/50 outline-none transition-all duration-200 shadow-sm hover:shadow-md"
            autoFocus
            value={currentDescription}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ width: `${Math.max(currentDescription.length * 8, 120)}px` }}
            placeholder="Entrez une description..."
          />
          <Tooltip content="Enregistrer la description">
            <button
              type="submit"
              className="i-ph:check-bold text-xl text-bolt-elements-textPrimary hover:text-green-500 transition-colors hover:scale-110 active:scale-95 transform-gpu"
              onMouseDown={handleSubmit}
            />
          </Tooltip>
        </form>
      ) : (
        <div className="flex items-center gap-2 group-hover:bg-bolt-elements-background-depth-2/50 rounded-lg px-3 py-1.5 transition-colors duration-200 hover:shadow-sm">
          <span className="text-bolt-elements-textPrimary font-medium truncate max-w-[200px]">
            {currentDescription}
          </span>
          <Tooltip content="Editer la description">
            <button
              type="button"
              className="i-ph:pencil-fill text-xl text-bolt-elements-textPrimary/50 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100 transform-gpu hover:scale-110 active:scale-95"
              onClick={(event) => {
                event.preventDefault();
                toggleEditMode();
              }}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
}
