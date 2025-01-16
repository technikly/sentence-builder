// src/components/word/index.js
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

export const WordContextMenu = ({ onCapitalize, onUncapitalize, onEdit, onClose, position }) => (
  ReactDOM.createPortal(
    <div 
      className="fixed bg-white border rounded-lg shadow-lg z-60 min-w-[150px]"
      style={{ top: position.y, left: position.x }}
    >
      <button 
        onClick={onCapitalize} 
        className="w-full text-left px-4 py-2 hover:bg-gray-100"
      >
        Capitalize
      </button>
      <button 
        onClick={onUncapitalize} 
        className="w-full text-left px-4 py-2 hover:bg-gray-100"
      >
        Uncapitalize
      </button>
      <button 
        onClick={onEdit} 
        className="w-full text-left px-4 py-2 hover:bg-gray-100"
      >
        Edit Word
      </button>
      <button 
        onClick={onClose} 
        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
      >
        Cancel
      </button>
    </div>,
    document.body
  )
);

export const WordEditor = ({ sentenceIndex, wordIndex, sentences, setSentences, closeEditor, playSound, theme }) => {
  const [editedWord, setEditedWord] = useState(sentences[sentenceIndex].words[wordIndex].word);
  const [editedPunctuation, setEditedPunctuation] = useState(sentences[sentenceIndex].words[wordIndex].punctuation);

  const saveEdits = () => {
    const newSentences = [...sentences];
    newSentences[sentenceIndex].words[wordIndex].word = editedWord;
    newSentences[sentenceIndex].words[wordIndex].punctuation = editedPunctuation;
    setSentences(newSentences);
    playSound('change');
    closeEditor();
  };

  return (
    <div className="space-y-6">
      <div>
        <label className={`block text-xl font-medium ${theme.primary} mb-2`} htmlFor="word-input">
          Word:
        </label>
        <input
          id="word-input"
          type="text"
          value={editedWord}
          onChange={(e) => setEditedWord(e.target.value)}
          className={`w-full p-4 border rounded-lg ${theme.secondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>
      <div>
        <label className={`block text-xl font-medium ${theme.primary} mb-2`} htmlFor="punctuation-select">
          Punctuation:
        </label>
        <select
          id="punctuation-select"
          value={editedPunctuation}
          onChange={(e) => setEditedPunctuation(e.target.value)}
          className={`w-full p-4 border rounded-lg ${theme.secondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="">None</option>
          <option value=".">.</option>
          <option value=",">,</option>
          <option value="!">!</option>
          <option value="?">?</option>
          <option value=";">;</option>
        </select>
      </div>
      <div className="flex justify-end gap-4">
        <button
          onClick={closeEditor}
          className={`px-6 py-3 ${theme.button} text-white rounded-lg hover:opacity-80`}
        >
          Cancel
        </button>
        <button
          onClick={saveEdits}
          className={`px-6 py-3 ${theme.button} text-white rounded-lg hover:opacity-80`}
        >
          Save
        </button>
      </div>
    </div>
  );
};
