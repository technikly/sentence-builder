// src/components/common/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { Plus, X } from 'lucide-react';

export const IconButton = ({ icon: Icon, label, onClick, className = '', size = 32 }) => (
  <button
    onClick={onClick}
    className={`p-6 rounded-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 ${className}`}
    aria-label={label}
    title={label}
  >
    <Icon size={size} className="text-white" />
  </button>
);

export const SentenceDot = ({ onClick, theme }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center w-24 h-24 rounded-full ${theme.sentenceDot} 
      transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 
      focus:outline-none focus:ring-4 focus:ring-green-300`}
    aria-label="Add a new sentence"
    title="Click to add a new sentence"
  >
    <Plus size={48} className="text-white transition-transform" />
  </button>
);

export const WordDot = ({ onClick, className = '', theme }) => (
  <button
    onClick={onClick}
    className={`w-12 h-12 rounded-full ${theme.wordDot} transition-all duration-300 
      shadow-md hover:shadow-lg hover:scale-110 focus:outline-none focus:ring-4 
      focus:ring-blue-300 ${className}`}
    aria-label="Add a word here"
    title="Click to add a word"
  />
);

export const Modal = ({ title, onClose, children, theme }) => {
  return ReactDOM.createPortal(
    <div 
      className={`fixed inset-0 ${theme.modal} backdrop-blur-sm flex items-center justify-center p-8 z-50`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`${theme.card} p-10 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[85vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-8">
          <h2 id="modal-title" className={`text-5xl font-bold ${theme.primary}`}>
            {title}
          </h2>
          <IconButton 
            icon={X} 
            label="Close modal"
            onClick={onClose}
            className={`${theme.button} hover:rotate-90`}
          />
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};
