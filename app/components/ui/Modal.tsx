interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-start p-4 z-[99999]">
      <div className="bg-bolt-elements-background-depth-1 rounded-xl shadow-2xl max-w-lg w-full relative z-[100000] mt-16 ml-4 border border-bolt-elements-borderColor/20">
        <div className="flex justify-between items-center p-4 border-b border-bolt-elements-borderColor/20">
          <h3 className="text-lg font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
            <div className="i-ph:info text-xl text-green-500" />
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-transparent hover:bg-bolt-elements-background-depth-2 transition-colors text-bolt-elements-textSecondary hover:text-red-400"
          >
            <div className="i-ph:x w-5 h-5" />
          </button>
        </div>
        <div className="p-4 text-bolt-elements-textSecondary">
          {children}
        </div>
      </div>
    </div>
  );
} 