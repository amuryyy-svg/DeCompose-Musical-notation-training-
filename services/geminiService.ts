
import { GoogleGenAI, Type } from "@google/genai";
import { Lesson, Language, ExamSession } from "../types";
import { TOPICS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

const LocalizedContentSchema = {
  type: Type.OBJECT,
  properties: {
    ru: { type: Type.STRING },
    en: { type: Type.STRING }
  },
  required: ["ru", "en"]
};

export const generateLesson = async (difficulty: 'beginner' | 'intermediate', topic: string, lang: Language): Promise<Lesson | null> => {
  try {
    const curriculum = TOPICS.map(t => `${t.ru} / ${t.en}`).join(', ');

    const prompt = `
      You are a strict but clear piano teacher.
      Topic: "${topic || "Basics: Intervals"}".

      CONTEXT - FULL CURRICULUM:
      ${curriculum}

      CONSTRAINT:
      Focus ONLY on the requested "${topic}".
      Do NOT teach concepts that belong to other topics in the curriculum list unless absolutely necessary.
      
      TASK:
      Create a step-by-step lesson.
      **BILINGUAL OUTPUT REQUIRED**: All text fields (title, explanation, description) MUST be objects with "ru" and "en" keys.

      CRITICAL INSTRUCTION FOR NOTE NAMES:
      In "explanation" text, ALWAYS include the international scientific pitch notation in parentheses.
      Example EN: "Play the note C (C4)"
      Example RU: "Нажмите ноту До (C4)"
      Use Markdown **bold** for notes.

      JSON STRUCTURE:
      - title: {ru, en}
      - description: {ru, en}
      - steps: Array
        - title: {ru, en}
        - explanation: {ru, en}
        - targets: Array of strings (e.g. ["C4", "C#4"]).
        - highlight: Array of strings.

      Return valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: LocalizedContentSchema,
            description: LocalizedContentSchema,
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: LocalizedContentSchema,
                  explanation: LocalizedContentSchema,
                  targets: { type: Type.ARRAY, items: { type: Type.STRING } },
                  highlight: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["title", "explanation", "targets", "highlight"]
              }
            }
          },
          required: ["title", "description", "steps"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as Lesson;

  } catch (error) {
    console.error("Gemini API Error (Lesson):", error);
    return null;
  }
};

export const generateExam = async (topics: string[], lang: Language): Promise<ExamSession | null> => {
  try {
    const topicsStr = topics.join(', ');

    const prompt = `
      You are a music theory examiner.
      Topics to cover: ${topicsStr}.

      TASK:
      Generate 5 practical piano exam questions.
      **BILINGUAL OUTPUT REQUIRED**: The 'question' field MUST be an object with "ru" and "en" keys.
      
      CRITICAL:
      1. 'pattern': Array of integers (relative semitones from root).
      2. 'exampleSolution': Array of strings (concrete note names e.g. ["C3", "E3"]). 
         This is used for the "HINT" system. It must be a valid example of the pattern starting on any root (usually C3 or C4 for simplicity).
      
      Examples:
      - Q: "Play Major Third" -> pattern: [0, 4], exampleSolution: ["C3", "E3"]
      - Q: "Play Minor Triad" -> pattern: [0, 3, 7], exampleSolution: ["A3", "C4", "E4"]
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: LocalizedContentSchema,
                  type: { type: Type.STRING, enum: ['interval', 'chord', 'scale'] },
                  pattern: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  exampleSolution: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "question", "type", "pattern", "exampleSolution"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = JSON.parse(text);
    return {
      questions: data.questions,
      currentIndex: 0,
      correctAnswers: 0,
      isFinished: false
    };

  } catch (error) {
    console.error("Gemini API Error (Exam):", error);
    return null;
  }
};
