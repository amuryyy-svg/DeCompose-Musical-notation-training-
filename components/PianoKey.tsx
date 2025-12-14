import React from 'react';
import { NoteDefinition } from '../types';

interface PianoKeyProps {
  noteData: NoteDefinition;
  isActive: boolean;
  isLessonTarget: boolean;
  showKeyLabel: boolean;
  showNoteLabel: boolean;
  onMouseDown: (note: NoteDefinition) => void;
  onMouseUp: (note: NoteDefinition) => void;
}

export const PianoKey: React.FC<PianoKeyProps> = ({ 
  noteData, 
  isActive, 
  isLessonTarget,
  showKeyLabel,
  showNoteLabel,
  onMouseDown, 
  onMouseUp 
}) => {
  const isWhite = noteData.type === 'white';
  
  // Base structural classes
  // White keys need transition-all (or transform/colors) for the press effect.
  // Black keys MUST NOT have background transition to avoid the "disappearing/blinking" glitch when switching from gradient to solid color.
  const baseClasses = `
    relative flex flex-col justify-end items-center pb-3 select-none cursor-pointer
    ease-out
    ${isWhite ? 'z-0 rounded-b-[4px] transition-all duration-75' : 'z-10 w-10 -mx-[1.25rem] h-40 rounded-b-[3px] transition-none'}
  `;

  // Visual Styling Logic
  let visualStyle = '';
  
  if (isWhite) {
    if (isActive) {
      visualStyle = 'bg-gray-300 shadow-inner translate-y-[2px] border-b border-gray-400';
    } else if (isLessonTarget) {
      visualStyle = 'bg-cyan-100 shadow-[0_4px_5px_rgba(0,0,0,0.1),inset_0_-5px_10px_rgba(6,182,212,0.1)] border-b-4 border-cyan-400';
    } else {
      visualStyle = 'bg-[#fdfdfd] shadow-[0_4px_5px_rgba(0,0,0,0.1),inset_0_-5px_10px_rgba(0,0,0,0.02)] active:shadow-none';
    }
  } else {
    if (isActive) {
      // Reverted to a darker black/gray as requested, ensuring it's solid to prevent blink
      visualStyle = 'bg-[#1a1a1a] shadow-none'; 
    } else if (isLessonTarget) {
      visualStyle = 'bg-gray-800 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]';
    } else {
      visualStyle = 'bg-gradient-to-b from-gray-800 to-black shadow-[0_3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.2)]';
    }
  }

  // Dimensions for white keys
  const whiteKeyStyle = isWhite ? { width: '4.5rem', height: '18rem', marginLeft: '1px', marginRight: '1px' } : {};

  // Target Marker (Circle)
  const TargetMarker = isLessonTarget && !isActive ? (
    <div className={`absolute bottom-12 w-3 h-3 rounded-full ${isWhite ? 'bg-cyan-500' : 'bg-cyan-400'} shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse`}></div>
  ) : null;

  const textColor = isWhite ? 'text-gray-400' : 'text-gray-500';

  return (
    <div
      className={`${baseClasses} ${visualStyle}`}
      style={whiteKeyStyle}
      onMouseDown={() => onMouseDown(noteData)}
      onMouseUp={() => onMouseUp(noteData)}
      onMouseLeave={() => isActive && onMouseUp(noteData)}
      onTouchStart={(e) => { e.preventDefault(); onMouseDown(noteData); }}
      onTouchEnd={(e) => { e.preventDefault(); onMouseUp(noteData); }}
    >
      {TargetMarker}

      {/* Labels Container */}
      <div className={`flex flex-col items-center gap-0.5 pointer-events-none transition-opacity duration-200 ${isActive || showKeyLabel || showNoteLabel ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Note Name (e.g. C4) - Shown on top */}
        {(showNoteLabel || isActive) && (
          <span className={`text-[10px] font-sans font-bold uppercase tracking-wider ${textColor} flex items-end`}>
            {noteData.note}
            <span className="text-[7px] mb-[1px] ml-[1px] opacity-70">{noteData.octave}</span>
          </span>
        )}

        {/* Keyboard Key (e.g. Z) - Shown below */}
        {(showKeyLabel) && (
          <span className={`text-[8px] font-mono opacity-70 ${textColor}`}>
            {noteData.keyboardKey}
          </span>
        )}
      </div>
    </div>
  );
};