import { useState, useEffect } from 'react';
import { initializeSpellChecker, checkSpelling, getSuggestions } from '../spellChecker';
import { vocabularyDB, loadVocabularyFromCSV } from '../vocabulary';

const TypingBuilder = () => {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [vocab, setVocab] = useState(vocabularyDB);

  useEffect(() => {
    initializeSpellChecker();
    loadVocabularyFromCSV().then(setVocab).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    const words = value.split(/\s+/);
    const last = words[words.length - 1];
    if (!last) {
      setSuggestions([]);
      return;
    }
    const spellSuggs = getSuggestions(last);
    const vocabSuggs = Object.values(vocab)
      .flat()
      .filter((w) => w.toLowerCase().startsWith(last.toLowerCase()));
    const combined = [...new Set([...vocabSuggs, ...spellSuggs])].slice(0, 5);
    setSuggestions(combined);
  };

  const applySuggestion = (word) => {
    const parts = text.split(/\s+/);
    parts[parts.length - 1] = word;
    const newText = parts.join(' ') + ' ';
    setText(newText);
    setSuggestions([]);
  };

  const renderPreview = () => {
    return text.split(/(\s+)/).map((segment, idx) => {
      if (/^\s+$/.test(segment)) return segment;
      const misspelled = segment && !checkSpelling(segment);
      return (
        <span
          key={idx}
          className={misspelled ? 'underline decoration-red-500' : ''}
        >
          {segment}
        </span>
      );
    });
  };

  const speakText = () => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="p-4">
      <textarea
        className="w-full h-48 text-3xl p-4 border-4 border-gray-300 rounded-lg bg-white text-black"
        value={text}
        onChange={handleChange}
        aria-label="Type your story"
      />
      <div className="mt-4 text-3xl text-black bg-white p-4 rounded-lg min-h-[6rem]">
        {renderPreview()}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => applySuggestion(s)}
              className="px-3 py-2 text-2xl rounded bg-blue-600 text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={speakText}
        className="mt-6 px-4 py-2 bg-green-600 text-white text-2xl rounded"
      >
        Speak
      </button>
    </div>
  );
};

export default TypingBuilder;
