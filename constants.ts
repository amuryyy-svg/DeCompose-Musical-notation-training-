
import { NoteDefinition, LocalizedContent, Language, Lesson, GlossaryItem } from './types';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Frequencies relative to A4 (440Hz, MIDI 69)
export const getFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// Helper to get text based on current language
export const getLocalizedText = (content: LocalizedContent | string | undefined | null, lang: Language): string => {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content[lang] || content['en'] || '';
};

const RU_OCTAVES: Record<number, string> = {
  1: 'Контроктава',
  2: 'Большая',
  3: 'Малая',
  4: 'Первая',
  5: 'Вторая',
  6: 'Третья',
  7: 'Четвертая',
  8: 'Пятая'
};

const EN_OCTAVES: Record<number, string> = {
  1: 'Contra',
  2: 'Great',
  3: 'Small',
  4: '1-lined',
  5: '2-lined',
  6: '3-lined',
  7: '4-lined',
  8: '5-lined'
};

export const getOctaveRangeLabel = (startOctave: number, lang: Language): string => {
  if (startOctave < 1 || startOctave > 7) return '';

  if (lang === 'ru') {
    const o1 = RU_OCTAVES[startOctave] || '';
    const o2 = RU_OCTAVES[startOctave + 1] || '';
    return `${o1} / ${o2}`;
  } else {
    const o1 = EN_OCTAVES[startOctave] || `Oct ${startOctave}`;
    const o2 = EN_OCTAVES[startOctave + 1] || `Oct ${startOctave + 1}`;
    return `${o1} / ${o2} (${startOctave}-${startOctave+1})`;
  }
};

