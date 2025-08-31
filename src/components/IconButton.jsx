// IconButton.jsx

import PropTypes from 'prop-types';

const IconButton = ({ icon: Icon, label, onClick, className = '', size = 32 }) => (
  <button
    onClick={onClick}
    className={`p-4 sm:p-6 rounded-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 ${className}`}
    aria-label={label}
    title={label}
  >
    <Icon size={size} className="text-white" />
  </button>
);

export default IconButton;

IconButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  size: PropTypes.number
};
