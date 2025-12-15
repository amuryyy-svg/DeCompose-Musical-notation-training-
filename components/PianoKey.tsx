import React from 'react';
import { NoteDefinition } from '../types';
import { getDisplayNoteName } from '../constants';

interface PianoKeyProps {
  noteData: NoteDefinition;
  isActive: boolean;
  isNextSemitoneActive: boolean; // New prop for dynamic accidental context
  isLessonTarget: boolean;
  showKeyLabel: boolean;
  showNoteLabel: boolean;
  accidentalMode?: 'sharp' | 'flat';
  onMouseDown: (note: NoteDefinition) => void;
  onMouseUp: (note: NoteDefinition) => void;
}

export const PianoKey: React.FC<PianoKeyProps> = ({ 
  noteData, 
  isActive, 
  isNextSemitoneActive,
  isLessonTarget,
  showKeyLabel,
  showNoteLabel,
  accidentalMode = 'sharp',
  onMouseDown, 
  onMouseUp 
}) => {
  const isWhite = noteData.type === 'white';
  
  // Base structural classes
  const baseClasses = `
    relative flex flex-col justify-end items-center pb-3 select-none cursor-pointer
    ease-out
    ${isWhite ? 'z-0 rounded-b-[4px] transition-all duration-75' : 'z-10 w-10 -mx-[1.25rem] h-40 rounded-b-[3px]'}
  `;

  // Explicitly disable transition for black keys
  const inlineStyle = isWhite ? {} : { transition: 'none' };
  
  const whiteKeyDimensions = isWhite ? { width: '4.5rem', height: '18rem', marginLeft: '1px', marginRight: '1px' } : {};
  const mergedStyle = { ...inlineStyle, ...whiteKeyDimensions };

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
    // Black Keys
    if (isActive) {
      visualStyle = 'bg-gradient-to-b from-gray-900 to-black shadow-none';
    } else if (isLessonTarget) {
      visualStyle = 'bg-gray-800 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]';
    } else {
      visualStyle = 'bg-gradient-to-b from-gray-800 to-black shadow-[0_3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.2)]';
    }
  }

  const TargetMarker = isLessonTarget && !isActive ? (
    <div className={`absolute bottom-12 w-3 h-3 rounded-full ${isWhite ? 'bg-cyan-500' : 'bg-cyan-400'} shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse`}></div>
  ) : null;

  const textColor = isWhite ? 'text-gray-400' : 'text-gray-500';
  
  // DYNAMIC ACCIDENTAL LOGIC
  // If the user explicitly sets 'flat', use 'flat'.
  // If the user sets 'sharp' (default), BUT the next semitone is active (context implies flats), force 'flat'.
  const effectiveMode = isNextSemitoneActive ? 'flat' : accidentalMode;

  const displayName = getDisplayNoteName(noteData.note, effectiveMode as 'sharp' | 'flat');

  return (
    <div
      className={`${baseClasses} ${visualStyle}`}
      style={mergedStyle}
      onMouseDown={() => onMouseDown(noteData)}
      onMouseUp={() => onMouseUp(noteData)}
      onMouseLeave={() => isActive && onMouseUp(noteData)}
      onTouchStart={(e) => { e.preventDefault(); onMouseDown(noteData); }}
      onTouchEnd={(e) => { e.preventDefault(); onMouseUp(noteData); }}
    >
      {TargetMarker}

      <div className={`flex flex-col items-center gap-0.5 pointer-events-none transition-opacity duration-200 ${isActive || showKeyLabel || showNoteLabel ? 'opacity-100' : 'opacity-0'}`}>
        
        {(showNoteLabel || isActive) && (
          <span className={`text-[10px] font-sans font-bold uppercase tracking-wider ${textColor} flex items-end`}>
            {displayName}
            <span className="text-[7px] mb-[1px] ml-[1px] opacity-70">{noteData.octave}</span>
          </span>
        )}

        {(showKeyLabel) && (
          <span className={`text-[8px] font-mono opacity-70 ${textColor}`}>
            {noteData.keyboardKey}
          </span>
        )}
      </div>
    </div>
  );
};