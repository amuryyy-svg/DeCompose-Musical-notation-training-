import React from 'react';
import { QuizQuestion, Language } from '../types';
import { getLocalizedText } from '../constants';

interface TheoryQuizProps {
  question: QuizQuestion;
  selectedOption: number | null;
  feedback: 'none' | 'correct' | 'wrong';
  onSelectOption: (index: number) => void;
  lang: Language;
}

export const TheoryQuiz: React.FC<TheoryQuizProps> = ({ 
  question, 
  selectedOption, 
  feedback, 
  onSelectOption, 
  lang 
}) => {
  
  // Mapping shortcuts to options for visual hints
  const shortcuts = ['Z', 'X', 'C', 'V'];

  return (
    <div className="flex justify-center items-end gap-4 h-48 sm:h-64 px-4 w-full max-w-4xl animate-slide-up">
      {question.options.map((option, idx) => {
        const isSelected = selectedOption === idx;
        const isCorrect = idx === question.correctIndex;
        
        // Base Style (mimicking a piano key shape roughly)
        let styleClass = "relative flex-1 h-full max-w-[140px] rounded-b-lg border-b-8 transition-all duration-200 flex flex-col justify-center items-center p-4 cursor-pointer select-none shadow-[0_4px_5px_rgba(0,0,0,0.3)] ";

        // State Logic
        if (feedback === 'none') {
          // Neutral State
          if (isSelected) {
             styleClass += "bg-gray-700 border-gray-500 translate-y-1";
          } else {
             styleClass += "bg-gray-800 border-gray-900 hover:bg-gray-750 hover:-translate-y-1";
          }
        } else {
          // Feedback State
          if (isCorrect) {
             // Show correct answer (even if not selected, or if selected)
             styleClass += "bg-green-900/40 border-green-600 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
          } else if (isSelected && !isCorrect) {
             // Show wrong selection
             styleClass += "bg-red-900/40 border-red-800 text-red-400 opacity-60";
          } else {
             // Dim others
             styleClass += "bg-gray-900 border-gray-950 opacity-20";
          }
        }

        return (
          <div 
            key={idx}
            onClick={() => feedback === 'none' && onSelectOption(idx)}
            className={styleClass}
          >
            {/* Answer Text */}
            <span className={`text-sm md:text-lg font-light text-center leading-tight ${isSelected ? 'text-white' : 'text-gray-300'}`}>
              {getLocalizedText(option, lang)}
            </span>

            {/* Shortcut Hint (Bottom) */}
            <div className="absolute bottom-4 text-[10px] font-mono uppercase tracking-widest opacity-50 text-gray-500">
               [{shortcuts[idx]}]
            </div>
          </div>
        );
      })}
    </div>
  );
};
