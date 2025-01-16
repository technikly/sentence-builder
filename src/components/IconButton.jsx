// IconButton.jsx

import React from 'react';

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
