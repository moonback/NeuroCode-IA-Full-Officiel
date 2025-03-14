import { atom } from 'nanostores';

export const syncSidebarStore = {
  isOpen: atom(false),
  open: () => syncSidebarStore.isOpen.set(true),
  close: () => syncSidebarStore.isOpen.set(false),
  toggle: () => {
    const currentState = syncSidebarStore.isOpen.get();
    syncSidebarStore.isOpen.set(!currentState);
  },

  // Add a method to force close regardless of hover
  forceClose: () => syncSidebarStore.isOpen.set(false),

  // Methods to control the sidebar state
};