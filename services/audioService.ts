
import * as Tone from 'https://esm.sh/tone@14.7.77';

const SAMPLES = {
  'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
  'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
  'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
  'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
  'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
  'A5': 'A5.mp3', 'C6': 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
  'A6': 'A6.mp3', 'C7': 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
  'A7': 'A7.mp3', 'C8': 'C8.mp3'
};

class AudioService {
  private sampler: Tone.Sampler | null = null;
  private reverb: Tone.Reverb | null = null;
  private filter: Tone.Filter | null = null;
  private initialized = false;

  /**
   * Initializes the Tone.js audio context and effect chain.
   * Must be triggered by a user interaction.
   */
  async initialize() {
    if (this.initialized) return;

    await Tone.start();

    // 1. Reverb (High Quality Convolution)
    this.reverb = new Tone.Reverb({
      decay: 4.0,
      preDelay: 0.01,
      wet: 0.3
    }).toDestination();
    
    // Critical: Generate impulse response
    await this.reverb.generate();

    // 2. LowPass Filter (Dynamic brightness)
    this.filter = new Tone.Filter({
      frequency: 2500,
      type: 'lowpass',
      rolloff: -12
    }).connect(this.reverb);

    // 3. Sampler
    this.sampler = new Tone.Sampler({
      urls: SAMPLES,
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      release: 1,
      curve: 'exponential',
      onload: () => {
        console.log('AudioService: Samples loaded');
      }
    }).connect(this.filter);

    this.initialized = true;
  }

  async load() {
    await this.initialize();
  }

  /**
   * Triggers a note.
   * @param midi MIDI note number (0-127)
   * @param velocity Optional velocity (0-1), defaults to ~0.8 with variance
   */
  async playNote(midi: number, velocity?: number) {
    if (!this.initialized) await this.initialize();

    if (this.sampler && this.sampler.loaded) {
      const now = Tone.now();
      const note = Tone.Frequency(midi, "midi").toNote();
      
      // Default natural velocity if not provided
      const finalVelocity = velocity || (0.7 + Math.random() * 0.2);

      // Dynamic Filter: Harder hits = brighter sound (opens filter)
      if (this.filter) {
        // Map velocity 0-1 to Frequency 2000-4000Hz
        const cutoff = 2000 + (finalVelocity * 2000);
        this.filter.frequency.setValueAtTime(cutoff, now);
      }

      this.sampler.triggerAttack(note, now, finalVelocity);
    }
  }

  stopNote(midi: number) {
    if (this.sampler) {
      const now = Tone.now();
      const note = Tone.Frequency(midi, "midi").toNote();
      this.sampler.triggerRelease(note, now);
    }
  }
}

export const audioService = new AudioService();
