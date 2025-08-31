// src/components/Suggestions.jsx

import { useState, useEffect, useCallback } from 'react';
import { wordClassBackgroundColours } from './mappings';
import { Lightbulb } from 'lucide-react';
import PropTypes from 'prop-types';

const Suggestions = ({
  sentences,
  activeSentenceIndex,
  activeIndex,
  handleWordSelect,
  vocabularyDB,
  wordieDB
}) => {
  const [suggestedWord, setSuggestedWord] = useState(null);

  /**
   * Simple predictive algorithm:
   * - Based on the last word type, suggest a word that commonly follows.
   * - This can be enhanced with more complex logic or integration with a language model.
   */
  const generateSuggestion = useCallback(() => {
    if (
      activeSentenceIndex === null ||
      activeIndex === null ||
      !sentences[activeSentenceIndex]
    ) {
      setSuggestedWord(null);
      return;
    }

    const currentSentence = sentences[activeSentenceIndex];
    const lastWordObj = currentSentence.words[activeIndex - 1];

    if (!lastWordObj) {
      setSuggestedWord(null);
      return;
    }

    // Example logic: Suggest a noun after determiners or adjectives, etc.
    let suggestedType = 'noun';

    if (lastWordObj.type === 'determiner') {
      suggestedType = 'adjective';
    } else if (lastWordObj.type === 'adjective') {
      suggestedType = 'noun';
    } else if (lastWordObj.type === 'noun') {
      suggestedType = 'verb';
    } else if (lastWordObj.type === 'verb') {
      suggestedType = 'adverb';
    }

    // Combine both databases for suggestions
    const combinedDB = { ...vocabularyDB };
    Object.keys(wordieDB).forEach((key) => {
      combinedDB[key] = [...combinedDB[key], ...wordieDB[key]];
    });

    const possibleWords = combinedDB[`${suggestedType}s`] || [];

    if (possibleWords.length === 0) {
      setSuggestedWord(null);
      return;
    }

    // Randomly select a word from the possible words
    const randomWord =
      possibleWords[Math.floor(Math.random() * possibleWords.length)];

    setSuggestedWord({ word: randomWord, type: suggestedType });
  }, [activeSentenceIndex, activeIndex, sentences, vocabularyDB, wordieDB]);

  useEffect(() => {
    generateSuggestion();
  }, [generateSuggestion]);

  /**
   * Render the predictive word suggestion
   */
  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Optional: Add an icon or indicator for suggestions */}
      <Lightbulb className="text-yellow-400" size={24} />

      {/* Display the suggested word */}
      {suggestedWord ? (
        <button
          onClick={() => handleWordSelect(suggestedWord.word, suggestedWord.type)}
          className={`font-semibold text-xl sm:text-2xl md:text-3xl lg:text-4xl ${wordClassBackgroundColours[suggestedWord.type]} bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-transparent underline cursor-pointer transition-transform duration-300 hover:scale-105`}
        >
          {suggestedWord.word}
        </button>
      ) : (
        <span className="text-gray-500">No suggestion available</span>
      )}
    </div>
  );
};

export default Suggestions;

Suggestions.propTypes = {
  sentences: PropTypes.array.isRequired,
  activeSentenceIndex: PropTypes.number,
  activeIndex: PropTypes.number,
  handleWordSelect: PropTypes.func.isRequired,
  vocabularyDB: PropTypes.object.isRequired,
  wordieDB: PropTypes.object.isRequired
};

