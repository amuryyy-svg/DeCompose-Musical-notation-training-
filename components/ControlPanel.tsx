
import React, { useState, useEffect, useRef } from 'react';
import { Lesson, LessonStep, Language, ExamSession, LocalizedContent, HistoryNote, QuizSession } from '../types';
import { generateLesson, generateExam, generateQuiz } from '../services/geminiService';
import { GLOSSARY_DATA, TOPICS, getLocalizedText } from '../constants';
import { InputHistory } from './InputHistory';

interface ControlPanelProps {
  onLessonStart: (lesson: Lesson) => void;
  onExamStart: (exam: ExamSession) => void;
  onQuizStart: (quiz: QuizSession) => void;
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

  // Quiz props
  isQuizMode: boolean;
  currentQuiz: QuizSession | null;

  lang: Language;
  showGlossary: boolean;
  setShowGlossary: (show: boolean) => void;
  
  inputHistory?: HistoryNote[];
}

type TabType = 'theory' | 'notes' | 'check' | 'practice';

// Helper to render text with opacity emphasis
const RenderText: React.FC<{ text: LocalizedContent | string, lang: Language }> = ({ text, lang }) => {
  const str = getLocalizedText(text, lang);
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return (
    <span className="text-xl md:text-2xl leading-relaxed text-gray-400 font-light tracking-wide">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={i} className="inline-block text-white font-normal opacity-100 bg-white/10 px-1.5 py-0 rounded mx-1 shadow-[0_0_10px_rgba(255,255,255,0.05)] translate-y-[2px]">
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
  onQuizStart,
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
  isQuizMode,
  currentQuiz,
  lang,
  showGlossary,
  setShowGlossary,
  inputHistory = []
}) => {
  const [prompt, setPrompt] = useState('');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('theory');
  
  // Selection state for Exam/Check Mode
  const [selectedCheckTopics, setSelectedCheckTopics] = useState<Set<string>>(new Set());

  // Track what exactly is loading for better UI feedback
  const [loadingState, setLoadingState] = useState<'none' | 'lesson' | 'exam' | 'quiz'>('none');

  // Ref to track cancellation
  const isCancelledRef = useRef(false);

  const t = {
    placeholder: lang === 'ru' ? "Чему научить?" : "What to learn?",
    placeholderCheck: lang === 'ru' ? "Что проверить?" : "What to test?",
    generatingLesson: lang === 'ru' ? "ГЕНЕРИРУЮ УРОК..." : "GENERATING LESSON...",
    generatingExam: lang === 'ru' ? "СОЗДАЮ ВОПРОСЫ..." : "GENERATING QUESTIONS...",
    generatingQuiz: lang === 'ru' ? "СОЗДАЮ ТЕСТ..." : "GENERATING QUIZ...",
    enter: "ENTER",
    next: lang === 'ru' ? "Далее" : "Next",
    back: lang === 'ru' ? "Назад" : "Back",
    played: lang === 'ru' ? "Я все сыграл" : "I did it",
    playNotes: lang === 'ru' ? "Сыграйте ноты" : "Play notes",
    glossary: lang === 'ru' ? "СЛОВАРЬ" : "GLOSSARY",
    search: lang === 'ru' ? "Поиск..." : "Search...",
    startExam: lang === 'ru' ? "Практика" : "Practice",
    startQuiz: lang === 'ru' ? "Теория" : "Theory",
    selectTopics: lang === 'ru' ? "Выберите темы" : "Select topics",
    startTest: lang === 'ru' ? "Начать" : "Start",
    question: lang === 'ru' ? "Вопрос" : "Question",
    success: lang === 'ru' ? "ВЕРНО" : "CORRECT",
    listen: lang === 'ru' ? "Слушаю..." : "Listening...",
    hint: lang === 'ru' ? "Подсказка" : "Hint",
    skip: lang === 'ru' ? "Пропустить" : "Skip",
    quiz: lang === 'ru' ? "ВИКТОРИНА" : "QUIZ",
    
    // Tabs
    tabTheory: lang === 'ru' ? "Теория" : "Theory",
    tabNotes: lang === 'ru' ? "Ноты" : "Notes",
    tabCheck: lang === 'ru' ? "Проверка" : "Check",
    tabPractice: lang === 'ru' ? "Практика" : "Practice",
    
    // Placeholders
    notesTitle: lang === 'ru' ? "Раздел в разработке" : "Under Construction",
    notesSub: lang === 'ru' ? "Скоро здесь появится тренажер чтения нот с листа" : "Sight reading trainer coming soon",
    practiceTitle: lang === 'ru' ? "Свободная игра" : "Free Play",
    practiceSub: lang === 'ru' ? "Здесь будут разучиваться полноценные композиции" : "Full song learning mode coming soon",
    
    // Check mode
    startCheck: lang === 'ru' ? "Начать проверку" : "Start Check",
    startLearning: lang === 'ru' ? "Начать обучение" : "Start Learning",
    termsTopic: lang === 'ru' ? "Термины и Определения" : "Terms & Definitions"
  };

  // Clear prompt when returning to menu
  useEffect(() => {
    if (!currentLesson && !isExamMode && !isQuizMode) {
      setPrompt('');
    }
  }, [currentLesson, isExamMode, isQuizMode]);

  // Clear prompt and Check selections when switching tabs
  useEffect(() => {
    setPrompt('');
    if (activeTab !== 'check') {
        setSelectedCheckTopics(new Set());
    }
  }, [activeTab]);

  // Timer for "I did it" button (Lesson ONLY)
  useEffect(() => {
    setShowSkipButton(false);
    setCanSkipStep(false);

    const isLessonActive = currentStep && !isStepComplete;

    if (isLessonActive) {
      const timer = setTimeout(() => {
        setShowSkipButton(true);
        setCanSkipStep(true);
      }, 30000); 

      return () => clearTimeout(timer);
    }
  }, [currentStep, isStepComplete, setCanSkipStep, currentStepIndex]);

  // Handler for Selecting Theory Topic (Just updates prompt)
  const handleSelectTheoryTopic = (topicText: string) => {
    if (isLoading) return;
    setPrompt(topicText);
  };

  // Handler for Starting Theory Lesson (API Call)
  const handleStartTheory = async () => {
    if (isLoading || !prompt) return;
    
    isCancelledRef.current = false;
    setLoading(true);
    setLoadingState('lesson');
    
    // Pass the prompt as the topic ID if it matches a preset, or as raw text if custom
    // Find ID if prompt matches label
    const matchedTopic = TOPICS.find(t => (lang === 'ru' ? t.label.ru : t.label.en) === prompt);
    const topicId = matchedTopic ? matchedTopic.id : prompt;

    const lesson = await generateLesson('beginner', topicId, lang);
    
    // If cancelled during await, do not proceed
    if (isCancelledRef.current) {
        setLoading(false);
        setLoadingState('none');
        return;
    }

    setLoading(false);
    setLoadingState('none');
    if (lesson) onLessonStart(lesson);
  };

  // Toggle Handler for Check Tab
  const toggleCheckTopic = (id: string) => {
    const newSet = new Set(selectedCheckTopics);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCheckTopics(newSet);
  };

  // Start Exam Handler
  const handleStartCheck = async () => {
    if (isLoading || (selectedCheckTopics.size === 0 && !prompt)) return;
    
    isCancelledRef.current = false;
    setLoading(true);
    setLoadingState('exam');
    
    // Collect topics
    const selectedLabels = Array.from(selectedCheckTopics).map(id => {
        if (id === 'terms') return t.termsTopic;
        const topic = TOPICS.find(t => t.id === id);
        return lang === 'ru' ? topic?.label.ru || '' : topic?.label.en || '';
    });
    
    if (prompt) selectedLabels.push(prompt);

    const exam = await generateExam(selectedLabels, lang);

    // If cancelled during await, do not proceed
    if (isCancelledRef.current) {
        setLoading(false);
        setLoadingState('none');
        return;
    }

    setLoading(false);
    setLoadingState('none');
    if (exam) onExamStart(exam);
  };

  // Cancel Loading Handler
  const handleCancelLoading = () => {
    isCancelledRef.current = true;
    setLoading(false);
    setLoadingState('none');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      if (activeTab === 'theory' && prompt) {
        handleStartTheory();
      } else if (activeTab === 'check' && (selectedCheckTopics.size > 0 || prompt)) {
        handleStartCheck();
      }
    }
  };

  // Shared Styles
  const buttonBaseClass = "px-5 py-2 rounded-full text-[10px] md:text-xs uppercase tracking-wider transition-all border";
  const buttonInactiveClass = "bg-gray-900/40 border-transparent text-gray-500 hover:bg-gray-800 hover:text-gray-300";
  const buttonSelectedClass = "bg-gray-800 border-gray-600 text-white shadow-[0_0_15px_rgba(0,0,0,0.3)]";
  
  // Reusing the same style for check items as theory items (as requested)
  const buttonSelectedCheckClass = buttonSelectedClass;

  // --- RENDERING ---

  // 1. Glossary Modal (UPDATED FOR GLOSSARY 2.0)
  if (showGlossary) {
      const allTerms = Object.values(GLOSSARY_DATA);
      const filteredGlossary = allTerms.filter(item => 
        item.term[lang].toLowerCase().includes(glossarySearch.toLowerCase()) || 
        item.definition[lang].toLowerCase().includes(glossarySearch.toLowerCase())
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
                    <h3 className="text-white font-bold text-sm uppercase mb-1 transition-colors">{item.term[lang]}</h3>
                    <p className="text-gray-400 font-light leading-relaxed text-sm">{item.definition[lang]}</p>
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

  // 2. Active Quiz Mode (Slot)
  if (isQuizMode && currentQuiz) {
    const question = currentQuiz.questions[currentQuiz.currentIndex];
    const progress = ((currentQuiz.currentIndex) / currentQuiz.questions.length) * 100;
    
    return (
      <div className="w-full max-w-4xl mb-12 animate-slide-up flex flex-col items-center text-center gap-8 relative">
          <div className="w-32 h-[1px] bg-gray-800 rounded-full overflow-hidden">
             <div className="h-full bg-white transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex flex-col gap-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-600">
               {t.quiz} {currentQuiz.currentIndex + 1} / {currentQuiz.questions.length}
            </h2>
            <div className="max-w-2xl">
              <span className="text-2xl md:text-4xl text-gray-200 font-light leading-relaxed">
                 {getLocalizedText(question.question, lang)}
              </span>
            </div>
          </div>
      </div>
    );
  }

  // 3. Active Exam Mode (Slot)
  if (isExamMode && currentExam) {
     const question = currentExam.questions[currentExam.currentIndex];
     const progress = ((currentExam.currentIndex) / currentExam.questions.length) * 100;
     const isSuccess = examFeedback === 'success';

     return (
       <div className="w-full max-w-4xl mb-12 animate-slide-up flex flex-col items-center text-center gap-8 relative">
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
            
            {/* Conditional Input History: Only show if it's NOT a quiz-type question */}
            {question.type !== 'quiz' && <InputHistory history={inputHistory} />}
            
            {/* Conditional Controls */}
            {question.type !== 'quiz' && (
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
            )}
          </div>
       </div>
     )
  }

  // 4. Active Lesson View (Slot)
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

  // 5. Default: Menu Navigation Mode (Tabs)
  // This renders when no lesson/exam/quiz is active
  
  const renderTabContent = () => {
      switch(activeTab) {
          case 'theory':
              return (
                  <>
                    <div className="w-full max-w-2xl relative flex justify-center items-center">
                        <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        placeholder={t.placeholder}
                        className={`w-full bg-transparent text-5xl text-center py-4 text-white placeholder-gray-800 focus:outline-none transition-colors font-light caret-white leading-tight ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                        />
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
                        {TOPICS.slice(0, 15).map((topic) => {
                            const topicText = lang === 'ru' ? topic.label.ru : topic.label.en;
                            const isSelected = prompt === topicText;
                            return (
                                <button
                                key={topic.id}
                                onClick={() => handleSelectTheoryTopic(topicText)}
                                disabled={isLoading}
                                className={`${buttonBaseClass} ${isSelected ? buttonSelectedClass : buttonInactiveClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                {topicText}
                                </button>
                            );
                        })}
                    </div>
                    {/* Action Bar for Theory */}
                    <div className="h-10 flex justify-center items-center gap-6 w-full mt-2">
                        {isLoading ? (
                            <div className="flex items-center gap-6 animate-fade-in">
                                <button onClick={handleCancelLoading} className="text-xs text-gray-600 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2">
                                    <span>←</span> {t.back}
                                </button>
                                <span className="text-xs text-gray-500 uppercase tracking-widest animate-pulse">{t.generatingLesson}</span>
                            </div>
                        ) : (
                            prompt && (
                                <button 
                                onClick={handleStartTheory}
                                className="text-xs uppercase tracking-[0.2em] text-white border-b border-gray-500 hover:border-white transition-all pb-1 animate-slide-up"
                                >
                                    {t.startLearning}
                                </button>
                            )
                        )}
                    </div>
                  </>
              );
          case 'check':
              const termsSelected = selectedCheckTopics.has('terms');
              // Removed the outer wrapper div to match hierarchy depth of 'theory' tab
              // This ensures the parent flex gap applies directly to these elements
              return (
                  <>
                      {/* Input for Exam generation */}
                      <div className="w-full max-w-2xl relative flex justify-center items-center">
                        <input 
                            type="text" 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            placeholder={t.placeholderCheck}
                            className={`w-full bg-transparent text-5xl text-center py-4 text-white placeholder-gray-800 focus:outline-none transition-colors font-light caret-white leading-tight ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                        />
                      </div>

                       {/* Topics Grid - Multi Select */}
                       <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
                        {/* Terms Topic Item */}
                        <button
                            onClick={() => toggleCheckTopic('terms')}
                            disabled={isLoading}
                            className={`${buttonBaseClass} ${termsSelected ? buttonSelectedCheckClass : buttonInactiveClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {t.termsTopic}
                        </button>
                        
                        {/* Regular Topics */}
                        {TOPICS.map((topic) => {
                             const isSelected = selectedCheckTopics.has(topic.id);
                             return (
                                <button
                                key={topic.id}
                                onClick={() => toggleCheckTopic(topic.id)}
                                disabled={isLoading}
                                className={`${buttonBaseClass} ${isSelected ? buttonSelectedCheckClass : buttonInactiveClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                {lang === 'ru' ? topic.label.ru : topic.label.en}
                                </button>
                             );
                        })}
                        </div>
                        
                        {/* Action Bar for Check */}
                        <div className="h-10 flex justify-center items-center gap-6 w-full mt-2">
                            {isLoading ? (
                                <div className="flex items-center gap-6 animate-fade-in">
                                    <button onClick={handleCancelLoading} className="text-xs text-gray-600 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2">
                                        <span>←</span> {t.back}
                                    </button>
                                    <span className="text-xs text-gray-500 uppercase tracking-widest animate-pulse">{t.generatingExam}</span>
                                </div>
                            ) : (
                                (selectedCheckTopics.size > 0 || prompt.length > 0) && (
                                    <button 
                                    onClick={handleStartCheck}
                                    className="text-xs uppercase tracking-[0.2em] text-white border-b border-gray-500 hover:border-white transition-all pb-1 animate-slide-up"
                                    >
                                        {t.startCheck}
                                    </button>
                                )
                            )}
                        </div>
                  </>
              );
          case 'notes':
              return (
                  <div className="flex flex-col items-center justify-center h-48 opacity-50">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25a2.25 2.25 0 00-1.632-2.163l-1.32-.377a1.803 1.803 0 01-.99-3.467l2.31.66a2.25 2.25 0 001.632 2.163v3.75m0 0a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163v-3.75m-10.5 0v3.75a2.25 2.25 0 001.632 2.163l1.32.377a1.803 1.803 0 11.99 3.467l-2.31-.66a2.25 2.25 0 01-1.632-2.163v-3.75m0 0a2.25 2.25 0 001.632-2.163l1.32-.377a1.803 1.803 0 11.99-3.467l-2.31.66a2.25 2.25 0 01-1.632 2.163v3.75" />
                      </svg>
                      <h3 className="text-xl uppercase tracking-widest text-gray-400">{t.notesTitle}</h3>
                      <p className="text-sm text-gray-600 mt-2">{t.notesSub}</p>
                  </div>
              );
          case 'practice':
              return (
                  <div className="flex flex-col items-center justify-center h-48 opacity-50">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-600">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                      </svg>
                      <h3 className="text-xl uppercase tracking-widest text-gray-400">{t.practiceTitle}</h3>
                      <p className="text-sm text-gray-600 mt-2">{t.practiceSub}</p>
                  </div>
              );
      }
  };

  const NavButton = ({ id, label, icon }: { id: TabType, label: string, icon: React.ReactNode }) => {
      const isActive = activeTab === id;
      return (
          <button 
            onClick={() => !isLoading && setActiveTab(id)}
            disabled={isLoading}
            className={`
                flex flex-col items-center gap-1.5 px-4 py-2 transition-all duration-300
                ${isActive ? 'text-white' : 'text-gray-600 hover:text-gray-400'}
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : ''}`}>
                  {icon}
              </div>
              <span className={`text-[9px] uppercase tracking-widest font-bold ${isActive ? 'text-cyan-100' : ''}`}>{label}</span>
              {/* Active Indicator Line */}
              <div className={`w-full h-[1px] mt-1 bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,1)] transition-all duration-300 ${isActive ? 'opacity-100 max-w-full' : 'opacity-0 max-w-[0px]'}`} />
          </button>
      )
  }

  return (
    <div className="w-full max-w-4xl mb-12 animate-fade-in flex flex-col gap-8 items-center h-full justify-between">
         
         {/* Main Content Area (Variable based on tab) */}
         <div className="flex-1 w-full flex flex-col justify-center items-center gap-8 min-h-[300px]">
            {renderTabContent()}
         </div>

         {/* Bottom Navigation */}
         <div className="mt-auto flex justify-center gap-4 md:gap-12 w-full border-t border-gray-900/50 pt-4">
             <NavButton 
                id="theory" 
                label={t.tabTheory} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
             />
             <NavButton 
                id="notes" 
                label={t.tabNotes} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25a2.25 2.25 0 00-1.632-2.163l-1.32-.377a1.803 1.803 0 01-.99-3.467l2.31.66a2.25 2.25 0 001.632 2.163v3.75m0 0a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163v-3.75m-10.5 0v3.75a2.25 2.25 0 001.632 2.163l1.32.377a1.803 1.803 0 11.99 3.467l-2.31-.66a2.25 2.25 0 01-1.632-2.163v-3.75m0 0a2.25 2.25 0 001.632-2.163l1.32-.377a1.803 1.803 0 11.99-3.467l-2.31.66a2.25 2.25 0 01-1.632 2.163v3.75" /></svg>}
             />
             <NavButton 
                id="check" 
                label={t.tabCheck} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
             />
             <NavButton 
                id="practice" 
                label={t.tabPractice} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>}
             />
         </div>
    </div>
  );
};
