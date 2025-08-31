// Modal.jsx

import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import IconButton from './IconButton';
import PropTypes from 'prop-types';

const Modal = ({ title, onClose, children, theme }) => {
  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 ${theme.modal} backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 z-50`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`${theme.card} p-6 sm:p-10 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto`}
      >
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2
            id="modal-title"
            className={`font-bold ${theme.primary} text-2xl sm:text-3xl md:text-4xl lg:text-5xl`}
          >
            {title}
          </h2>
          <IconButton
            icon={X}
            label="Close modal"
            onClick={onClose}
            className={`${theme.button} hover:rotate-90`}
            size={24}
          />
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;

Modal.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  theme: PropTypes.shape({
    modal: PropTypes.string.isRequired,
    card: PropTypes.string.isRequired,
    primary: PropTypes.string.isRequired,
    button: PropTypes.string.isRequired
  }).isRequired
};
