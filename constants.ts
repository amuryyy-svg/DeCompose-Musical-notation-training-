
import { NoteDefinition, LocalizedContent, Language } from './types';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Frequencies relative to A4 (440Hz, MIDI 69)
export const getFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// Helper to get text based on current language
export const getLocalizedText = (content: LocalizedContent | string, lang: Language): string => {
  if (typeof content === 'string') return content;
  return content[lang] || content['en'] || '';
};

// Mapping using physical key codes (works regardless of language layout)
// Layout requested:
// Lower: zxcvbnm (White) | sdghj (Black)
// Upper: yuiop[] (White) | 780-= (Black)
export const KEYBOARD_MAP = [
  // Cluster 1 (Lower)
  { code: 'KeyZ', semitone: 0, label: 'Z', type: 'white' }, // C
  { code: 'KeyS', semitone: 1, label: 'S', type: 'black' }, // C#
  { code: 'KeyX', semitone: 2, label: 'X', type: 'white' }, // D
  { code: 'KeyD', semitone: 3, label: 'D', type: 'black' }, // D#
  { code: 'KeyC', semitone: 4, label: 'C', type: 'white' }, // E
  { code: 'KeyV', semitone: 5, label: 'V', type: 'white' }, // F
  { code: 'KeyG', semitone: 6, label: 'G', type: 'black' }, // F#
  { code: 'KeyB', semitone: 7, label: 'B', type: 'white' }, // G
  { code: 'KeyH', semitone: 8, label: 'H', type: 'black' }, // G#
  { code: 'KeyN', semitone: 9, label: 'N', type: 'white' }, // A
  { code: 'KeyJ', semitone: 10, label: 'J', type: 'black' }, // A#
  { code: 'KeyM', semitone: 11, label: 'M', type: 'white' }, // B

  // Cluster 2 (Upper)
  { code: 'KeyY', semitone: 12, label: 'Y', type: 'white' }, // C
  { code: 'Digit7', semitone: 13, label: '7', type: 'black' }, // C#
  { code: 'KeyU', semitone: 14, label: 'U', type: 'white' }, // D
  { code: 'Digit8', semitone: 15, label: '8', type: 'black' }, // D#
  { code: 'KeyI', semitone: 16, label: 'I', type: 'white' }, // E
  { code: 'KeyO', semitone: 17, label: 'O', type: 'white' }, // F
  { code: 'Digit0', semitone: 18, label: '0', type: 'black' }, // F#
  { code: 'KeyP', semitone: 19, label: 'P', type: 'white' }, // G
  { code: 'Minus', semitone: 20, label: '-', type: 'black' }, // G#
  { code: 'BracketLeft', semitone: 21, label: '[', type: 'white' }, // A
  { code: 'Equal', semitone: 22, label: '=', type: 'black' }, // A#
  { code: 'BracketRight', semitone: 23, label: ']', type: 'white' }, // B
] as const;

export const generatePianoKeys = (baseOctave: number): NoteDefinition[] => {
  const startMidi = (baseOctave + 1) * 12; // C3 is MIDI 48
  
  return KEYBOARD_MAP.map(k => {
    const totalSemitones = k.semitone;
    const midi = startMidi + totalSemitones;
    const noteName = NOTES[midi % 12];
    const octave = Math.floor(midi / 12) - 1; 

    return {
      note: noteName,
      octave: octave,
      frequency: getFreq(midi),
      type: k.type,
      keyboardKey: k.label,
      code: k.code,
      midi: midi
    };
  });
};

const ENHARMONIC_MAP: Record<string, string> = {
  'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'E#': 'F', 'B#': 'C'
};

const FLAT_MAP: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};

// Converts C# -> Db depending on mode
export const getDisplayNoteName = (note: string, mode: 'sharp' | 'flat'): string => {
  if (mode === 'flat' && FLAT_MAP[note]) {
    return FLAT_MAP[note];
  }
  return note;
};

