import { useState, useEffect } from 'react';

export function usePeopleLikeYou(limit = 20) {
  const [data, setData] = useState<{ user_id: string; display_name: string; score: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching people like you...');
      const res = await fetch(`/api/discovery/people-like-you?limit=${limit}`, {
        credentials: 'include',
      });
      console.log('People like you response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('People like you error:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      const body = await res.json();
      console.log('People like you data:', body);
      setData(body.people || []);
    } catch (err) {
      console.error('People like you fetch error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [limit]);

  return { data, isLoading, error, refetch: fetchData };
}
