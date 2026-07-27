import { useEffect, useState } from 'react';
import { getDashboardSummary, type DashboardSummary } from '../services/dashboardService';

export function useDashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      const { data } = await getDashboardSummary();

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
