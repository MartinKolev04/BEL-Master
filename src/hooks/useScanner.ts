import { useCallback, useState } from 'react';
import { geminiService, type SpellingScanResult } from '../services/ai/GeminiService';

export function useScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SpellingScanResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  const analyze = useCallback(async (dataUrl: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await geminiService.scanText(dataUrl);
      setResult(res);
    } catch (err) {
      setError(err);
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const captureFromDataUrl = useCallback(
    (dataUrl: string) => {
      setImage(dataUrl);
      analyze(dataUrl);
    },
    [analyze],
  );

  const reset = useCallback(() => {
    setImage(null);
    setResult(null);
    setError(null);
  }, []);

  return { image, analyzing, result, error, captureFromDataUrl, reset };
}
