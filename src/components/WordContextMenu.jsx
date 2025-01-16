// WordContextMenu.jsx

import React from 'react';
import ReactDOM from 'react-dom';

const WordContextMenu = ({
  onCapitalize,
  onUncapitalize,
  onAddPunctuation,
  onEditPunctuation,
  onEdit,
  onDelete,
  onClose,
  position,
  isCapitalized,
  hasPunctuation
}) =>
  ReactDOM.createPortal(
    <div
      className="fixed bg-white border rounded-lg shadow-lg z-50 min-w-[220px]"
      style={{ top: position.y, left: position.x }}
      role="menu"
      aria-label="Word context menu"
    >
      {isCapitalized ? (
        <button
          onClick={onUncapitalize}
          className="w-full text-left px-4 py-2 hover:bg-gray-100"
          role="menuitem"
        >
          ✨ Remove Capital Letter
        </button>
      ) : (
        <button
          onClick={onCapitalize}
          className="w-full text-left px-4 py-2 hover:bg-gray-100"
          role="menuitem"
        >
          ✨ Add Capital Letter
        </button>
      )}

      {hasPunctuation ? (
        <button
          onClick={onEditPunctuation}
          className="w-full text-left px-4 py-2 hover:bg-gray-100"
          role="menuitem"
        >
          ✍️ Edit Punctuation
        </button>
      ) : (
        <button
          onClick={onAddPunctuation}
          className="w-full text-left px-4 py-2 hover:bg-gray-100"
          role="menuitem"
        >
          ✍️ Add Punctuation
        </button>
      )}

      <button
        onClick={onEdit}
        className="w-full text-left px-4 py-2 hover:bg-gray-100"
        role="menuitem"
      >
        📝 Edit Word
      </button>

      <button
        onClick={onDelete}
        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
        role="menuitem"
      >
        🗑️ Delete Word
      </button>

      <button
        onClick={onClose}
        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-500"
        role="menuitem"
      >
        ❌ Cancel
      </button>
    </div>,
    document.body
  );

export default WordContextMenu;
