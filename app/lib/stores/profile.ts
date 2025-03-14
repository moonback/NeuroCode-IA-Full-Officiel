import { atom } from 'nanostores';

interface Profile {
  username: string;
  bio: string;
  avatar: string;
}

// Validation function for profile data
const validateProfile = (data: unknown): data is Profile => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'username' in data &&
    'bio' in data &&
    'avatar' in data
  );
};

// Initialize with stored profile or defaults
const storedProfile = typeof window !== 'undefined' ? localStorage.getItem('bolt_profile') : null;
let initialProfile: Profile = {
  username: '',
  bio: '',
  avatar: '',
};

try {
  if (storedProfile) {
    const parsed = JSON.parse(storedProfile);
    if (validateProfile(parsed)) {
      initialProfile = parsed;
    }
  }
} catch (error) {
  console.error('Error parsing stored profile:', error);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bolt_profile');
  }
}

export const profileStore = atom<Profile>(initialProfile);

export const updateProfile = (updates: Partial<Profile>) => {
  const currentProfile = profileStore.get();
  const newProfile = { ...currentProfile, ...updates };
  
  // Validate before setting
  if (validateProfile(newProfile)) {
    profileStore.set(newProfile);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bolt_profile', JSON.stringify(newProfile));
      } catch (error) {
        console.error('Error saving profile to localStorage:', error);
      }
    }
  } else {
    console.error('Invalid profile data:', newProfile);
  }
};
