import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  Bold,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Highlighter,
  Italic,
  Languages,
  Lightbulb,
  List,
  ListOrdered,
  Share2,
  Sparkles,
  Underline,
  Upload,
  Volume2,
  VolumeX
} from 'lucide-react';
import nlp from 'compromise';

import { filterItemsByLevel, flattenWordBank, levelRank, wordBankCategories } from '../data/ealWordBank';
import { grammarAppendixStrands } from '../data/ukGrammarAppendix';
import {
  initializeSpellChecker,
  checkSpelling,
  getSuggestions
} from '../spellChecker.js';
import { buildPredictiveSuggestions } from '../utils/predictiveSuggestions';

const ToolbarButton = ({ icon: Icon, label, onClick }) => (
  <button type="button" className="format-button" onClick={onClick} aria-label={label} title={label}>
    <Icon size={16} />
  </button>
);

const SuggestionChip = ({ suggestion, onSelect }) => (
  <button
    type="button"
    className="suggestion-chip"
    onClick={() => onSelect(suggestion.text)}
    title={suggestion.hint ?? suggestion.text}
  >
    <span className="suggestion-chip__text">{suggestion.text}</span>
    {suggestion.hint ? (
      <span className="suggestion-chip__hint">{suggestion.hint}</span>
    ) : null}
  </button>
);

const WordBankItem = ({ item, onInsert }) => (
  <button type="button" className="word-bank-item" onClick={() => onInsert(item)}>
    <span className="word-bank-item__text">{item.text}</span>
    {item.hint ? <span className="word-bank-item__hint">{item.hint}</span> : null}
  </button>
);

const SupportLevelBadge = ({ level }) => {
  const levelLabels = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  };

  return <span className={`support-badge support-badge--${level}`}>{levelLabels[level]}</span>;
};

ToolbarButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired
};

SuggestionChip.propTypes = {
  suggestion: PropTypes.shape({
    text: PropTypes.string.isRequired,
    hint: PropTypes.string
  }).isRequired,
  onSelect: PropTypes.func.isRequired
};

WordBankItem.propTypes = {
  item: PropTypes.shape({
    text: PropTypes.string.isRequired,
    hint: PropTypes.string,
    level: PropTypes.string
  }).isRequired,
  onInsert: PropTypes.func.isRequired
};

SupportLevelBadge.propTypes = {
  level: PropTypes.oneOf(['beginner', 'intermediate', 'advanced']).isRequired
};

const getLevelRank = (level) => levelRank[level] ?? 0;

const ensureEditorFocus = (editor) => {
  if (editor && document.activeElement !== editor) {
    editor.focus();
  }
};

