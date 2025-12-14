import React, { useState, useEffect } from 'react';
import { Lesson, LessonStep, Language } from '../types';
import { generateLesson } from '../services/geminiService';

interface ControlPanelProps {
  onLessonStart: (lesson: Lesson) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  currentLesson: Lesson | null;
  currentStepIndex: number;
  currentStep: LessonStep | null;
  isStepComplete: boolean;
  onNextStep: () => void;
  setCanSkipStep: (canSkip: boolean) => void;
  lang: Language;
}

const TOPICS = [
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

// Helper to render text with opacity emphasis
const RenderText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span className="text-xl md:text-2xl leading-relaxed text-gray-400 font-light tracking-wide">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={i} className="text-white font-normal opacity-100 bg-white/5 px-1 rounded mx-0.5">
              {part.slice(2, -2)}
            </span>
          );
        }
        return <span key={i} className="opacity-60">{part}</span>;
      })}
    </span>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onLessonStart, 
  isLoading, 
  setLoading,
  currentLesson,
  currentStepIndex,
  currentStep,
  isStepComplete,
  onNextStep,
  setCanSkipStep,
  lang
}) => {
  const [prompt, setPrompt] = useState('');
  const [showSkipButton, setShowSkipButton] = useState(false);

  const t = {
    placeholder: lang === 'ru' ? "Чему научить?" : "What to learn?",
    generating: lang === 'ru' ? "ГЕНЕРИРУЮ..." : "GENERATING...",
    enter: "ENTER",
    next: lang === 'ru' ? "Далее" : "Next",
    played: lang === 'ru' ? "Я все сыграл" : "I did it",
    playNotes: lang === 'ru' ? "Сыграйте ноты" : "Play notes"
  };

  // Timer for "I did it" button
  useEffect(() => {
    setShowSkipButton(false);
    setCanSkipStep(false);

    if (currentStep && !isStepComplete) {
      const timer = setTimeout(() => {
        setShowSkipButton(true);
        setCanSkipStep(true);
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [currentStep, isStepComplete, setCanSkipStep, currentStepIndex]);

  const handleGenerate = async (topicPrompt?: string) => {
    const p = topicPrompt || prompt;
    if (!p.trim() || isLoading) return;
    
    setLoading(true);
    // If user clicked a topic, update the input visually
    if (topicPrompt) setPrompt(topicPrompt);
    
    const lesson = await generateLesson('beginner', p, lang);
    setLoading(false);
    if (lesson) {
      onLessonStart(lesson);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleGenerate();
    }
  };

  // If no lesson OR if loading (to keep the input visible), show Input
  if (!currentLesson || isLoading) {
    return (
      <div className="w-full max-w-4xl mb-12 animate-fade-in flex flex-col gap-10 items-center">
         
         {/* Input Field Area */}
         <div className="w-full max-w-2xl relative group flex flex-col justify-center items-center">
            <div className="relative w-full flex justify-center items-center">
                {/* Blinking Stick (Cursor simulation when not focused or empty) */}
                <div className={`absolute pointer-events-none flex items-center justify-center inset-0 text-5xl font-light text-white opacity-20 ${prompt ? 'hidden' : ''}`}>
                   <span className="opacity-0">{t.placeholder}</span>
                   <span className="ml-1 w-[2px] h-10 bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
                </div>

                <input 
                  type="text" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder={t.placeholder}
                  className={`w-full bg-transparent text-5xl text-center py-4 text-white placeholder-gray-800 focus:outline-none transition-colors font-light caret-cyan-400 ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                />
            </div>
            
            {/* Status / Enter Button Area - CENTERED BELOW INPUT and lowered */}
            <div className={`h-8 mt-4 flex items-center justify-center transition-opacity duration-300 ${prompt || isLoading ? 'opacity-100' : 'opacity-0'}`}>
               <button 
                onClick={() => handleGenerate()}
                disabled={isLoading}
                className={`text-sm uppercase tracking-widest text-gray-500 hover:text-white transition-colors ${isLoading ? 'animate-pulse cursor-wait' : ''}`}
               >
                 {isLoading ? t.generating : t.enter}
               </button>
            </div>
         </div>

         {/* Topics List (Curriculum) */}
         {!isLoading && (
            <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleGenerate(lang === 'ru' ? topic.ru : topic.en)}
                  className="px-5 py-2 bg-gray-900/40 rounded-full text-[10px] md:text-xs text-gray-500 uppercase tracking-wider hover:bg-gray-800 hover:text-gray-300 transition-all"
                >
                  {lang === 'ru' ? topic.ru : topic.en}
                </button>
              ))}
            </div>
         )}
      </div>
    );
  }

  // Active Lesson View
  if (currentStep) {
    return (
      <div className="w-full max-w-4xl mb-12 animate-slide-up flex flex-col items-center text-center gap-8">
        
        {/* Minimal Progress Line */}
        <div className="w-32 h-[1px] bg-gray-800 rounded-full overflow-hidden">
           <div 
             className="h-full bg-white transition-all duration-700 ease-out"
             style={{ width: `${((currentStepIndex + 1) / currentLesson.steps.length) * 100}%` }}
           ></div>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-600">
            {currentStep.title}
          </h2>
          
          <div className="max-w-2xl">
            <RenderText text={currentStep.explanation} />
          </div>

          <div className="mt-4 h-12 flex items-center justify-center">
            {isStepComplete ? (
              // Success State (Prioritized over timeout)
              <button 
                onClick={onNextStep}
                className="group flex flex-col items-center gap-1"
              >
                <span className="text-white border-b border-white pb-1 text-sm uppercase tracking-widest group-hover:opacity-70 transition-opacity">
                  {t.next}
                </span>
                <span className="text-[10px] text-gray-600">Enter ↵</span>
              </button>
            ) : showSkipButton ? (
               // "I did it" State (Timeout)
               <button 
                onClick={onNextStep}
                className="group flex flex-col items-center gap-1 animate-fade-in"
              >
                <span className="text-gray-300 border-b border-gray-600 pb-1 text-sm uppercase tracking-widest group-hover:text-white group-hover:border-white transition-all">
                  {t.played}
                </span>
                <span className="text-[10px] text-gray-600">Enter ↵</span>
              </button>
            ) : (
              // Waiting State
              <span className="text-xs text-gray-700 uppercase tracking-widest animate-pulse">
                {t.playNotes}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};