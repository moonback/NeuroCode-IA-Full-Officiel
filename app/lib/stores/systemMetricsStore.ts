import { atom } from 'nanostores';

export interface SystemMetrics {
  cpu: {
    usage: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export const systemMetricsStore = atom<SystemMetrics & { active: boolean }>({
  cpu: {
    usage: 0,
  },
  memory: {
    used: 0,
    total: 0,
    percentage: 0,
  },
  active: false
}); 