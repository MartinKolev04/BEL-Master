import { useCallback, useEffect, useState } from 'react';
import { questionsRepository } from '../services/repositories/QuestionsRepository';
import type { Grade, QuizQuestion } from '../types';

interface UseQuestionsOptions {
  grade: Grade | null;
  category: string;
  isMultiplayer?: boolean;
  enabled?: boolean;
}

export function useQuestions({
  grade,
  category,
  isMultiplayer = false,
  enabled = true,
}: UseQuestionsOptions) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await questionsRepository.list(grade || '7', category, isMultiplayer);
      setQuestions(data);
    } catch (err) {
      setError(err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, grade, category, isMultiplayer]);

  useEffect(() => {
    load();
  }, [load]);

  return { questions, loading, error, reload: load };
}
