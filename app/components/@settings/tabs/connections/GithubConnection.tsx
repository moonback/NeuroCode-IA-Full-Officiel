import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import { classNames } from '~/utils/classNames';
import Cookies from 'js-cookie';

interface GitHubUserResponse {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  public_gists: number;
}

interface GitHubRepoInfo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  languages_url: string;
}

interface GitHubOrganization {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubEvent {
  id: string;
  type: string;
  repo: {
    name: string;
  };
  created_at: string;
}

interface GitHubLanguageStats {
  [language: string]: number;
}

interface GitHubStats {
  repos: GitHubRepoInfo[];
  totalStars: number;
  totalForks: number;
  organizations: GitHubOrganization[];
  recentActivity: GitHubEvent[];
  languages: GitHubLanguageStats;
  totalGists: number;
}

interface GitHubConnection {
  user: GitHubUserResponse | null;
  token: string;
  tokenType: 'classic' | 'fine-grained';
  stats?: GitHubStats;
}

export function GithubConnection() {
  const [connection, setConnection] = useState<GitHubConnection>({
    user: null,
    token: '',
    tokenType: 'classic',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

  const fetchGithubUser = async (token: string) => {
    try {
      setIsConnecting(true);

      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Jeton invalide ou non autorisé');
      }

      const data = (await response.json()) as GitHubUserResponse;
      const newConnection: GitHubConnection = {
        user: data,
        token,
        tokenType: connection.tokenType,
      };

      localStorage.setItem('github_connection', JSON.stringify(newConnection));
      Cookies.set('githubToken', token);
      Cookies.set('githubUsername', data.login);
      Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));

      setConnection(newConnection);

      await fetchGitHubStats(token);

      toast.success('Connexion à GitHub réussie');
    } catch (error) {
      logStore.logError('Failed to authenticate with GitHub', { error });
      toast.error('Échec de la connexion à GitHub');
      setConnection({ user: null, token: '', tokenType: 'classic' });
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchGitHubStats = async (token: string) => {
    try {
      setIsFetchingStats(true);

      const reposResponse = await fetch(
        'https://api.github.com/user/repos?sort=updated&per_page=10&affiliation=owner,organization_member,collaborator',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!reposResponse.ok) {
        throw new Error('Échec de la récupération des dépôts');
      }

      const repos = (await reposResponse.json()) as GitHubRepoInfo[];

      const orgsResponse = await fetch('https://api.github.com/user/orgs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!orgsResponse.ok) {
        throw new Error('Échec de la récupération des organisations');
      }

      const organizations = (await orgsResponse.json()) as GitHubOrganization[];

      const eventsResponse = await fetch('https://api.github.com/users/' + connection.user?.login + '/events/public', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!eventsResponse.ok) {
        throw new Error('Échec de la récupération des événements');
      }

      const recentActivity = ((await eventsResponse.json()) as GitHubEvent[]).slice(0, 5);

      const languagePromises = repos.map((repo) =>
        fetch(repo.languages_url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then((res) => res.json() as Promise<Record<string, number>>),
      );

      const repoLanguages = await Promise.all(languagePromises);
      const languages: GitHubLanguageStats = {};

      repoLanguages.forEach((repoLang) => {
        Object.entries(repoLang).forEach(([lang, bytes]) => {
          languages[lang] = (languages[lang] || 0) + bytes;
        });
      });

      const totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
      const totalForks = repos.reduce((acc, repo) => acc + repo.forks_count, 0);
      const totalGists = connection.user?.public_gists || 0;

      setConnection((prev) => ({
        ...prev,
        stats: {
          repos,
          totalStars,
          totalForks,
          organizations,
          recentActivity,
          languages,
          totalGists,
        },
      }));
    } catch (error) {
      logStore.logError('Failed to fetch GitHub stats', { error });
      toast.error('Échec de la récupération des statistiques GitHub');
    } finally {
      setIsFetchingStats(false);
    }
  };

  useEffect(() => {
    const savedConnection = localStorage.getItem('github_connection');

    if (savedConnection) {
      const parsed = JSON.parse(savedConnection);

      if (!parsed.tokenType) {
        parsed.tokenType = 'classic';
      }

      setConnection(parsed);

      if (parsed.user && parsed.token) {
        fetchGitHubStats(parsed.token);
      }
    } else if (import.meta.env.VITE_GITHUB_ACCESS_TOKEN) {
      fetchGithubUser(import.meta.env.VITE_GITHUB_ACCESS_TOKEN);
    }

    setIsLoading(false);
  }, []);
  useEffect(() => {
    if (!connection) {
      return;
    }

    const token = connection.token;
    const data = connection.user;
    Cookies.set('githubToken', token);
    Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));

    if (data) {
      Cookies.set('githubUsername', data.login);
    }
  }, [connection]);

  if (isLoading || isConnecting || isFetchingStats) {
    return <LoadingSpinner />;
  }

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    await fetchGithubUser(connection.token);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('github_connection');
    setConnection({ user: null, token: '', tokenType: 'classic' });
    toast.success('Déconnexion de GitHub réussie');
  };

