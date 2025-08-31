// SentenceDot.jsx

import { Plus } from 'lucide-react';
import PropTypes from 'prop-types';

const SentenceDot = ({ onClick, theme }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full ${theme.sentenceDot} transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 focus:outline-none focus:ring-4 focus:ring-green-300`}
    aria-label="Add a new sentence"
    title="Click to add a new sentence"
  >
    <Plus size={28} className="text-white transition-transform" />
  </button>
);

export default SentenceDot;

SentenceDot.propTypes = {
  onClick: PropTypes.func.isRequired,
  theme: PropTypes.shape({
    sentenceDot: PropTypes.string.isRequired
  }).isRequired
};
