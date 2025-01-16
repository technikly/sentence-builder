// src/SentenceBuilder.jsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Save,
  RefreshCw,
  Eye,
  Volume2,
  VolumeX,
  X,
  Palette
} from 'lucide-react';

import { themes } from './themes';
import {
  csvToVocabCategory,
  wordClassColours,
  wordClassBackgroundColours
} from './mappings';
import IconButton from './IconButton';
import ResizableDraggableModal from './ResizableDraggableModal'; // Ensure correct import path
import WordContextMenu from './WordContextMenu';
import PunctuationEditor from './PunctuationEditor';
import WordEditor from './WordEditor';
import EditableWord from './EditableWord'; // New import
import { parseCSV } from './parseCSV';
import WordDot from './WordDot';
import SentenceDot from './SentenceDot';

// Import TTS functions and configurations
import { speakText, initializeVoices, ttsConfig } from './tts';

// Import Spell Checker functions
import { checkSpelling, getSuggestions, initializeSpellChecker } from './spellChecker';

const SentenceBuilder = () => {
  /**
   * ---------------------------
   * State Variables
   * ---------------------------
   */

  // Existing state variables
  const [text, setText] = useState(''); // New state variable for the main text
  const [currentTheme, setCurrentTheme] = useState('ocean');
  const [showPreview, setShowPreview] = useState(false);
  const [showWordEditor, setShowWordEditor] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    word: null
  });
  const [hoveredWord, setHoveredWord] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vocabularyDB, setVocabularyDB] = useState({
    determiners: ['the', 'a', 'that', 'this'],
    nouns: ['dog', 'cat', 'bird', 'rabbit', 'fish', 'car', 'tree', 'house'],
    verbs: ['ran', 'jumped', 'walked', 'slept', 'played', 'drove', 'climbed', 'ate'],
    adjectives: ['happy', 'quick', 'sleepy', 'hungry', 'playful', 'bright', 'dark', 'silent'],
    adverbs: [
      'quickly',
      'silently',
      'happily',
      'sadly',
      'gracefully',
      'loudly',
      'eagerly',
      'brightly'
    ],
    prepositions: ['with', 'under', 'behind', 'near', 'beside', 'between', 'above', 'around'],
    conjunctions: ['and', 'but', 'or', 'so', 'yet', 'for', 'nor', 'although']
  });
  const [customWord, setCustomWord] = useState('');
  const [customWordType, setCustomWordType] = useState('unknown');
  const [filter, setFilter] = useState('all'); // 'all' or specific word type

  // **New State Variable for wordie.csv**
  const [wordieDB, setWordieDB] = useState({
    determiners: [],
    nouns: [],
    verbs: [],
    adjectives: [],
    adverbs: [],
    prepositions: [],
    conjunctions: []
  });

  // **New State Variables for Spell Checking**
  const [misspelledWords, setMisspelledWords] = useState({}); // {word: [positions]}
  const [suggestions, setSuggestions] = useState({}); // {word: [suggestions]}

  const theme = themes[currentTheme];

  // Reference to the textarea for cursor manipulation
  const textareaRef = useRef(null);

  /**
   * ---------------------------
   * Data Fetch / CSV Parsing
   * ---------------------------
   */

  // Existing useEffect for vocabulary.csv
  useEffect(() => {
    fetch('/vocabulary.csv')
      .then((response) => {
        if (!response.ok) {
          throw new Error('CSV not found');
        }
        return response.text();
      })
      .then((csvText) => {
        const parsed = parseCSV(csvText);
        setVocabularyDB((prev) => {
          const newVocab = { ...prev };
          parsed.forEach((row) => {
            Object.keys(row).forEach((header) => {
              if (header === 'punctuation') return;
              const category = csvToVocabCategory[header];
              if (!category) return;
              const word = row[header].trim();
              if (word) {
                const lowerCaseWords = newVocab[category].map((w) => w.toLowerCase());
                if (!lowerCaseWords.includes(word.toLowerCase())) {
                  newVocab[category].push(word);
                }
              }
            });
          });
          return newVocab;
        });
      })
      .catch((error) => {
        console.log('No vocabulary.csv found or failed to load:', error);
      });
  }, []);

  // **New useEffect for wordie.csv**
  useEffect(() => {
    fetch('/wordie.csv')
      .then((response) => {
        if (!response.ok) {
          throw new Error('wordie.csv not found');
        }
        return response.text();
      })
      .then((csvText) => {
        const parsed = parseCSV(csvText);
        setWordieDB((prev) => {
          const newWordie = { ...prev };
          parsed.forEach((row) => {
            Object.keys(row).forEach((header) => {
              if (header === 'punctuation') return;
              const category = csvToVocabCategory[header];
              if (!category) return;
              const word = row[header].trim();
              if (word) {
                const lowerCaseWords = newWordie[category].map((w) => w.toLowerCase());
                if (!lowerCaseWords.includes(word.toLowerCase())) {
                  newWordie[category].push(word);
                }
              }
            });
          });
          return newWordie;
        });
      })
      .catch((error) => {
        console.log('No wordie.csv found or failed to load:', error);
      });
  }, []);

  /**
   * ---------------------------
   * Sound-Related Functions
   * ---------------------------
   */
  const playSound = useCallback(
    (soundName) => {
      if (soundEnabled) {
        console.log(`Playing sound: ${soundName}`);
      }
    },
    [soundEnabled]
  );

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  /**
   * ---------------------------
   * Text-to-Speech Initialization
   * ---------------------------
   */
  useEffect(() => {
    initializeVoices()
      .then((voices) => {
        console.log('Available voices:', voices);
        // Optionally, set a default voice or handle voice selection here
      })
      .catch((error) => {
        console.error('Error initializing voices:', error);
      });
  }, []);

  /**
   * ---------------------------
   * Spell Checker Initialization
   * ---------------------------
   */
  useEffect(() => {
    initializeSpellChecker()
      .then(() => {
        console.log('Spell checker initialized');
        performSpellCheck();
      })
      .catch((error) => {
        console.error('Error initializing spell checker:', error);
      });
  }, [vocabularyDB, wordieDB]);

  /**
   * ---------------------------
   * Spell Checking Functions
   * ---------------------------
   */

  // Function to perform spell check on all words in the text
  const performSpellCheck = () => {
    const words = text.split(/\s+/);
    const newMisspelled = {};
    const newSuggestions = {};

    words.forEach((word, idx) => {
      const cleanWord = word.replace(/[^A-Za-z']/g, ''); // Remove punctuation
      if (cleanWord && !checkSpelling(cleanWord)) {
        newMisspelled[idx] = true;
        newSuggestions[idx] = getSuggestions(cleanWord);
      }
    });

    setMisspelledWords(newMisspelled);
    setSuggestions(newSuggestions);
  };

  // Re-run spell check whenever text changes
  useEffect(() => {
    performSpellCheck();
  }, [text]);

  /**
   * ---------------------------
   * Helper: Check if a word is in local DB
   * ---------------------------
   */
  const checkWordInVocabDB = (word) => {
    if (!word.trim()) return 'unknown';
    
    // **Check in vocabularyDB first**
    for (const [category, words] of Object.entries(vocabularyDB)) {
      if (words.map((w) => w.toLowerCase()).includes(word.toLowerCase())) {
        return category.slice(0, -1); // Return singular form
      }
    }
    
    // **Then check in wordieDB**
    for (const [category, words] of Object.entries(wordieDB)) {
      if (words.map((w) => w.toLowerCase()).includes(word.toLowerCase())) {
        return category.slice(0, -1); // Return singular form
      }
    }
    
    return 'unknown';
  };

  // Whenever `customWord` changes, figure out the best guess for its type
  useEffect(() => {
    setCustomWordType(checkWordInVocabDB(customWord));
  }, [customWord, wordieDB, vocabularyDB]);

  /**
   * ---------------------------
   * Word Selection & Insertion
   * ---------------------------
   */
  const handleWordSelect = (word, type) => {
    // Insert the selected word at the cursor position in the textarea
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newWord = word + ' ';
    const newText = before + newWord + after;
    setText(newText);
    playSound('select');

    // Move cursor after the inserted word
    setTimeout(() => {
      const cursorPosition = start + newWord.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
      textarea.focus();
    }, 0);

    // Reset the custom input box if used
    setCustomWord('');
    setCustomWordType('unknown');
  };

  /**
   * ---------------------------
   * Sentence CRUD
   * ---------------------------
   */
  const addNewSentence = (insertPosition) => {
    playSound('add');
    // In a text area approach, sentences are separated by periods.
    // This function can insert a new line or a period to denote a new sentence.
    setText(prevText => prevText + '. ');
  };

  const deleteSentence = (sentenceIndex) => {
    playSound('delete');
    // In a text area approach, deleting a sentence isn't straightforward.
    // You might implement sentence selection or provide other mechanisms.
    // For simplicity, this function is left as a placeholder.
    console.warn('Delete sentence functionality is not directly applicable in the text area approach.');
  };

  /**
   * Randomizes the first 3 words in the text (determiner, adjective, noun)
   * and ensures the last word has punctuation.
   * If the text is empty, it will create a new set of 3 words.
   */
  const randomizeStartingPhrase = () => {
    playSound('change');
    const determiner =
      vocabularyDB.determiners[
        Math.floor(Math.random() * vocabularyDB.determiners.length)
      ];
    const adjective =
      vocabularyDB.adjectives[
        Math.floor(Math.random() * vocabularyDB.adjectives.length)
      ];
    const noun =
      vocabularyDB.nouns[Math.floor(Math.random() * vocabularyDB.nouns.length)];

    let newText = determiner + ' ' + adjective + ' ' + noun + '. ';
    setText(prevText => newText + prevText);
  };

  /**
   * ---------------------------
   * Saving Sentences to File
   * ---------------------------
   */
  const saveSentencesAsTextFile = () => {
    playSound('save');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'my-story.txt';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  /**
   * ---------------------------
   * Context Menu
   * ---------------------------
   */
  const handleWordRightClick = (e, word) => {
    e.preventDefault();
    e.stopPropagation();

    let xPos = e.pageX;
    let yPos = e.pageY;

    const menuWidth = 220;
    const menuHeight = 100; // Adjusted for fewer options
    if (xPos + menuWidth > window.innerWidth) {
      xPos = window.innerWidth - menuWidth - 10;
    }
    if (yPos + menuHeight > window.innerHeight) {
      yPos = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({
      visible: true,
      x: xPos,
      y: yPos,
      word
    });
  };

  const deleteWord = (word) => {
    // Implement word deletion logic if needed
    // For simplicity, this function is left as a placeholder
    console.warn('Delete word functionality is not directly implemented.');
  };

  // Closes context menu on outside click
  const closeContextMenu = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false, word: null });
    }
  };

  // Hide context menu on scroll or window resize
  useEffect(() => {
    const handleScrollOrResize = () => closeContextMenu();
    window.addEventListener('scroll', handleScrollOrResize);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [contextMenu.visible]);

  // Hide context menu on any window click
  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    return () => {
      window.removeEventListener('click', closeContextMenu);
    };
  }, []);

  /**
   * ---------------------------
   * Render
   * ---------------------------
   */
  return (
    <div
      className={`min-h-screen ${theme.background} p-4 sm:p-8 transition-colors duration-500`}
    >
      <div className="w-full">
        {/* 
          ===================================== 
          =============== HEADER ===============
          =====================================
        */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-12 p-4 sm:p-6 bg-white rounded-2xl shadow-lg">
          <h1
            className={`font-bold ${theme.primary} text-2xl sm:text-3xl md:text-4xl lg:text-5xl transition-colors duration-500 text-center sm:text-left`}
          >
            Sentence Builder
          </h1>
          <nav
            className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6 mt-4 sm:mt-0"
            aria-label="Main controls"
          >
            <IconButton
              icon={soundEnabled ? Volume2 : VolumeX}
              label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
              onClick={toggleSound}
              className={theme.button}
              size={24}
            />

            <IconButton
              icon={Eye}
              label="Preview your story"
              onClick={() => setShowPreview(true)}
              className={theme.button}
              size={24}
            />

            {/* THEME DROPDOWN */}
            <div className="relative group">
              <IconButton
                icon={Palette}
                label="Change theme"
                className={theme.button}
                size={24}
              />
              <div className="absolute right-0 mt-2 py-2 w-40 bg-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                {Object.entries(themes).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentTheme(key)}
                    className={`block w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                      currentTheme === key ? 'font-bold' : ''
                    }`}
                  >
                    {value.name}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </header>

        {/* 
          ===================================== 
          =========== MAIN CONTENT ============
          =====================================
        */}
        <main className="space-y-8 sm:space-y-12">
          {/**
           * MAIN TEXT AREA
           */}
          <div className="flex flex-col">
            <label
              htmlFor="mainText"
              className={`block mb-2 font-medium ${theme.primary} text-base sm:text-lg`}
            >
              Your Story:
            </label>
            <textarea
              id="mainText"
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onContextMenu={(e) => {
                const selection = window.getSelection();
                const selectedText = selection.toString();
                if (selectedText) {
                  handleWordRightClick(e, selectedText);
                }
              }}
              className={`w-full min-h-[200px] border-2 ${
                Object.keys(misspelledWords).length > 0 ? 'border-red-500' : 'border-gray-300'
              } rounded-md p-4 text-base sm:text-lg outline-none focus:ring-2 focus:ring-blue-200`}
              spellCheck="true"
              placeholder="Start typing your story here..."
            />

            {/* Highlight Misspelled Words */}
            {Object.keys(misspelledWords).length > 0 && (
              <p className="mt-2 text-red-500">
                There are misspelled words in your text.
              </p>
            )}
          </div>

          {/**
           * WORD BANK
           */}
          <div className="flex flex-col">
            <h2 className={`font-semibold mb-4 ${theme.secondary} text-base sm:text-lg md:text-xl`}>
              Word Bank:
            </h2>

            {/**
             * --- 1) FILTER BUTTONS ---
             */}
            <div className="mb-6">
              <span className={`block mb-2 font-medium ${theme.primary} text-base sm:text-lg`}>
                Filter by Type:
              </span>
              <div className="flex flex-wrap gap-2">
                {/* 'All' Filter */}
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-full ${
                    filter === 'all'
                      ? `${wordClassBackgroundColours['determiner']} font-bold`
                      : 'bg-gray-300 hover:bg-gray-400'
                  } text-white text-sm sm:text-base`}
                >
                  All
                </button>
                {/* Dynamic Filters based on vocabularyDB */}
                {Object.keys(vocabularyDB).map((category) => (
                  <button
                    key={category}
                    onClick={() => setFilter(category.slice(0, -1))} // e.g., 'determiners' to 'determiner'
                    className={`px-3 py-1 rounded-full ${
                      filter === category.slice(0, -1)
                        ? `${wordClassBackgroundColours[category.slice(0, -1)]} font-bold`
                        : 'bg-gray-300 hover:bg-gray-400'
                    } text-white text-sm sm:text-base`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1, -1)}
                  </button>
                ))}
              </div>
            </div>

            {/** 
             * --- 2) CUSTOM TYPED WORD BOX ---
             */}
            <div className="mb-6">
              <label
                className={`block mb-2 font-medium ${theme.primary} text-base sm:text-lg`}
                htmlFor="customWord"
              >
                Type your own word:
              </label>
              <input
                id="customWord"
                type="text"
                value={customWord}
                onChange={(e) =>
                  setCustomWord(e.target.value.replace(/[^A-Za-z'"]/g, ''))
                }
                className={`block w-full border-2 ${
                  customWord && !checkSpelling(customWord) ? 'border-red-500' : 'border-gray-300'
                } rounded-md p-2 text-base sm:text-lg outline-none focus:ring-2 focus:ring-blue-200`}
                spellCheck="true"
                placeholder="Enter a word..."
              />
              {customWord && !checkSpelling(customWord) && (
                <div className="mt-2">
                  <p className="text-red-500">Misspelled word. Suggestions:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {getSuggestions(customWord).slice(0, 5).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCustomWord(suggestion)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {/* Preview of the typed word with coloring */}
                <span
                  className={`inline-block px-4 py-2 rounded-md text-white text-sm sm:text-base ${
                    customWordType !== 'unknown'
                      ? wordClassBackgroundColours[customWordType]
                      : 'bg-black'
                  } cursor-pointer`}
                  onMouseEnter={() => {
                    if (customWord.trim()) {
                      setHoveredWord({
                        word: customWord,
                        type: customWordType === 'unknown' ? 'unknown' : customWordType,
                        isCustom: true,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredWord(null)}
                  onClick={() => {
                    if (customWord.trim() && checkSpelling(customWord)) {
                      handleWordSelect(
                        customWord,
                        customWordType === 'unknown' ? 'unknown' : customWordType
                      );
                    }
                  }}
                >
                  {customWord || '(no word)'}
                </span>
                {/* Button to insert this typed word */}
                <button
                  onClick={() => {
                    if (customWord.trim() && checkSpelling(customWord)) {
                      handleWordSelect(
                        customWord,
                        customWordType === 'unknown' ? 'unknown' : customWordType
                      );
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-semibold text-sm sm:text-base"
                  disabled={!customWord.trim() || !checkSpelling(customWord)}
                  title={
                    !checkSpelling(customWord)
                      ? 'Cannot add misspelled word'
                      : 'Add This Word'
                  }
                >
                  Add This Word
                </button>
              </div>
            </div>

            {/**
             * --- 3) EXISTING VOCAB CATEGORIES ---
             */}
            <div>
              {Object.entries(vocabularyDB).map(([category, words]) => (
                // Apply filtering at the category level
                (filter === 'all' || category.slice(0, -1) === filter) && (
                  <div key={category} className="mb-4">
                    <h4
                      className={`font-medium ${theme.primary} capitalize text-base sm:text-lg md:text-xl`}
                    >
                      {category.replace(/([A-Z])/g, ' $1').trim()}:
                    </h4>
                    <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
                      {words.map((word) => (
                        <button
                          key={word}
                          onMouseEnter={() =>
                            setHoveredWord({
                              word,
                              type: category.slice(0, -1)
                            })
                          }
                          onMouseLeave={() => setHoveredWord(null)}
                          onClick={() => {
                            handleWordSelect(word, category.slice(0, -1));
                          }}
                          className={`px-4 sm:px-6 py-2 sm:py-3 ${
                            wordClassBackgroundColours[category.slice(0, -1)]
                          } rounded-xl text-white transition-all duration-300 hover:scale-105 text-sm sm:text-base md:text-lg`}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/**
           * SAVE BUTTON
           */}
          {text.trim().length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={saveSentencesAsTextFile}
                className={`flex items-center gap-2 sm:gap-4 px-6 sm:px-12 py-4 sm:py-6 ${theme.button} text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 text-base sm:text-lg md:text-2xl`}
              >
                <Save size={24} className="sm:hidden" />
                <Save size={32} className="hidden sm:inline" />
                <span className="hidden sm:inline">Save My Story</span>
              </button>
            </div>
          )}
        </main>

        {/**
         * =====================================
         * ========== ADD WORD MODAL ===========
         * =====================================
         */}
        {hoveredWord && (
          <ResizableDraggableModal
            title="Word Options"
            onClose={() => setHoveredWord(null)}
            theme={theme}
            className="" // Removed width and height limiting classes
          >
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => {
                  handleWordSelect(hoveredWord.word, hoveredWord.type);
                  setHoveredWord(null);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
              >
                Insert "{hoveredWord.word}"
              </button>
              <button
                onClick={() => {
                  // Additional options like delete can be added here
                  deleteWord(hoveredWord.word);
                  setHoveredWord(null);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
              >
                Delete "{hoveredWord.word}"
              </button>
            </div>
          </ResizableDraggableModal>
        )}

        {/**
         * =====================================
         * ========== WORD/PUNCT. EDITOR ========
         * =====================================
         */}
        {showWordEditor && editingWord && (
          <ResizableDraggableModal
            title={
              editingWord.mode === 'addPunctuation'
                ? 'Add Punctuation'
                : editingWord.mode === 'editPunctuation'
                ? 'Edit Punctuation'
                : 'Edit Word'
            }
            onClose={() => {
              setShowWordEditor(false);
              setEditingWord(null);
            }}
            theme={theme}
            className="" // Removed width and height limiting classes
          >
            {editingWord.mode === 'addPunctuation' ||
            editingWord.mode === 'editPunctuation' ? (
              <PunctuationEditor
                sentenceIndex={null} // Not applicable in text area approach
                wordIndex={null} // Not applicable in text area approach
                sentences={[]} // Not applicable
                setSentences={() => {}} // Not applicable
                closeEditor={() => {
                  setShowWordEditor(false);
                  setEditingWord(null);
                }}
                playSound={playSound}
                theme={theme}
              />
            ) : (
              <WordEditor
                sentenceIndex={null} // Not applicable in text area approach
                wordIndex={null} // Not applicable in text area approach
                sentences={[]} // Not applicable
                setSentences={() => {}} // Not applicable
                closeEditor={() => {
                  setShowWordEditor(false);
                  setEditingWord(null);
                }}
                playSound={playSound}
                theme={theme}
              />
            )}
          </ResizableDraggableModal>
        )}

        {/**
         * =====================================
         * =========== STORY PREVIEW ===========
         * =====================================
         */}
        {showPreview && (
          <ResizableDraggableModal
            title="Your Story Preview"
            onClose={() => setShowPreview(false)}
            theme={theme}
            className="" // Removed width and height limiting classes
          >
            <div className="space-y-6 sm:space-y-8">
              <p
                className={`${theme.secondary} leading-relaxed text-lg sm:text-xl md:text-2xl lg:text-3xl`}
              >
                {text}
              </p>
            </div>
          </ResizableDraggableModal>
        )}
      </div>
    </div>
  );
};

export default SentenceBuilder;
