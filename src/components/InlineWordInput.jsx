import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { fetchSuggestions, fetchNextWords } from '../utils/dictionary';

const InlineWordInput = ({ onSubmit, onCancel, theme, previousWord }) => {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (value.trim()) {
        const sugg = await fetchSuggestions(value.trim());
        setSuggestions(sugg.slice(0, 5));
      } else if (previousWord) {
        const sugg = await fetchNextWords(previousWord);
        setSuggestions(sugg.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [value, previousWord]);

  const borderClass = theme.primary.replace('text-', 'border-');

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && value.trim()) {
      e.preventDefault();
      onSubmit(value.trim());
      setValue('');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="relative inline-block" onBlur={onCancel}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`px-4 py-2 rounded-full bg-white text-2xl sm:text-3xl lg:text-4xl ${theme.primary} ${borderClass} border-4 focus:outline-none`}
        aria-label="Type a word"
      />
      {suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-2 flex flex-col gap-2 bg-white p-2 rounded-xl shadow-lg border border-gray-200 z-10">
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              onMouseDown={() => {
                onSubmit(sug);
                setValue('');
              }}
              className={`${theme.button} text-white px-4 py-2 rounded-lg text-xl sm:text-2xl`}
            >
              {sug}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

InlineWordInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  previousWord: PropTypes.string
};

export default InlineWordInput;
