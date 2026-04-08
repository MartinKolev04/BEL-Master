import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function checkSpellingWithGemini(imageData: string) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Ти си експерт по български език. Анализирай текста от изображението. Извлечи текста и идентифицирай правописни или граматични грешки." },
          { inlineData: { data: imageData.split(',')[1], mimeType: "image/jpeg" } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
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
                reason: { type: Type.STRING }
              },
              required: ["original", "correction", "reason"]
            }
          }
        },
        required: ["extractedText", "errors"]
      }
    }
  });

  const response = await model;
  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    return { extractedText: "Грешка при анализа", errors: [] };
  }
}

export async function generateQuizQuestions(grade: string, category: string, subGrade?: string) {
  console.log(`Gemini generateQuizQuestions called for grade: ${grade}, category: ${category}, subGrade: ${subGrade}`);
  let prompt = `Генерирай 10 въпроса за тест по Български език и литература за ${grade} клас. 
  Категория: ${category === 'literature' ? 'Литература (въпроси върху изучаваните автори и произведения в учебната програма за ' + grade + ' клас)' : category === 'grammar' ? 'Граматика и правопис' : 'Общ тест (правопис, граматика и литература)'}.
  
  ВАЖНО: Въпросите трябва да са строго съобразени с учебния материал за ${grade} клас в България. 
  Ако категорията е Литература:
  1. Включи въпроси за конкретни произведения и автори, изучавани точно в ${grade} клас.
  2. Включи въпроси, които изискват анализ на цитати или откъси от произведенията (напр. "Кое твърдение за думите на... е вярно?").
  3. Въпросите трябва да са на ниво Държавен зрелостен изпит (Матура) или НВО, с фокус върху интерпретация на идеи, мотиви и образи.`;

  if (grade === '12' && subGrade) {
    prompt = `Генерирай 10 въпроса за тест по Български език и литература за ${subGrade} клас. 
    Категория: ${category === 'literature' ? 'Литература (въпроси върху изучаваните автори и произведения в учебната програма за ' + subGrade + ' клас)' : category === 'grammar' ? 'Граматика и правопис' : 'Общ тест'}.
    ВАЖНО: Въпросите трябва да са строго съобразени с учебния материал за ${subGrade} клас.
    За Литература: Включи аналитични въпроси с цитати от произведенията, типични за изпитния формат.`;
  } else if (grade === '12' && !subGrade) {
    prompt = `Генерирай 10 въпроса за тест по Български език и литература за 11 и 12 клас (общ тест за матура). 
    Категория: ${category === 'literature' ? 'Литература (въпроси върху изучаваните автори и произведения в 11 и 12 клас)' : category === 'grammar' ? 'Граматика и правопис' : 'Общ тест'}.
    ВАЖНО: Въпросите трябва да са съобразени с изпитния формат за Държавен зрелостен изпит (Матура).
    За Литература: Използвай цитати и изисквай анализ на художествени похвати, идеи и образи.`;
  }

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["id", "question", "options", "correctAnswer", "explanation", "category"]
        }
      }
    }
  });

  const response = await model;
  try {
    const questions = JSON.parse(response.text);
    return questions.map((q: any) => ({
      id: q.id || Math.random().toString(36).substring(2, 9),
      question: q.question || '',
      options: q.options || [],
      correctAnswer: q.correctAnswer ?? -1,
      explanation: q.explanation || '',
      category: q.category || category,
      type: 'multiple_choice',
      isMultiplayer: true
    }));
  } catch (e) {
    console.error("Error generating questions:", e);
    return [];
  }
}

export async function getLibraryDetails(workTitle: string, authorName: string) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Направи детайлен анализ на произведението "${workTitle}" от ${authorName} за ученици. 
    Върни информацията в JSON формат със следните полета: 
    { 
      "summary": "Кратко резюме на сюжета", 
      "analysis": "Основна тема, идеи и послания", 
      "characters": "Основни герои и техните характеристики",
      "authorInfo": "Кратка биография и значение на автора" 
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          analysis: { type: Type.STRING },
          characters: { type: Type.STRING },
          authorInfo: { type: Type.STRING }
        },
        required: ["summary", "analysis", "characters", "authorInfo"]
      }
    }
  });

  const response = await model;
  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Error fetching library details:", e);
    return { 
      summary: "Грешка при зареждане", 
      analysis: "Грешка при зареждане", 
      characters: "Грешка при зареждане", 
      authorInfo: "Грешка при зареждане" 
    };
  }
}
