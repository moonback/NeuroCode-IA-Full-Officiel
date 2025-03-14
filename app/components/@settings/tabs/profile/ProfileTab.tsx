import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { profileStore, updateProfile } from '~/lib/stores/profile';
import { toast } from 'react-toastify';

interface ProfileTabProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileTab({ open, onClose }: ProfileTabProps) {
  const profile = useStore(profileStore);
  const [isUploading, setIsUploading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [bioError, setBioError] = useState('');

  if (!open) return null;

  const validateUsername = (value: string) => {
    if (value.length < 0) {
      setUsernameError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      return false;
    }
    if (value.length > 30) {
      setUsernameError('Le nom d\'utilisateur ne peut pas dépasser 30 caractères');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const validateBio = (value: string) => {
    if (value.length > 200) {
      setBioError('La bio ne peut pas dépasser 200 caractères');
      return false;
    }
    setBioError('');
    return true;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast('Veuillez télécharger un fichier image valide');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast('La taille du fichier doit être inférieure à 2MB');
      return;
    }

    try {
      setIsUploading(true);
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile({ avatar: base64String });
        setIsUploading(false);
        toast('Photo de profil mise à jour');
      };

      reader.onerror = () => {
        console.error('Erreur lors de la lecture du fichier:', reader.error);
        setIsUploading(false);
        toast('Erreur lors de la mise à jour de la photo de profil');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la photo de profil:', error);
      setIsUploading(false);
      toast('Erreur lors de la mise à jour de la photo de profil');
    }
  };

  const handleProfileUpdate = (field: 'username' | 'bio', value: string) => {
    if (field === 'username' && !validateUsername(value)) return;
    if (field === 'bio' && !validateBio(value)) return;

    updateProfile({ [field]: value });

    // Only show toast for completed typing (after 1 second of no typing)
    const debounceToast = setTimeout(() => {
      // toast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`, {
      //   position: 'bottom-right',
      //   autoClose: 3000,
      //   hideProgressBar: true,
      //   closeOnClick: true,
      //   pauseOnHover: true,
      //   draggable: true,
      //   progress: undefined,
      //   theme: 'colored',
      //   className: '!bg-green-500/10 dark:!bg-green-500/20 !text-green-600 dark:!text-green-400',
      // });
    }, 1000);

    return () => clearTimeout(debounceToast);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-950 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Modifier le profil</h2>
            <button
              onClick={onClose}
              className={classNames(
                'p-2 rounded-lg transition-all',
                'bg-transparent',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                'focus:outline-none focus:ring-2 focus:ring-green-500/50'
              )}
              title="Fermer"
              aria-label="Fermer"
            >
              <div className="i-ph:x w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            {/* Personal Information Section */}
            <div>
              {/* Avatar Upload */}
              <div className="flex items-start gap-6 mb-8">
                <div
                  className={classNames(
                    'w-24 h-24 rounded-full overflow-hidden',
                    'bg-gray-100 dark:bg-gray-800/50',
                    'flex items-center justify-center',
                    'ring-1 ring-gray-200 dark:ring-gray-700',
                    'relative group',
                    'transition-all duration-300 ease-out',
                    'hover:ring-green-500/30 dark:hover:ring-green-500/30',
                    'hover:shadow-lg hover:shadow-green-500/10',
                  )}
                >
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Profile"
                      className={classNames(
                        'w-full h-full object-cover',
                        'transition-all duration-300 ease-out',
                        'group-hover:scale-105 group-hover:brightness-90',
                      )}
                    />
                  ) : (
                    <div className="i-ph:robot-fill w-16 h-16 text-gray-400 dark:text-gray-500 transition-colors group-hover:text-green-500/70 transform -translate-y-1" />
                  )}

                  <label
                    className={classNames(
                      'absolute inset-0',
                      'flex items-center justify-center',
                      'bg-black/0 group-hover:bg-black/40',
                      'cursor-pointer transition-all duration-300 ease-out',
                      isUploading ? 'cursor-wait' : '',
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <div className="i-ph:spinner-gap w-6 h-6 text-white animate-spin" />
                    ) : (
                      <div className="i-ph:camera-plus w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform group-hover:scale-110" />
                    )}
                  </label>
                </div>

                <div className="flex-1 pt-1">
                  <label className="block text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Photo de profil
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Téléchargez une photo de profil ou un avatar
                  </p>
                </div>
              </div>

              {/* Username Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Nom d'utilisateur
                  {usernameError && (
                    <span className="text-sm text-red-500 ml-2">({usernameError})</span>
                  )}
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <div className="i-ph:user-circle-fill w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-green-500" />
                  </div>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => handleProfileUpdate('username', e.target.value)}
                    className={classNames(
                      'w-full pl-11 pr-4 py-2.5 rounded-xl',
                      'bg-white dark:bg-gray-800/50',
                      'border border-gray-200 dark:border-gray-700/50',
                      'text-gray-900 dark:text-white',
                      'placeholder-gray-400 dark:placeholder-gray-500',
                      'focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50',
                      'transition-all duration-300 ease-out',
                    )}
                    placeholder="Entrez votre nom d'utilisateur"
                  />
                </div>
              </div>

              {/* Bio Input */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Bio
                  {bioError && (
                    <span className="text-sm text-red-500 ml-2">({bioError})</span>
                  )}
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-3">
                    <div className="i-ph:text-aa w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-green-500" />
                  </div>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                    className={classNames(
                      'w-full pl-11 pr-4 py-2.5 rounded-xl',
                      'bg-white dark:bg-gray-800/50',
                      'border border-gray-200 dark:border-gray-700/50',
                      'text-gray-900 dark:text-white',
                      'placeholder-gray-400 dark:placeholder-gray-500',
                      'focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50',
                      'transition-all duration-300 ease-out',
                      'resize-none',
                      'h-32',
                    )}
                    placeholder="Parlez de vous"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
