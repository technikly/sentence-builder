import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlertTriangle,
  Bold,
  BookOpen,
  Brain,
  CheckCircle2,
  Download,
  FileText,
  Highlighter,
  Italic,
  Languages,
  List,
  ListOrdered,
  PauseCircle,
  PlayCircle,
  Share2,
  Sparkles,
  StopCircle,
  Underline,
  Upload,
  Volume2
} from 'lucide-react';

import { filterItemsByLevel, flattenWordBank, levelRank, wordBankCategories } from '../data/ealWordBank';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { analyseSpelling } from '../utils/spellingInsights';
import { evaluateGrammarAgainstCurriculum } from '../utils/grammarInsights';
import { generatePredictiveSuggestions } from '../utils/predictiveSuggestions';
import { initializeSpellChecker } from '../spellChecker';

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

const escapeRegExp = (value) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

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
  const [spellIssues, setSpellIssues] = useState([]);
  const [spellLoading, setSpellLoading] = useState(false);
  const [grammarInsights, setGrammarInsights] = useState({ met: [], targets: [] });

  const {
    supported: speechSupported,
    voices: voiceOptions,
    selectedVoice,
    setSelectedVoice,
    speak,
    cancel: cancelSpeech,
    pause,
    resume,
    speaking,
    paused
  } = useSpeechSynthesis({ preferredLang: 'en-GB' });

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
    initializeSpellChecker().catch((error) =>
      console.error('Spell checker initialisation failed', error)
    );
  }, []);

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

  const syncEditorState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const currentText = editor.innerText.replace(/\u00a0/g, ' ');
    setPlainText(currentText);
    const words = currentText.trim() ? currentText.trim().split(/\s+/) : [];
    setWordCount(words.length);
    editor.dataset.hasContent = words.length > 0 ? 'true' : 'false';
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
      syncEditorState();
      updateCaretContext();
    },
    [syncEditorState, updateCaretContext]
  );

  const handleWordInsert = useCallback(
    (item) => {
      const addition = item.text.endsWith(' ') ? item.text : `${item.text} `;
      insertTextAtCursor(addition);
    },
    [insertTextAtCursor]
  );

  const replaceWordInEditor = useCallback((targetWord, replacementWord) => {
    const editor = editorRef.current;
    if (!editor) {
      return false;
    }
    const regex = new RegExp(`\\b${escapeRegExp(targetWord)}\\b`, 'i');
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const { textContent } = node;
      const match = regex.exec(textContent);
      if (match) {
        const before = textContent.slice(0, match.index);
        const after = textContent.slice(match.index + match[0].length);
        node.textContent = `${before}${replacementWord}${after}`;
        return true;
      }
    }
    return false;
  }, []);

  const handleSpellSuggestionApply = useCallback(
    (original, suggestion) => {
      if (replaceWordInEditor(original, suggestion)) {
        syncEditorState();
        updateCaretContext();
      }
    },
    [replaceWordInEditor, syncEditorState, updateCaretContext]
  );

  const handleGrammarRecommendation = useCallback(
    (text) => {
      const addition = text.endsWith(' ') ? text : `${text} `;
      insertTextAtCursor(addition);
    },
    [insertTextAtCursor]
  );

  const handleSpeakDocument = useCallback(() => {
    const editor = editorRef.current;
    const content = editor?.innerText ?? '';
    if (content.trim()) {
      speak(content);
    }
  }, [speak]);

  const handlePauseResume = useCallback(() => {
    if (paused) {
      resume();
    } else {
      pause();
    }
  }, [pause, resume, paused]);

  const handleStopSpeech = useCallback(() => {
    cancelSpeech();
  }, [cancelSpeech]);

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
        syncEditorState();
        updateCaretContext();
      };

      reader.readAsText(file);
      // reset input so the same file can be chosen again
      event.target.value = '';
    },
    [syncEditorState, updateCaretContext]
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
      generatePredictiveSuggestions({
        caretContext,
        categoryLookup,
        uniqueWordList,
        grammarTargets: grammarInsights.targets,
        supportLevel
      }),
    [caretContext, categoryLookup, uniqueWordList, grammarInsights.targets, supportLevel]
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

      syncEditorState();
      updateCaretContext();
    },
    [caretContext.prefix, syncEditorState, updateCaretContext]
  );

  const handleEditorInput = useCallback(
    () => {
      syncEditorState();
      updateCaretContext();
    },
    [syncEditorState, updateCaretContext]
  );

  const handleEditorFocus = useCallback(() => {
    updateCaretContext();
  }, [updateCaretContext]);

  useEffect(() => {
    const trimmed = plainText.trim();
    if (!trimmed) {
      setFocusTip('Start by choosing a sentence starter from the word bank.');
      return;
    }

    const wordTotal = trimmed.split(/\s+/).length;
    if (wordTotal < 5) {
      setFocusTip('Can you add a describing word to give more detail?');
      return;
    }

    if (!/[.!?]$/.test(trimmed)) {
      setFocusTip('Finish the sentence with a full stop, question mark, or exclamation mark.');
      return;
    }

    if (getLevelRank(supportLevel) >= levelRank.intermediate) {
      setFocusTip('Try adding a connector like "because" or "after that" to join ideas.');
      return;
    }

    setFocusTip('Great writing! Could you add how the person feels?');
  }, [plainText, supportLevel]);

  useEffect(() => {
    setGrammarInsights(evaluateGrammarAgainstCurriculum(plainText));
  }, [plainText]);

  useEffect(() => {
    let cancelled = false;

    const runAnalysis = async () => {
      const trimmed = plainText.trim();
      if (!trimmed) {
        if (!cancelled) {
          setSpellIssues([]);
          setSpellLoading(false);
        }
        return;
      }

      setSpellLoading(true);
      try {
        const issues = await analyseSpelling(trimmed);
        if (!cancelled) {
          setSpellIssues(issues);
        }
      } catch (error) {
        console.error('Spell analysis failed', error);
        if (!cancelled) {
          setSpellIssues([]);
        }
      } finally {
        if (!cancelled) {
          setSpellLoading(false);
        }
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
    };
  }, [plainText]);

  const activeCategoryData = categoryLookup.get(activeCategory);
  const activeItems = activeCategoryData?.items ?? [];
  const curriculumTargets = grammarInsights.targets;
  const achievedGrammar = grammarInsights.met;
  const hasContent = plainText.trim().length > 0;

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
                    key={`${suggestion}-${supportLevel}`}
                    text={suggestion}
                    onSelect={handleSuggestionSelect}
                  />
                ))
              ) : (
                <span className="suggestion-empty">Type a word to see ideas appear here.</span>
              )}
            </div>
          </div>

          <div className="tts-controls">
            <div className="tts-controls__summary">
              <Volume2 size={22} />
              <div>
                <h3>Read aloud</h3>
                <p>Hear your ideas in a natural UK English voice.</p>
              </div>
            </div>
            {speechSupported ? (
              <div className="tts-controls__actions">
                {voiceOptions.length ? (
                  <select
                    className="tts-select"
                    value={selectedVoice}
                    onChange={(event) => setSelectedVoice(event.target.value)}
                    aria-label="Choose a speaking voice"
                  >
                    {voiceOptions.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="tts-voice-loading">Loading voices…</span>
                )}
                <div className="tts-controls__buttons">
                  <button
                    type="button"
                    className="tts-button"
                    onClick={handleSpeakDocument}
                    disabled={!hasContent}
                  >
                    <PlayCircle size={20} />
                    {speaking && !paused ? 'Restart' : 'Play'}
                  </button>
                  <button
                    type="button"
                    className="tts-button"
                    onClick={handlePauseResume}
                    disabled={!speaking}
                  >
                    {paused ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
                    {paused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    type="button"
                    className="tts-button"
                    onClick={handleStopSpeech}
                    disabled={!speaking}
                  >
                    <StopCircle size={20} />
                    Stop
                  </button>
                </div>
              </div>
            ) : (
              <p className="tts-controls__unsupported">Speech synthesis is not available on this device.</p>
            )}
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
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span className="doc-status-bar__tip">{focusTip}</span>
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

          <div className="insight-card">
            <div className="insight-card__header">
              <AlertTriangle size={18} />
              <div>
                <h3>Spell check</h3>
                <p>Uses a UK English dictionary with child-friendly filtering.</p>
              </div>
            </div>
            {spellLoading ? (
              <p className="insight-card__loading">Checking spelling…</p>
            ) : !hasContent ? (
              <p className="insight-card__loading">Start typing to see spelling support.</p>
            ) : spellIssues.length ? (
              <ul className="insight-list">
                {spellIssues.map((issue) => (
                  <li key={issue.word} className="spell-issue">
                    <div className="spell-issue__meta">
                      <span className="spell-issue__word">{issue.word}</span>
                      <span className="spell-issue__count">{issue.count}×</span>
                    </div>
                    <div className="spell-issue__actions">
                      {issue.suggestions.length ? (
                        issue.suggestions.slice(0, 3).map((suggestion) => (
                          <button
                            key={`${issue.word}-${suggestion}`}
                            type="button"
                            className="spell-issue__suggestion"
                            onClick={() => handleSpellSuggestionApply(issue.word, suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))
                      ) : (
                        <span className="spell-issue__no-suggestion">No dictionary suggestions</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="insight-card__success">No spelling concerns found.</p>
            )}
          </div>

          <div className="insight-card">
            <div className="insight-card__header">
              <Brain size={18} />
              <div>
                <h3>Grammar goals</h3>
                <p>Aligned with the UK national curriculum grammar appendix.</p>
              </div>
            </div>
            <div className="insight-card__section">
              <h4>Next steps</h4>
              {!hasContent ? (
                <p className="insight-card__loading">Start writing to see curriculum goals.</p>
              ) : curriculumTargets.length ? (
                <ul className="insight-list">
                  {curriculumTargets.map((target) => (
                    <li key={target.id} className="grammar-target">
                      <div className="grammar-target__summary">
                        <AlertTriangle size={16} />
                        <div>
                          <span className="grammar-target__label">{target.label}</span>
                          <span className="grammar-target__stage">{target.stage}</span>
                        </div>
                      </div>
                      <p className="grammar-target__description">{target.description}</p>
                      {target.suggestions?.length ? (
                        <p className="grammar-target__tip">{target.suggestions[0]}</p>
                      ) : null}
                      {target.recommendationWords?.length ? (
                        <div className="grammar-target__actions">
                          {target.recommendationWords.slice(0, 3).map((word) => (
                            <button
                              key={`${target.id}-${word}`}
                              type="button"
                              className="grammar-target__chip"
                              onClick={() => handleGrammarRecommendation(word)}
                            >
                              {word}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="insight-card__success">You have met every grammar focus for this level.</p>
              )}
            </div>
            {hasContent && achievedGrammar.length ? (
              <div className="insight-card__section insight-card__section--success">
                <h4>Great work</h4>
                <ul className="insight-list insight-list--compact">
                  {achievedGrammar.map((feature) => (
                    <li key={feature.id} className="grammar-target grammar-target--achieved">
                      <CheckCircle2 size={16} />
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EALDocs;