const EALDocs = () => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [docTitle, setDocTitle] = useState('Untitled EAL Doc');
  const [supportLevel, setSupportLevel] = useState('beginner');
  const [activeCategory, setActiveCategory] = useState(wordBankCategories[0].id);
  const [wordCount, setWordCount] = useState(0);
  const [focusTip, setFocusTip] = useState('Start by choosing a sentence starter from the bank.');
  const [plainText, setPlainText] = useState('');
  const [caretContext, setCaretContext] = useState({
    prefix: '',
    previousWord: '',
    textBeforeCaret: ''
  });
  const [spellReady, setSpellReady] = useState(false);
  const [misspellings, setMisspellings] = useState([]);
  const [grammarHighlights, setGrammarHighlights] = useState([]);
  const speechUtteranceRef = useRef(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState(null);

  const categoriesForLevel = useMemo(
    () =>
      wordBankCategories.map((category) => ({
        ...category,
        items: filterItemsByLevel(category.items, supportLevel)
      })),
    [supportLevel]
  );

  const categoryLookup = useMemo(() => {
    const lookup = new Map();
    categoriesForLevel.forEach((category) => {
      lookup.set(category.id, category);
    });
    return lookup;
  }, [categoriesForLevel]);

  useEffect(() => {
    const availableCategories = categoriesForLevel.filter((category) => category.items.length > 0);
    if (!availableCategories.length) {
      return;
    }
    if (!availableCategories.find((category) => category.id === activeCategory)) {
      setActiveCategory(availableCategories[0].id);
    }
  }, [activeCategory, categoriesForLevel]);

  useEffect(() => {
    let isMounted = true;
    initializeSpellChecker()
      .then(() => {
        if (isMounted) {
          setSpellReady(true);
        }
      })
      .catch((error) => {
        console.error('Spell checker failed to load', error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const synthesis = window.speechSynthesis;
    if (!synthesis) {
      return;
    }
    setIsSpeechSupported(true);

    const updateVoices = () => {
      const voices = synthesis.getVoices();
      if (!voices.length) {
        return;
      }
      setPreferredVoice((currentVoice) => {
        if (currentVoice) {
          const stillAvailable = voices.find((voice) => voice.name === currentVoice.name);
          if (stillAvailable) {
            return stillAvailable;
          }
        }
        const britishVoice = voices.find((voice) => voice.lang?.toLowerCase().includes('en-gb'));
        return britishVoice ?? voices[0];
      });
    };

    updateVoices();
    synthesis.addEventListener('voiceschanged', updateVoices);
    return () => {
      synthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  const uniqueWordList = useMemo(
    () => flattenWordBank(wordBankCategories, supportLevel),
    [supportLevel]
  );

  useEffect(() => {
    if (!spellReady) {
      setMisspellings([]);
      return;
    }

    const trimmed = plainText.trim();
    if (!trimmed) {
      setMisspellings([]);
      return;
    }

    const wordMatches = trimmed.match(/\b[\p{L}'-]+\b/gu) ?? [];
    const uniqueWords = [];
    const seen = new Set();
    wordMatches.forEach((word) => {
      const lower = word.toLowerCase();
      if (seen.has(lower)) {
        return;
      }
      seen.add(lower);
      uniqueWords.push({ original: word, lower });
    });
    const flagged = [];
    for (const { original, lower } of uniqueWords) {
      if (lower.length < 2) {
        continue;
      }
      if (!checkSpelling(lower)) {
        flagged.push({
          word: original,
          normalized: lower,
          suggestions: getSuggestions(lower).slice(0, 3)
        });
      }
      if (flagged.length >= 10) {
        break;
      }
    }
    setMisspellings(flagged);
  }, [plainText, spellReady]);

  useEffect(() => {
    const trimmed = plainText.trim();
    if (!trimmed) {
      const initial = grammarAppendixStrands.slice(0, 4).map((strand) => ({
        id: strand.id,
        label: strand.label,
        status: 'prompt',
        message: strand.prompt,
        curriculumNote: strand.curriculumNote
      }));
      setGrammarHighlights(initial);
      return;
    }

    const doc = nlp(trimmed);
    const sentences = doc.sentences().json();
    const lastSentence = sentences[sentences.length - 1];
    const tagSet = new Set();
    (lastSentence?.terms ?? []).forEach((term) => {
      (term.tags ?? []).forEach((tag) => tagSet.add(tag));
    });

    const highlightItems = grammarAppendixStrands.map((strand) => {
      const hasStrand = strand.tags.some((tag) => tagSet.has(tag));
      return {
        id: strand.id,
        label: strand.label,
        status: hasStrand ? 'celebrate' : 'prompt',
        message: hasStrand ? strand.success : strand.prompt,
        curriculumNote: strand.curriculumNote
      };
    });

    const prompts = highlightItems.filter((item) => item.status === 'prompt').slice(0, 3);
    const celebrates = highlightItems.filter((item) => item.status === 'celebrate').slice(0, 2);
    setGrammarHighlights([...prompts, ...celebrates]);
  }, [plainText]);

  const updateCaretContext = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || !selection.rangeCount) {
      setCaretContext({ prefix: '', previousWord: '', textBeforeCaret: '' });
      return;
    }

    const focusNode = selection.focusNode;
    if (!editor.contains(focusNode)) {
      setCaretContext({ prefix: '', previousWord: '', textBeforeCaret: '' });
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(editor);
    range.setEnd(selection.focusNode, selection.focusOffset);
    const text = range.toString().replace(/\u00a0/g, ' ');
    const trimmed = text.replace(/\s+/g, ' ').trimEnd();

    const prefixMatch = trimmed.match(/([\p{L}'’-]+)$/u);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const beforePrefix = prefixMatch ? trimmed.slice(0, -prefix.length) : trimmed;
    const previousMatch = beforePrefix.trim().match(/([\p{L}'’-]+)$/u);
    const previousWord = previousMatch ? previousMatch[1] : '';

    setCaretContext({ prefix, previousWord, textBeforeCaret: trimmed });
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => updateCaretContext();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateCaretContext]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.dataset.hasContent = 'false';
    }
  }, []);

  const applyCommand = useCallback((command, value) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    ensureEditorFocus(editor);
    document.execCommand(command, false, value);
    updateCaretContext();
  }, [updateCaretContext]);

  const insertTextAtCursor = useCallback(
    (text) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      ensureEditorFocus(editor);
      document.execCommand('insertText', false, text);
      updateCaretContext();
    },
    [updateCaretContext]
  );

  const handleWordInsert = useCallback(
    (item) => {
      const addition = item.text.endsWith(' ') ? item.text : `${item.text} `;
      insertTextAtCursor(addition);
    },
    [insertTextAtCursor]
  );

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    (event) => {
      const [file] = event.target.files ?? [];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const editor = editorRef.current;
        if (!editor) {
          return;
        }
        editor.innerText = text;
        const cleaned = text.replace(/\u00a0/g, ' ');
        setPlainText(cleaned);
        const words = cleaned.trim() ? cleaned.trim().split(/\s+/) : [];
        setWordCount(words.length);
        editor.dataset.hasContent = words.length > 0 ? 'true' : 'false';
        updateCaretContext();
      };

      reader.readAsText(file);
      // reset input so the same file can be chosen again
      event.target.value = '';
    },
    [updateCaretContext]
  );

  const handleExport = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const content = editor.innerText ?? '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = docTitle.trim() || 'eal-doc';
    link.download = `${safeTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [docTitle]);

  const suggestions = useMemo(
    () =>
      buildPredictiveSuggestions({
        caretContext,
        categoryLookup,
        uniqueWordList,
        misspellings
      }),
    [caretContext, categoryLookup, uniqueWordList, misspellings]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const prefix = caretContext.prefix;
      ensureEditorFocus(editor);

      if (prefix && suggestion.toLowerCase().startsWith(prefix.toLowerCase())) {
        const remainder = suggestion.slice(prefix.length);
        const insertion = remainder.endsWith(' ') ? remainder : `${remainder} `;
        document.execCommand('insertText', false, insertion);
      } else {
        const needsSpace = !/[.!?,]$/.test(suggestion);
        const addition = needsSpace ? `${suggestion} ` : suggestion;
        document.execCommand('insertText', false, addition);
      }

      updateCaretContext();
    },
    [caretContext.prefix, updateCaretContext]
  );

  const handleEditorInput = useCallback(
    (event) => {
      const currentText = event.currentTarget.innerText.replace(/\u00a0/g, ' ');
      setPlainText(currentText);
      const words = currentText.trim() ? currentText.trim().split(/\s+/) : [];
      setWordCount(words.length);

      const editor = editorRef.current;
      if (editor) {
        editor.dataset.hasContent = words.length > 0 ? 'true' : 'false';
      }

      updateCaretContext();
    },
    [updateCaretContext]
  );

  const handleEditorFocus = useCallback(() => {
    updateCaretContext();
  }, [updateCaretContext]);

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },
    []
  );

  const speakText = useCallback(
    (text) => {
      if (!isSpeechSupported || typeof window === 'undefined') {
        return;
      }
      const synthesis = window.speechSynthesis;
      if (!synthesis || !text.trim()) {
        return;
      }
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => {
        setIsSpeaking(false);
        speechUtteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        speechUtteranceRef.current = null;
      };
      speechUtteranceRef.current = utterance;
      setIsSpeaking(true);
      synthesis.speak(utterance);
    },
    [isSpeechSupported, preferredVoice]
  );

  const speakLatestSentence = useCallback(() => {
    if (!plainText.trim()) {
      return;
    }
    const doc = nlp(plainText);
    const sentences = doc.sentences().json();
    const lastSentence = sentences[sentences.length - 1]?.text ?? plainText;
    speakText(lastSentence);
  }, [plainText, speakText]);

  const speakWholeDocument = useCallback(() => {
    if (!plainText.trim()) {
      return;
    }
    speakText(plainText);
  }, [plainText, speakText]);

  const stopSpeaking = useCallback(() => {
    if (!isSpeechSupported || typeof window === 'undefined') {
      return;
    }
    const synthesis = window.speechSynthesis;
    if (!synthesis) {
      return;
    }
    synthesis.cancel();
    speechUtteranceRef.current = null;
    setIsSpeaking(false);
  }, [isSpeechSupported]);

  useEffect(() => {
    const trimmed = plainText.trim();
    if (!trimmed) {
      setFocusTip('Start by choosing a sentence starter from the word bank.');
      return;
    }

    const wordTotal = trimmed.split(/\s+/).length;
    if (wordTotal < 5) {
      setFocusTip('Build a noun phrase with an adjective, as the grammar appendix suggests.');
      return;
    }

    if (!/[.!?]$/.test(trimmed)) {
      setFocusTip('Finish the idea with sentence punctuation – a full stop, question mark or exclamation mark.');
      return;
    }

    const promptHighlight = grammarHighlights.find((item) => item.status === 'prompt');
    if (promptHighlight) {
      setFocusTip(promptHighlight.message);
      return;
    }

    if (getLevelRank(supportLevel) >= levelRank.intermediate) {
      setFocusTip('Stretch yourself with a subordinating conjunction like "because" or "although".');
      return;
    }

    setFocusTip('Great writing! Could you add how the person feels?');
  }, [plainText, supportLevel, grammarHighlights]);

  const activeCategoryData = categoryLookup.get(activeCategory);
  const activeItems = activeCategoryData?.items ?? [];

  return (
    <div className="app-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        className="visually-hidden"
        onChange={handleFileImport}
      />
      <header className="app-toolbar">
        <div className="app-toolbar__left">
          <div className="app-logo">
            <FileText size={20} />
          </div>
          <div className="doc-meta">
            <input
              className="doc-title-input"
              value={docTitle}
              onChange={(event) => setDocTitle(event.target.value)}
              aria-label="Document title"
            />
            <nav className="doc-menu">
              <span>File</span>
              <span>Edit</span>
              <span>Insert</span>
              <span>Format</span>
              <span>Tools</span>
              <span>Help</span>
            </nav>
          </div>
        </div>
        <div className="app-toolbar__right">
          <div className="support-selector">
            <Languages size={16} />
            <label htmlFor="support-level">Support level</label>
            <select
              id="support-level"
              value={supportLevel}
              onChange={(event) => setSupportLevel(event.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <button type="button" className="share-button">
            <Share2 size={16} />
            Share support doc
          </button>
        </div>
      </header>

      <div className="format-toolbar">
        <ToolbarButton icon={Bold} label="Bold" onClick={() => applyCommand('bold')} />
        <ToolbarButton icon={Italic} label="Italic" onClick={() => applyCommand('italic')} />
        <ToolbarButton icon={Underline} label="Underline" onClick={() => applyCommand('underline')} />
        <ToolbarButton icon={Highlighter} label="Highlight" onClick={() => applyCommand('hiliteColor', '#fff3b0')} />
        <div className="format-toolbar__divider" />
        <ToolbarButton icon={AlignLeft} label="Align left" onClick={() => applyCommand('justifyLeft')} />
        <ToolbarButton icon={AlignCenter} label="Align centre" onClick={() => applyCommand('justifyCenter')} />
        <ToolbarButton icon={AlignJustify} label="Justify" onClick={() => applyCommand('justifyFull')} />
        <div className="format-toolbar__divider" />
        <ToolbarButton icon={List} label="Bullet list" onClick={() => applyCommand('insertUnorderedList')} />
        <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => applyCommand('insertOrderedList')} />
        <div className="format-toolbar__spacer" />
        <button type="button" className="format-button" onClick={handleImportClick}>
          <Upload size={16} />
          <span>Import</span>
        </button>
        <button type="button" className="format-button" onClick={handleExport}>
          <Download size={16} />
          <span>Export</span>
        </button>
      </div>

      <div className="doc-layout">
        <div className="doc-wrapper">
          <div className="suggestion-bar">
          <div className="suggestion-bar__header">
            <Sparkles size={16} />
            <span>Smart suggestions</span>
            <SupportLevelBadge level={supportLevel} />
          </div>
          <div className="suggestion-bar__chips">
            {suggestions.length ? (
              suggestions.map((suggestion) => (
                <SuggestionChip
                    key={`${suggestion.text}-${supportLevel}`}
                    suggestion={suggestion}
                    onSelect={handleSuggestionSelect}
                  />
                ))
              ) : (
                <span className="suggestion-empty">Type a word to see ideas appear here.</span>
              )}
          </div>
          <div className="support-panels">
            <div className="support-panel-card">
              <div className="support-panel-card__header">
                <AlertTriangle size={18} />
                <div>
                  <span className="support-panel-card__title">Spell check</span>
                  <small>UK dictionary with child-friendly filtering.</small>
                </div>
              </div>
              {spellReady ? (
                misspellings.length ? (
                  <ul className="support-panel-card__list">
                    {misspellings.map((item) => (
                      <li key={item.word} className="support-panel-card__list-item">
                        <span className="support-panel-card__term">{item.word}</span>
                        {item.suggestions.length ? (
                          <span className="support-panel-card__suggestions">
                            Try: {item.suggestions.join(', ')}
                          </span>
                        ) : (
                          <span className="support-panel-card__suggestions">Check this spelling carefully.</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="support-panel-card__celebration">
                    <CheckCircle2 size={18} />
                    <span>No spelling issues flagged.</span>
                  </div>
                )
              ) : (
                <p className="support-panel-card__loading">Loading UK dictionary…</p>
              )}
            </div>
            <div className="support-panel-card support-panel-card--grammar">
              <div className="support-panel-card__header">
                <Lightbulb size={18} />
                <div>
                  <span className="support-panel-card__title">Grammar focus</span>
                  <small>Aligned with the UK grammar appendix.</small>
                </div>
              </div>
              {grammarHighlights.length ? (
                <ul className="support-panel-card__list support-panel-card__list--grammar">
                  {grammarHighlights.map((item) => (
                    <li
                      key={item.id}
                      className={`grammar-highlight grammar-highlight--${item.status}`}
                    >
                      {item.status === 'celebrate' ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Lightbulb size={16} />
                      )}
                      <div>
                        <span className="grammar-highlight__label">{item.label}</span>
                        <span className="grammar-highlight__message">{item.message}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="support-panel-card__loading">Start typing to unlock grammar guidance.</p>
              )}
            </div>
          </div>
        </div>

        <div className="doc-page-wrapper">
          <div
            ref={editorRef}
              className="doc-page"
              contentEditable
              role="textbox"
              aria-label="Document editor"
              spellCheck
              data-placeholder="Type your ideas here..."
              onInput={handleEditorInput}
              onKeyUp={updateCaretContext}
              onMouseUp={updateCaretContext}
              onFocus={handleEditorFocus}
              suppressContentEditableWarning
            />
          </div>

          <div className="doc-status-bar">
            <div className="doc-status-bar__meta">
              <span className="doc-status-bar__count">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
              <span className="doc-status-bar__tip">{focusTip}</span>
            </div>
            <div className="tts-controls">
              {isSpeechSupported ? (
                <>
                  <button type="button" className="tts-button" onClick={speakLatestSentence}>
                    <Volume2 size={16} />
                    Read sentence
                  </button>
                  <button type="button" className="tts-button tts-button--secondary" onClick={speakWholeDocument}>
                    <Volume2 size={16} />
                    Read document
                  </button>
                  {isSpeaking ? (
                    <button type="button" className="tts-button tts-button--stop" onClick={stopSpeaking}>
                      <VolumeX size={16} />
                      Stop
                    </button>
                  ) : null}
                  {preferredVoice ? (
                    <span className="tts-voice">Voice: {preferredVoice.name}</span>
                  ) : null}
                </>
              ) : (
                <span className="tts-unavailable">Text-to-speech is not available in this browser.</span>
              )}
            </div>
          </div>
        </div>

        <aside className="scaffold-panel">
          <div className="scaffold-panel__header">
            <BookOpen size={18} />
            <div>
              <h2>Word bank</h2>
              <p>Tap a word or phrase to add it to your document.</p>
            </div>
          </div>

          <div className="word-bank-tabs">
            {categoriesForLevel
              .filter((category) => category.items.length > 0)
              .map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`word-bank-tab ${activeCategory === category.id ? 'word-bank-tab--active' : ''}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <span className="word-bank-tab__dot" style={{ backgroundColor: category.color }} />
                  {category.label}
                </button>
              ))}
          </div>

          <div className="word-bank-items">
            {activeItems.length ? (
              activeItems.map((item) => (
                <WordBankItem key={item.text} item={item} onInsert={handleWordInsert} />
              ))
            ) : (
              <p className="word-bank-empty">No words at this support level yet. Try a different level.</p>
            )}
          </div>

          <div className="support-card">
            <h3>Curriculum writing coach</h3>
            <p className="support-card__focus">{focusTip}</p>
            <ul className="curriculum-list">
              {grammarHighlights.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <strong>{item.label}:</strong> {item.curriculumNote}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EALDocs;

