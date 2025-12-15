
import React from 'react';
import { HistoryNote } from '../types';

export const InputHistory: React.FC<{ history: HistoryNote[] }> = ({ history }) => {
  // Reverse the array to work with flex-row-reverse.
  // This ensures that:
  // 1. Newest items (end of history) are at the "Start" of the flex container (Right side).
  // 2. Oldest items are at the "End" of the flex container (Left side).
  // 3. Flex overflow logic clips the "End" (Left side), so oldest items disappear off-screen.
  const reversedHistory = [...history].reverse();

  return (
    <div className="relative w-full h-12 mt-6">
      {/* Gradients for smooth fade out at edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      
      <div className="absolute inset-0 flex flex-row-reverse flex-nowrap items-center justify-center gap-2 overflow-hidden px-4 md:px-10">
        {reversedHistory.map((note) => (
          <div
            key={note.id}
            className={`
              w-10 h-10 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold font-mono tracking-wider transition-all duration-500 transform
              ${note.isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
              ${note.status === 'success' 
                ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                : 'bg-white/5 text-gray-400'}
            `}
          >
            {note.name}
          </div>
        ))}
      </div>
    </div>
  );
};
