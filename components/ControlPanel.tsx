import React, { useState, useEffect } from 'react';
import { Lesson, LessonStep, Language } from '../types';
import { generateLesson } from '../services/geminiService';
import { GLOSSARY_DATA, TOPICS } from '../constants';

interface ControlPanelProps {
  onLessonStart: (lesson: Lesson) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  currentLesson: Lesson | null;
  currentStepIndex: number;
  currentStep: LessonStep | null;
  isStepComplete: boolean;
  onNextStep: () => void;
  onPrevStep: () => void;
  setCanSkipStep: (canSkip: boolean) => void;
  lang: Language;
  showGlossary: boolean;
  setShowGlossary: (show: boolean) => void;
}

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
  onPrevStep,
  setCanSkipStep,
  lang,
  showGlossary,
  setShowGlossary
}) => {
  const [prompt, setPrompt] = useState('');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [showSkipButton, setShowSkipButton] = useState(false);

  const t = {
    placeholder: lang === 'ru' ? "Чему научить?" : "What to learn?",
    generating: lang === 'ru' ? "ГЕНЕРИРУЮ..." : "GENERATING...",
    enter: "ENTER",
    next: lang === 'ru' ? "Далее" : "Next",
    back: lang === 'ru' ? "Назад" : "Back",
    played: lang === 'ru' ? "Я все сыграл" : "I did it",
    playNotes: lang === 'ru' ? "Сыграйте ноты" : "Play notes",
    glossary: lang === 'ru' ? "СЛОВАРЬ" : "GLOSSARY",
    search: lang === 'ru' ? "Поиск..." : "Search..."
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

  // GLOSSARY MODAL
  if (showGlossary) {
    const filteredGlossary = GLOSSARY_DATA[lang].filter(item => 
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) || 
      item.def.toLowerCase().includes(glossarySearch.toLowerCase())
    );

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowGlossary(false)}>
        {/* Modal Window */}
        <div className="bg-[#111] p-8 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          
          {/* Header with Title and Search */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-2 gap-4">
             <h2 className="text-xl font-bold tracking-widest text-white">{t.glossary}</h2>
             
             <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="relative w-full md:w-48">
                  <input 
                      type="text" 
                      value={glossarySearch}
                      onChange={(e) => setGlossarySearch(e.target.value)}
                      placeholder={t.search}
                      className="w-full bg-transparent border-none text-right text-white text-sm focus:outline-none placeholder-gray-700 transition-colors"
                      autoFocus
                  />
               </div>
               <button onClick={() => setShowGlossary(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
             </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto pr-2 custom-scrollbar space-y-6 flex-1">
            {filteredGlossary.length > 0 ? (
              filteredGlossary.map((item, idx) => (
                <div key={idx} className="group">
                  <h3 className="text-white font-bold text-sm uppercase mb-1 transition-colors">{item.term}</h3>
                  <p className="text-gray-400 font-light leading-relaxed text-sm">{item.def}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-center py-4 text-sm uppercase tracking-widest opacity-50">Nothing found</p>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                   {/* CHANGED: Removed bg-cyan-400 and shadow-cyan */}
                   <span className="ml-1 w-[2px] h-10 bg-white/50 animate-pulse"></span>
                </div>

                <input 
                  type="text" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder={t.placeholder}
                  // CHANGED: caret-cyan-400 to caret-white
                  className={`w-full bg-transparent text-5xl text-center py-4 text-white placeholder-gray-800 focus:outline-none transition-colors font-light caret-white ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
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
      <div className="w-full max-w-4xl mb-12 animate-slide-up flex flex-col items-center text-center gap-8 relative">
        
        {/* Navigation Wrapper */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-8 hidden xl:block">
           {currentStepIndex > 0 && (
             <button onClick={onPrevStep} className="text-gray-600 hover:text-white transition-colors p-2">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
             </button>
           )}
        </div>

        {/* Minimal Progress Line */}
        <div className="w-32 h-[1px] bg-gray-800 rounded-full overflow-hidden">
           <div 
             className="h-full bg-white transition-all duration-700 ease-out"
             style={{ width: `${((currentStepIndex + 1) / currentLesson.steps.length) * 100}%` }}
           ></div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-4">
             {/* Mobile Back Button */}
             {currentStepIndex > 0 && (
               <button onClick={onPrevStep} className="xl:hidden text-gray-600 hover:text-white">
                 ←
               </button>
             )}
             <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-600">
               {currentStep.title}
             </h2>
          </div>
          
          <div className="max-w-2xl">
            <RenderText text={currentStep.explanation} />
          </div>

          <div className="mt-4 h-12 flex items-center justify-center">
            {isStepComplete ? (
              // Success State
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
               // "I did it" State
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