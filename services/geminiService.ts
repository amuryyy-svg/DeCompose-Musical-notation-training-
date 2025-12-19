
import { GoogleGenAI, Type } from "@google/genai";
import { Lesson, Language, ExamSession, QuizSession } from "../types";
import { GLOSSARY_DATA, TOPICS, STATIC_LESSONS } from "../constants";

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

// --- SYSTEM PROMPT ---
const SYSTEM_PROMPT = `
You are the AI engine for 'DeCompose', a serious music theory app.
Your goal is to generate structured JSON data.

**TONE & STYLE RULES:**
1.  **Strictly Academic & Dry:** No greetings ("Hi!", "Welcome"). No fluff ("Let's explore", "Magic of music"). No emojis.
2.  **Concise:** Definitions must be short and precise.
3.  **Instructional:** Direct commands only ("Play C4", "Find the interval").
4.  **Adult Audience:** Do not treat the user like a child.

**GLOBAL DATA RULES:**
1.  **Output Format:** RETURN ONLY JSON.
2.  **Languages:** All text fields must have "ru" and "en" keys.
3.  **Note Naming:**
    - In text/explanation: Use bold format **Note (Solfege)**. Example: "**C (До)**".
    - In code (targets/highlight): Use Scientific Pitch Notation (e.g., "C4").
4.  **Valid Octaves:** 3, 4, 5.
5.  **Highlighting:** NEVER highlight the natural note if the target is an accidental.
6.  **Explicit Action:** Every step explanation MUST end with a command to play the notes.

**LESSON STRUCTURE RULE (CRITICAL):**
Every lesson MUST end with a "Check" step.
- \`targets\`: correct answer notes.
- \`highlight\`: MUST BE EMPTY \`[]\`.
`;

export const checkConnection = async (): Promise<boolean> => {
  try {
    await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { role: 'user', parts: [{ text: 'Ping' }] },
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (error) {
    console.warn("Gemini Connection Check Failed:", error);
    return false;
  }
};

export const generateLesson = async (difficulty: 'beginner' | 'intermediate', topic: string, lang: Language): Promise<Lesson | null> => {
  // CRITICAL FIX: Always prefer STATIC_LESSONS first to ensure quality and structure.
  // This prevents the AI from generating "hallucinated" versions of basic lessons.
  if (STATIC_LESSONS[topic]) {
      console.log(`Serving verified static lesson for: ${topic}`);
      // Return a deep copy to prevent mutation issues
      return JSON.parse(JSON.stringify(STATIC_LESSONS[topic]));
  }

  try {
    const prompt = `
      ${SYSTEM_PROMPT}

      TASK: Create a lesson for topic ID: **${topic}**.
      
      **STRUCTURE:**
      Return JSON with \`title\`, \`description\`, and \`steps\`.
      
      **STEP LOGIC:**
      1. Theory: Brief definition.
      2. Action: Command to play specific notes.
      3. Targets: Array of MIDI note names (e.g. ["C4"]).
      4. Visuals: Highlight array.
      
      **REMEMBER:** The final step is a BLIND TEST (highlight: []).
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
    if (!text) throw new Error("Empty response from AI");
    
    console.log(`Generated dynamic lesson for: ${topic}`);
    return JSON.parse(text) as Lesson;

  } catch (error) {
    console.warn("Gemini API Error, falling back:", error);
    // Double check static fallback just in case
    if (STATIC_LESSONS[topic]) {
        return JSON.parse(JSON.stringify(STATIC_LESSONS[topic]));
    }
    return null;
  }
};

export const generateExam = async (topics: string[], lang: Language): Promise<ExamSession | null> => {
  try {
    const topicsStr = topics.join(', ');
    const includeQuiz = topics.some(t => t.toLowerCase().includes('terms') || t.toLowerCase().includes('термины'));

    const prompt = `
      ${SYSTEM_PROMPT}

      TASK: Create 5 exam questions for topic ID: **${topicsStr}**.

      **OUTPUT JSON:**
      \`{ "questions": [ { "text": {...}, "type": "interval", "pattern": [numbers], "exampleSolution": ["strings"] } ] }\`

      **PATTERNS:**
      - Min2: [0,1], Maj2: [0,2], Min3: [0,3], Maj3: [0,4], P4: [0,5], P5: [0,7], MajTriad: [0,4,7], MinTriad: [0,3,7]

      ${includeQuiz ? `INCLUDE 1-2 'quiz' type questions (multiple choice).` : ''}
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
                  type: { type: Type.STRING, enum: ['interval', 'chord', 'scale', 'quiz'] },
                  pattern: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  exampleSolution: { type: Type.ARRAY, items: { type: Type.STRING } },
                  options: { type: Type.ARRAY, items: LocalizedContentSchema },
                  correctIndex: { type: Type.INTEGER }
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

export const generateQuiz = async (topic: string, lang: Language): Promise<QuizSession | null> => {
  try {
    const prompt = `
      ${SYSTEM_PROMPT}

      TASK: Generate a quiz (5 questions) for topic ID: **${topic}**.
      USE ONLY PROVIDED GLOSSARY DATA.
      
      **GLOSSARY DATA:**
      ${JSON.stringify(GLOSSARY_DATA)}
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
                  options: { type: Type.ARRAY, items: LocalizedContentSchema },
                  correctIndex: { type: Type.INTEGER }
                },
                required: ["id", "question", "options", "correctIndex"]
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
      score: 0,
      isFinished: false
    };
  } catch (error) {
    console.error("Gemini Quiz Error", error);
    return null;
  }
};
