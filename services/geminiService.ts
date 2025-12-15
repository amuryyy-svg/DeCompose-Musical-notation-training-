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
    const prompt = `
      Create a step-by-step piano lesson.
      Topic: "${topic}".
      
      Requirements:
      1.  Output MUST be valid JSON matching the schema.
      2.  Do NOT include Markdown code blocks (like \`\`\`json). Just the raw JSON.
      3.  Content must be bilingual (RU and EN).
      4.  Format note names in the 'explanation' field using bold asterisks, e.g., "**C (C4)**".

      Structure:
      {
        "title": { "ru": "...", "en": "..." },
        "description": { "ru": "...", "en": "..." },
        "steps": [
          {
            "title": { "ru": "...", "en": "..." },
            "explanation": { "ru": "...", "en": "..." },
            "targets": ["C4", "E4"], // Array of note codes
            "highlight": ["C4", "E4"] // Array of note codes to visually highlight
          }
        ]
      }
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