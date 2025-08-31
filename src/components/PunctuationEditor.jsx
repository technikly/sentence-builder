// PunctuationEditor.jsx

import PropTypes from 'prop-types';

const PunctuationEditor = ({
  sentenceIndex,
  wordIndex,
  sentences,
  setSentences,
  closeEditor,
  playSound,
  theme
}) => {
  const punctuationOptions = ['', '.', ',', '!', '?', ';'];
  const currentPunctuation = sentences[sentenceIndex].words[wordIndex].punctuation;

  const applyPunctuation = (punctuation) => {
    const newSentences = [...sentences];
    newSentences[sentenceIndex].words[wordIndex].punctuation = punctuation;
    setSentences(newSentences);
    playSound('change');
    closeEditor();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h3 className={`font-semibold ${theme.secondary} text-base sm:text-lg md:text-xl`}>
        Current Sentence:
      </h3>
      <p className={`${theme.primary} text-base sm:text-lg md:text-xl`}>
        {sentences[sentenceIndex].words.map((word, idx) => (
          <span key={idx}>
            {idx === wordIndex ? <strong>{word.word}</strong> : word.word}
            {idx < sentences[sentenceIndex].words.length - 1 ? ' ' : ''}
          </span>
        ))}
        {currentPunctuation}
      </p>
      <div className="flex flex-wrap gap-4">
        {punctuationOptions.map((punct) => (
          <button
            key={punct || 'none'}
            onClick={() => applyPunctuation(punct)}
            className={`px-6 py-3 ${theme.button} text-white rounded-lg text-base sm:text-lg md:text-xl transition-all duration-300 hover:scale-105`}
          >
            {punct || 'None'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PunctuationEditor;

PunctuationEditor.propTypes = {
  sentenceIndex: PropTypes.number.isRequired,
  wordIndex: PropTypes.number.isRequired,
  sentences: PropTypes.array.isRequired,
  setSentences: PropTypes.func.isRequired,
  closeEditor: PropTypes.func.isRequired,
  playSound: PropTypes.func.isRequired,
  theme: PropTypes.shape({
    secondary: PropTypes.string.isRequired,
    primary: PropTypes.string.isRequired,
    button: PropTypes.string.isRequired
  }).isRequired
};
