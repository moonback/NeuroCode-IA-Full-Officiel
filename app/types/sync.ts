export type TimeRange = '24h' | '7d' | '30d' | 'all';

export interface SyncStatistics {
  totalFiles: number;
  syncedFiles: number;
  totalSize: number;
  duration: number;
  timestamp: number;
}

export interface SyncHistoryEntry {
  id: string;
  projectName: string;
  timestamp: number;
  status: 'success' | 'partial' | 'failed' | 'unknown';
  files: string[];
  statistics: SyncStatistics;
  error?: string;
}

export interface ProjectSyncInfo {
  projectName: string;
  folderName: string;
  lastSync: number;
  syncEnabled: boolean;
}

export interface SyncSettings {
  autoSync: boolean;
  autoSyncInterval: number;
  syncOnSave: boolean;
  excludePatterns: string[];
  syncMode: 'ask' | 'overwrite' | 'skip';
  projectFolders: Record<string, ProjectSyncInfo>;
  defaultSyncEnabled: boolean;
}

export interface SyncSession {
  id: string;
  timestamp: number;
  lastSync: number;
  projectName?: string;
  projectFolder?: string;
  history: SyncHistoryEntry[];
  statistics: SyncStatistics[];
  files: Set<string>;
}