import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  Bold,
  BookOpen,
  Download,
  FileText,
  Highlighter,
  Italic,
  Languages,
  List,
  ListOrdered,
  Share2,
  Sparkles,
  SpellCheck,
  Square,
  Underline,
  Upload,
  Volume2
} from 'lucide-react';

import { filterItemsByLevel, flattenWordBank, levelRank, wordBankCategories } from '../data/ealWordBank';
import { yearGroupGuidance } from '../data/grammarAppendix';
import { generateGrammarSuggestions } from '../utils/grammarPredictor';
import {
  initializeSpellChecker,
  checkSpelling,
  getSuggestions as getSpellingSuggestions
} from '../spellChecker';
import { loadVoices, speakText, cancelSpeech } from './tts';

const ToolbarButton = ({ icon: Icon, label, onClick }) => (
  <button type="button" className="format-button" onClick={onClick} aria-label={label} title={label}>
    <Icon size={16} />
  </button>
);

const SuggestionChip = ({ text, onSelect }) => (
  <button type="button" className="suggestion-chip" onClick={() => onSelect(text)}>
    {text}
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
  text: PropTypes.string.isRequired,
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

const normaliseText = (text) => text?.toLowerCase().trim() ?? '';

const sanitiseWord = (text) => normaliseText(text).replace(/[^\p{L}'’-]+/gu, '');

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
  const [spellCheckerReady, setSpellCheckerReady] = useState(false);
  const [spellingIssues, setSpellingIssues] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speechRate, setSpeechRate] = useState(0.95);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  const uniqueWordList = useMemo(
    () => flattenWordBank(wordBankCategories, supportLevel),
    [supportLevel]
  );

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

  const refreshEditorState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      setPlainText('');
      setWordCount(0);
      return;
    }

    const currentText = editor.innerText.replace(/\u00a0/g, ' ');
    setPlainText(currentText);
    const words = currentText.trim() ? currentText.trim().split(/\s+/) : [];
    setWordCount(words.length);
    editor.dataset.hasContent = words.length > 0 ? 'true' : 'false';
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

  useEffect(() => {
    let isMounted = true;

    loadVoices()
      .then((loadedVoices) => {
        if (!isMounted) {
          return;
        }
        setVoices(loadedVoices);
        const preferred =
          loadedVoices.find((voice) => voice.lang?.toLowerCase().startsWith('en-gb')) ??
          loadedVoices.find((voice) => voice.lang?.toLowerCase().startsWith('en')) ??
          loadedVoices[0];
        setSelectedVoice(preferred?.voiceURI ?? '');
      })
      .catch(() => {
        if (isMounted) {
          setVoices([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => () => cancelSpeech(), []);

  useEffect(() => {
    let isActive = true;

    initializeSpellChecker()
      .then(() => {
        if (isActive) {
          setSpellCheckerReady(true);
        }
      })
      .catch(() => {
        if (isActive) {
          setSpellCheckerReady(false);
        }
      });

    return () => {
      isActive = false;
    };
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
        refreshEditorState();
        updateCaretContext();
      };

      reader.readAsText(file);
      // reset input so the same file can be chosen again
      event.target.value = '';
    },
    [refreshEditorState, updateCaretContext]
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

  const grammarSuggestions = useMemo(
    () =>
      generateGrammarSuggestions({
        prefix: caretContext.prefix,
        previousWord: caretContext.previousWord,
        textBeforeCaret: caretContext.textBeforeCaret,
        supportLevel,
        categoryLookup,
        uniqueWordList
      }),
    [caretContext, supportLevel, categoryLookup, uniqueWordList]
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

  const applySpellingSuggestion = useCallback(
    (targetWord, suggestion) => {
      const editor = editorRef.current;
      const cleanTarget = sanitiseWord(targetWord);
      if (!editor || !cleanTarget) {
        return;
      }

      ensureEditorFocus(editor);
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !editor.contains(selection.focusNode)) {
        return;
      }

      const selectionText = sanitiseWord(selection.toString());
      const prefixClean = sanitiseWord(caretContext.prefix);
      const previousClean = sanitiseWord(caretContext.previousWord);
      const range = selection.getRangeAt(0);
      const workingRange = range.cloneRange();

      if (selectionText === cleanTarget && selection.toString()) {
        // Keep the cloned range as-is
      } else if (prefixClean && prefixClean === cleanTarget) {
        const focusNode = selection.focusNode;
        const offset = selection.focusOffset;
        if (!focusNode || typeof focusNode.textContent !== 'string' || offset < caretContext.prefix.length) {
          return;
        }
        workingRange.setStart(focusNode, offset - caretContext.prefix.length);
        workingRange.setEnd(focusNode, offset);
      } else if (previousClean && previousClean === cleanTarget) {
        const focusNode = selection.focusNode;
        const offset = selection.focusOffset;
        if (!focusNode || typeof focusNode.textContent !== 'string') {
          return;
        }
        const wordLength = caretContext.previousWord.length;
        workingRange.setStart(focusNode, Math.max(0, offset - wordLength));
        workingRange.setEnd(focusNode, offset);
      } else {
        return;
      }

      workingRange.deleteContents();
      const textContent = suggestion.endsWith(' ') ? suggestion : `${suggestion} `;
      const textNode = document.createTextNode(textContent);
      workingRange.insertNode(textNode);

      const newRange = document.createRange();
      newRange.setStart(textNode, textNode.textContent.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      refreshEditorState();
      updateCaretContext();
    },
    [caretContext.prefix, caretContext.previousWord, refreshEditorState, updateCaretContext]
  );

  const analyseSpelling = useCallback(() => {
    if (!spellCheckerReady) {
      return;
    }

    const matches = plainText.matchAll(/\b[\p{L}'’-]+\b/gu);
    const flagged = [];
    const seen = new Set();

    for (const match of matches) {
      const original = match[0];
      const cleaned = sanitiseWord(original);
      if (!cleaned) {
        continue;
      }

      const index = match.index ?? 0;
      const preceding = plainText.slice(0, index);
      const isSentenceStart = !preceding.trim() || /[.!?]\s*$/.test(preceding);
      const isCapitalised = /^[A-Z]/.test(original);
      if (isCapitalised && !isSentenceStart) {
        continue;
      }

      if (!checkSpelling(original) && !seen.has(cleaned)) {
        const options = getSpellingSuggestions(original).slice(0, 3);
        flagged.push({ word: original, cleaned, suggestions: options });
        seen.add(cleaned);
      }
    }

    setSpellingIssues(flagged.slice(0, 4));
  }, [plainText, spellCheckerReady]);

  useEffect(() => {
    analyseSpelling();
  }, [analyseSpelling]);

  const handleSpeakDocument = useCallback(() => {
    const text = plainText.trim();
    if (!text) {
      return;
    }

    setIsSpeaking(true);
    const started = speakText(text, {
      voiceURI: selectedVoice,
      rate: speechRate,
      onend: () => setIsSpeaking(false),
      onerror: () => setIsSpeaking(false)
    });

    if (!started) {
      setIsSpeaking(false);
    }
  }, [plainText, selectedVoice, speechRate]);

  const handleStopSpeaking = useCallback(() => {
    cancelSpeech();
    setIsSpeaking(false);
  }, []);

  const handleEditorInput = useCallback(() => {
    refreshEditorState();
    updateCaretContext();
  }, [refreshEditorState, updateCaretContext]);

  const handleEditorFocus = useCallback(() => {
    updateCaretContext();
  }, [updateCaretContext]);

  useEffect(() => {
    const trimmed = plainText.trim();
    if (!trimmed) {
      setFocusTip('Start with a capital letter and choose a sentence starter from the word bank.');
      return;
    }

    const sentences = trimmed
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    const hasCapitalStart = sentences.every((sentence) => /^[A-Z]/.test(sentence));
    if (!hasCapitalStart) {
      setFocusTip('Check each sentence begins with a capital letter, as set out in the grammar appendix.');
      return;
    }

    if (!/[.!?]$/.test(trimmed)) {
      setFocusTip('Finish with the correct punctuation mark: full stop, question mark, or exclamation mark.');
      return;
    }

    const hasExpandedNoun = /\b(the|a|an)\s+\w+\s+\w+/i.test(trimmed);
    if (!hasExpandedNoun) {
      setFocusTip('Add an expanded noun phrase such as "the bright red kite" to build detail.');
      return;
    }

    if (getLevelRank(supportLevel) >= levelRank.intermediate && !/(when|if|because|although|since|while)/i.test(trimmed)) {
      setFocusTip('Try joining clauses with a subordinating conjunction like "when" or "because".');
      return;
    }

    if (getLevelRank(supportLevel) >= levelRank.advanced && !/(,\s+who|,\s+which|,\s+that)/i.test(trimmed)) {
      setFocusTip('Could you add a relative clause, for example "who was waiting quietly"?');
      return;
    }

    const guidance = yearGroupGuidance.find((item) => item.level === supportLevel);
    setFocusTip(guidance?.reminder ?? 'Excellent! Consider varying your openings with a fronted adverbial.');
  }, [plainText, supportLevel]);

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
              <Sparkles size={24} />
              <span>Curriculum-aligned suggestions</span>
              <SupportLevelBadge level={supportLevel} />
            </div>
            <div className="suggestion-bar__chips">
              {grammarSuggestions.length ? (
                grammarSuggestions.map((suggestion) => (
                  <SuggestionChip
                    key={`${suggestion}-${supportLevel}`}
                    text={suggestion}
                    onSelect={handleSuggestionSelect}
                  />
                ))
              ) : (
                <span className="suggestion-empty">
                  Type or place your cursor to see grammar-aware prompts.
                </span>
              )}
            </div>
            <div className="spelling-panel">
              <div className="spelling-panel__header">
                <SpellCheck size={22} />
                <span>Spell check</span>
                {!spellCheckerReady ? (
                  <span className="spelling-panel__status">Preparing dictionary…</span>
                ) : null}
              </div>
              {spellCheckerReady ? (
                spellingIssues.length ? (
                  <ul className="spelling-panel__list">
                    {spellingIssues.map((issue) => (
                      <li key={issue.cleaned} className="spelling-panel__item">
                        <span className="spelling-panel__word">{issue.word}</span>
                        <div className="spelling-panel__suggestions">
                          {issue.suggestions.length ? (
                            issue.suggestions.map((option) => (
                              <button
                                key={`${issue.cleaned}-${option}`}
                                type="button"
                                className="spelling-panel__suggestion"
                                onClick={() => applySpellingSuggestion(issue.word, option)}
                              >
                                {option}
                              </button>
                            ))
                          ) : (
                            <span className="spelling-panel__hint">Double-check this spelling carefully.</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="spelling-panel__message">
                    No spelling alerts detected. Remember to check apostrophes for possession.
                  </p>
                )
              ) : (
                <p className="spelling-panel__message">Loading UK English dictionary…</p>
              )}
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
            <div className="doc-status-bar__summary">
              <span className="doc-status-bar__count">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
              <span className="doc-status-bar__tip">{focusTip}</span>
            </div>
            <div className="speech-controls">
              <button
                type="button"
                className="speech-button"
                onClick={isSpeaking ? handleStopSpeaking : handleSpeakDocument}
                disabled={!plainText.trim()}
              >
                {isSpeaking ? (
                  <>
                    <Square size={20} />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={20} />
                    <span>Listen</span>
                  </>
                )}
              </button>
              <label className="speech-select">
                <span>Voice</span>
                <select
                  value={selectedVoice}
                  onChange={(event) => setSelectedVoice(event.target.value)}
                  disabled={!voices.length}
                >
                  {voices.length ? (
                    voices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))
                  ) : (
                    <option value="">No voices available</option>
                  )}
                </select>
              </label>
              <label className="speech-rate">
                <span>Speed</span>
                <div className="speech-rate__control">
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.05"
                    value={speechRate}
                    onChange={(event) => setSpeechRate(Number(event.target.value))}
                  />
                  <span className="speech-rate__value">{speechRate.toFixed(2)}×</span>
                </div>
              </label>
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
            <h3>Writing coach</h3>
            <p>{focusTip}</p>
            <ul>
              <li>Use the connectors tab to join short sentences.</li>
              <li>Try saying your sentence aloud before writing it.</li>
              <li>Remember to check punctuation at the end.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EALDocs;

