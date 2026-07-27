import { useEffect, useState } from 'react';
import { getDashboardSnapshot, type DashboardSnapshot } from '../services/dashboardService';

export function useDashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      const { data } = await getDashboardSnapshot();

      if (isMounted) {
        setSnapshot(data);
        setIsLoading(false);
      }
    }

    void loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, []);

  return { snapshot, isLoading };
}
