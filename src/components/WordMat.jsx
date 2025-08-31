import PropTypes from 'prop-types';
import { wordClassBackgroundColours } from './mappings';

/**
 * A sliding panel that displays words grouped by their type.
 * Initially hidden and appears from the bottom when opened.
 */
const WordMat = ({ open, onClose, vocabulary, onWordClick }) => {
  const categories = Object.keys(vocabulary);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white shadow-lg transform transition-transform duration-300 z-40 ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-semibold">Word Mat</h2>
        <button onClick={onClose} className="text-xl" aria-label="Close word mat">
          &times;
        </button>
      </div>
      <div className="p-4 max-h-60 overflow-y-auto">
        {categories.map((cat) => (
          <div key={cat} className="mb-4">
            <h3 className="capitalize font-semibold mb-2">{cat}</h3>
            <div className="flex flex-wrap gap-2">
              {vocabulary[cat].map((word, idx) => (
                <button
                  key={idx}
                  onClick={() => onWordClick(word)}
                  className={`text-white px-2 py-1 rounded ${
                    wordClassBackgroundColours[cat.slice(0, -1)] || 'bg-gray-300'
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

WordMat.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  vocabulary: PropTypes.object.isRequired,
  onWordClick: PropTypes.func.isRequired,
};

export default WordMat;
