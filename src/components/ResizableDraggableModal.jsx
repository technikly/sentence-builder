// ResizableDraggableModal.jsx

import { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { X, Maximize, Minimize } from 'lucide-react';
import PropTypes from 'prop-types';

const ResizableDraggableModal = ({
  title,
  children,
  onClose,
  theme,
  className
}) => {
  // State to track if the modal is in full screen
  const [isFullScreen, setIsFullScreen] = useState(true);

  // States to store previous size and position
  const [prevSize, setPrevSize] = useState(null);
  const [prevPosition, setPrevPosition] = useState(null);

  // Function to toggle full screen
  const toggleFullScreen = () => {
    if (isFullScreen) {
      // If currently full screen, reduce to half screen size
      if (!prevSize || !prevPosition) {
        const halfWidth = Math.min(window.innerWidth / 2, 800); // Max half width 800px for better UX
        const halfHeight = Math.min(window.innerHeight / 2, 600); // Max half height 600px
        const halfX = (window.innerWidth - halfWidth) / 2;
        const halfY = (window.innerHeight - halfHeight) / 2;
        setPrevSize({ width: halfWidth, height: halfHeight });
        setPrevPosition({ x: halfX, y: halfY });
      }
      setIsFullScreen(false);
    } else {
      // If not full screen, revert to full screen
      setIsFullScreen(true);
    }
  };

  // Handle window resize to adjust half screen size and position if necessary
  useEffect(() => {
    const handleResize = () => {
      if (!isFullScreen && prevSize && prevPosition) {
        const newHalfWidth = Math.min(window.innerWidth / 2, 800);
        const newHalfHeight = Math.min(window.innerHeight / 2, 600);
        const newHalfX = Math.min(prevPosition.x, window.innerWidth - newHalfWidth);
        const newHalfY = Math.min(prevPosition.y, window.innerHeight - newHalfHeight);
        setPrevSize({ width: newHalfWidth, height: newHalfHeight });
        setPrevPosition({ x: newHalfX, y: newHalfY });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullScreen, prevSize, prevPosition]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Rnd
        // Set size and position based on isFullScreen state
        size={
          isFullScreen
            ? { width: '100%', height: '100%' }
            : prevSize
            ? { width: prevSize.width, height: prevSize.height }
            : { width: 600, height: 400 }
        }
        position={
          isFullScreen
            ? { x: 0, y: 0 }
            : prevPosition
            ? { x: prevPosition.x, y: prevPosition.y }
            : { x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 200 }
        }
        // Enable dragging and resizing only when not in full screen
        disableDragging={isFullScreen}
        enableResizing={!isFullScreen}
        bounds="window"
        onDragStop={(e, d) => {
          // Update position state when dragging stops
          if (!isFullScreen) {
            setPrevPosition({ x: d.x, y: d.y });
          }
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          // Update size and position state when resizing stops
          if (!isFullScreen) {
            setPrevSize({
              width: parseInt(ref.style.width, 10),
              height: parseInt(ref.style.height, 10)
            });
            setPrevPosition(position);
          }
        }}
        style={{ zIndex: 1000 }}
      >
        <div
          className={`flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-100">
            <h2 className={`text-lg font-semibold ${theme.primary}`}>
              {title}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFullScreen}
                className="p-1 rounded hover:bg-gray-200"
                aria-label={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isFullScreen ? (
                  <Minimize size={16} />
                ) : (
                  <Maximize size={16} />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-200"
                aria-label="Close Modal"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </Rnd>
    </div>
  );
};

ResizableDraggableModal.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  className: PropTypes.string
};

ResizableDraggableModal.defaultProps = {
  className: ''
};

export default ResizableDraggableModal;