// Mapping using physical key codes
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
  const match = note.match(/^([A-G][b#]?)(-?\d+)?$/);
  if (!match) return note;

  const name = match[1];
  const octave = match[2] || '';

  if (ENHARMONIC_MAP[name]) {
    return `${ENHARMONIC_MAP[name]}${octave}`;
  }
  
  return note;
};

export const TOPICS = [
  { id: 'basics_notes', label: { ru: 'Ноты и Октавы', en: 'Notes & Octaves' } },
  { id: 'basics_tone', label: { ru: 'Тон и Полутон', en: 'Tone & Semitone' } },
  { id: 'basics_alteration', label: { ru: 'Диезы, Бемоли, Бекары', en: 'Sharps, Flats, Naturals' } },
  { id: 'intervals_small', label: { ru: 'Секунды и Терции', en: 'Seconds & Thirds' } },
  { id: 'intervals_perfect', label: { ru: 'Кварта и Квинта', en: 'Perfect 4th & 5th' } },
  { id: 'intervals_wide', label: { ru: 'Секста, Септима, Октава', en: '6th, 7th, Octave' } },
  { id: 'scale_major', label: { ru: 'Мажорная гамма (Строение)', en: 'Major Scale Construction' } },
  { id: 'scale_minor', label: { ru: 'Минорная гамма (Натуральная)', en: 'Natural Minor Scale' } },
  { id: 'triads_basic', label: { ru: 'Трезвучия (Мажор/Минор)', en: 'Major & Minor Triads' } },
  { id: 'harmony_main', label: { ru: 'Тоника, Субдоминанта, Доминанта', en: 'Tonic, Subdominant, Dominant' } }
];

export const STATIC_LESSONS: Record<string, Lesson> = {
    'basics_notes': {
        title: { ru: 'Ноты и Октавы', en: 'Notes & Octaves' },
        description: { ru: 'Изучение всех белых клавиш', en: 'Learning all white keys' },
        steps: [
            {
                title: { ru: 'До (C)', en: 'Note C' },
                explanation: { ru: 'Ориентир: Группа из **двух черных клавиш**. Нота **До (C4)** находится сразу слева от них.', en: 'Anchor: Group of **two black keys**. The note **C4** is immediately to the left.' },
                targets: ['C4'],
                highlight: ['C4']
            },
            {
                title: { ru: 'Ре (D)', en: 'Note D' },
                explanation: { ru: 'Нота **Ре (D4)** находится между двумя черными клавишами.', en: 'The note **D4** is located between the two black keys.' },
                targets: ['D4'],
                highlight: ['D4']
            },
            {
                title: { ru: 'Ми (E)', en: 'Note E' },
                explanation: { ru: 'Нота **Ми (E4)** находится справа от двух черных клавиш.', en: 'The note **E4** is to the right of the two black keys.' },
                targets: ['E4'],
                highlight: ['E4']
            },
            {
                title: { ru: 'Фа (F)', en: 'Note F' },
                explanation: { ru: 'Новый ориентир: Группа из **трех черных клавиш**. Нота **Фа (F4)** находится слева от них.', en: 'New anchor: Group of **three black keys**. **F4** is to the left of them.' },
                targets: ['F4'],
                highlight: ['F4']
            },
            {
                title: { ru: 'Соль (G)', en: 'Note G' },
                explanation: { ru: 'Нота **Соль (G4)** находится между первой и второй черной клавишей в группе из трех.', en: '**G4** is between the first and second black keys in the group of three.' },
                targets: ['G4'],
                highlight: ['G4']
            },
            {
                title: { ru: 'Ля (A)', en: 'Note A' },
                explanation: { ru: 'Нота **Ля (A4)** находится между второй и третьей черной клавишей.', en: '**A4** is between the second and third black keys.' },
                targets: ['A4'],
                highlight: ['A4']
            },
            {
                title: { ru: 'Си (B)', en: 'Note B' },
                explanation: { ru: 'Нота **Си (B4)** находится справа от группы из трех черных клавиш.', en: '**B4** is to the right of the group of three black keys.' },
                targets: ['B4'],
                highlight: ['B4']
            },
            {
                title: { ru: 'Октава (C)', en: 'Octave (C)' },
                explanation: { ru: 'Цикл замыкается. Следующая нота — снова **До (C5)**, но октавой выше.', en: 'The cycle completes. The next note is **C5** again, but an octave higher.' },
                targets: ['C5'],
                highlight: ['C5']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Найдите ноту **Соль (G4)**. Подсказка: она внутри группы из трех черных клавиш.', en: 'Find **G4**. Hint: it is inside the group of three black keys.' },
                targets: ['G4'],
                highlight: [] 
            }
        ]
    },
    'basics_tone': {
        title: { ru: 'Тон и Полутон', en: 'Tone & Semitone' },
        description: { ru: 'Измерение расстояний', en: 'Measuring Distances' },
        steps: [
            {
                title: { ru: 'Полутон (Ми-Фа)', en: 'Semitone (E-F)' },
                explanation: { ru: 'Полутон — это самое близкое расстояние. Между **Ми (E4)** и **Фа (F4)** нет черной клавиши. Это естественный полутон.', en: 'A semitone is the closest distance. There is no black key between **E4** and **F4**. This is a natural semitone.' },
                targets: ['E4', 'F4'],
                highlight: ['E4', 'F4']
            },
            {
                title: { ru: 'Полутон (Си-До)', en: 'Semitone (B-C)' },
                explanation: { ru: 'Еще один естественный полутон на белых клавишах: **Си (B4)** и **До (C5)**.', en: 'Another natural semitone on white keys: **B4** and **C5**.' },
                targets: ['B4', 'C5'],
                highlight: ['B4', 'C5']
            },
            {
                title: { ru: 'Полутон (Хроматический)', en: 'Semitone (Chromatic)' },
                explanation: { ru: 'Чаще всего полутон — это шаг с белой на ближайшую черную. Например: **До (C4)** и **До-диез (C#4)**.', en: 'Most often, a semitone is a step from white to the nearest black. Example: **C4** and **C#4**.' },
                targets: ['C4', 'C#4'],
                highlight: ['C4', 'C#4']
            },
            {
                title: { ru: 'Целый Тон (Белые)', en: 'Whole Tone (White)' },
                explanation: { ru: 'Тон = 2 полутона. Мы перепрыгиваем через одну клавишу. **До (C4)** — (черная) — **Ре (D4)**.', en: 'Tone = 2 semitones. We skip over one key. **C4** — (black) — **D4**.' },
                targets: ['C4', 'D4'],
                highlight: ['C4', 'D4']
            },
            {
                title: { ru: 'Целый Тон (Белая-Черная)', en: 'Whole Tone (White-Black)' },
                explanation: { ru: 'Тон может идти с белой на черную. От **Ми (E4)** шагните через F4 на **Фа-диез (F#4)**.', en: 'A tone can go from white to black. From **E4**, skip F4 to land on **F#4**.' },
                targets: ['E4', 'F#4'],
                highlight: ['E4', 'F#4']
            },
            {
                title: { ru: 'Целый Тон (Черные)', en: 'Whole Tone (Black)' },
                explanation: { ru: 'Между **Фа-диез (F#4)** и **Соль-диез (G#4)** есть белая клавиша (G). Значит это тоже целый тон.', en: 'There is a white key (G) between **F#4** and **G#4**. So this is also a whole tone.' },
                targets: ['F#4', 'G#4'],
                highlight: ['F#4', 'G#4']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Сыграйте полутон вверх от ноты **Ля (A4)**. (Вам нужна черная клавиша).', en: 'Play a semitone up from **A4**. (You need a black key).' },
                targets: ['A#4'],
                highlight: [] 
            }
        ]
    },
    'basics_alteration': {
        title: { ru: 'Знаки альтерации', en: 'Accidentals' },
        description: { ru: 'Диезы, Бемоли и Энгармонизм', en: 'Sharps, Flats & Enharmonics' },
        steps: [
            {
                title: { ru: 'Диез (Sharp)', en: 'Sharp' },
                explanation: { ru: 'Диез (♯) повышает ноту на полутон (шаг вправо). Сыграйте **Фа (F4)** и **Фа-диез (F#4)**.', en: 'Sharp (♯) raises a note by a semitone (step right). Play **F4** and **F#4**.' },
                targets: ['F4', 'F#4'],
                highlight: ['F4', 'F#4']
            },
            {
                title: { ru: 'Бемоль (Flat)', en: 'Flat' },
                explanation: { ru: 'Бемоль (♭) понижает ноту на полутон (шаг влево). Сыграйте **Ми (E4)** и **Ми-бемоль (Eb4)**.', en: 'Flat (♭) lowers a note by a semitone (step left). Play **E4** and **Eb4**.' },
                targets: ['E4', 'D#4'],
                highlight: ['E4', 'D#4']
            },
            {
                title: { ru: 'Энгармонизм 1', en: 'Enharmonic 1' },
                explanation: { ru: 'Черная клавиша между D и E имеет два имени. Как повышенная D (**D#**) и как пониженная E (**Eb**). Нажмите её.', en: 'The black key between D and E has two names. Raised D (**D#**) and lowered E (**Eb**). Press it.' },
                targets: ['D#4'],
                highlight: ['D#4']
            },
            {
                title: { ru: 'Энгармонизм 2', en: 'Enharmonic 2' },
                explanation: { ru: 'То же самое с клавишей между F и G. Это **F#** и **Gb**. Нажмите её.', en: 'Same for the key between F and G. It is **F#** and **Gb**. Press it.' },
                targets: ['F#4'],
                highlight: ['F#4']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Сыграйте **Ля-бемоль (Ab4)**.', en: 'Play **Ab4**.' },
                targets: ['G#4'],
                highlight: [] 
            }
        ]
    },
    'intervals_small': {
        title: { ru: 'Секунды и Терции', en: 'Seconds & Thirds' },
        description: { ru: 'Малые интервалы', en: 'Small Intervals' },
        steps: [
            {
                title: { ru: 'Малая секунда (м2)', en: 'Minor 2nd' },
                explanation: { ru: '1 полутон. Очень резкое звучание. **C4 - C#4**.', en: '1 semitone. Very sharp sound. **C4 - C#4**.' },
                targets: ['C4', 'C#4'],
                highlight: ['C4', 'C#4']
            },
            {
                title: { ru: 'Большая секунда (б2)', en: 'Major 2nd' },
                explanation: { ru: '2 полутона (целый тон). Звучит более мягко, но все еще напряженно. **C4 - D4**.', en: '2 semitones (whole tone). Sounds softer but still tense. **C4 - D4**.' },
                targets: ['C4', 'D4'],
                highlight: ['C4', 'D4']
            },
            {
                title: { ru: 'Малая терция (м3)', en: 'Minor 3rd' },
                explanation: { ru: '3 полутона. Грустный, минорный интервал. **C4 - Eb4**.', en: '3 semitones. Sad, minor interval. **C4 - Eb4**.' },
                targets: ['C4', 'D#4'],
                highlight: ['C4', 'D#4']
            },
            {
                title: { ru: 'Большая терция (б3)', en: 'Major 3rd' },
                explanation: { ru: '4 полутона. Светлый, мажорный интервал. **C4 - E4**.', en: '4 semitones. Bright, major interval. **C4 - E4**.' },
                targets: ['C4', 'E4'],
                highlight: ['C4', 'E4']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Постройте Малую Терцию (3 полутона) от ноты **Ре (D4)**. (Цель: Фа).', en: 'Build a Minor Third (3 semitones) from **D4**. (Target: F4).' },
                targets: ['D4', 'F4'],
                highlight: [] 
            }
        ]
    },
    'intervals_perfect': {
        title: { ru: 'Кварта и Квинта', en: 'Perfect 4th & 5th' },
        description: { ru: 'Чистые интервалы', en: 'Perfect Intervals' },
        steps: [
            {
                title: { ru: 'Чистая Квинта (ч5)', en: 'Perfect 5th' },
                explanation: { ru: '7 полутонов. Самый устойчивый интервал. **C4 - G4**.', en: '7 semitones. The most stable interval. **C4 - G4**.' },
                targets: ['C4', 'G4'],
                highlight: ['C4', 'G4']
            },
            {
                title: { ru: 'Чистая Кварта (ч4)', en: 'Perfect 4th' },
                explanation: { ru: '5 полутонов. Звучит как призыв или гимн. **C4 - F4**.', en: '5 semitones. Sounds like a call or anthem. **C4 - F4**.' },
                targets: ['C4', 'F4'],
                highlight: ['C4', 'F4']
            },
            {
                title: { ru: 'Тритон', en: 'Tritone' },
                explanation: { ru: '6 полутонов. "Дьявол в музыке". Находится ровно между квартой и квинтой. **C4 - F#4**.', en: '6 semitones. "The Devil in Music". Exactly between 4th and 5th. **C4 - F#4**.' },
                targets: ['C4', 'F#4'],
                highlight: ['C4', 'F#4']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Постройте Чистую Квинту от ноты **Ля (A3)**. (Цель: Ми).', en: 'Build a Perfect 5th from **A3**. (Target: E4).' },
                targets: ['A3', 'E4'],
                highlight: [] 
            }
        ]
    },
    'intervals_wide': {
        title: { ru: 'Широкие интервалы', en: 'Wide Intervals' },
        description: { ru: 'Секста, Септима, Октава', en: '6th, 7th, Octave' },
        steps: [
            {
                title: { ru: 'Малая Секста (м6)', en: 'Minor 6th' },
                explanation: { ru: '8 полутонов. Романтичный, печальный интервал. **C4 - Ab4**.', en: '8 semitones. Romantic, sad interval. **C4 - Ab4**.' },
                targets: ['C4', 'G#4'],
                highlight: ['C4', 'G#4']
            },
            {
                title: { ru: 'Большая Секста (б6)', en: 'Major 6th' },
                explanation: { ru: '9 полутонов. Пасторальный, широкий интервал. **C4 - A4**.', en: '9 semitones. Pastoral, wide interval. **C4 - A4**.' },
                targets: ['C4', 'A4'],
                highlight: ['C4', 'A4']
            },
            {
                title: { ru: 'Малая Септима (м7)', en: 'Minor 7th' },
                explanation: { ru: '10 полутонов. Мягкий диссонанс, основа джазовых аккордов. **C4 - Bb4**.', en: '10 semitones. Soft dissonance, basis of jazz chords. **C4 - Bb4**.' },
                targets: ['C4', 'A#4'],
                highlight: ['C4', 'A#4']
            },
            {
                title: { ru: 'Большая Септима (б7)', en: 'Major 7th' },
                explanation: { ru: '11 полутонов. Острый, колючий диссонанс. Стремится в октаву. **C4 - B4**.', en: '11 semitones. Sharp, prickly dissonance. Yearns for the octave. **C4 - B4**.' },
                targets: ['C4', 'B4'],
                highlight: ['C4', 'B4']
            },
            {
                title: { ru: 'Чистая Октава (ч8)', en: 'Perfect Octave' },
                explanation: { ru: '12 полутонов. Полное слияние звуков. **C4 - C5**.', en: '12 semitones. Total blending of sounds. **C4 - C5**.' },
                targets: ['C4', 'C5'],
                highlight: ['C4', 'C5']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Сыграйте Большую Септиму от ноты **Фа (F4)**. (Цель: Ми).', en: 'Play a Major 7th from **F4**. (Target: E5).' },
                targets: ['F4', 'E5'],
                highlight: [] 
            }
        ]
    },
    'scale_major': {
        title: { ru: 'Мажорная гамма', en: 'Major Scale' },
        description: { ru: 'Строение', en: 'Structure' },
        steps: [
            {
                title: { ru: 'Тетрахорд 1', en: 'Tetrachord 1' },
                explanation: { ru: 'Формула мажора: Тон-Тон-Полутон-Тон-Тон-Тон-Полутон. Начнем с первых трех нот (Тон-Тон): **C4-D4-E4**.', en: 'Major formula: W-W-H-W-W-W-H. Start with the first three notes (W-W): **C4-D4-E4**.' },
                targets: ['C4', 'D4', 'E4'],
                highlight: ['C4', 'D4', 'E4']
            },
            {
                title: { ru: 'Переход', en: 'Transition' },
                explanation: { ru: 'Далее следует полутон и тон: **Фа (F4)** и **Соль (G4)**.', en: 'Next is a semitone and a tone: **F4** and **G4**.' },
                targets: ['F4', 'G4'],
                highlight: ['F4', 'G4']
            },
            {
                title: { ru: 'Тетрахорд 2', en: 'Tetrachord 2' },
                explanation: { ru: 'Завершение гаммы (Тон-Тон-Полутон): **Ля (A4) - Си (B4) - До (C5)**.', en: 'Completion (W-W-H): **A4 - B4 - C5**.' },
                targets: ['A4', 'B4', 'C5'],
                highlight: ['A4', 'B4', 'C5']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Сыграйте первые 3 ноты гаммы Соль-мажор (**G4-A4-B4**).', en: 'Play the first 3 notes of the G Major scale (**G4-A4-B4**).' },
                targets: ['G4', 'A4', 'B4'],
                highlight: [] 
            }
        ]
    },
    'scale_minor': {
        title: { ru: 'Минорная гамма', en: 'Minor Scale' },
        description: { ru: 'Натуральный минор', en: 'Natural Minor' },
        steps: [
            {
                title: { ru: 'Основа', en: 'Base' },
                explanation: { ru: 'Натуральный минор строится от **Ля (A)** по белым клавишам. Сыграйте **A3-B3-C4**.', en: 'Natural minor is built from **A** on white keys. Play **A3-B3-C4**.' },
                targets: ['A3', 'B3', 'C4'],
                highlight: ['A3', 'B3', 'C4']
            },
            {
                title: { ru: 'Развитие', en: 'Development' },
                explanation: { ru: 'Продолжение звукоряда: **Ре (D4) - Ми (E4)**.', en: 'Continuation: **D4 - E4**.' },
                targets: ['D4', 'E4'],
                highlight: ['D4', 'E4']
            },
            {
                title: { ru: 'Завершение', en: 'Completion' },
                explanation: { ru: 'Финал: **Фа (F4) - Соль (G4) - Ля (A4)**.', en: 'Finale: **F4 - G4 - A4**.' },
                targets: ['F4', 'G4', 'A4'],
                highlight: ['F4', 'G4', 'A4']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Сыграйте тоническое трезвучие Ля-минора (**A3-C4-E4**).', en: 'Play the tonic triad of A Minor (**A3-C4-E4**).' },
                targets: ['A3', 'C4', 'E4'],
                highlight: [] 
            }
        ]
    },
    'triads_basic': {
        title: { ru: 'Трезвучия', en: 'Triads' },
        description: { ru: 'Виды трезвучий', en: 'Triad Types' },
        steps: [
            {
                title: { ru: 'Мажорное трезвучие', en: 'Major Triad' },
                explanation: { ru: 'Состоит из б3 + м3. Сыграйте До-мажор: **C4 - E4 - G4**.', en: 'Consists of Maj3 + min3. Play C Major: **C4 - E4 - G4**.' },
                targets: ['C4', 'E4', 'G4'],
                highlight: ['C4', 'E4', 'G4']
            },
            {
                title: { ru: 'Минорное трезвучие', en: 'Minor Triad' },
                explanation: { ru: 'Состоит из м3 + б3. Терцовый тон понижен. Сыграйте До-минор: **C4 - Eb4 - G4**.', en: 'Consists of min3 + Maj3. The third is lowered. Play C Minor: **C4 - Eb4 - G4**.' },
                targets: ['C4', 'D#4', 'G4'],
                highlight: ['C4', 'D#4', 'G4']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Постройте Мажорное трезвучие от ноты **Соль (G4)**. (Состав: G4-B4-D5).', en: 'Build a Major triad from **G4**. (Notes: G4-B4-D5).' },
                targets: ['G4', 'B4', 'D5'],
                highlight: [] 
            }
        ]
    },
    'harmony_main': {
        title: { ru: 'Главные ступени', en: 'Main Degrees' },
        description: { ru: 'T - S - D', en: 'T - S - D' },
        steps: [
            {
                title: { ru: 'Тоника (T)', en: 'Tonic (T)' },
                explanation: { ru: 'I ступень лада. Центр тональности. В До-мажоре это **До (C3)**.', en: '1st degree. Tonal center. In C Major it is **C3**.' },
                targets: ['C3'],
                highlight: ['C3']
            },
            {
                title: { ru: 'Субдоминанта (S)', en: 'Subdominant (S)' },
                explanation: { ru: 'IV ступень лада. В До-мажоре это **Фа (F3)**.', en: '4th degree. In C Major it is **F3**.' },
                targets: ['F3'],
                highlight: ['F3']
            },
            {
                title: { ru: 'Доминанта (D)', en: 'Dominant (D)' },
                explanation: { ru: 'V ступень лада. Максимальное напряжение. В До-мажоре это **Соль (G3)**.', en: '5th degree. Maximum tension. In C Major it is **G3**.' },
                targets: ['G3'],
                highlight: ['G3']
            },
            {
                title: { ru: 'Проверка', en: 'Check' },
                explanation: { ru: 'Сыграйте Доминанту (V ступень) в тональности До-мажор.', en: 'Play the Dominant (5th degree) in C Major.' },
                targets: ['G3'],
                highlight: [] 
            }
        ]
    }
};

export const GLOSSARY_DATA: Record<string, GlossaryItem> = {
  note: {
    term: { ru: "Нота", en: "Note" },
    definition: {
      ru: "Условный графический знак, находящийся на нотном стане и обозначающий высоту и длительность звука.",
      en: "A symbol placed on a staff to indicate the pitch and duration of a sound."
    },
    category: "basics"
  },
  octave: {
    term: { ru: "Октава", en: "Octave" },
    definition: {
      ru: "Интервал между двумя одноименными звуками разной высоты. Частотное соотношение 2:1.",
      en: "The interval between two notes of the same name. Frequency ratio 2:1."
    },
    category: "basics"
  },
  semitone: {
    term: { ru: "Полутон", en: "Semitone" },
    definition: {
      ru: "Наименьшее расстояние между двумя звуками в темперированном строе.",
      en: "The smallest interval used in classical Western music."
    },
    category: "basics"
  },
  tone: {
    term: { ru: "Тон", en: "Whole Tone" },
    definition: {
      ru: "Интервал, состоящий из двух полутонов.",
      en: "An interval consisting of two semitones."
    },
    category: "basics"
  },
  sharp: {
    term: { ru: "Диез (♯)", en: "Sharp (♯)" },
    definition: {
      ru: "Знак альтерации, повышающий ноту на полтона.",
      en: "An accidental that raises the pitch of a note by one semitone."
    },
    category: "basics"
  },
  flat: {
    term: { ru: "Бемоль (♭)", en: "Flat (♭)" },
    definition: {
      ru: "Знак альтерации, понижающий ноту на полтона.",
      en: "An accidental that lowers the pitch of a note by one semitone."
    },
    category: "basics"
  },
  interval: {
    term: { ru: "Интервал", en: "Interval" },
    definition: {
      ru: "Расстояние по высоте между двумя звуками.",
      en: "The difference in pitch between two sounds."
    },
    category: "intervals"
  },
  perfect_fifth: {
    term: { ru: "Чистая квинта", en: "Perfect 5th" },
    definition: {
      ru: "Интервал в 7 полутонов. Обладает совершенным консонансом.",
      en: "An interval of 7 semitones. Highly consonant."
    },
    category: "intervals"
  },
  major_scale: {
    term: { ru: "Мажорная гамма", en: "Major Scale" },
    definition: {
      ru: "Лад, построенный по формуле: Тон-Тон-Полутон-Тон-Тон-Тон-Полутон.",
      en: "A scale with the interval pattern: W-W-H-W-W-W-H."
    },
    category: "scales"
  },
  minor_scale: {
    term: { ru: "Минорная гамма", en: "Minor Scale" },
    definition: {
      ru: "Лад, в котором III ступень образует с тоникой малую терцию.",
      en: "A scale having a minor third interval between the first and third degree."
    },
    category: "scales"
  },
  triad: {
    term: { ru: "Трезвучие", en: "Triad" },
    definition: {
      ru: "Аккорд из трех звуков, расположенных по терциям.",
      en: "A chord made up of three notes stacked in thirds."
    },
    category: "chords"
  },
  tonic: {
    term: { ru: "Тоника", en: "Tonic" },
    definition: {
      ru: "Первая, самая устойчивая ступень лада.",
      en: "The first scale degree of a diatonic scale."
    },
    category: "harmony"
  }
};
