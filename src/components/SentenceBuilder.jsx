// src/SentenceBuilder.jsx

import { useState, useCallback, useEffect, Fragment, useMemo } from 'react';
import { Save, Eye, Volume2, VolumeX, X, Palette } from 'lucide-react';

import { themes } from './themes';
import { csvToVocabCategory, wordClassColours } from './mappings';
import WordMat from './WordMat';
import IconButton from './IconButton';
import ResizableDraggableModal from './ResizableDraggableModal'; // Ensure correct import path
import WordContextMenu from './WordContextMenu';
import PunctuationEditor from './PunctuationEditor';
import WordEditor from './WordEditor';
import { parseCSV } from './parseCSV';
import WordDot from './WordDot';
import SentenceDot from './SentenceDot';
import InlineWordInput from './InlineWordInput';
import { fetchWordClass } from '../utils/dictionary';
import { initializeSpellChecker, checkSpelling, getSuggestions } from '../spellChecker';

// Import TTS functions and configurations
import { speakText } from './tts';

const SentenceBuilder = () => {
  /**
   * ---------------------------
   * State Variables
   * ---------------------------
   */

  // Existing state variables
  const [sentences, setSentences] = useState([]);
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
  const [spellingSuggestions, setSpellingSuggestions] = useState({
    sentenceIndex: null,
    wordIndex: null,
    suggestions: []
  });
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

  const [typingPosition, setTypingPosition] = useState(null);
  const [showWordMat, setShowWordMat] = useState(false);

  const mergedVocabulary = useMemo(() => {
    const combined = {};
    Object.keys(vocabularyDB).forEach((key) => {
      combined[key] = Array.from(
        new Set([...(vocabularyDB[key] || []), ...(wordieDB[key] || [])])
      );
    });
    return combined;
  }, [vocabularyDB, wordieDB]);

  const theme = themes[currentTheme];

  useEffect(() => {
    initializeSpellChecker().catch((err) =>
      console.error('Spell checker init failed', err)
    );
  }, []);

  useEffect(() => {
    const handler = () =>
      setSpellingSuggestions({ sentenceIndex: null, wordIndex: null, suggestions: [] });
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

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
  // No voice initialization needed for online TTS

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

  const openSpellingSuggestions = (sentenceIndex, wordIndex) => {
    const word = sentences[sentenceIndex].words[wordIndex].word;
    const suggestions = getSuggestions(word);
    setSpellingSuggestions({ sentenceIndex, wordIndex, suggestions });
  };

  const applySpellingSuggestion = (sentenceIndex, wordIndex, suggestion) => {
    const newSentences = [...sentences];
    newSentences[sentenceIndex].words[wordIndex].word = suggestion;
    setSentences(newSentences);
    setSpellingSuggestions({ sentenceIndex: null, wordIndex: null, suggestions: [] });
  };

  /**
   * ---------------------------
   * Helper: Check if a word is in local DB
   * ---------------------------
   */
  const checkWordInVocabDB = useCallback(
    (word) => {
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
    },
    [vocabularyDB, wordieDB]
  );


  /**
   * ---------------------------
   * Word Selection & Insertion
   * ---------------------------
   */
  const startTyping = (sentenceIndex, wordIndex) => {
    playSound('select');
    setTypingPosition({ sentenceIndex, wordIndex });
  };

  const insertWord = async (word) => {
    if (!typingPosition) return;
    const { sentenceIndex, wordIndex } = typingPosition;

    let type = checkWordInVocabDB(word);
    if (type === 'unknown') {
      const contextWords = sentences[sentenceIndex].words.map((w) => w.word);
      contextWords.splice(wordIndex, 0, word);
      type = await fetchWordClass(word, contextWords.join(' '));
    }

    const newSentences = [...sentences];
    const newWord = { word, type, punctuation: '' };
    newSentences[sentenceIndex].words.splice(wordIndex, 0, newWord);
    setSentences(newSentences);
    setTypingPosition({ sentenceIndex, wordIndex: wordIndex + 1 });
    playSound('select');
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

  // Removed shuffle functionality for cleaner experience

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
                  {typingPosition &&
                  typingPosition.sentenceIndex === sentenceIndex &&
                  typingPosition.wordIndex === 0 ? (
                    <InlineWordInput
                      onSubmit={insertWord}
                      onCancel={() => setTypingPosition(null)}
                      theme={theme}
                      previousWord={null}
                    />
                  ) : (
                    <WordDot
                      onClick={() => startTyping(sentenceIndex, 0)}
                      theme={theme}
                    />
                  )}

                  {/*
                    Map each word in the sentence
                  */}
                    {(sentence.words || []).map((wordObj, wordIndex) => {
                      const misspelled = !checkSpelling(wordObj.word);
                      const suggestionOpen =
                        spellingSuggestions.sentenceIndex === sentenceIndex &&
                        spellingSuggestions.wordIndex === wordIndex;
                      return (
                        <Fragment key={wordIndex}>
                          <div className="flex items-center gap-2 relative">
                            <span className="relative">
                              <span
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (misspelled) {
                                    openSpellingSuggestions(sentenceIndex, wordIndex);
                                  } else {
                                    setSpellingSuggestions({
                                      sentenceIndex: null,
                                      wordIndex: null,
                                      suggestions: []
                                    });
                                    handleWordRightClick(e, sentenceIndex, wordIndex);
                                  }
                                }}
                                onContextMenu={(e) =>
                                  handleWordRightClick(e, sentenceIndex, wordIndex)
                                }
                                className={`font-bold tracking-wide transition-colors duration-500 cursor-pointer hover:opacity-80 text-xl sm:text-2xl md:text-3xl lg:text-4xl ${
                                  misspelled
                                    ? 'underline decoration-red-500 decoration-wavy'
                                    : wordClassColours[wordObj.type]
                                }`}
                              >
                                {wordObj.word}
                                {wordObj.punctuation}
                              </span>
                              {misspelled &&
                                suggestionOpen &&
                                spellingSuggestions.suggestions.length > 0 && (
                                  <div className="absolute left-0 top-full mt-1 w-max bg-white border border-gray-300 rounded-md shadow-lg z-10">
                                    {spellingSuggestions.suggestions
                                      .slice(0, 5)
                                      .map((suggestion, idx) => (
                                        <div
                                          key={idx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            applySpellingSuggestion(
                                              sentenceIndex,
                                              wordIndex,
                                              suggestion
                                            );
                                          }}
                                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        >
                                          {suggestion}
                                        </div>
                                      ))}
                                  </div>
                                )}
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
                                    setEditingWord({
                                      sentenceIndex,
                                      wordIndex,
                                      mode: 'edit'
                                    });
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
                          {typingPosition &&
                          typingPosition.sentenceIndex === sentenceIndex &&
                          typingPosition.wordIndex === wordIndex + 1 ? (
                            <InlineWordInput
                              onSubmit={insertWord}
                              onCancel={() => setTypingPosition(null)}
                              theme={theme}
                              previousWord={wordObj.word}
                            />
                          ) : (
                            <WordDot
                              onClick={() => startTyping(sentenceIndex, wordIndex + 1)}
                              theme={theme}
                            />
                          )}
                        </Fragment>
                      );
                    })}

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

      <IconButton
        icon={Palette}
        label={showWordMat ? 'Hide word mat' : 'Show word mat'}
        onClick={() => setShowWordMat(!showWordMat)}
        className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600"
        size={24}
      />

      <WordMat
        open={showWordMat}
        onClose={() => setShowWordMat(false)}
        vocabulary={mergedVocabulary}
        onWordClick={(word) => insertWord(word)}
      />

      {/* Inline word input is rendered directly in the sentence; modal removed */}

        {/**
         * =====================================
         * ========== WORD/PUNCT. EDITOR ========
         * =====================================
         */}
        {showWordEditor && editingWord && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 p-4 z-50 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-semibold ${theme.primary}`}>
                {editingWord.mode === 'addPunctuation'
                  ? 'Add Punctuation'
                  : editingWord.mode === 'editPunctuation'
                  ? 'Edit Punctuation'
                  : 'Edit Word'}
              </h2>
              <button
                onClick={() => {
                  setShowWordEditor(false);
                  setEditingWord(null);
                }}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
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
          </div>
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
                  {sentence.words.map((w, wordIndex) => {
                    const misspelled = !checkSpelling(w.word);
                    const suggestionOpen =
                      spellingSuggestions.sentenceIndex === index &&
                      spellingSuggestions.wordIndex === wordIndex;
                    return (
                      <span key={wordIndex} className="relative mr-1">
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (misspelled) {
                              openSpellingSuggestions(index, wordIndex);
                            } else {
                              setSpellingSuggestions({
                                sentenceIndex: null,
                                wordIndex: null,
                                suggestions: []
                              });
                            }
                          }}
                          className={
                            misspelled
                              ? 'underline decoration-red-500 decoration-wavy cursor-pointer'
                              : ''
                          }
                        >
                          {w.word}
                          {w.punctuation}
                        </span>
                        {misspelled &&
                          suggestionOpen &&
                          spellingSuggestions.suggestions.length > 0 && (
                            <div className="absolute left-0 top-full mt-1 w-max bg-white border border-gray-300 rounded-md shadow-lg z-10">
                              {spellingSuggestions.suggestions
                                .slice(0, 5)
                                .map((suggestion, idx) => (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      applySpellingSuggestion(
                                        index,
                                        wordIndex,
                                        suggestion
                                      );
                                    }}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                  >
                                    {suggestion}
                                  </div>
                                ))}
                            </div>
                          )}
                      </span>
                    );
                  })}
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
