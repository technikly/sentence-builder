// src/EditableWord.jsx

import { useState, useEffect, useRef } from 'react';
import { getSuggestions } from '../spellChecker';
import { wordClassColours } from './mappings';
import PropTypes from 'prop-types';

const EditableWord = ({
  wordObj,
  sentenceIndex,
  wordIndex,
  updateWord,
  misspelled
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentWord, setCurrentWord] = useState(wordObj.word);
  const [localSuggestions, setLocalSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    updateWord(sentenceIndex, wordIndex, currentWord);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCurrentWord(wordObj.word);
    setIsEditing(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setCurrentWord(suggestion);
    updateWord(sentenceIndex, wordIndex, suggestion);
    setIsEditing(false);
  };

  useEffect(() => {
    if (misspelled) {
      const sugg = getSuggestions(currentWord);
      setLocalSuggestions(sugg);
    }
  }, [currentWord, misspelled]);

  return (
    <span className="relative">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={currentWord}
          onChange={(e) => setCurrentWord(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          spellCheck="true"
          className={`border-b-2 focus:outline-none ${
            misspelled ? 'border-red-500' : 'border-transparent'
          } bg-transparent`}
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`font-bold tracking-wide transition-colors duration-500 cursor-pointer hover:opacity-80 text-xl sm:text-2xl md:text-3xl lg:text-4xl ${
            misspelled ? 'underline decoration-red-500' : wordClassColours[wordObj.type]
          }`}
          title="Click to edit"
        >
          {wordObj.word}
          {wordObj.punctuation}
        </span>
      )}

      {/* Suggestions Dropdown */}
      {misspelled && !isEditing && localSuggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-max bg-white border border-gray-300 rounded-md shadow-lg z-10">
          {localSuggestions.slice(0, 5).map((suggestion, idx) => (
            <div
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </span>
  );
};

export default EditableWord;

EditableWord.propTypes = {
  wordObj: PropTypes.shape({
    word: PropTypes.string.isRequired,
    punctuation: PropTypes.string,
    type: PropTypes.string
  }).isRequired,
  sentenceIndex: PropTypes.number.isRequired,
  wordIndex: PropTypes.number.isRequired,
  updateWord: PropTypes.func.isRequired,
  misspelled: PropTypes.bool
};

