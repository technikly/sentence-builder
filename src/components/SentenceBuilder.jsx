// src/SentenceBuilder.jsx

import { useState, useCallback, useEffect, Fragment } from 'react';
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
import { parseCSV } from './parseCSV';
import WordDot from './WordDot';
import SentenceDot from './SentenceDot';
import { fetchWordClass, fetchSuggestions } from '../utils/dictionary';

// Import TTS functions and configurations
import { speakText, initializeVoices } from './tts';

const SentenceBuilder = () => {
  /**
   * ---------------------------
   * State Variables
   * ---------------------------
   */

  // Existing state variables
  const [sentences, setSentences] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('ocean');
  const [showPreview, setShowPreview] = useState(false);
  const [showWordEditor, setShowWordEditor] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    sentenceIndex: null,
    wordIndex: null
  });
  const [hoveredWordIndex, setHoveredWordIndex] = useState(null);
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
  const [customSuggestions, setCustomSuggestions] = useState([]);
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

  const theme = themes[currentTheme];

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
   * Punctuation Handlers
   * ---------------------------
   */
  const openAddPunctuationEditor = (sentenceIndex, wordIndex) => {
    setEditingWord({ sentenceIndex, wordIndex, mode: 'addPunctuation' });
    setShowWordEditor(true);
  };

  const openEditPunctuationEditor = (sentenceIndex, wordIndex) => {
    setEditingWord({ sentenceIndex, wordIndex, mode: 'editPunctuation' });
    setShowWordEditor(true);
  };

  /**
   * ---------------------------
   * Capitalization / Case
   * ---------------------------
   */
  const toggleCase = (sentenceIndex, wordIndex) => {
    const newSentences = [...sentences];
    const word = newSentences[sentenceIndex].words[wordIndex].word;
    const firstChar = word[0];
    newSentences[sentenceIndex].words[wordIndex].word =
      firstChar === firstChar.toUpperCase()
        ? firstChar.toLowerCase() + word.slice(1)
        : firstChar.toUpperCase() + word.slice(1);

    // After toggling case, re-check the word's type
    const updatedWord = newSentences[sentenceIndex].words[wordIndex].word;
    const updatedType = checkWordInVocabDB(updatedWord);
    newSentences[sentenceIndex].words[wordIndex].type = updatedType;

    setSentences(newSentences);
    playSound('change');
  };

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
  // and retrieve predictive suggestions from an online dictionary. A
  // debounce ensures we don't query on every keypress.
  useEffect(() => {
    if (!customWord) {
      setCustomWordType('unknown');
      setCustomSuggestions([]);
      return;
    }

    const handler = setTimeout(async () => {
      // First check local vocab databases
      let type = checkWordInVocabDB(customWord);

      // If not found locally, query the Datamuse API for part of speech
      if (type === 'unknown') {
        type = await fetchWordClass(customWord);
      }
      setCustomWordType(type);

      // Fetch predictive suggestions (including spelling corrections)
      const suggestions = await fetchSuggestions(customWord);
      setCustomSuggestions(suggestions);
    }, 1000); // 1 second debounce

    return () => clearTimeout(handler);
  }, [customWord, wordieDB, vocabularyDB]);

  /**
   * ---------------------------
   * Update Hovered Word Index When Custom Word Changes
   * ---------------------------
   */
  useEffect(() => {
    if (hoveredWordIndex?.isCustom) {
      setHoveredWordIndex((prev) => ({
        ...prev,
        word: customWord,
        type: customWordType === 'unknown' ? 'unknown' : customWordType,
      }));
    }
  }, [customWord, customWordType, hoveredWordIndex]);

  /**
   * ---------------------------
   * Word Selection & Insertion
   * ---------------------------
   */
  const handleWordSelect = (word, type) => {
    if (activeIndex === null || activeSentenceIndex === null) return;
    playSound('select');

    const newSentences = [...sentences];
    const currentSentence = newSentences[activeSentenceIndex];
    const newWord = { word, type, punctuation: '' };

    // Insert the new word at the chosen index
    if (activeIndex === currentSentence.words?.length) {
      currentSentence.words.push(newWord);
    } else {
      currentSentence.words.splice(activeIndex, 0, newWord);
    }

    setSentences(newSentences);
    setActiveIndex(null);
    setActiveSentenceIndex(null);
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
    // Create a brand-new, empty sentence
    const newSentence = {
      words: []
    };

    const newSentences = [...sentences];
    newSentences.splice(insertPosition, 0, newSentence);
    setSentences(newSentences);
  };

  const deleteSentence = (sentenceIndex) => {
    playSound('delete');
    const newSentences = [...sentences];
    newSentences.splice(sentenceIndex, 1);
    setSentences(newSentences);
  };

  /**
   * Randomizes the first 3 words in a sentence (determiner, adjective, noun)
   * and ensures the last word has punctuation. If the sentence is empty,
   * it will create a new set of 3 words.
   */
  const randomizeStartingPhrase = (sentenceIndex) => {
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

    const newSentences = [...sentences];
    newSentences[sentenceIndex].words = [
      { word: determiner, type: 'determiner', punctuation: '' },
      { word: adjective, type: 'adjective', punctuation: '' },
      { word: noun, type: 'noun', punctuation: '.' }
    ];
    setSentences(newSentences);
  };

  /**
   * ---------------------------
   * Saving Sentences to File
   * ---------------------------
   */
  const saveSentencesAsTextFile = () => {
    playSound('save');
    const textContent = sentences
      .map((sentence) =>
        sentence.words.map((w) => w.word + w.punctuation).join(' ')
      )
      .join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
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
  const handleWordRightClick = (e, sentenceIndex, wordIndex) => {
    e.preventDefault();
    e.stopPropagation();

    const wordObj = sentences[sentenceIndex].words[wordIndex];
    const hasPunctuation = Boolean(wordObj.punctuation);

    let xPos = e.pageX;
    let yPos = e.pageY;

    const menuWidth = 220;
    const menuHeight = 300;
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
      sentenceIndex,
      wordIndex,
      hasPunctuation
    });
  };

  const deleteWord = (sentenceIndex, wordIndex) => {
    const newSentences = [...sentences];
    const selectedSentence = newSentences[sentenceIndex];

    // Remove the restriction; now a sentence can be empty
    selectedSentence.words.splice(wordIndex, 1);
    setSentences(newSentences);
    playSound('delete');
  };

  // Closes context menu on outside click
  const closeContextMenu = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
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
           * If there are no sentences, display a SentenceDot
           * so users can add their first sentence.
           */}
          {sentences.length === 0 ? (
            <div className="flex justify-center">
              <SentenceDot onClick={() => addNewSentence(0)} theme={theme} />
            </div>
          ) : (
            /**
             * Otherwise, display all existing sentences.
             */
            sentences.map((sentence, sentenceIndex) => (
              <div key={sentenceIndex}>
                {/* Sentence Card */}
                <div
                  className={`flex flex-wrap items-center gap-4 sm:gap-8 p-8 sm:p-16 ${theme.card} rounded-2xl shadow-xl`}
                >
                  {/*
                    Leading WordDot to insert a word at the start (index 0)
                  */}
                  <WordDot
                    onClick={() => {
                      setActiveIndex(0);
                      setActiveSentenceIndex(sentenceIndex);
                      playSound('select');
                    }}
                    theme={theme}
                  />

                  {/*
                    Map each word in the sentence
                  */}
                    {(sentence.words || []).map((wordObj, wordIndex) => (
                      <Fragment key={wordIndex}>
                      <div className="flex items-center gap-2 relative">
                        <span
                          onClick={(e) => handleWordRightClick(e, sentenceIndex, wordIndex)}
                          className={`font-bold tracking-wide transition-colors duration-500 cursor-pointer hover:opacity-80 text-xl sm:text-2xl md:text-3xl lg:text-4xl ${wordClassColours[wordObj.type]}`}
                        >
                          {wordObj.word}
                          {wordObj.punctuation}
                        </span>

                        {/* CONTEXT MENU */}
                        {contextMenu.visible &&
                          contextMenu.sentenceIndex === sentenceIndex &&
                            contextMenu.wordIndex === wordIndex && (
                              <WordContextMenu
                              onCapitalize={() => {
                                toggleCase(sentenceIndex, wordIndex);
                                setContextMenu({ ...contextMenu, visible: false });
                              }}
                              onUncapitalize={() => {
                                toggleCase(sentenceIndex, wordIndex);
                                setContextMenu({ ...contextMenu, visible: false });
                              }}
                              onAddPunctuation={() => {
                                openAddPunctuationEditor(sentenceIndex, wordIndex);
                                setContextMenu({ ...contextMenu, visible: false });
                              }}
                              onEditPunctuation={() => {
                                openEditPunctuationEditor(sentenceIndex, wordIndex);
                                setContextMenu({ ...contextMenu, visible: false });
                              }}
                              onEdit={() => {
                                setEditingWord({ sentenceIndex, wordIndex, mode: 'edit' });
                                setShowWordEditor(true);
                                setContextMenu({ ...contextMenu, visible: false });
                              }}
                              onDelete={() => {
                                deleteWord(sentenceIndex, wordIndex);
                                setContextMenu({ ...contextMenu, visible: false });
                              }}
                              onClose={() =>
                                setContextMenu({ ...contextMenu, visible: false })
                              }
                              position={{ x: contextMenu.x, y: contextMenu.y }}
                              isCapitalized={
                                wordObj.word[0] === wordObj.word[0].toUpperCase()
                              }
                              hasPunctuation={wordObj.punctuation}
                              zIndexClass="z-[9999]"
                            />
                          )}
                      </div>

                      {/* WordDot after each word for inserting a new word */}
                      <WordDot
                        onClick={() => {
                          setActiveIndex(wordIndex + 1);
                          setActiveSentenceIndex(sentenceIndex);
                          playSound('select');
                        }}
                        theme={theme}
                      />
                      </Fragment>
                  ))}

                  {/*
                    Controls for this Sentence
                  */}
                  <div className="ml-4 sm:ml-8 flex items-center gap-2">
                    <IconButton
                      icon={X}
                      label="Delete this sentence"
                      onClick={() => deleteSentence(sentenceIndex)}
                      className="bg-red-500 hover:bg-red-600"
                      size={24}
                    />
                    <IconButton
                      icon={RefreshCw}
                      label="Randomize starting words"
                      onClick={() => randomizeStartingPhrase(sentenceIndex)}
                      className={`${theme.button} hover:rotate-180`}
                      size={24}
                    />

                    {/* New TTS Button */}
                    <IconButton
                      icon={Volume2}
                      label="Read this sentence aloud"
                      onClick={() => {
                        const sentenceText = sentence.words.map(w => w.word + w.punctuation).join(' ');
                        speakText(sentenceText);
                      }}
                      className={`${theme.button} bg-green-500 hover:bg-green-600`}
                      size={24}
                    />
                  </div>
                </div>

                {/*
                  SentenceDot to add a new sentence immediately below
                */}
                <div className="flex justify-center mt-4 sm:mt-8">
                  <SentenceDot
                    onClick={() => addNewSentence(sentenceIndex + 1)}
                    theme={theme}
                  />
                </div>
              </div>
            ))
          )}

          {/*
            SAVE BUTTON
          */}
          {sentences.length > 0 && (
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
        {activeIndex !== null && activeSentenceIndex !== null && (
          <ResizableDraggableModal
            title="Choose a Word to Insert"
            onClose={() => {
              setActiveIndex(null);
              setActiveSentenceIndex(null);
              setHoveredWordIndex(null);
              setCustomWord('');
              setCustomWordType('unknown');
            }}
            theme={theme}
            className="" // Removed width and height limiting classes
          >
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
              {/* 
                PREVIEW of CURRENT SENTENCE 
              */}
              <div className="flex-1 bg-gray-50 p-6 rounded-lg shadow-lg">
                <h3
                  className={`font-semibold mb-4 ${theme.secondary} text-base sm:text-lg md:text-xl`}
                >
                  Current Sentence:
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                    {sentences[activeSentenceIndex].words.map((wordObj, idx) => (
                      <Fragment key={idx}>
                      {idx === activeIndex && (
                        hoveredWordIndex ? (
                          <button
                            onClick={() =>
                              handleWordSelect(
                                hoveredWordIndex.word,
                                hoveredWordIndex.type === 'unknown'
                                  ? 'unknown'
                                  : hoveredWordIndex.type
                              )
                            }
                            className={`font-semibold transition-transform duration-300 text-xl sm:text-2xl md:text-3xl lg:text-4xl ${wordClassColours[hoveredWordIndex.type]}`}
                          >
                            {hoveredWordIndex.word}
                          </button>
                        ) : (
                          <span className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                        )
                      )}

                      {/* Existing word (bigger font for preview as well) */}
                      <span
                        className={`font-semibold transition-transform duration-300 text-xl sm:text-2xl md:text-3xl lg:text-4xl ${wordClassColours[wordObj.type]}`}
                      >
                        {wordObj.word}
                        {wordObj.punctuation}
                      </span>
                      </Fragment>
                  ))}

                  {/*
                    If activeIndex is at the end, show preview/dot after the last word
                  */}
                  {activeIndex === sentences[activeSentenceIndex].words.length && (
                    hoveredWordIndex ? (
                      <button
                        onClick={() =>
                          handleWordSelect(
                            hoveredWordIndex.word,
                            hoveredWordIndex.type === 'unknown'
                              ? 'unknown'
                              : hoveredWordIndex.type
                          )
                        }
                        className={`font-semibold transition-transform duration-300 text-xl sm:text-2xl md:text-3xl lg:text-4xl ${wordClassColours[hoveredWordIndex.type]}`}
                      >
                        {hoveredWordIndex.word}
                      </button>
                    ) : (
                      <span className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                    )
                  )}
                </div>
              </div>

              {/* 
                WORD BANK & CUSTOM INPUT
              */}
              <div className="flex-1 bg-white p-6 rounded-lg shadow-lg overflow-y-auto max-h-[70vh]">
                <h3
                  className={`font-semibold mb-4 ${theme.secondary} text-base sm:text-lg md:text-xl`}
                >
                  Word Bank:
                </h3>

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
                    className="block w-full border-2 border-gray-300 rounded-md p-2 text-base sm:text-lg outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {customSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customSuggestions.map((sug) => (
                        <button
                          key={sug}
                          onClick={() => setCustomWord(sug)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                        >
                          {sug}
                        </button>
                      ))}
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
                          setHoveredWordIndex({
                            word: customWord,
                            type: customWordType === 'unknown' ? 'unknown' : customWordType,
                            isCustom: true,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredWordIndex(null)}
                      onClick={() => {
                        if (customWord.trim()) {
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
                        if (customWord.trim()) {
                          handleWordSelect(
                            customWord,
                            customWordType === 'unknown' ? 'unknown' : customWordType
                          );
                        }
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-semibold text-sm sm:text-base"
                    >
                      Add This Word
                    </button>
                  </div>
                </div>

                {/**
                 * --- 3) EXISTING VOCAB CATEGORIES ---
                 */}
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
                              setHoveredWordIndex({
                                word,
                                type: category.slice(0, -1)
                              })
                            }
                            onMouseLeave={() => setHoveredWordIndex(null)}
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
                sentenceIndex={editingWord.sentenceIndex}
                wordIndex={editingWord.wordIndex}
                sentences={sentences}
                setSentences={setSentences}
                closeEditor={() => {
                  setShowWordEditor(false);
                  setEditingWord(null);
                }}
                playSound={playSound}
                theme={theme}
              />
            ) : (
              <WordEditor
                sentenceIndex={editingWord.sentenceIndex}
                wordIndex={editingWord.wordIndex}
                sentences={sentences}
                setSentences={setSentences}
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
              {sentences.map((sentence, index) => (
                <p
                  key={index}
                  className={`${theme.secondary} leading-relaxed text-lg sm:text-xl md:text-2xl lg:text-3xl`}
                >
                  {sentence.words.map((w) => w.word + w.punctuation).join(' ')}
                </p>
              ))}
            </div>
          </ResizableDraggableModal>
        )}
      </div>
    </div>
  );
};

export default SentenceBuilder;
