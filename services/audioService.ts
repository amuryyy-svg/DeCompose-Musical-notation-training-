
// MIDI to Note Name mapping for sample lookup
const MIDI_TO_NOTE: Record<number, string> = {
  21: 'A0', 24: 'C1', 27: 'Ds1', 30: 'Fs1', 33: 'A1',
  36: 'C2', 39: 'Ds2', 42: 'Fs2', 45: 'A2',
  48: 'C3', 51: 'Ds3', 54: 'Fs3', 57: 'A3',
  60: 'C4', 63: 'Ds4', 66: 'Fs4', 69: 'A4',
  72: 'C5', 75: 'Ds5', 78: 'Fs5', 81: 'A5',
  84: 'C6', 87: 'Ds6', 90: 'Fs6', 93: 'A6',
  96: 'C7', 99: 'Ds7', 102: 'Fs7', 105: 'A7',
  108: 'C8'
};

const BASE_URL = 'https://tonejs.github.io/audio/salamander/';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private buffers: Map<number, AudioBuffer> = new Map();
  private activeSources: Map<number, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();
  private isLoaded: boolean = false;

  initialize() {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master Volume
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // Reverb (Convolver)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createReverbBuffer(this.ctx, 3, 2); // 3 seconds reverb
    
    // Dry/Wet Mix (Simple parallel connection)
    // Dry
    this.masterGain.connect(this.ctx.destination);
    // Wet
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.3; // 30% Reverb
    this.masterGain.connect(this.reverbNode);
    this.reverbNode.connect(reverbGain);
    reverbGain.connect(this.ctx.destination);

    this.loadSamples();
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createReverbBuffer(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Synthesize a noise burst with exponential decay
      // Using Math.random() * 2 - 1 for white noise
      const amplitude = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * amplitude;
      right[i] = (Math.random() * 2 - 1) * amplitude;
    }
    return impulse;
  }

  private async loadSamples() {
    if (!this.ctx) return;

    const promises = Object.entries(MIDI_TO_NOTE).map(async ([midi, noteName]) => {
      try {
        const response = await fetch(`${BASE_URL}${noteName}.mp3`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        this.buffers.set(parseInt(midi), audioBuffer);
      } catch (e) {
        console.warn(`Failed to load sample for ${noteName}`, e);
      }
    });

    await Promise.all(promises);
    this.isLoaded = true;
    console.log('Piano samples loaded');
  }

  private getNearestSample(midi: number): { buffer: AudioBuffer; distance: number; rootMidi: number } | null {
    if (this.buffers.size === 0) return null;

    // Direct match
    if (this.buffers.has(midi)) {
      return { buffer: this.buffers.get(midi)!, distance: 0, rootMidi: midi };
    }

    // Find nearest
    let minDistance = Infinity;
    let nearestMidi = -1;

    for (const key of this.buffers.keys()) {
      const dist = Math.abs(midi - key);
      if (dist < minDistance) {
        minDistance = dist;
        nearestMidi = key;
      }
    }

    if (nearestMidi !== -1) {
      return { 
        buffer: this.buffers.get(nearestMidi)!, 
        distance: midi - nearestMidi, 
        rootMidi: nearestMidi 
      };
    }

    return null;
  }

  playNote(frequency: number, midiIndex: number) {
    if (!this.ctx || !this.masterGain) {
      this.initialize();
    }
    if (!this.ctx || !this.masterGain) return;

    // Resume context if needed (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Stop existing note if playing
    this.stopNote(midiIndex);

    const sample = this.getNearestSample(midiIndex);
    
    // Fallback oscillator if samples aren't loaded yet
    if (!sample) {
      this.playFallbackOscillator(frequency, midiIndex);
      return;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = sample.buffer;
    
    // Pitch shift
    // playbackRate = 2 ^ (semitones / 12)
    source.playbackRate.value = Math.pow(2, sample.distance / 12);

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 1.0;

    // Simple velocity curve simulation (optional, fixed here)
    
    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start(0);

    this.activeSources.set(midiIndex, { source, gain: gainNode });
  }

  private playFallbackOscillator(frequency: number, midiIndex: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, t);
    
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 1);
  }

  stopNote(midiIndex: number) {
    if (!this.ctx) return;
    
    const active = this.activeSources.get(midiIndex);
    if (active) {
      const { source, gain } = active;
      const t = this.ctx.currentTime;
      const release = 0.3; // Natural release time

      // Fade out
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + release);

      source.stop(t + release + 0.1);
      
      // Cleanup
      setTimeout(() => {
        source.disconnect();
        gain.disconnect();
      }, (release * 1000) + 200);

      this.activeSources.delete(midiIndex);
    }
  }
}

export const audioService = new AudioService();
