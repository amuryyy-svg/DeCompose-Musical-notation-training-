import { NoteDefinition } from './types';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Frequencies relative to A4 (440Hz, MIDI 69)
export const getFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

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

export const normalizeNoteName = (note: string): string => {
  // Extract note name and octave (e.g., "Eb4" -> "Eb", "4")
  const match = note.match(/^([A-G][b#]?)(-?\d+)?$/);
  if (!match) return note;

  const name = match[1];
  const octave = match[2] || '';

  if (ENHARMONIC_MAP[name]) {
    // Check if the note is B# or E# or Cb or Fb which might change octave
    // Simple case for now (Eb -> D#) does not change octave.
    // Edge cases like Cb4 -> B3 are harder, but for simple sharps/flats mapping within C-B range:
    // Eb -> D#, Ab -> G#, etc. - octave stays same.
    // Cb -> B (octave - 1) - this is complex.
    // Let's handle the common flats: Db, Eb, Gb, Ab, Bb.
    return `${ENHARMONIC_MAP[name]}${octave}`;
  }
  
  return note;
};