  return (
    <motion.div
      className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-lg border border-[#E5E5E5] dark:border-[#1A1A1A]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <div className="i-ph:github-logo w-5 h-5 text-bolt-elements-textPrimary" />
          <h3 className="text-base font-medium text-bolt-elements-textPrimary">Connexion GitHub</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-bolt-elements-textSecondary mb-2">Type de Jeton</label>
            <select
              value={connection.tokenType}
              onChange={(e) =>
                setConnection((prev) => ({ ...prev, tokenType: e.target.value as 'classic' | 'fine-grained' }))
              }
              disabled={isConnecting || !!connection.user}
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                'border border-[#E5E5E5] dark:border-[#333333]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-1 focus:ring-purple-500',
                'disabled:opacity-50',
              )}
            >
              <option value="classic">Jeton d'Accès Personnel (Classique)</option>
              <option value="fine-grained">Jeton à Granularité Fine</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-bolt-elements-textSecondary mb-2">
              {connection.tokenType === 'classic' ? 'Jeton d\'Accès Personnel' : 'Jeton à Granularité Fine'}
            </label>
            <input
              type="password"
              value={connection.token}
              onChange={(e) => setConnection((prev) => ({ ...prev, token: e.target.value }))}
              disabled={isConnecting || !!connection.user}
              placeholder={`Entrez votre ${
                connection.tokenType === 'classic' ? 'jeton d\'accès personnel' : 'jeton à granularité fine'
              } GitHub`}
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                'border border-[#E5E5E5] dark:border-[#333333]',
                'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                'focus:outline-none focus:ring-1 focus:ring-purple-500',
                'disabled:opacity-50',
              )}
            />
            <div className="mt-2 text-sm text-bolt-elements-textSecondary">
              <a
                href={`https://github.com/settings/tokens${connection.tokenType === 'fine-grained' ? '/beta' : '/new'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:underline inline-flex items-center gap-1"
              >
                Obtenir votre jeton
                <div className="i-ph:arrow-square-out w-10 h-5" />
              </a>
              <span className="mx-2">•</span>
              <span>
                Autorisations requises:{' '}
                {connection.tokenType === 'classic'
                  ? 'repo, read:org, read:user'
                  : 'Accès aux dépôts, Accès aux organisations'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!connection.user ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting || !connection.token}
              className={classNames(
                'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                'bg-purple-500 text-white',
                'hover:bg-purple-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isConnecting ? (
                <>
                  <div className="i-ph:spinner-gap animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <div className="i-ph:plug-charging w-4 h-4" />
                  Connecter
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className={classNames(
                'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                'bg-red-500 text-white',
                'hover:bg-red-600',
              )}
            >
              <div className="i-ph:plug w-4 h-4" />
              Déconnecter
            </button>
          )}

          {connection.user && (
            <span className="text-sm text-bolt-elements-textSecondary flex items-center gap-1">
              <div className="i-ph:check-circle w-4 h-4 text-green-500" />
              Connecté à GitHub
            </span>
          )}
        </div>

        {connection.user && connection.stats && (
          <div className="mt-6 border-t border-[#E5E5E5] dark:border-[#1A1A1A] pt-6">
            <button onClick={() => setIsStatsExpanded(!isStatsExpanded)} className="w-full bg-transparent">
              <div className="flex items-center gap-4">
                <img src={connection.user.avatar_url} alt={connection.user.login} className="w-16 h-16 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-bolt-elements-textPrimary">
                      {connection.user.name || connection.user.login}
                    </h3>
                    <div
                      className={classNames(
                        'i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary transition-transform',
                        isStatsExpanded ? 'rotate-180' : '',
                      )}
                    />
                  </div>
                  {connection.user.bio && (
                    <p className="text-sm text-start text-bolt-elements-textSecondary">{connection.user.bio}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-bolt-elements-textSecondary">
                    <span className="flex items-center gap-1">
                      <div className="i-ph:users w-4 h-4" />
                      {connection.user.followers} followers
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="i-ph:book-bookmark w-4 h-4" />
                      {connection.user.public_repos} public repos
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="i-ph:star w-4 h-4" />
                      {connection.stats.totalStars} stars
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="i-ph:git-fork w-4 h-4" />
                      {connection.stats.totalForks} forks
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {isStatsExpanded && (
              <div className="pt-4">
                {connection.stats.organizations.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-bolt-elements-textPrimary mb-3">Organisations</h4>
                    <div className="flex flex-wrap gap-3">
                      {connection.stats.organizations.map((org) => (
                        <a
                          key={org.login}
                          href={org.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A] hover:bg-[#F0F0F0] dark:hover:bg-[#252525] transition-colors"
                        >
                          <img src={org.avatar_url} alt={org.login} className="w-6 h-6 rounded-md" />
                          <span className="text-sm text-bolt-elements-textPrimary">{org.login}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-bolt-elements-textPrimary mb-3">Langages Principaux</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(connection.stats.languages)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([language]) => (
                        <span
                          key={language}
                          className="px-3 py-1 text-xs rounded-full bg-purple-500/10 text-purple-500 dark:bg-purple-500/20"
                        >
                          {language}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Recent Activity Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-bolt-elements-textPrimary mb-3">Activité Récente</h4>
                  <div className="space-y-3">
                    {connection.stats.recentActivity.map((event) => (
                      <div key={event.id} className="p-3 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A] text-sm">
                        <div className="flex items-center gap-2 text-bolt-elements-textPrimary">
                          <div className="i-ph:git-commit w-4 h-4 text-bolt-elements-textSecondary" />
                          <span className="font-medium">{event.type.replace('Event', '')}</span>
                          <span>on</span>
                          <a
                            href={`https://github.com/${event.repo.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-500 hover:underline"
                          >
                            {event.repo.name}
                          </a>
                        </div>
                        <div className="mt-1 text-xs text-bolt-elements-textSecondary">
                          {new Date(event.created_at).toLocaleDateString()} at{' '}
                          {new Date(event.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A]">
                    <div className="text-sm text-bolt-elements-textSecondary">Membre depuis</div>
                    <div className="text-lg font-medium text-bolt-elements-textPrimary">
                      {new Date(connection.user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A]">
                    <div className="text-sm text-bolt-elements-textSecondary">Gists Publics</div>
                    <div className="text-lg font-medium text-bolt-elements-textPrimary">
                      {connection.stats.totalGists}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A]">
                    <div className="text-sm text-bolt-elements-textSecondary">Organisations</div>
                    <div className="text-lg font-medium text-bolt-elements-textPrimary">
                      {connection.stats.organizations.length}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A]">
                    <div className="text-sm text-bolt-elements-textSecondary">Langages</div>
                    <div className="text-lg font-medium text-bolt-elements-textPrimary">
                      {Object.keys(connection.stats.languages).length}
                    </div>
                  </div>
                </div>

                {/* Repositories Section */}
                <h4 className="text-sm font-medium text-bolt-elements-textPrimary mb-3">Dépôts Récents</h4>
                <div className="space-y-3">
                  {connection.stats.repos.map((repo) => (
                    <a
                      key={repo.full_name}
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A] hover:bg-[#F0F0F0] dark:hover:bg-[#252525] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium text-bolt-elements-textPrimary flex items-center gap-2">
                            <div className="i-ph:git-repository w-4 h-4 text-bolt-elements-textSecondary" />
                            {repo.name}
                          </h5>
                          {repo.description && (
                            <p className="text-xs text-bolt-elements-textSecondary mt-1">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-bolt-elements-textSecondary">
                            <span className="flex items-center gap-1">
                              <div className="i-ph:git-branch w-3 h-3" />
                              {repo.default_branch}
                            </span>
                            <span>•</span>
                            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-bolt-elements-textSecondary">
                          <span className="flex items-center gap-1">
                            <div className="i-ph:star w-3 h-3" />
                            {repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="i-ph:git-fork w-3 h-3" />
                            {repo.forks_count}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center gap-2">
        <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
        <span className="text-bolt-elements-textSecondary">Chargement...</span>
      </div>
    </div>
  );
}