import { GoogleGenAI, Type } from "@google/genai";
import { Lesson, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLesson = async (difficulty: 'beginner' | 'intermediate', topic: string, lang: Language): Promise<Lesson | null> => {
  try {
    const langName = lang === 'en' ? 'English' : 'Russian';
    const prompt = `
      You are a strict but clear piano teacher.
      
      Topic: "${topic || "Basics: Intervals"}".
      Language: ${langName}.

      TASK:
      Create a step-by-step lesson. For EACH step, you MUST provide a specific playing exercise.
      Even if the question is theoretical (e.g., "What is a semitone?"), you must force the student to play a concrete example.

      CRITICAL INSTRUCTION FOR NOTE NAMES:
      When mentioning notes in the text, ALWAYS include the international scientific pitch notation in parentheses.
      Example (English): "Play the note C (C4)"
      Example (Russian): "Нажмите ноту До (C4)" or "Сыграйте Фа-диез (F#3)"
      NEVER write just "Do" or "Фа-диез" without the code (C4, F#3, etc).

      JSON STRUCTURE:
      1. steps: Array of steps.
      
      FOR EACH STEP (step):
      - title: Short title.
      - explanation: Explanation text. Include the note names to be played in the text, highlighting them with **bold**. Example: "Play **C4**, then the adjacent black key **C#4**."
      - targets: Array of strings (specific notes, e.g. ["C4", "C#4"]). THIS FIELD CANNOT BE EMPTY. If the step is theoretical, invent an example.
      - highlight: Same notes for visual highlighting.

      Example sequence for "Intervals":
      1. Semitone (targets: ["C4", "C#4"])
      2. Tone (targets: ["C4", "D4"])
      3. Octave (targets: ["C3", "C4"])

      Return valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  explanation: { type: Type.STRING },
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
    console.error("Gemini API Error:", error);
    return null;
  }
};