
export type Language = 'ru' | 'en';

export type LocalizedContent = {
  ru: string;
  en: string;
};

export type TermCategory = 'basics' | 'intervals' | 'scales' | 'chords' | 'harmony' | 'dynamics';

export interface GlossaryItem {
  term: LocalizedContent;
  definition: LocalizedContent;
  category: TermCategory;
}

export interface NoteDefinition {
  note: string; // e.g., "C"
  octave: number; // e.g., 4
  frequency: number; // Hz
  type: 'white' | 'black';
  keyboardKey: string; // The display label (e.g. "Z")
  code: string; // The physical key code (e.g. "KeyZ")
  midi: number;
}

export interface HistoryNote {
  id: string;
  midi: number;
  name: string;
  status: 'neutral' | 'success';
  isFading: boolean;
  isReleased: boolean;
}

export interface LessonStep {
  title: LocalizedContent; 
  explanation: LocalizedContent; 
  targets: string[]; // Notes to play e.g. ["C4"]
  highlight: string[]; // Visual highlights
}

export interface Lesson {
  title: LocalizedContent;
  description: LocalizedContent;
  steps: LessonStep[];
}

export interface ExamQuestion {
  id: string;
  question: LocalizedContent; 
  type: 'interval' | 'chord' | 'scale' | 'quiz';
  pattern: number[]; // Relative semitones (empty if quiz)
  exampleSolution: string[]; // Concrete notes for the hint system
  // Quiz specific props
  options?: LocalizedContent[];
  correctIndex?: number;
}

export interface ExamSession {
  questions: ExamQuestion[];
  currentIndex: number;
  correctAnswers: number;
  isFinished: boolean;
}

// --- QUIZ MODE TYPES ---
export interface QuizQuestion {
  id: string;
  question: LocalizedContent;
  options: LocalizedContent[]; // Array of 4 options
  correctIndex: number;
}

export interface QuizSession {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  isFinished: boolean;
}

export interface ActiveNote {
  midi: number;
  velocity: number;
}
