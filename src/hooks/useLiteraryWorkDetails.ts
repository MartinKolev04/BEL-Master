import { useCallback, useState } from 'react';
import { geminiService, type LiteraryWorkDetails } from '../services/ai/GeminiService';

export function useLiteraryWorkDetails() {
  const [details, setDetails] = useState<LiteraryWorkDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetch = useCallback(async (title: string, author: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await geminiService.getLiteraryWorkDetails(title, author);
      setDetails(res);
    } catch (err) {
      setError(err);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setDetails(null), []);

  return { details, loading, error, fetch, clear };
}
