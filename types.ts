
export type Language = 'ru' | 'en';

export interface NoteDefinition {
  note: string; // e.g., "C"
  octave: number; // e.g., 4
  frequency: number; // Hz
  type: 'white' | 'black';
  keyboardKey: string; // The display label (e.g. "Z")
  code: string; // The physical key code (e.g. "KeyZ")
  midi: number;
}

export interface LessonStep {
  title: string; // Заголовок шага (например "Полутон")
  explanation: string; // Текст объяснения
  targets: string[]; // Ноты, которые нужно сыграть (например ["C4", "C#4"])
  highlight: string[]; // Ноты, которые нужно визуально подсветить
}

export interface Lesson {
  title: string;
  description: string;
  steps: LessonStep[];
}

export interface ActiveNote {
  midi: number;
  velocity: number;
}
