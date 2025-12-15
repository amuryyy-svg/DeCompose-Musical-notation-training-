import React, { useState, useEffect } from 'react';
import { Lesson, LessonStep, Language, ExamSession, LocalizedContent, HistoryNote } from '../types';
import { generateLesson, generateExam } from '../services/geminiService';
import { GLOSSARY_DATA, TOPICS, getLocalizedText } from '../constants';
import { InputHistory } from './InputHistory';

interface ControlPanelProps {
  onLessonStart: (lesson: Lesson) => void;
  onExamStart: (exam: ExamSession) => void;
  onNextExamQuestion: () => void;
  onShowHint: () => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  currentLesson: Lesson | null;
  currentStepIndex: number;
  currentStep: LessonStep | null;
  isStepComplete: boolean;
  onNextStep: () => void;
  onPrevStep: () => void;
  setCanSkipStep: (canSkip: boolean) => void;
  
  // Exam props
  isExamMode: boolean;
  currentExam: ExamSession | null;
  examFeedback: 'none' | 'success' | 'failure';
  examHintState: 'idle' | 'hintReady' | 'hintActive' | 'skipReady';

  lang: Language;
  showGlossary: boolean;
  setShowGlossary: (show: boolean) => void;
  
  // New Prop
  inputHistory?: HistoryNote[];
}

