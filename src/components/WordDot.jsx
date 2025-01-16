// WordDot.jsx

import React from 'react';

const WordDot = ({ onClick, className = '', theme }) => (
  <button
    onClick={onClick}
    className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full ${theme.wordDot} transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 ${className}`}
    aria-label="Add a word here"
    title="Click to add a word"
  />
);

export default WordDot;
