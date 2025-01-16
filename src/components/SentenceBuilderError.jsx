Compare:

1)
import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { Save, RefreshCw, Plus, Palette, Eye, Volume2, VolumeX, X } from 'lucide-react';

// Theme configuration
const themes = {
    ocean: {
        name: 'Ocean',
        background: 'bg-blue-50',
        primary: 'text-blue-600',
        secondary: 'text-blue-800',
        button: 'bg-blue-500 hover:bg-blue-600',
        card: 'bg-white',
        wordDot: 'bg-blue-200 hover:bg-blue-300',
        sentenceDot: 'bg-green-400 hover:bg-green-500',
        modal: 'bg-black bg-opacity-50',
    },
    forest: {
        name: 'Forest',
        background: 'bg-green-50',
        primary: 'text-green-600',
        secondary: 'text-green-800',
        button: 'bg-green-500 hover:bg-green-600',
        card: 'bg-white',
        wordDot: 'bg-green-200 hover:bg-green-300',
        sentenceDot: 'bg-emerald-400 hover:bg-emerald-500',
        modal: 'bg-black bg-opacity-50',
    },
    sunset: {
        name: 'Sunset',
        background: 'bg-orange-50',
        primary: 'text-orange-600',
        secondary: 'text-orange-800',
        button: 'bg-orange-500 hover:bg-orange-600',
        card: 'bg-white',
        wordDot: 'bg-orange-200 hover:bg-orange-300',
        sentenceDot: 'bg-red-400 hover:bg-red-500',
        modal: 'bg-black bg-opacity-50',
    },
};

// Theme Context
const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

// IconButton Component
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

// Modal Component using React Portal
const Modal = ({ title, onClose, children }) => {
    const { theme } = useTheme();
    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 ${theme.modal} backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 z-50`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className={`${theme.card} p-6 sm:p-10 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto`}>
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <h2 id="modal-title" className={`text-3xl sm:text-5xl font-bold ${theme.primary}`}>
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

// SentenceBuilder Component
const SentenceBuilder = () => {
    const [sentences, setSentences] = useState([
        {
            words: [
                { word: 'The', type: 'determiner', punctuation: '' },
                { word: 'dog', type: 'noun', punctuation: '.' },
            ],
        },
    ]);
    const [activeIndex, setActiveIndex] = useState(null);
    const [activeSentence, setActiveSentence] = useState(null);
    const [currentTheme, setCurrentTheme] = useState('ocean');
    const [showPreview, setShowPreview] = useState(false);
    const [showWordEditor, setShowWordEditor] = useState(false);
    const [editingWord, setEditingWord] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const { theme } = useTheme();

    const playSound = useCallback(
        (soundName) => {
            if (soundEnabled) {
                console.log(`Playing sound: ${soundName}`);
            }
        },
        [soundEnabled]
    );

    const addNewSentence = (position) => {
        playSound('add');
        const newSentence = {
            words: [
                { word: 'The', type: 'determiner', punctuation: '' },
                { word: 'cat', type: 'noun', punctuation: '.' },
            ],
        };
        const newSentences = [...sentences];
        newSentences.splice(position, 0, newSentence);
        setSentences(newSentences);
    };

    const deleteSentence = (index) => {
        const newSentences = [...sentences];
        newSentences.splice(index, 1);
        setSentences(newSentences);
        playSound('delete');
    };

    const saveSentences = () => {
        playSound('save');
        const text = sentences
            .map((sentence) => sentence.words.map((w) => w.word + w.punctuation).join(' '))
            .join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-story.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <ThemeContext.Provider value={{ theme, setCurrentTheme }}>
            <div className={`min-h-screen ${theme.background} p-4 sm:p-8 transition-colors duration-500`}>
                <header className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-12 p-4 sm:p-6 bg-white rounded-2xl shadow-lg">
                    <h1 className={`text-3xl sm:text-5xl font-bold ${theme.primary}`}>Sentence Builder</h1>
                    <nav className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6 mt-4 sm:mt-0">
                        <IconButton
                            icon={soundEnabled ? Volume2 : VolumeX}
                            label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`${theme.button}`}
                            size={24}
                        />
                        <IconButton
                            icon={Eye}
                            label="Preview story"
                            onClick={() => setShowPreview(true)}
                            className={`${theme.button}`}
                            size={24}
                        />
                        <div className="relative group">
                            <IconButton
                                icon={Palette}
                                label="Change theme"
                                className={`${theme.button}`}
                                size={24}
                            />
                            <div className="absolute right-0 mt-2 py-2 w-40 bg-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                {Object.entries(themes).map(([key, value]) => (
                                    <button
                                        key={key}
                                        onClick={() => setCurrentTheme(key)}
                                        className={`block w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${currentTheme === key ? 'font-bold' : ''}`}
                                    >
                                        {value.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </nav>
                </header>

                <main className="space-y-8 sm:space-y-12">
                    {sentences.map((sentence, index) => (
                        <div key={index} className={`p-4 sm:p-6 ${theme.card} rounded-xl shadow-md`}>
                            {sentence.words.map((word, idx) => (
                                <span key={idx} className={`text-lg sm:text-2xl ${theme.primary} mr-2`}>
                                    {word.word + word.punctuation}
                                </span>
                            ))}
                            <IconButton
                                icon={X}
                                label="Delete sentence"
                                onClick={() => deleteSentence(index)}
                                className="bg-red-500 hover:bg-red-600"
                                size={20}
                            />
                        </div>
                    ))}
                    <button
                        onClick={() => addNewSentence(sentences.length)}
                        className={`mt-4 sm:mt-8 px-4 py-2 ${theme.button} text-white rounded-xl`}
                    >
                        Add Sentence
                    </button>
                    <button
                        onClick={saveSentences}
                        className={`mt-4 sm:mt-8 px-4 py-2 ${theme.button} text-white rounded-xl`}
                    >
                        Save Story
                    </button>
                </main>
            </div>
        </ThemeContext.Provider>
    );
};

export default SentenceBuilder;


2) 
