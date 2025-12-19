
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { audioService } from './services/audioService';
import { generatePianoKeys, normalizeNoteName, getFreq, getOctaveRangeLabel } from './constants';
import { NoteDefinition, Lesson, Language, ExamSession, HistoryNote, QuizSession } from './types';
import { PianoKey } from './components/PianoKey';
import { ControlPanel } from './components/ControlPanel';
import { TheoryQuiz } from './components/TheoryQuiz';
import { checkConnection } from './services/geminiService';

// Helper to check if played notes fit the pattern (Subset check)
const isPatternMatch = (playedMidis: number[], pattern: number[], strictLength: boolean = false) => {
    if (playedMidis.length === 0) return false;
    const patternSet = new Set(pattern);

    // Try every played note as the potential root
    for (const root of playedMidis) {
        const intervals = playedMidis.map(m => m - root);
        
        // 1. Check if all intervals exist in pattern (Subset check)
        const isSubset = intervals.every(i => patternSet.has(i));
        
        if (!isSubset) continue; // Try next root

        // 2. If strict length check (Final validation), lengths must match
        if (strictLength) {
             if (intervals.length === pattern.length) return true;
        } else {
             // For "So Far" check, just being a subset is enough
             return true;
        }
    }
    return false;
};

const App: React.FC = () => {
  const [baseOctave, setBaseOctave] = useState(4);
  const [activeMidis, setActiveMidis] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<Language>('ru');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  // Display settings
  const [showKeyLabels, setShowKeyLabels] = useState(true);
  const [showNoteLabels, setShowNoteLabels] = useState(true);
  const [accidentalMode, setAccidentalMode] = useState<'sharp' | 'flat'>('sharp');
  const [showGlossary, setShowGlossary] = useState(false);
  
  // Shift State for Visualization
  const [shiftState, setShiftState] = useState<'none' | 'left' | 'right'>('none');

  // Input History
  const [inputHistory, setInputHistory] = useState<HistoryNote[]>([]);

  // Lesson State
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isStepComplete, setIsStepComplete] = useState(false);
  const [canSkipStep, setCanSkipStep] = useState(false);
  
  // New State: Track max progress to allow moving back without re-doing
  const [maxCompletedStepIndex, setMaxCompletedStepIndex] = useState(-1);
  
  // Lesson Logic: Sequence Matching
  const [playedSequence, setPlayedSequence] = useState<string[]>([]);

  // Exam State
  const [isExamMode, setIsExamMode] = useState(false);
  const [currentExam, setCurrentExam] = useState<ExamSession | null>(null);
  const [examFeedback, setExamFeedback] = useState<'none' | 'success' | 'failure'>('none');
  
  // Exam Hint System
  const [examHintState, setExamHintState] = useState<'idle' | 'hintReady' | 'hintActive' | 'skipReady'>('idle');

  // Quiz State (Separate mode, kept for compatibility if needed, but mixed mode uses Exam logic)
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizSession | null>(null);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<'none' | 'correct' | 'wrong'>('none');

  // Generate keys
  const leftOctaveNum = baseOctave - 2;
  const rightOctaveNum = baseOctave + 2;

  const leftKeys = useMemo(() => generatePianoKeys(leftOctaveNum), [leftOctaveNum]);
  const centerKeys = useMemo(() => generatePianoKeys(baseOctave), [baseOctave]);
  const rightKeys = useMemo(() => generatePianoKeys(rightOctaveNum), [rightOctaveNum]);

  // Map physical keys
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
  // Refs for async access
  const currentStepRef = useRef(currentLesson?.steps[currentStepIndex]);
  const isStepCompleteRef = useRef(isStepComplete);
  const canSkipStepRef = useRef(canSkipStep);
  const isExamModeRef = useRef(isExamMode);
  const currentExamRef = useRef(currentExam);
  const examFeedbackRef = useRef(examFeedback);
  const examHintStateRef = useRef(examHintState);
  // Quiz refs
  const isQuizModeRef = useRef(isQuizMode);
  const currentQuizRef = useRef(currentQuiz);
  const quizFeedbackRef = useRef(quizFeedback);
  
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
    // Quiz updates
    isQuizModeRef.current = isQuizMode;
    currentQuizRef.current = currentQuiz;
    quizFeedbackRef.current = quizFeedback;
  }, [currentLesson, currentStepIndex, isStepComplete, canSkipStep, isExamMode, currentExam, examFeedback, examHintState, isQuizMode, currentQuiz, quizFeedback]);

  // Check Connection on Mount
  useEffect(() => {
    const initCheck = async () => {
        const isConnected = await checkConnection();
        setApiStatus(isConnected ? 'connected' : 'disconnected');
    };
    initCheck();
  }, []);

  // --- Handlers ---

  const handleHome = () => {
    // Reset Everything
    setCurrentLesson(null);
    setCurrentStepIndex(0);
    setMaxCompletedStepIndex(-1); // Reset max progress

    setIsExamMode(false);
    setCurrentExam(null);
    setExamFeedback('none');
    setExamHintState('idle');
    setIsQuizMode(false);
    setCurrentQuiz(null);
    setQuizSelection(null);
    setQuizFeedback('none');
    
    setPlayedSequence([]);
    setCanSkipStep(false);
    setActiveMidis(new Set());
    setInputHistory([]);
    setIsLoading(false);
  };

  const handleLessonStart = (lesson: Lesson) => {
    handleHome();
    setCurrentLesson(lesson);
  };

  const handleExamStart = (exam: ExamSession) => {
    handleHome();
    setIsExamMode(true);
    setCurrentExam(exam);
  };

  const handleQuizStart = (quiz: QuizSession) => {
    handleHome();
    setIsQuizMode(true);
    setCurrentQuiz(quiz);
  };

  const handleNextStep = useCallback(() => {
    if (!currentLesson) return;

    // Update Max Progress if we are moving forward from the furthest point
    if (currentStepIndex > maxCompletedStepIndex) {
        setMaxCompletedStepIndex(currentStepIndex);
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < currentLesson.steps.length) {
      setCurrentStepIndex(nextIndex);
      
      const alreadyDone = nextIndex <= maxCompletedStepIndex;
      
      setIsStepComplete(alreadyDone); 
      setCanSkipStep(alreadyDone);
      
      setPlayedSequence([]);
      setInputHistory([]);
    } else {
      handleHome();
    }
  }, [currentLesson, currentStepIndex, maxCompletedStepIndex]);

  const handlePrevStep = useCallback(() => {
    if (!currentLesson) return;
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStepIndex(prevIndex);
      
      const alreadyDone = prevIndex <= maxCompletedStepIndex;
      
      setIsStepComplete(alreadyDone); 
      setCanSkipStep(alreadyDone);
      
      setPlayedSequence([]);
      setInputHistory([]);
    }
  }, [currentLesson, currentStepIndex, maxCompletedStepIndex]);

  const handleNextExamQuestion = useCallback(() => {
    if (!currentExam) return;
    setExamFeedback('none');
    setExamHintState('idle');
    // Reset Quiz state for mixed mode
    setQuizSelection(null);
    setQuizFeedback('none');
    
    setCanSkipStep(false);
    setActiveMidis(new Set());
    setInputHistory([]);

    const nextIndex = currentExam.currentIndex + 1;
    if (nextIndex < currentExam.questions.length) {
      setCurrentExam({ ...currentExam, currentIndex: nextIndex });
    } else {
      handleHome();
    }
  }, [currentExam]);

  const handleNextQuizQuestion = useCallback(() => {
    if (!currentQuizRef.current) return;
    setQuizFeedback('none');
    setQuizSelection(null);

    const nextIndex = currentQuizRef.current.currentIndex + 1;
    if (nextIndex < currentQuizRef.current.questions.length) {
        setCurrentQuiz(prev => prev ? ({ ...prev, currentIndex: nextIndex }) : null);
    } else {
        handleHome();
    }
  }, []);

  const handleShowHint = useCallback(() => {
    setExamHintState('hintActive');
  }, []);

  // Dedicated Quiz Mode Input Logic (Separate from Exam Mixed Quiz)
  const handleQuizAnswer = useCallback((index: number) => {
    if (!currentQuizRef.current || quizFeedbackRef.current !== 'none') return;
    setQuizSelection(index);
    const q = currentQuizRef.current.questions[currentQuizRef.current.currentIndex];
    const isCorrect = index === q.correctIndex;
    setQuizFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => { handleNextQuizQuestion(); }, 1500);
  }, [handleNextQuizQuestion]);

  // Mixed Exam Quiz Input Logic
  const handleExamMixedQuizAnswer = useCallback((index: number) => {
    const exam = currentExamRef.current;
    if (!exam || examFeedbackRef.current !== 'none') return;
    
    setQuizSelection(index);
    const q = exam.questions[exam.currentIndex];
    if (q.type !== 'quiz' || q.correctIndex === undefined) return;
    
    const isCorrect = index === q.correctIndex;
    
    // We repurpose quizFeedback/Selection for visual rendering
    setQuizFeedback(isCorrect ? 'correct' : 'wrong');
    setExamFeedback(isCorrect ? 'success' : 'failure');

    if (isCorrect) {
       setTimeout(() => {
          handleNextExamQuestion();
       }, 1500);
    } else {
        setTimeout(() => {
             handleNextExamQuestion();
        }, 1500);
    }

  }, [handleNextExamQuestion]);


  // Exam Hint Timer Logic
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    // Only run hint timer if it's NOT a quiz-type question
    if (isExamMode && currentExam) {
       const q = currentExam.questions[currentExam.currentIndex];
       if (q.type !== 'quiz' && examFeedback !== 'success') {
          if (examHintState === 'idle') {
            timer = setTimeout(() => setExamHintState('hintReady'), 15000);
          } else if (examHintState === 'hintActive') {
            timer = setTimeout(() => setExamHintState('skipReady'), 15000);
          }
       }
    }
    return () => clearTimeout(timer);
  }, [isExamMode, currentExam?.currentIndex, examFeedback, examHintState]);

  // Lesson Success Logic
  useEffect(() => {
    if (isStepComplete && currentLesson && currentStepRef.current) {
      const step = currentStepRef.current;
      const targetCount = step.targets.length;
      setInputHistory(prev => {
        const startIndex = Math.max(0, prev.length - targetCount);
        return prev.map((n, i) => i >= startIndex ? { ...n, status: 'success' as const } : { ...n, isFading: true });
      });
      const timer = setTimeout(() => setInputHistory(prev => prev.filter(n => !n.isFading)), 600);
      return () => clearTimeout(timer);
    }
  }, [isStepComplete, currentLesson]);


  // Exam Validation
  const validateExamInput = useCallback((activeNotes: Set<number>) => {
    const exam = currentExamRef.current;
    if (!exam || examFeedbackRef.current === 'success') return; 
    
    const question = exam.questions[exam.currentIndex];
    if (question.type === 'quiz') return; // Handled separately

    const playedMidis: number[] = Array.from(activeNotes);
    if (playedMidis.length === 0 || playedMidis.length < question.pattern.length) return;

    if (isPatternMatch(playedMidis, question.pattern, true)) {
      setExamFeedback('success');
      const activeMidiSet = new Set(playedMidis);
      setInputHistory(prev => {
         const newState = prev.map(n => {
            if (activeMidiSet.has(n.midi) && !n.isReleased) return { ...n, status: 'success' as const };
            return { ...n, isFading: true };
         });
         return newState;
      });
      setTimeout(() => setInputHistory(prev => prev.filter(n => !n.isFading)), 600);
    }
  }, []);

  const playNote = useCallback((midi: number) => {
    if (activeMidisRef.current.has(midi)) return; 

    // Updated: Passing strictly MIDI to the new Audio Service signature
    audioService.playNote(midi);
    
    const newActiveMidis = new Set<number>(activeMidisRef.current);
    newActiveMidis.add(midi);
    setActiveMidis(newActiveMidis);

    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const canonicalNote = NOTES[midi % 12];
    const canonicalOctave = Math.floor(midi / 12) - 1;
    let noteName = `${canonicalNote}${canonicalOctave}`;
    
    let initialStatus: 'neutral' | 'success' = 'neutral';
    let isExamMistake = false;

    if (currentLesson && currentStepRef.current) {
        const targets = currentStepRef.current.targets.map(t => normalizeNoteName(t));
        // Normalize current note for comparison
        const inputNorm = normalizeNoteName(noteName);

        // Smart Display: If the played note matches a target, display the target's specific spelling (e.g. Eb4)
        if (targets.includes(inputNorm)) {
            initialStatus = 'success';
            // Find the exact string in targets that matches
            // We need to re-find it because we normalized everything
            const step = currentStepRef.current;
            for (const t of step.targets) {
                if (normalizeNoteName(t) === inputNorm) {
                    noteName = t; // Override display name with the Lesson Target name
                    break;
                }
            }
        }
    }
    
    if (isExamModeRef.current && currentExamRef.current) {
         const exam = currentExamRef.current;
         const question = exam.questions[exam.currentIndex];
         // Only validate piano notes if it's NOT a quiz question
         if (question.type !== 'quiz') {
            const playedMidis: number[] = Array.from(newActiveMidis);
            const isSubPattern = isPatternMatch(playedMidis, question.pattern, false);
            if (isSubPattern) initialStatus = 'success';
            else isExamMistake = true;
         }
    }
    
    const newHistoryNote: HistoryNote = { 
      id: Date.now() + '-' + midi + '-' + Math.random(), 
      midi: midi,
      name: noteName, 
      status: initialStatus, 
      isFading: false,
      isReleased: false
    };
    
    setInputHistory(prev => [...prev, newHistoryNote].slice(-10));
    
    if (isExamMistake) {
        setTimeout(() => {
           setInputHistory(prev => prev.map(n => ({ ...n, isFading: true })));
           setTimeout(() => setInputHistory([]), 500);
        }, 500);
    }

    if (isExamModeRef.current) {
      validateExamInput(newActiveMidis);
      return;
    }

    // --- NEW LESSON SEQUENCE LOGIC (Progressive Cursor) ---
    const step = currentStepRef.current;
    if (step && !isStepCompleteRef.current) {
      setPlayedSequence(prev => {
        const currentProgress = prev.length;
        if (currentProgress >= step.targets.length) return prev; // Already full

        const target = step.targets[currentProgress];
        
        // Normalize both input and target (e.g. handle C# vs Db)
        const inputNorm = normalizeNoteName(noteName);
        const targetNorm = normalizeNoteName(target);

        if (inputNorm === targetNorm) {
            // Correct note for current position!
            const newSeq = [...prev, noteName];
            if (newSeq.length === step.targets.length) {
                setIsStepComplete(true);
            }
            return newSeq;
        }

        // If wrong note:
        // Check if it matches the START of the sequence. If so, restart the sequence.
        // This allows the user to self-correct if they messed up halfway through.
        const firstTargetNorm = normalizeNoteName(step.targets[0]);
        if (inputNorm === firstTargetNorm) {
             return [noteName];
        }

        // Otherwise, ignore the mistake. Do not reset. Allow "hunting and pecking".
        return prev;
      });
    }
  }, [validateExamInput, currentLesson]);

  const stopNote = useCallback((midi: number) => {
    audioService.stopNote(midi);
    setActiveMidis(prev => {
      const newSet = new Set(prev);
      newSet.delete(midi);
      if (isExamModeRef.current && newSet.size > 0) validateExamInput(newSet);
      return newSet;
    });

    setInputHistory(prev => {
        const index = [...prev].reverse().findIndex(n => n.midi === midi && !n.isReleased);
        if (index === -1) return prev;
        const realIndex = prev.length - 1 - index;
        const note = prev[realIndex];

        setTimeout(() => {
            setInputHistory(curr => curr.map(n => n.id === note.id ? { ...n, isFading: true } : n));
            setTimeout(() => setInputHistory(curr => curr.filter(n => n.id !== note.id)), 500);
        }, 4000);

        const newHistory = [...prev];
        newHistory[realIndex] = { ...note, isReleased: true };
        return newHistory;
    });

  }, [validateExamInput]);

  // --- Keyboard Logic ---

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; 
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    // QUIZ SHORTCUTS (Dedicated Mode)
    if (isQuizModeRef.current) {
        if (e.code === 'KeyZ') handleQuizAnswer(0);
        if (e.code === 'KeyX') handleQuizAnswer(1);
        if (e.code === 'KeyC') handleQuizAnswer(2);
        if (e.code === 'KeyV') handleQuizAnswer(3);
        return; 
    }
    
    // MIXED EXAM SHORTCUTS (When current exam question is 'quiz' type)
    if (isExamModeRef.current && currentExamRef.current) {
        const q = currentExamRef.current.questions[currentExamRef.current.currentIndex];
        if (q.type === 'quiz') {
            if (e.code === 'KeyZ') handleExamMixedQuizAnswer(0);
            if (e.code === 'KeyX') handleExamMixedQuizAnswer(1);
            if (e.code === 'KeyC') handleExamMixedQuizAnswer(2);
            if (e.code === 'KeyV') handleExamMixedQuizAnswer(3);
            return; // Don't trigger piano notes
        }
    }

    if (e.code === 'Enter') {
      if (currentLesson && (isStepCompleteRef.current || canSkipStepRef.current)) {
        handleNextStep();
        return;
      }
      if (isExamModeRef.current) {
        if (examFeedbackRef.current === 'success' || examHintStateRef.current === 'skipReady') {
          handleNextExamQuestion();
          return;
        }
        // Only allow hint if it's NOT a quiz
        const q = currentExamRef.current?.questions[currentExamRef.current.currentIndex];
        if (q?.type !== 'quiz' && examHintStateRef.current === 'hintReady') {
           handleShowHint();
           return;
        }
      }
    }
    
    if (e.code === 'ArrowLeft') { setBaseOctave(prev => Math.max(1, prev - 1)); return; }
    if (e.code === 'ArrowRight') { setBaseOctave(prev => Math.min(7, prev + 1)); return; }

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
  }, [codeToNoteMap, playNote, handleNextStep, handleNextExamQuestion, handleShowHint, currentLesson, baseOctave, handleQuizAnswer, handleExamMixedQuizAnswer]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Ignore key up in quiz modes
    if (isQuizModeRef.current) return;
    if (isExamModeRef.current && currentExamRef.current?.questions[currentExamRef.current.currentIndex].type === 'quiz') return;

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

  const toggleLang = () => setLang(prev => prev === 'ru' ? 'en' : 'ru');

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
            let isBlindTest = false;

            if (currentLesson) {
              const step = currentLesson.steps[currentStepIndex];
              highlights = step.highlight.map(h => normalizeNoteName(h));
              // Detect Blind Test: Targets exist but highlights are empty
              isBlindTest = step.targets.length > 0 && step.highlight.length === 0;
            }
            if (isExamMode && (examHintState === 'hintActive' || examHintState === 'skipReady') && currentExam) {
              const q = currentExam.questions[currentExam.currentIndex];
              if (q.exampleSolution) highlights = q.exampleSolution.map(h => normalizeNoteName(h));
            }
            const isTarget = highlights.includes(noteName);
            const isNoteActive = activeMidis.has(note.midi);
            const isGlobalActive = [...activeMidis].some(m => m % 12 === note.midi % 12);
            const isNextSemitoneActive = activeMidis.has(note.midi + 1);
  
            // Combine Exam blind mode with Lesson Blind Test mode
            const effectiveBlindMode = (isExamMode && !(examHintState === 'hintActive' || examHintState === 'skipReady')) || isBlindTest;

            return (
              <PianoKey 
                key={note.midi}
                noteData={note}
                isActive={isNoteActive}
                isGlobalActive={isGlobalActive}
                isNextSemitoneActive={isNextSemitoneActive}
                isLessonTarget={isTarget}
                isBlindMode={effectiveBlindMode}
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

  const t = { octaves: lang === 'ru' ? 'Октавы' : 'Octaves', nav: lang === 'ru' ? 'Навигация' : 'Nav', next: lang === 'ru' ? 'Далее' : 'Next' };
  const borderClass = examFeedback === 'success' ? 'border-[3px] border-green-500' : (examFeedback === 'failure' ? 'border-[3px] border-red-500' : '');

  // Helper to determine if we are in a mixed exam question of type 'quiz'
  const isMixedQuizQuestion = isExamMode && currentExam && currentExam.questions[currentExam.currentIndex].type === 'quiz';
  // If we are in mixed quiz question, we hijack the rendering to show TheoryQuiz instead of piano
  // BUT we keep the top ControlPanel layout

  return (
    <div className={`h-screen w-screen bg-[#0a0a0a] flex flex-col items-center overflow-hidden box-border ${borderClass} transition-all duration-300`}>
      <div className="flex-1 w-full flex flex-col justify-center items-center px-8 min-h-[40vh]">
        <button onClick={handleHome} className={`absolute top-8 left-8 text-gray-600 hover:text-white transition-all duration-300 ${currentLesson || isExamMode || isQuizMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </button>
        <button onClick={() => setShowGlossary(true)} className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
        </button>

        <ControlPanel 
          onLessonStart={handleLessonStart}
          onExamStart={handleExamStart}
          onQuizStart={handleQuizStart}
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
          isQuizMode={isQuizMode}
          currentQuiz={currentQuiz}
          lang={lang}
          showGlossary={showGlossary}
          setShowGlossary={setShowGlossary}
          inputHistory={inputHistory}
        />
      </div>

      <div className="w-full flex-grow-0 flex items-end justify-center pb-8 px-4 overflow-visible">
        {/* Render Quiz Interface if in Dedicated Quiz Mode OR Mixed Exam Mode */}
        {(isQuizMode && currentQuiz) || isMixedQuizQuestion ? (
             <TheoryQuiz 
                question={isMixedQuizQuestion 
                  ? { 
                      id: currentExam!.questions[currentExam!.currentIndex].id,
                      question: currentExam!.questions[currentExam!.currentIndex].question,
                      options: currentExam!.questions[currentExam!.currentIndex].options!,
                      correctIndex: currentExam!.questions[currentExam!.currentIndex].correctIndex!
                    }
                  : currentQuiz!.questions[currentQuiz!.currentIndex]
                }
                selectedOption={quizSelection}
                feedback={quizFeedback}
                onSelectOption={isMixedQuizQuestion ? handleExamMixedQuizAnswer : handleQuizAnswer}
                lang={lang}
             />
        ) : (
             <div className="flex justify-center origin-bottom transform scale-75 md:scale-90 lg:scale-100 xl:scale-110 transition-transform duration-500">
                {renderOctave(leftKeys, shiftState === 'left' ? 1 : 0.3, getOctaveRangeLabel(baseOctave - 2, lang))}
                {renderOctave(centerKeys, shiftState === 'none' ? 1 : 0.3, getOctaveRangeLabel(baseOctave, lang))}
                {renderOctave(rightKeys, shiftState === 'right' ? 1 : 0.3, getOctaveRangeLabel(baseOctave + 2, lang))}
             </div>
        )}
      </div>

      <div className="w-full py-4 border-t border-gray-900 bg-[#050505] relative flex justify-center items-center">
        <div className="absolute left-8 flex gap-3">
           <button onClick={toggleLang} className="text-xs font-mono font-bold px-2 py-1 rounded text-gray-600 hover:text-white transition-colors uppercase border border-gray-800 hover:border-gray-600">{lang === 'ru' ? 'RU' : 'EN'}</button>
           <button onClick={() => setAccidentalMode(prev => prev === 'sharp' ? 'flat' : 'sharp')} className="text-lg leading-none font-mono font-bold px-2 py-1 rounded text-gray-600 hover:text-white transition-colors border border-gray-800 hover:border-gray-600 w-12">{accidentalMode === 'sharp' ? '♯' : '♭'}</button>
        </div>
        <div className="flex flex-col gap-1 items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-300">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono space-x-4">
             {isQuizMode || isMixedQuizQuestion ? (
                 <span>Z / X / C / V : Select</span>
             ) : (
                 <><span>Shift : {t.octaves}</span><span>← / → : {t.nav}</span><span>Enter : {t.next}</span></>
             )}
          </div>
        </div>
        {!isExamMode && !isQuizMode && !isMixedQuizQuestion && (
          <div className="absolute right-8 flex gap-2">
            <button onClick={() => setShowKeyLabels(!showKeyLabels)} className={`text-xs font-mono font-bold px-2 py-1 rounded transition-colors ${showKeyLabels ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-400'}`}>KEY</button>
            <button onClick={() => setShowNoteLabels(!showNoteLabels)} className={`text-xs font-mono font-bold px-2 py-1 rounded transition-colors ${showNoteLabels ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-400'}`}>NOTE</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