export const normalizeNoteName = (note: string): string => {
  // Extract note name and octave (e.g., "Eb4" -> "Eb", "4")
  const match = note.match(/^([A-G][b#]?)(-?\d+)?$/);
  if (!match) return note;

  const name = match[1];
  const octave = match[2] || '';

  if (ENHARMONIC_MAP[name]) {
    return `${ENHARMONIC_MAP[name]}${octave}`;
  }
  
  return note;
};

// Curriculum Topics
export const TOPICS = [
  { id: '1', ru: 'Ноты и Октавы', en: 'Notes & Octaves' },
  { id: '2', ru: 'Тон и Полутон', en: 'Tone & Semitone' },
  { id: '3', ru: 'Интервалы: Основы', en: 'Basic Intervals' },
  { id: '4', ru: 'Малые и Большие Терции', en: 'Major & Minor Thirds' },
  { id: '5', ru: 'Квинта и Кварта', en: 'Perfect Fifth & Fourth' },
  { id: '6', ru: 'Мажорная гамма', en: 'Major Scale' },
  { id: '7', ru: 'Минорная гамма', en: 'Minor Scale' },
  { id: '8', ru: 'Трезвучия (Мажор/Минор)', en: 'Major/Minor Triads' },
  { id: '9', ru: 'Обращения: Секстаккорд', en: 'Inversions: Sixth Chord' },
  { id: '10', ru: 'Ступени лада', en: 'Scale Degrees' },
  { id: '11', ru: 'Гармония: T-S-D', en: 'Harmony: T-S-D' },
  { id: '12', ru: 'Септаккорды', en: 'Seventh Chords' },
  { id: '13', ru: 'Лидийский лад', en: 'Lydian Mode' },
  { id: '14', ru: 'Тональность', en: 'Tonality' },
  { id: '15', ru: 'Модуляция', en: 'Modulation' },
];

export const GLOSSARY_DATA = {
  ru: [
    { term: 'Нота', def: 'Графическое обозначение музыкального звука и сам звук.' },
    { term: 'Октава', def: 'Интервал между двумя нотами с одинаковым названием (например, от До до следующего До). Содержит 12 полутонов.' },
    { term: 'Полутон', def: 'Минимальное расстояние между звуками в современной музыке (например, между белой клавишей и соседней черной).' },
    { term: 'Тон', def: 'Расстояние, равное двум полутонам (например, До — Ре).' },
    { term: 'Диез (♯)', def: 'Знак повышения ноты на полтона.' },
    { term: 'Бемоль (♭)', def: 'Знак понижения ноты на полтона.' },
    { term: 'Бекар (♮)', def: 'Знак, отменяющий действие диеза или бемоля.' },
    { term: 'Энгармонизм', def: 'Равенство звуков по высоте, но различие по названию (C# = Db).' },
    
    // Интервалы
    { term: 'Интервал', def: 'Сочетание двух звуков, взятых последовательно или одновременно.' },
    { term: 'Прима (ч1)', def: 'Интервал в 0 тонов. Повторение одной и той же ноты (унисон).' },
    { term: 'Секунда (2)', def: 'Интервал, охватывающий две ступени. Малая секунда (м2) = 0.5 тона, Большая секунда (б2) = 1 тон.' },
    { term: 'Терция (3)', def: 'Интервал, охватывающий три ступени. Основа мажора и минора. Малая терция (м3) = 1.5 тона (грусть), Большая терция (б3) = 2 тона (радость).' },
    { term: 'Кварта (ч4)', def: 'Интервал, охватывающий четыре ступени. Чистая кварта = 2.5 тона.' },
    { term: 'Тритон', def: 'Интервал в 3 тона (увеличенная кварта или уменьшенная квинта). Звучит напряженно.' },
    { term: 'Квинта (ч5)', def: 'Интервал, охватывающий пять ступеней. Чистая квинта = 3.5 тона. Звучит пусто и устойчиво.' },
    { term: 'Секста (6)', def: 'Интервал, охватывающий шесть ступеней. Малая секста (м6) = 4 тона, Большая секста (б6) = 4.5 тона.' },
    { term: 'Септима (7)', def: 'Интервал, охватывающий семь ступеней. Малая септима (м7) = 5 тонов, Большая септима (б7) = 5.5 тонов.' },

    // Гармония и Лад
    { term: 'Лад', def: 'Система взаимосвязи звуков вокруг тоники (устойчивого центра). Основные лады: мажор и минор.' },
    { term: 'Мажор', def: 'Лад светлого, радостного наклонения. Строится по формуле: Тон-Тон-Полутон-Тон-Тон-Тон-Полутон.' },
    { term: 'Минор', def: 'Лад темного, грустного наклонения. Строится по формуле: Тон-Полутон-Тон-Тон-Полутон-Тон-Тон.' },
    { term: 'Тональность', def: 'Высота лада, определяемая тоникой (например, До мажор).' },
    { term: 'Ступень', def: 'Порядковый номер звука в гамме (I, II, III...).' },
    { term: 'Тоника (T)', def: 'Первая, самая устойчивая ступень лада.' },
    { term: 'Субдоминанта (S)', def: 'Четвертая ступень лада.' },
    { term: 'Доминанта (D)', def: 'Пятая ступень лада, стремится разрешиться в тонику.' },
    
    // Аккорды
    { term: 'Аккорд', def: 'Созвучие из трех и более разноименных звуков.' },
    { term: 'Трезвучие', def: 'Аккорд из трех звуков, расположенных по терциям.' },
    { term: 'Обращение', def: 'Перенос нижнего звука аккорда на октаву вверх.' },
    { term: 'Секстаккорд', def: 'Первое обращение трезвучия (терция в басу).' },
    { term: 'Септаккорд', def: 'Аккорд из четырех звуков, расположенных по терциям (крайние звуки образуют септиму).' },
    { term: 'Арпеджио', def: 'Поочередное исполнение звуков аккорда.' },
    { term: 'Модуляция', def: 'Переход из одной тональности в другую.' },
  ],
  en: [
    { term: 'Note', def: 'A symbol denoting a musical sound.' },
    { term: 'Octave', def: 'Interval between one musical pitch and another with half or double its frequency.' },
    { term: 'Semitone', def: 'The smallest interval used in classical Western music, equal to a twelfth of an octave.' },
    { term: 'Tone', def: 'An interval of two semitones.' },
    { term: 'Sharp (♯)', def: 'Raises a note by a semitone.' },
    { term: 'Flat (♭)', def: 'Lowers a note by a semitone.' },
    { term: 'Natural (♮)', def: 'Cancels a previous accidental (sharp or flat).' },
    { term: 'Enharmonic', def: 'Notes that sound the same but are named differently (e.g., C# and Db).' },

    // Intervals
    { term: 'Interval', def: 'The difference in pitch between two sounds.' },
    { term: 'Unison (Prime)', def: 'Two notes of the same pitch (0 semitones).' },
    { term: 'Second', def: 'Interval spanning 2 degrees. Minor 2nd (1 semitone), Major 2nd (2 semitones).' },
    { term: 'Third', def: 'Interval spanning 3 degrees. Minor 3rd (3 semitones) - sad, Major 3rd (4 semitones) - happy.' },
    { term: 'Fourth', def: 'Interval spanning 4 degrees. Perfect 4th is 5 semitones.' },
    { term: 'Tritone', def: 'Interval of three whole tones. Augmented 4th or Diminished 5th.' },
    { term: 'Fifth', def: 'Interval spanning 5 degrees. Perfect 5th is 7 semitones. Sounds open and stable.' },
    { term: 'Sixth', def: 'Interval spanning 6 degrees. Minor 6th (8 semitones), Major 6th (9 semitones).' },
    { term: 'Seventh', def: 'Interval spanning 7 degrees. Minor 7th (10 semitones), Major 7th (11 semitones).' },

    // Harmony
    { term: 'Mode/Key', def: 'A system of relationships between notes (e.g., Major or Minor).' },
    { term: 'Major Scale', def: 'A scale with a happy sound. Formula: W-W-H-W-W-W-H (W=Whole, H=Half).' },
    { term: 'Minor Scale', def: 'A scale with a sadder sound. Formula: W-H-W-W-H-W-W.' },
    { term: 'Tonality', def: 'The arrangement of pitches and chords of a musical work in a hierarchy of perceived relations.' },
    { term: 'Degree', def: 'The position of a note in a scale.' },
    { term: 'Tonic (I)', def: 'The first scale degree, the "home" note.' },
    { term: 'Subdominant (IV)', def: 'The fourth scale degree.' },
    { term: 'Dominant (V)', def: 'The fifth scale degree, creates tension resolving to Tonic.' },

    // Chords
    { term: 'Chord', def: 'Any harmonic set of pitches consisting of multiple notes (usually three or more).' },
    { term: 'Triad', def: 'A set of three notes stacked in thirds.' },
    { term: 'Inversion', def: 'Rearranging the notes of a chord so a different note is at the bottom.' },
    { term: 'Sixth Chord', def: 'The first inversion of a triad.' },
    { term: 'Seventh Chord', def: 'A chord consisting of a triad plus a note forming an interval of a seventh above the root.' },
    { term: 'Arpeggio', def: 'Playing the notes of a chord sequentially.' },
    { term: 'Modulation', def: 'Changing from one key (tonality) to another.' },
  ]
};