// Helper to render text with opacity emphasis
const RenderText: React.FC<{ text: LocalizedContent | string, lang: Language }> = ({ text, lang }) => {
  const str = getLocalizedText(text, lang);
  const parts = str.split(/(\*\*.*?\*\*)/g);
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
  onExamStart, 
  onNextExamQuestion,
  onShowHint,
  isLoading, 
  setLoading,
  currentLesson,
  currentStepIndex,
  currentStep,
  isStepComplete,
  onNextStep,
  onPrevStep,
  setCanSkipStep,
  isExamMode,
  currentExam,
  examFeedback,
  examHintState,
  lang,
  showGlossary,
  setShowGlossary,
  inputHistory = []
}) => {
  const [prompt, setPrompt] = useState('');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [showSkipButton, setShowSkipButton] = useState(false);
  
  // Exam selection state
  const [isExamSetup, setIsExamSetup] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  // Track what exactly is loading for better UI feedback
  const [loadingState, setLoadingState] = useState<'none' | 'lesson' | 'exam'>('none');

  const t = {
    placeholder: lang === 'ru' ? "Чему научить?" : "What to learn?",
    generatingLesson: lang === 'ru' ? "ГЕНЕРИРУЮ УРОК..." : "GENERATING LESSON...",
    generatingExam: lang === 'ru' ? "ГЕНЕРИРУЮ ТЕСТ..." : "GENERATING TEST...",
    enter: "ENTER",
    next: lang === 'ru' ? "Далее" : "Next",
    back: lang === 'ru' ? "Назад" : "Back",
    played: lang === 'ru' ? "Я все сыграл" : "I did it",
    playNotes: lang === 'ru' ? "Сыграйте ноты" : "Play notes",
    glossary: lang === 'ru' ? "СЛОВАРЬ" : "GLOSSARY",
    search: lang === 'ru' ? "Поиск..." : "Search...",
    startExam: lang === 'ru' ? "Проверить знания" : "Test Knowledge",
    selectTopics: lang === 'ru' ? "Выберите темы" : "Select topics",
    startTest: lang === 'ru' ? "Начать тест" : "Start Test",
    question: lang === 'ru' ? "Вопрос" : "Question",
    success: lang === 'ru' ? "ВЕРНО" : "CORRECT",
    listen: lang === 'ru' ? "Слушаю..." : "Listening...",
    hint: lang === 'ru' ? "Подсказка" : "Hint",
    skip: lang === 'ru' ? "Пропустить" : "Skip"
  };

  // Clear prompt when returning to menu
  useEffect(() => {
    if (!currentLesson && !isExamMode) {
      setPrompt('');
    }
  }, [currentLesson, isExamMode]);

  // Timer for "I did it" button (Lesson ONLY)
  useEffect(() => {
    setShowSkipButton(false);
    setCanSkipStep(false);

    // Only for Lesson mode now. Exam mode logic is handled by examHintState in App.tsx
    const isLessonActive = currentStep && !isStepComplete;

    if (isLessonActive) {
      const timer = setTimeout(() => {
        setShowSkipButton(true);
        setCanSkipStep(true);
      }, 30000); 

      return () => clearTimeout(timer);
    }
  }, [currentStep, isStepComplete, setCanSkipStep, currentStepIndex]);

  const handleGenerate = async (topicPrompt?: string) => {
    const p = topicPrompt || prompt;
    
    // Check if user is asking for exam via text
    if (p.toLowerCase().includes('экзамен') || p.toLowerCase().includes('test') || p.toLowerCase().includes('exam')) {
      setIsExamSetup(true);
      setPrompt('');
      return;
    }

    if (!p.trim() || isLoading) return;
    
    setLoading(true);
    setLoadingState('lesson');
    if (topicPrompt) setPrompt(topicPrompt);
    
    const lesson = await generateLesson('beginner', p, lang);
    setLoading(false);
    setLoadingState('none');
    if (lesson) {
      onLessonStart(lesson);
    }
  };

  const handleStartExamGeneration = async () => {
    if (selectedTopics.size === 0 || isLoading) return;
    setLoading(true);
    setLoadingState('exam');
    const topicsArray = Array.from(selectedTopics).map(id => {
      const topic = TOPICS.find(t => t.id === id);
      return lang === 'ru' ? topic?.ru || '' : topic?.en || '';
    });
    
    const exam = await generateExam(topicsArray, lang);
    setLoading(false);
    setLoadingState('none');
    if (exam) {
      onExamStart(exam);
      setIsExamSetup(false);
    }
  }

  const toggleTopic = (id: string) => {
    const newSet = new Set(selectedTopics);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTopics(newSet);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleGenerate();
    }
  };

  const getLoadingText = () => {
    if (loadingState === 'exam') return t.generatingExam;
    return t.generatingLesson;
  };

  // Shared Styles
  const buttonBaseClass = "px-5 py-2 rounded-full text-[10px] md:text-xs uppercase tracking-wider transition-all border";
  const buttonInactiveClass = "bg-gray-900/40 border-transparent text-gray-500 hover:bg-gray-800 hover:text-gray-300";
  const buttonSelectedClass = "bg-gray-800 border-gray-600 text-white shadow-[0_0_15px_rgba(0,0,0,0.3)]";

  // --- RENDERING ---

  // 1. Glossary Modal (Global)
  if (showGlossary) {
    const filteredGlossary = GLOSSARY_DATA[lang].filter(item => 
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) || 
      item.def.toLowerCase().includes(glossarySearch.toLowerCase())
    );

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowGlossary(false)}>
        <div className="bg-[#111] p-8 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
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

  // 2. Exam Setup Mode
  if (isExamSetup) {
    return (
      <div className="w-full max-w-4xl mb-12 animate-fade-in flex flex-col gap-8 items-center">
        {/* Header */}
        <div className="w-full max-w-2xl flex flex-col justify-center items-center relative">
             <h2 className="text-5xl font-light text-gray-400 text-center py-4 leading-tight">{t.selectTopics}</h2>
        </div>
        
        {/* Topics Cloud */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
          {TOPICS.map((topic) => {
            const isSelected = selectedTopics.has(topic.id);
            return (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                disabled={isLoading}
                className={`${buttonBaseClass} ${isSelected ? buttonSelectedClass : buttonInactiveClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {lang === 'ru' ? topic.ru : topic.en}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-8 mt-4 items-center h-5">
           {!isLoading && (
             <button 
               onClick={() => setIsExamSetup(false)}
               className="text-xs text-gray-600 hover:text-white uppercase tracking-widest border-b border-transparent hover:border-gray-600 transition-all pb-1"
             >
               {t.back}
             </button>
           )}
           
           <button 
             onClick={handleStartExamGeneration}
             disabled={selectedTopics.size === 0 || isLoading}
             className={`text-xs uppercase tracking-widest border-b border-transparent transition-all pb-1 ${selectedTopics.size > 0 && !isLoading ? 'text-white hover:border-white font-bold' : (isLoading ? 'text-gray-500 animate-pulse' : 'text-gray-800 cursor-not-allowed')}`}
           >
             {isLoading ? t.generatingExam : t.startTest}
           </button>
        </div>
      </div>
    );
  }

  // 3. Active Exam Mode
  if (isExamMode && currentExam) {
     const question = currentExam.questions[currentExam.currentIndex];
     const progress = ((currentExam.currentIndex) / currentExam.questions.length) * 100;
     const isSuccess = examFeedback === 'success';

     return (
       <div className="w-full max-w-4xl mb-12 animate-slide-up flex flex-col items-center text-center gap-8 relative">
          {/* Exam Progress - Identical to Lesson */}
          <div className="w-32 h-[1px] bg-gray-800 rounded-full overflow-hidden">
             <div className="h-full bg-white transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-600">
               {t.question} {currentExam.currentIndex + 1} / {currentExam.questions.length}
            </h2>
            
            <div className="max-w-2xl">
              <span className="text-2xl md:text-3xl text-gray-200 font-light leading-relaxed">
                 {getLocalizedText(question.question, lang)}
              </span>
            </div>
            
            {/* Input History */}
            <InputHistory history={inputHistory} />
            
            <div className="mt-4 h-12 flex items-center justify-center">
               {isSuccess ? (
                 <button onClick={onNextExamQuestion} className="group flex flex-col items-center gap-1 animate-fade-in">
                   <span className="text-white border-b border-white pb-1 text-sm uppercase tracking-widest group-hover:opacity-70 transition-opacity">
                     {t.next}
                   </span>
                   <span className="text-[10px] text-gray-600">Enter ↵</span>
                 </button>
               ) : (
                  <>
                    {examHintState === 'skipReady' ? (
                       <button onClick={onNextExamQuestion} className="group flex flex-col items-center gap-1 animate-fade-in">
                          <span className="text-gray-300 border-b border-gray-600 pb-1 text-sm uppercase tracking-widest group-hover:text-white group-hover:border-white transition-all">{t.skip}</span>
                          <span className="text-[10px] text-gray-600">Enter ↵</span>
                       </button>
                    ) : examHintState === 'hintReady' ? (
                       <button onClick={onShowHint} className="group flex flex-col items-center gap-1 animate-fade-in">
                          <span className="text-gray-300 border-b border-gray-500 pb-1 text-sm uppercase tracking-widest hover:text-white hover:border-white transition-all">{t.hint}</span>
                          <span className="text-[10px] text-gray-600">Enter ↵</span>
                       </button>
                    ) : (
                      <span className="text-xs text-gray-700 uppercase tracking-widest animate-pulse">
                         {t.listen}
                      </span>
                    )}
                  </>
               )}
            </div>
          </div>
       </div>
     )
  }

  // 4. Default: Lesson Input Mode (If no lesson active)
  if (!currentLesson || isLoading) {
    return (
      <div className="w-full max-w-4xl mb-12 animate-fade-in flex flex-col gap-8 items-center">
         <div className="w-full max-w-2xl relative flex justify-center items-center">
             {/* Input Area: Centered, width limited */}
             <input 
               type="text" 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               onKeyDown={handleKeyDown}
               disabled={isLoading}
               placeholder={t.placeholder}
               className={`w-full bg-transparent text-5xl text-center py-4 text-white placeholder-gray-800 focus:outline-none transition-colors font-light caret-white leading-tight ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
             />
             
             {/* Enter/Loading Button: Absolute to the right */}
             <div className={`absolute -right-24 top-1/2 -translate-y-1/2 flex justify-start items-center transition-opacity duration-300 ${prompt && !isLoading ? 'opacity-100' : 'opacity-0'}`}>
                <button onClick={() => handleGenerate()} disabled={isLoading} className={`text-sm uppercase tracking-widest text-gray-500 hover:text-white transition-colors`}>
                  {t.enter}
                </button>
             </div>
         </div>

         {/* Topics Cloud */}
         <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
           {TOPICS.slice(0, 15).map((topic) => (
             <button
               key={topic.id}
               onClick={() => handleGenerate(lang === 'ru' ? topic.ru : topic.en)}
               disabled={isLoading}
               className={`${buttonBaseClass} ${buttonInactiveClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               {lang === 'ru' ? topic.ru : topic.en}
             </button>
           ))}
         </div>

         {/* Exam Button */}
         <div className="mt-4 h-5 flex items-center">
            <button 
              onClick={() => setIsExamSetup(true)}
              disabled={isLoading}
              className={`text-xs text-gray-600 hover:text-white uppercase tracking-widest border-b border-transparent hover:border-gray-600 transition-all pb-1 ${isLoading ? 'text-gray-500 animate-pulse border-none' : ''}`}
            >
                {isLoading ? getLoadingText() : t.startExam}
            </button>
         </div>
      </div>
    );
  }

  // 5. Active Lesson View
  if (currentStep) {
    return (
      <div className="w-full max-w-4xl mb-12 animate-slide-up flex flex-col items-center text-center gap-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-8 hidden xl:block">
           {currentStepIndex > 0 && (
             <button onClick={onPrevStep} className="text-gray-600 hover:text-white transition-colors p-2">
               ←
             </button>
           )}
        </div>
        <div className="w-32 h-[1px] bg-gray-800 rounded-full overflow-hidden">
           <div className="h-full bg-white transition-all duration-700 ease-out" style={{ width: `${((currentStepIndex + 1) / currentLesson.steps.length) * 100}%` }}></div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-4">
             {currentStepIndex > 0 && <button onClick={onPrevStep} className="xl:hidden text-gray-600 hover:text-white">←</button>}
             <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-600">{getLocalizedText(currentStep.title, lang)}</h2>
          </div>
          <div className="max-w-2xl"><RenderText text={currentStep.explanation} lang={lang} /></div>
          
          {/* Input History for Lesson (optional, but good for consistency) */}
          <InputHistory history={inputHistory} />

          <div className="mt-4 h-12 flex items-center justify-center">
            {isStepComplete ? (
              <button onClick={onNextStep} className="group flex flex-col items-center gap-1">
                <span className="text-white border-b border-white pb-1 text-sm uppercase tracking-widest group-hover:opacity-70 transition-opacity">{t.next}</span>
                <span className="text-[10px] text-gray-600">Enter ↵</span>
              </button>
            ) : showSkipButton ? (
               <button onClick={onNextStep} className="group flex flex-col items-center gap-1 animate-fade-in">
                <span className="text-gray-300 border-b border-gray-600 pb-1 text-sm uppercase tracking-widest group-hover:text-white group-hover:border-white transition-all">{t.played}</span>
                <span className="text-[10px] text-gray-600">Enter ↵</span>
              </button>
            ) : (
              <span className="text-xs text-gray-700 uppercase tracking-widest animate-pulse">{t.playNotes}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};