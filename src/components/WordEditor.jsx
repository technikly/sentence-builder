// WordEditor.jsx

import React, { useState } from 'react';

const WordEditor = ({
  sentenceIndex,
  wordIndex,
  sentences,
  setSentences,
  closeEditor,
  playSound,
  theme
}) => {
  const [editedWord, setEditedWord] = useState(
    sentences[sentenceIndex].words[wordIndex].word
  );

  const saveEdits = () => {
    const newSentences = [...sentences];
    newSentences[sentenceIndex].words[wordIndex].word = editedWord;
    setSentences(newSentences);
    playSound('change');
    closeEditor();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <label
          className={`block mb-2 font-medium ${theme.primary} text-base sm:text-lg md:text-xl`}
          htmlFor="word-input"
        >
          Word:
        </label>
        <input
          id="word-input"
          type="text"
          value={editedWord}
          onChange={(e) => setEditedWord(e.target.value)}
          className={`w-full p-2 sm:p-4 border rounded-lg ${theme.secondary} focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-lg md:text-xl`}
        />
      </div>
      <div className="flex justify-end gap-4">
        <button
          onClick={closeEditor}
          className={`px-4 sm:px-6 py-2 sm:py-3 ${theme.button} text-white rounded-lg hover:opacity-80 text-base sm:text-lg md:text-xl`}
        >
          Cancel
        </button>
        <button
          onClick={saveEdits}
          className={`px-4 sm:px-6 py-2 sm:py-3 ${theme.button} text-white rounded-lg hover:opacity-80 text-base sm:text-lg md:text-xl`}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default WordEditor;
