import { classNames } from '~/utils/classNames';

// Theme token documentation
const themeTokens = {
  background: {
    base: 'bg-[#F5F5F5] dark:bg-[#1E1E1E]',
    depth1: 'bg-[#FFFFFF] dark:bg-[#252525]',
    depth2: 'bg-[#FFFFFF] dark:bg-[#2A2A2A]',
    depth3: 'bg-[#EFEFEF] dark:bg-[#333333]',
  },
  text: {
    primary: 'text-[#111111] dark:text-[#FFFFFF]',
    secondary: 'text-[#666666] dark:text-[#A0A0A0]',
    tertiary: 'text-[#888888] dark:text-[#808080]',
  },
  border: {
    base: 'border-[#E5E5E5] dark:border-[#333333]',
  },
  icon: {
    base: 'flex items-center justify-center',
    sizes: {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    },
    colors: {
      primary: 'text-[#111111] dark:text-[#FFFFFF]',
      secondary: 'text-[#666666] dark:text-[#A0A0A0]',
      tertiary: 'text-[#888888] dark:text-[#808080]',
      accent: 'text-purple-500 dark:text-purple-400',
    },
    outline: classNames(
      'border border-[#E5E5E5] dark:border-[#333333]',
      'bg-transparent',
      'text-[#111111] dark:text-[#FFFFFF]',
      'hover:bg-[#F5F5F5] dark:hover:bg-[#252525]',
      'focus:ring-[#E5E5E5]/50 dark:focus:ring-[#333333]/50',
    ),
  },
  input: {
    base: classNames(
      'h-12 px-4 rounded-xl',
      'bg-[#FFFFFF] dark:bg-[#2A2A2A]',
      'border border-[#E5E5E5] dark:border-[#333333]',
      'text-[#111111] dark:text-[#FFFFFF]',
      'placeholder:text-[#888888] dark:placeholder:text-[#808080]',
      'focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20',
      'focus:border-purple-500 dark:focus:border-purple-400',
    ),
  },
  button: {
    base: classNames(
      'transition-colors duration-200',
      'focus:outline-none focus:ring-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'rounded-xl h-12 px-4',
      'inline-flex items-center justify-center gap-2',
      'text-sm font-medium',
    ),
    primary: classNames(
      'bg-[#7C3AED] hover:bg-[#6D28D9]',
      'text-white',
      'focus:ring-[#7C3AED]/50',
      'dark:bg-[#8B5CF6] dark:hover:bg-[#7C3AED]',
    ),
    secondary: classNames(
      'bg-[#FFFFFF] hover:bg-[#F5F5F5]',
      'text-[#111111] dark:text-[#FFFFFF]',
      'border border-[#E5E5E5] dark:border-[#333333]',
      'focus:ring-[#E5E5E5]/50 dark:focus:ring-[#333333]/50',
      'dark:bg-[#2A2A2A] dark:hover:bg-[#333333]',
    ),
    outline: classNames(
      'border border-[#E5E5E5] dark:border-[#333333]',
      'bg-transparent',
      'text-[#111111] dark:text-[#FFFFFF]',
      'hover:bg-[#F5F5F5] dark:hover:bg-[#252525]',
      'focus:ring-[#E5E5E5]/50 dark:focus:ring-[#333333]/50',
    ),
    tab: {
      base: classNames(
        'inline-flex items-center gap-2',
        'text-sm font-medium',
        'rounded-xl px-4 h-12',
        'transition-colors duration-200',
      ),
      active: classNames('bg-[#FFFFFF] dark:bg-[#2A2A2A]', 'text-[#111111] dark:text-[#FFFFFF]'),
      inactive: classNames(
        'bg-transparent',
        'text-[#666666] dark:text-[#A0A0A0]',
        'hover:text-[#111111] dark:hover:text-[#FFFFFF]',
        'hover:bg-[#FFFFFF] dark:hover:bg-[#252525]',
      ),
    },
  },
  dialog: {
    overlay: classNames('fixed inset-0 bg-black/90 z-50', 'backdrop-blur-sm'),
    content: classNames(
      'bg-[#F5F5F5] dark:bg-[#1E1E1E]',
      'border border-[#E5E5E5] dark:border-[#333333]',
      'shadow-xl rounded-xl',
      'overflow-hidden',
      'fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2',
      'w-[90vw] md:w-[600px] max-h-[85vh]',
      'z-[51]',
    ),
    header: classNames('p-4 border-b', 'border-[#E5E5E5] dark:border-[#333333]', 'bg-[#FFFFFF] dark:bg-[#252525]'),
    body: classNames('p-4 overflow-y-auto', 'bg-[#F5F5F5] dark:bg-[#1E1E1E]'),
    footer: classNames(
      'p-4 border-t',
      'border-[#E5E5E5] dark:border-[#333333]',
      'bg-[#FFFFFF] dark:bg-[#252525]',
      'flex justify-end gap-3',
    ),
    close: classNames(
      'p-2 rounded-lg transition-colors duration-200',
      'text-[#666666] hover:text-[#111111]',
      'bg-transparent hover:bg-[#EFEFEF]',
      'dark:text-[#A0A0A0] dark:hover:text-[#FFFFFF]',
      'dark:bg-transparent dark:hover:bg-[#333333]',
    ),
    section: classNames(
      'p-4 rounded-xl',
      'bg-[#FFFFFF] dark:bg-[#2A2A2A]',
      'transition-colors duration-200',
      'hover:bg-[#F5F5F5] dark:hover:bg-[#333333]',
    ),
  },
  status: {
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: 'text-yellow-500 dark:text-yellow-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      icon: 'text-red-500 dark:text-red-400',
    },
    private: {
      bg: 'bg-neutral-50 dark:bg-neutral-900/30',
      text: 'text-neutral-700 dark:text-neutral-400',
    },
  },
  scrollbar: classNames(
    'scrollbar-thin',
    'scrollbar-thumb-[#E5E5E5] dark:scrollbar-thumb-[#333333]',
    'scrollbar-track-transparent',
  ),
  checkbox: {
    base: classNames(
      'appearance-none w-5 h-5 rounded-md border transition-colors duration-200',
      'border-[#E5E5E5] dark:border-[#333333]',
      'checked:bg-[#F5F5F5] dark:checked:bg-[#2A2A2A]',
      'checked:border-[#E5E5E5] dark:checked:border-[#333333]',
      'hover:border-[#D5D5D5] dark:hover:border-[#404040]',
    ),
    checkmark: classNames(
      'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      'w-3 h-3 text-[#666666] dark:text-[#A0A0A0] pointer-events-none',
    ),
  },
  iconButton: {
    base: classNames(
      'p-2 rounded-lg transition-colors duration-200',
      'text-[#666666] hover:text-[#111111]',
      'bg-transparent hover:bg-[#F5F5F5]',
      'dark:text-[#A0A0A0] dark:hover:text-[#FFFFFF]',
      'dark:bg-transparent dark:hover:bg-[#333333]',
    ),
  },
  branchSelector: {
    base: classNames(
      'h-10 px-4 rounded-xl',
      'bg-[#FFFFFF] dark:bg-[#2A2A2A]',
      'border border-[#E5E5E5] dark:border-[#333333]',
      'text-[#111111] dark:text-[#FFFFFF]',
      'hover:border-[#D5D5D5] dark:hover:border-[#404040]',
      'focus:ring-2 focus:ring-[#E5E5E5]/50 dark:focus:ring-[#333333]/50',
    ),
    dropdown: classNames(
      'absolute z-50 mt-2 w-full',
      'bg-[#FFFFFF] dark:bg-[#2A2A2A]',
      'border border-[#E5E5E5] dark:border-[#333333]',
      'rounded-xl shadow-lg',
      'max-h-60 overflow-y-auto',
      'scrollbar-thin scrollbar-thumb-[#E5E5E5] dark:scrollbar-thumb-[#333333]',
    ),
    option: classNames(
      'px-4 py-2 text-sm cursor-pointer',
      'text-[#111111] dark:text-[#FFFFFF]',
      'hover:bg-[#F5F5F5] dark:hover:bg-[#333333]',
      'transition-colors duration-200',
    ),
  },
};

export { themeTokens };