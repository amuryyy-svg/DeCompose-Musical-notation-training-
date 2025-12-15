import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { audioService } from './services/audioService';
import { generatePianoKeys, normalizeNoteName, getFreq } from './constants';
import { NoteDefinition, Lesson, Language, ExamSession } from './types';
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
  const [isStepComplete, setIsStepComplete] = useState(false);
  const [canSkipStep, setCanSkipStep] = useState(false);
  
  // Lesson Logic: Sequence Matching
  const [playedSequence, setPlayedSequence] = useState<string[]>([]);

  // Exam State
  const [isExamMode, setIsExamMode] = useState(false);
  const [currentExam, setCurrentExam] = useState<ExamSession | null>(null);
  const [examFeedback, setExamFeedback] = useState<'none' | 'success' | 'failure'>('none');
  
  // Exam Hint System: 
  // 'idle' (0-15s) -> 'hintReady' (Button shows) -> 'hintActive' (Visuals ON, 0-15s wait) -> 'skipReady' (Skip button shows)
  const [examHintState, setExamHintState] = useState<'idle' | 'hintReady' | 'hintActive' | 'skipReady'>('idle');

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
  // Refs for async access in event handlers
  const currentStepRef = useRef(currentLesson?.steps[currentStepIndex]);
  const isStepCompleteRef = useRef(isStepComplete);
  const canSkipStepRef = useRef(canSkipStep);
  const isExamModeRef = useRef(isExamMode);
  const currentExamRef = useRef(currentExam);
  const examFeedbackRef = useRef(examFeedback);
  const examHintStateRef = useRef(examHintState);
  
  const shiftLeftPressed = useRef(false);
  const shiftRightPressed = useRef(false);

  useEffect(() => { activeMidisRef.current = activeMidis; }, [activeMidis]);
  useEffect(() => { 
    currentStepRef.current = currentLesson ? currentLesson.steps[currentStepIndex] : undefined; 
    isStepCompleteRef.current = isStepComplete;
    canSkipStepRef.current = canSkipStep;
    isExamModeRef.current = isExamMode;
    currentExamRef.current = currentExam;
    examFeedbackRef.current = examFeedback;
    examHintStateRef.current = examHintState;
  }, [currentLesson, currentStepIndex, isStepComplete, canSkipStep, isExamMode, currentExam, examFeedback, examHintState]);

  // --- Handlers ---

  const handleHome = () => {
    setCurrentLesson(null);
    setCurrentStepIndex(0);
    setIsExamMode(false);
    setCurrentExam(null);
    setExamFeedback('none');
    setExamHintState('idle');
    setPlayedSequence([]);
    setCanSkipStep(false);
    setActiveMidis(new Set());
    setIsLoading(false);
  };

  const handleLessonStart = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setCurrentStepIndex(0);
    setPlayedSequence([]);
    setIsStepComplete(false);
    setCanSkipStep(false);
    
    // Disable exam mode
    setIsExamMode(false);
    setCurrentExam(null);
  };

  const handleExamStart = (exam: ExamSession) => {
    setCurrentLesson(null);
    setIsExamMode(true);
    setCurrentExam(exam);
    setExamFeedback('none');
    setExamHintState('idle'); 
    setCanSkipStep(false); 
    setActiveMidis(new Set());
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

  const handleNextExamQuestion = useCallback(() => {
    if (!currentExam) return;
    
    // Clear feedback and hints
    setExamFeedback('none');
    setExamHintState('idle');
    setCanSkipStep(false);
    setActiveMidis(new Set());

    const nextIndex = currentExam.currentIndex + 1;
    if (nextIndex < currentExam.questions.length) {
      setCurrentExam({
        ...currentExam,
        currentIndex: nextIndex
      });
    } else {
      // Exam Finished - for now just exit to menu
      setIsExamMode(false);
      setCurrentExam(null);
    }
  }, [currentExam]);

  // Handle Hint Activation
  const handleShowHint = useCallback(() => {
    setExamHintState('hintActive');
  }, []);

  // Exam Hint Timer Logic
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isExamMode && currentExam && examFeedback !== 'success') {
      if (examHintState === 'idle') {
        // Phase 1: Wait 15s to show "Hint" button
        timer = setTimeout(() => {
          setExamHintState('hintReady');
        }, 15000);
      } else if (examHintState === 'hintActive') {
        // Phase 2: Hint is active. Wait 15s to show "Skip" button
        timer = setTimeout(() => {
          setExamHintState('skipReady');
        }, 15000);
      }
    }

    return () => clearTimeout(timer);
  }, [isExamMode, currentExam?.currentIndex, examFeedback, examHintState]);


  // Smart Validation for Exam Mode
  const validateExamInput = useCallback((activeNotes: Set<number>) => {
    const exam = currentExamRef.current;
    if (!exam || examFeedbackRef.current === 'success') return; // Don't validate if already correct
    
    const question = exam.questions[exam.currentIndex];
    const pattern = question.pattern;
    const playedMidis = Array.from(activeNotes).sort((a, b) => a - b);
    
    if (playedMidis.length === 0) return;
    
    // If pattern requires more notes than played, wait.
    if (playedMidis.length < pattern.length) return;

    // Normalize played notes to relative intervals from the root (lowest note)
    const root = playedMidis[0];
    const relativeIntervals = playedMidis.map(m => m - root);
    
    // Check if relativeIntervals matches the pattern exactly
    const isMatch = relativeIntervals.length === pattern.length && 
                    relativeIntervals.every((val, index) => val === pattern[index]);

    if (isMatch) {
      setExamFeedback('success');
      // No auto-advance. User must press Enter or click Next.
    }
  }, []);


  const playNote = useCallback((midi: number) => {
    if (activeMidisRef.current.has(midi)) return; 

    const freq = getFreq(midi);
    audioService.playNote(freq, midi);
    
    const newActiveMidis = new Set(activeMidisRef.current);
    newActiveMidis.add(midi);
    setActiveMidis(newActiveMidis);

    // EXAM MODE LOGIC
    if (isExamModeRef.current) {
      validateExamInput(newActiveMidis);
      return;
    }

    // LESSON MODE LOGIC
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
  }, [validateExamInput]);

  const stopNote = useCallback((midi: number) => {
    audioService.stopNote(midi);
    setActiveMidis(prev => {
      const newSet = new Set(prev);
      newSet.delete(midi);
      
      if (isExamModeRef.current && newSet.size > 0) {
         validateExamInput(newSet);
      }
      return newSet;
    });
  }, [validateExamInput]);

  // --- Keyboard Logic ---

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; 
    
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || e.shiftKey) {
       // e.preventDefault(); 
    }

    if (e.code === 'Enter') {
      // Lesson Mode
      if (currentLesson && (isStepCompleteRef.current || canSkipStepRef.current)) {
        handleNextStep();
        return;
      }
      // Exam Mode
      if (isExamModeRef.current) {
        // 1. Success -> Next
        if (examFeedbackRef.current === 'success') {
          handleNextExamQuestion();
          return;
        }
        // 2. Hint available -> Activate Hint
        if (examHintStateRef.current === 'hintReady') {
           handleShowHint();
           return;
        }
        // 3. Skip available -> Skip
        if (examHintStateRef.current === 'skipReady') {
          handleNextExamQuestion();
          return;
        }
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
      if (baseOctave < 2) return;
      shiftLeftPressed.current = true;
      setShiftState('left');
      return;
    }
    if (e.code === 'ShiftRight') {
      if (baseOctave > 6) return;
      shiftRightPressed.current = true;
      setShiftState('right');
      return;
    }

    const note = codeToNoteMap[e.code];
    if (note) {
      e.preventDefault(); 
      let finalMidi = note.midi;
      if (shiftLeftPressed.current) finalMidi -= 24;
      if (shiftRightPressed.current) finalMidi += 24;
      playNote(finalMidi);
    }
  }, [codeToNoteMap, playNote, handleNextStep, handleNextExamQuestion, handleShowHint, currentLesson, baseOctave]);

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
    const octaveNum = keys[0]?.octave ?? -999;
    const isVisible = octaveNum >= 0 && octaveNum <= 8;
    
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
            let highlights: string[] = [];

            // LESSON HIGHLIGHT
            if (currentLesson) {
              const currentStep = currentLesson.steps[currentStepIndex];
              highlights = currentStep.highlight.map(h => normalizeNoteName(h));
            }
            
            // EXAM HINT HIGHLIGHT
            // Show highlights if hint is active OR skip is ready (since skip comes after hint active)
            if (isExamMode && (examHintState === 'hintActive' || examHintState === 'skipReady') && currentExam) {
              const q = currentExam.questions[currentExam.currentIndex];
              if (q.exampleSolution) {
                highlights = q.exampleSolution.map(h => normalizeNoteName(h));
              }
            }

            const isTarget = highlights.includes(noteName);
            
            // STRICT check (is this specific key pressed?)
            const isNoteActive = activeMidis.has(note.midi);
            
            // GLOBAL check (is this note name pressed anywhere?)
            const isGlobalActive = [...activeMidis].some(m => m % 12 === note.midi % 12);

            const isNextSemitoneActive = activeMidis.has(note.midi + 1);
  
            return (
              <PianoKey 
                key={note.midi}
                noteData={note}
                isActive={isNoteActive}
                isGlobalActive={isGlobalActive} // Pass global state
                isNextSemitoneActive={isNextSemitoneActive}
                isLessonTarget={isTarget}
                isBlindMode={isExamMode && !(examHintState === 'hintActive' || examHintState === 'skipReady')} // Blind unless hint active
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

  // Exam Visual Border feedback
  const borderClass = examFeedback === 'success' ? 'border-[3px] border-green-500' : (examFeedback === 'failure' ? 'border-[3px] border-red-500' : '');

  return (
    <div className={`h-screen w-screen bg-[#0a0a0a] flex flex-col items-center overflow-hidden box-border ${borderClass} transition-all duration-300`}>
      
      {/* Top Section - Use flex-1 to occupy space and center ControlPanel vertically */}
      <div className="flex-1 w-full flex flex-col justify-center items-center px-8 min-h-[40vh]">
        
        {/* Home Icon - Left */}
        <button
          onClick={handleHome}
          className={`absolute top-8 left-8 text-gray-600 hover:text-white transition-all duration-300 ${currentLesson || isExamMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          title={lang === 'ru' ? "На главную" : "Home"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </button>

        {/* Glossary Icon */}
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
          onExamStart={handleExamStart}
          onNextExamQuestion={handleNextExamQuestion}
          onShowHint={handleShowHint}
          isLoading={isLoading}
          setLoading={setIsLoading}
          currentLesson={currentLesson}
          currentStepIndex={currentStepIndex}
          currentStep={currentLesson ? currentLesson.steps[currentStepIndex] : null}
          isStepComplete={isStepComplete}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
          setCanSkipStep={setCanSkipStep}
          isExamMode={isExamMode}
          currentExam={currentExam}
          examFeedback={examFeedback}
          examHintState={examHintState}
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

        {/* Right: Labels Toggles - HIDDEN IN EXAM MODE */}
        {!isExamMode && (
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
        )}
      </div>

    </div>
  );
};

export default App;