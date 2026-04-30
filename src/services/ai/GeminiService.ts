import { GoogleGenAI, Type } from '@google/genai';
import { GeminiError } from '../../errors';
import type { Grade, QuizQuestion } from '../../types';

const DEFAULT_MODEL = 'gemini-3-flash-preview';

export interface SpellingError {
  original: string;
  correction: string;
  reason: string;
}

export interface SpellingScanResult {
  extractedText: string;
  errors: SpellingError[];
}

export interface LiteraryWorkDetails {
  summary: string;
  analysis: string;
  characters: string;
  authorInfo: string;
}

export class GeminiService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(
    apiKey: string = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    model: string = DEFAULT_MODEL,
  ) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  public async scanText(imageDataUrl: string): Promise<SpellingScanResult> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            parts: [
              {
                text:
                  'Ти си експерт по български език. Анализирай текста от изображението. ' +
                  'Извлечи текста и идентифицирай правописни или граматични грешки.',
              },
              {
                inlineData: {
                  data: imageDataUrl.split(',')[1],
                  mimeType: 'image/jpeg',
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedText: { type: Type.STRING },
              errors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    correction: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['original', 'correction', 'reason'],
                },
              },
            },
            required: ['extractedText', 'errors'],
          },
        },
      });

      try {
        return JSON.parse(response.text) as SpellingScanResult;
      } catch (parseCause) {
        console.error('Error parsing Gemini response:', parseCause);
        return { extractedText: 'Грешка при анализа', errors: [] };
      }
    } catch (cause) {
      throw new GeminiError(this.toMessage(cause), cause);
    }
  }

  public async generateQuizQuestions(
    grade: Grade | string,
    category: string,
    subGrade?: string,
  ): Promise<QuizQuestion[]> {
    const prompt = this.buildQuestionPrompt(String(grade), category, subGrade);

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                category: { type: Type.STRING },
              },
              required: ['id', 'question', 'options', 'correctAnswer', 'explanation', 'category'],
            },
          },
        },
      });

      try {
        const parsed = JSON.parse(response.text) as Array<Partial<QuizQuestion>>;
        return parsed.map((q) => ({
          id: q.id || Math.random().toString(36).substring(2, 9),
          question: q.question || '',
          options: q.options || [],
          correctAnswer: q.correctAnswer ?? -1,
          explanation: q.explanation || '',
          category: (q.category as QuizQuestion['category']) || (category as QuizQuestion['category']),
          type: 'multiple_choice',
        })) as QuizQuestion[];
      } catch (parseCause) {
        console.error('Error generating questions:', parseCause);
        return [];
      }
    } catch (cause) {
      throw new GeminiError(this.toMessage(cause), cause);
    }
  }

  public async getLiteraryWorkDetails(
    workTitle: string,
    authorName: string,
  ): Promise<LiteraryWorkDetails> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents:
          `Направи детайлен анализ на произведението "${workTitle}" от ${authorName} за ученици. ` +
          'Върни информацията в JSON формат със следните полета: ' +
          '{ "summary": "Кратко резюме на сюжета", "analysis": "Основна тема, идеи и послания", ' +
          '"characters": "Основни герои и техните характеристики", ' +
          '"authorInfo": "Кратка биография и значение на автора" }',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              analysis: { type: Type.STRING },
              characters: { type: Type.STRING },
              authorInfo: { type: Type.STRING },
            },
            required: ['summary', 'analysis', 'characters', 'authorInfo'],
          },
        },
      });

      try {
        return JSON.parse(response.text) as LiteraryWorkDetails;
      } catch (parseCause) {
        console.error('Error fetching library details:', parseCause);
        return {
          summary: 'Грешка при зареждане',
          analysis: 'Грешка при зареждане',
          characters: 'Грешка при зареждане',
          authorInfo: 'Грешка при зареждане',
        };
      }
    } catch (cause) {
      throw new GeminiError(this.toMessage(cause), cause);
    }
  }

  private buildQuestionPrompt(grade: string, category: string, subGrade?: string): string {
    const categoryLabel = (g: string) =>
      category === 'literature'
        ? `Литература (въпроси върху изучаваните автори и произведения в учебната програма за ${g} клас)`
        : category === 'grammar'
        ? 'Граматика и правопис'
        : 'Общ тест (правопис, граматика и литература)';

    if (grade === '12' && subGrade) {
      return (
        `Генерирай 10 въпроса за тест по Български език и литература за ${subGrade} клас. \n` +
        `    Категория: ${categoryLabel(subGrade)}.\n` +
        `    ВАЖНО: Въпросите трябва да са строго съобразени с учебния материал за ${subGrade} клас.\n` +
        `    За Литература: Включи аналитични въпроси с цитати от произведенията, типични за изпитния формат.`
      );
    }

    if (grade === '12' && !subGrade) {
      return (
        'Генерирай 10 въпроса за тест по Български език и литература за 11 и 12 клас (общ тест за матура). \n' +
        `    Категория: ${
          category === 'literature'
            ? 'Литература (въпроси върху изучаваните автори и произведения в 11 и 12 клас)'
            : category === 'grammar'
            ? 'Граматика и правопис'
            : 'Общ тест'
        }.\n` +
        '    ВАЖНО: Въпросите трябва да са съобразени с изпитния формат за Държавен зрелостен изпит (Матура).\n' +
        '    За Литература: Използвай цитати и изисквай анализ на художествени похвати, идеи и образи.'
      );
    }

    return (
      `Генерирай 10 въпроса за тест по Български език и литература за ${grade} клас. \n` +
      `  Категория: ${categoryLabel(grade)}.\n  \n` +
      `  ВАЖНО: Въпросите трябва да са строго съобразени с учебния материал за ${grade} клас в България. \n` +
      '  Ако категорията е Литература:\n' +
      `  1. Включи въпроси за конкретни произведения и автори, изучавани точно в ${grade} клас.\n` +
      '  2. Включи въпроси, които изискват анализ на цитати или откъси от произведенията (напр. "Кое твърдение за думите на... е вярно?").\n' +
      '  3. Въпросите трябва да са на ниво Държавен зрелостен изпит (Матура) или НВО, с фокус върху интерпретация на идеи, мотиви и образи.'
    );
  }

  private toMessage(cause: unknown): string {
    if (cause instanceof Error) return cause.message;
    return String(cause);
  }
}

export const geminiService = new GeminiService();
