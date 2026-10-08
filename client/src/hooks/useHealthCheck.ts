import { useEffect, useState } from 'react';
import { fetchHealthStatus } from '../services/healthService.js';
import { HealthResponse } from '../types/index.js';

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function check() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchHealthStatus();
        if (isMounted) {
          setHealth(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to reach API server');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    check();

    return () => {
      isMounted = false;
    };
  }, []);

  return { health, loading, error };
}
