import { useState, useEffect } from 'react';

export function useNearMe(radiusKm = 50) {
  const [data, setData] = useState<{ user_id: string; display_name: string; distance_km: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    console.log('🔍 [USE-NEAR-ME] Starting fetch with radius:', radiusKm);
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 [USE-NEAR-ME] Fetching near me with radius:', radiusKm);
      const res = await fetch(`/api/discovery/near-me?radiusKm=${radiusKm}`, {
        credentials: 'include',
      });
      console.log('🔍 [USE-NEAR-ME] Response status:', res.status);
      if (!res.ok) {
        const errorData = await res.json();
        console.error('❌ [USE-NEAR-ME] Error response:', errorData);
        
        // Handle specific error cases
        if (res.status === 403) {
          if (errorData.error === 'Location sharing not enabled') {
            throw new Error('Location sharing is not enabled. Please enable it in your profile settings.');
          } else if (errorData.error === 'Location not set') {
            throw new Error('Your location is not set. Please add your location in your profile settings.');
          }
        }
        
        throw new Error(`HTTP ${res.status}: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
      const body = await res.json();
      console.log('🔍 [USE-NEAR-ME] Response data:', body);
      setData(body.people || []);
      
      // If we get an empty array, that's normal - it just means no nearby users
      if (!body.people || body.people.length === 0) {
        console.log('🔍 [USE-NEAR-ME] No nearby users found - this is normal');
        // Don't set an error for empty results - this is expected behavior
        setData([]);
      } else {
        console.log('✅ [USE-NEAR-ME] Found', body.people.length, 'nearby users');
      }
    } catch (err) {
      console.error('❌ [USE-NEAR-ME] Fetch error:', err);
      setError(err as Error);
    } finally {
      console.log('🔍 [USE-NEAR-ME] Fetch completed');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [radiusKm]);

  return { data, isLoading, error, refetch: fetchData };
}
