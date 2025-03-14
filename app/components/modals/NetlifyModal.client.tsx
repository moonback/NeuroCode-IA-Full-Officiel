import { Dialog, Transition } from '@headlessui/react';
import { useStore } from '@nanostores/react';
import { netlifyConnection } from '~/lib/stores/netlify';
import { chatStore } from '~/lib/stores/chat';
import { updateNetlifyConnection } from '~/lib/stores/netlify';
import { useState } from 'react';

interface NetlifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: () => void;
}

export function NetlifyModal({ isOpen, onClose, onConnect }: NetlifyModalProps) {
  const connection = useStore(netlifyConnection);
  const chat = useStore(chatStore);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 5;

  const filteredSites = connection.stats?.sites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.url.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const paginatedSites = filteredSites.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Transition show={isOpen}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-lg rounded-lg bg-bolt-elements-background-depth-2 p-6 border border-bolt-elements-borderColor shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-lg font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
                  <div className="i-ph:rocket-launch-duotone w-5 h-5 text-[#00AD9F]" />
                  Gestion Netlify
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-bolt-elements-background-depth-1 transition-colors text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-[#00AD9F]"
                  aria-label="Fermer"
                >
                  <div className="i-ph:x w-5 h-5" />
                </button>
              </div>

              {connection.user ? (
                <div className="space-y-6">
                  <div className="p-4 bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor">
                    <div className="flex items-center gap-4">
                      <img
                        src={connection.user.avatar_url}
                        alt={connection.user.full_name}
                        className="w-12 h-12 rounded-full border-2 border-[#00AD9F]"
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-bolt-elements-textPrimary">
                          {connection.user.full_name}
                        </h4>
                        <p className="text-sm text-bolt-elements-textSecondary">
                          {connection.user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {connection.stats && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-sm font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
                          <div className="i-ph:globe-duotone w-4 h-4 text-[#00AD9F]" />
                          Sites déployés ({filteredSites.length})
                        </h4>
                        <div className="flex-1 max-w-xs">
                          <input
                            type="text"
                            placeholder="Rechercher un site..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 focus:outline-none focus:ring-1 focus:ring-[#00AD9F]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {paginatedSites.map((site) => (
                          <a
                            key={site.id}
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-2 transition-colors group"
                          >
                            <h5 className="text-sm font-medium text-bolt-elements-textPrimary group-hover:text-[#00AD9F] transition-colors">
                              {site.name}
                            </h5>
                            <p className="text-xs text-bolt-elements-textSecondary mt-1 truncate">
                              {site.url}
                            </p>
                          </a>
                        ))}
                      </div>

                      {filteredSites.length > itemsPerPage && (
                        <div className="flex items-center justify-between gap-4">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-white text-sm rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Précédent
                          </button>
                          <span className="text-sm text-bolt-elements-textSecondary">
                            Page {currentPage} sur {Math.ceil(filteredSites.length / itemsPerPage)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredSites.length / itemsPerPage)))}
                            disabled={currentPage === Math.ceil(filteredSites.length / itemsPerPage)}
                            className="px-3 py-1.5 text-white text-sm rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Suivant
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => updateNetlifyConnection({ user: null, token: '', stats: undefined })}
                    className="w-full px-4 text-white py-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 font-medium flex items-center justify-center gap-2"
                  >
                    <div className="i-ph:sign-out-duotone w-5 h-5" />
                    Se déconnecter de Netlify
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor">
                    <div className="flex items-center gap-2 text-sm text-bolt-elements-textSecondary mb-3">
                      <div className="i-ph:warning-duotone w-4 h-4 text-yellow-400" />
                      Connexion requise
                    </div>
                    <p className="text-sm text-bolt-elements-textSecondary mb-4">
                      Pour déployer votre projet, vous devez d'abord vous connecter à Netlify.
                    </p>
                    <ol className="text-sm text-bolt-elements-textSecondary list-decimal list-inside space-y-2 pl-4 marker:text-[#00AD9F]">
                      <li>Accédez aux Paramètres puis connexion</li>
                      <li>Ajoutez votre token d'accès Netlify</li>
                      <li>Cliquez sur "Se connecter"</li>
                    </ol>
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
} 