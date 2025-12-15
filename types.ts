
export type Language = 'ru' | 'en';

export type LocalizedContent = {
  ru: string;
  en: string;
};

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
  type: 'interval' | 'chord' | 'scale';
  pattern: number[]; // Relative semitones
  exampleSolution: string[]; // Concrete notes for the hint system (e.g. ["C3", "E3", "G3"])
}

export interface ExamSession {
  questions: ExamQuestion[];
  currentIndex: number;
  correctAnswers: number;
  isFinished: boolean;
}

export interface ActiveNote {
  midi: number;
  velocity: number;
}
