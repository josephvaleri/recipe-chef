import { useState, useEffect } from 'react';

export function useSearchProfiles(q: string, limit = 20) {
  const [data, setData] = useState<{ user_id: string; display_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/discovery/search-profiles?q=${encodeURIComponent(q)}&limit=${limit}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setData(body.items || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (q.trim().length < 2) {
      setData([]);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(fetchData, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [q, limit]);

  return { data, isLoading, error, refetch: fetchData };
}
