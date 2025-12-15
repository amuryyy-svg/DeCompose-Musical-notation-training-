import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { audioService } from './services/audioService';
import { generatePianoKeys, normalizeNoteName, getFreq } from './constants';
import { NoteDefinition, Lesson, Language } from './types';
import { PianoKey } from './components/PianoKey';
import { ControlPanel } from './components/ControlPanel';

const App: React.FC = () => {
  const [baseOctave, setBaseOctave] = useState(3);
  const [activeMidis, setActiveMidis] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<Language>('ru');
  
  // Display settings
  const [showKeyLabels, setShowKeyLabels] = useState(true);
  const [showNoteLabels, setShowNoteLabels] = useState(true);
  const [accidentalMode, setAccidentalMode] = useState<'sharp' | 'flat'>('sharp');
  const [showGlossary, setShowGlossary] = useState(false);
  
  // Shift State for Visualization
  const [shiftState, setShiftState] = useState<'none' | 'left' | 'right'>('none');

  // Lesson State
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [playedSequence, setPlayedSequence] = useState<string[]>([]);
  const [isStepComplete, setIsStepComplete] = useState(false);
  const [canSkipStep, setCanSkipStep] = useState(false);

  // Generate keys. Always generate them to maintain DOM structure for flexbox alignment.
  // We will hide invalid octaves visually using opacity.
  const leftOctaveNum = baseOctave - 2;
  const rightOctaveNum = baseOctave + 2;

  const leftKeys = useMemo(() => generatePianoKeys(leftOctaveNum), [leftOctaveNum]);
  const centerKeys = useMemo(() => generatePianoKeys(baseOctave), [baseOctave]);
  const rightKeys = useMemo(() => generatePianoKeys(rightOctaveNum), [rightOctaveNum]);

  // Map physical keys to note definitions
  const codeToNoteMap = useMemo(() => {
    const map: Record<string, NoteDefinition> = {};
    centerKeys.forEach(k => { map[k.code] = k; });
    return map;
  }, [centerKeys]);

  const getVisualKeys = (keys: NoteDefinition[]) => {
    return keys.reduce<NoteDefinition[]>((acc, current) => {
        if (!acc.find(k => k.midi === current.midi)) acc.push(current);
        return acc;
    }, []).sort((a, b) => a.midi - b.midi);
  };

  const activeMidisRef = useRef<Set<number>>(new Set());
  const currentStepRef = useRef(currentLesson?.steps[currentStepIndex]);
  const isStepCompleteRef = useRef(isStepComplete);
  const canSkipStepRef = useRef(canSkipStep);
  
  const shiftLeftPressed = useRef(false);
  const shiftRightPressed = useRef(false);

  useEffect(() => { activeMidisRef.current = activeMidis; }, [activeMidis]);
  useEffect(() => { 
    currentStepRef.current = currentLesson ? currentLesson.steps[currentStepIndex] : undefined; 
    isStepCompleteRef.current = isStepComplete;
    canSkipStepRef.current = canSkipStep;
  }, [currentLesson, currentStepIndex, isStepComplete, canSkipStep]);

  // --- Handlers ---

  const handleLessonStart = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setCurrentStepIndex(0);
    setPlayedSequence([]);
    setIsStepComplete(false);
    setCanSkipStep(false);
  };

  const handleNextStep = useCallback(() => {
    if (!currentLesson) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < currentLesson.steps.length) {
      setCurrentStepIndex(nextIndex);
      setIsStepComplete(false);
      setCanSkipStep(false);
      setPlayedSequence([]);
    } else {
      setCurrentLesson(null);
      setCurrentStepIndex(0);
    }
  }, [currentLesson, currentStepIndex]);

  const handlePrevStep = useCallback(() => {
    if (!currentLesson) return;
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStepIndex(prevIndex);
      setIsStepComplete(false); 
      setCanSkipStep(false);
      setPlayedSequence([]);
    }
  }, [currentLesson, currentStepIndex]);

  const playNote = useCallback((midi: number) => {
    if (activeMidisRef.current.has(midi)) return; 

    const freq = getFreq(midi);
    audioService.playNote(freq, midi);
    
    setActiveMidis(prev => {
      const newSet = new Set(prev);
      newSet.add(midi);
      return newSet;
    });

    const step = currentStepRef.current;
    if (step && !isStepCompleteRef.current) {
      const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const canonicalNote = NOTES[midi % 12];
      const canonicalOctave = Math.floor(midi / 12) - 1;
      const canonicalName = `${canonicalNote}${canonicalOctave}`;

      setPlayedSequence(prev => {
        const newSeq = [...prev, canonicalName].slice(-step.targets.length);
        const normalizedTargets = step.targets.map(t => normalizeNoteName(t));
        const isMatch = newSeq.length === normalizedTargets.length && 
                        newSeq.every((val, index) => val === normalizedTargets[index]);
        if (isMatch) setIsStepComplete(true);
        return newSeq;
      });
    }
  }, []);

  const stopNote = useCallback((midi: number) => {
    audioService.stopNote(midi);
    setActiveMidis(prev => {
      const newSet = new Set(prev);
      newSet.delete(midi);
      return newSet;
    });
  }, []);

  // --- Keyboard Logic ---

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; 
    
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || e.shiftKey) {
       // e.preventDefault(); 
    }

    if (e.code === 'Enter') {
      if (isStepCompleteRef.current || canSkipStepRef.current) {
        handleNextStep();
        return;
      }
    }

    if (e.code === 'ArrowLeft') {
      setBaseOctave(prev => Math.max(1, prev - 1));
      return;
    }
    if (e.code === 'ArrowRight') {
      setBaseOctave(prev => Math.min(7, prev + 1)); 
      return;
    }

    if (e.code === 'ShiftLeft') {
      // Prevent shifting if we are at the lowest octave (1) to avoid negative octaves
      if (baseOctave < 2) return;
      
      shiftLeftPressed.current = true;
      setShiftState('left');
      return;
    }
    if (e.code === 'ShiftRight') {
      // Prevent shifting if we are at the highest octave (7) to avoid exceeding octave 8
      if (baseOctave > 6) return;
      
      shiftRightPressed.current = true;
      setShiftState('right');
      return;
    }

    const note = codeToNoteMap[e.code];
    if (note) {
      e.preventDefault(); 
      let finalMidi = note.midi;
      // Shift by 24 semitones (2 octaves)
      if (shiftLeftPressed.current) finalMidi -= 24;
      if (shiftRightPressed.current) finalMidi += 24;
      playNote(finalMidi);
    }
  }, [codeToNoteMap, playNote, handleNextStep, baseOctave]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft') {
      shiftLeftPressed.current = false;
      setShiftState(shiftRightPressed.current ? 'right' : 'none');
      return;
    }
    if (e.code === 'ShiftRight') {
      shiftRightPressed.current = false;
      setShiftState(shiftLeftPressed.current ? 'left' : 'none');
      return;
    }

    const note = codeToNoteMap[e.code];
    if (note) {
      stopNote(note.midi);
      stopNote(note.midi - 12);
      stopNote(note.midi + 12);
      stopNote(note.midi - 24);
      stopNote(note.midi + 24);
    }
  }, [codeToNoteMap, stopNote]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const initAudio = () => audioService.initialize();
    window.addEventListener('click', initAudio);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', initAudio);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Toggle Language
  const toggleLang = () => {
    setLang(prev => prev === 'ru' ? 'en' : 'ru');
  };

  const renderOctave = (keys: NoteDefinition[], opacity: number, octaveLabel: string) => {
    // If keys are generated but the octave is out of valid piano bounds (e.g. -1 or 9),
    // we make it transparent but keep it in the DOM for layout structure.
    // Valid visual range: Octave 0 to 8.
    const octaveNum = keys[0]?.octave ?? -999;
    const isVisible = octaveNum >= 0 && octaveNum <= 8;
    
    // If invisible, force opacity 0 and disable pointer events
    const finalOpacity = isVisible ? opacity : 0;
    const pointerEvents = isVisible ? 'auto' : 'none';

    return (
      <div 
        className="flex flex-col items-center mx-1 md:mx-2 transition-opacity duration-300" 
        style={{ opacity: finalOpacity, pointerEvents: pointerEvents as any }}
      >
         <div className={`text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-mono ${finalOpacity < 0.5 ? 'opacity-0' : 'opacity-50'}`}>
           {octaveLabel}
         </div>
         <div className="flex relative justify-center">
          {getVisualKeys(keys).map((note) => {
            const noteName = `${note.note}${note.octave}`;
            const currentStep = currentLesson ? currentLesson.steps[currentStepIndex] : null;
            const highlights = currentStep ? currentStep.highlight.map(h => normalizeNoteName(h)) : [];
            const isTarget = highlights.includes(noteName);
            
            // Check if active
            const isNoteActive = Array.from(activeMidis).some((m: number) => m % 12 === note.midi % 12);
            
            // Check if NEXT semitone (white key usually) is active to trigger Flat notation on this key
            const isNextSemitoneActive = Array.from(activeMidis).some((m: number) => m % 12 === (note.midi + 1) % 12);
  
            return (
              <PianoKey 
                key={note.midi}
                noteData={note}
                isActive={isNoteActive}
                isNextSemitoneActive={isNextSemitoneActive}
                isLessonTarget={isTarget}
                showKeyLabel={showKeyLabels}
                showNoteLabel={showNoteLabels}
                accidentalMode={accidentalMode}
                onMouseDown={(n) => playNote(n.midi)}
                onMouseUp={(n) => stopNote(n.midi)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const t = {
    octaves: lang === 'ru' ? 'Октавы' : 'Octaves',
    nav: lang === 'ru' ? 'Навигация' : 'Nav',
    next: lang === 'ru' ? 'Далее' : 'Next',
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center overflow-hidden">
      
      {/* Top Section */}
      <div className="flex-1 w-full flex flex-col justify-center items-center px-8 pt-12 pb-4 min-h-[30vh]">
        
        {/* Glossary Icon (Absolute Top Right) */}
        <button 
          onClick={() => setShowGlossary(true)}
          className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors"
          title={lang === 'ru' ? "Словарь" : "Glossary"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </button>

        <ControlPanel 
          onLessonStart={handleLessonStart}
          isLoading={isLoading}
          setLoading={setIsLoading}
          currentLesson={currentLesson}
          currentStepIndex={currentStepIndex}
          currentStep={currentLesson ? currentLesson.steps[currentStepIndex] : null}
          isStepComplete={isStepComplete}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
          setCanSkipStep={setCanSkipStep}
          lang={lang}
          showGlossary={showGlossary}
          setShowGlossary={setShowGlossary}
        />
      </div>

      {/* Piano Section */}
      <div className="w-full flex-grow-0 flex items-end justify-center pb-8 px-4 overflow-visible">
        <div className="flex justify-center origin-bottom transform scale-75 md:scale-90 lg:scale-100 xl:scale-110 transition-transform duration-500">
           {renderOctave(leftKeys, shiftState === 'left' ? 1 : 0.3, `${t.octaves} ${baseOctave - 2}`)}
           {renderOctave(centerKeys, shiftState === 'none' ? 1 : 0.3, `${t.octaves} ${baseOctave}`)}
           {renderOctave(rightKeys, shiftState === 'right' ? 1 : 0.3, `${t.octaves} ${baseOctave + 2}`)}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full py-4 border-t border-gray-900 bg-[#050505] relative flex justify-center items-center">
        
        {/* Left: Toggles */}
        <div className="absolute left-8 flex gap-3">
           <button 
             onClick={toggleLang}
             className="text-xs font-mono font-bold px-2 py-1 rounded text-gray-600 hover:text-white transition-colors uppercase border border-gray-800 hover:border-gray-600"
           >
             {lang === 'ru' ? 'RU' : 'EN'}
           </button>
           
           <button 
             onClick={() => setAccidentalMode(prev => prev === 'sharp' ? 'flat' : 'sharp')}
             className="text-lg leading-none font-mono font-bold px-2 py-1 rounded text-gray-600 hover:text-white transition-colors border border-gray-800 hover:border-gray-600 w-12"
             title={lang === 'ru' ? 'Диезы / Бемоли' : 'Sharps / Flats'}
           >
             {accidentalMode === 'sharp' ? '♯' : '♭'}
           </button>
        </div>

        {/* Center: Controls Hint */}
        <div className="flex flex-col gap-1 items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-300">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono space-x-4">
             <span>Shift : {t.octaves}</span>
             <span>← / → : {t.nav}</span>
             <span>Enter : {t.next}</span>
          </div>
        </div>

        {/* Right: Labels Toggles */}
        <div className="absolute right-8 flex gap-2">
          <button 
            onClick={() => setShowKeyLabels(!showKeyLabels)}
            className={`text-xs font-mono font-bold px-2 py-1 rounded transition-colors ${showKeyLabels ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            KEY
          </button>
          <button 
            onClick={() => setShowNoteLabels(!showNoteLabels)}
            className={`text-xs font-mono font-bold px-2 py-1 rounded transition-colors ${showNoteLabels ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            NOTE
          </button>
        </div>
      </div>

    </div>
  );
};

export default App;