import PropTypes from 'prop-types';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
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

import {
  filterItemsByLevel,
  levelRank,
  wordBankCategories
} from '../data/ealWordBank';
import { useOpenAITts } from '../hooks/useOpenAITts';
import { evaluateGrammarAgainstCurriculum } from '../utils/grammarInsights';
import { fetchWritingIntel } from '../utils/fetchWritingIntel';

const ToolbarButton = ({ icon: Icon, label, onClick }) => (
  <button type="button" className="format-button" onClick={onClick} aria-label={label} title={label}>
    <Icon size={16} />
  </button>
);

const SuggestionGhost = ({ suggestion, onSelect }) => (
  <button type="button" className="ghost-suggestion" onClick={() => onSelect(suggestion.text)}>
    <span className="ghost-suggestion__text">{suggestion.text}</span>
    {suggestion.hint ? <span className="ghost-suggestion__hint">{suggestion.hint}</span> : null}
  </button>
);

const WordBankItem = ({ item, onInsert }) => (
  <button type="button" className="word-bank-item" onClick={() => onInsert(item)}>
    <span className="word-bank-item__text">{item.text}</span>
    {item.hint ? <span className="word-bank-item__hint">{item.hint}</span> : null}
  </button>
);

const normalise = (value = '') => value.toLowerCase();
const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const WORD_PATTERN = /(\b[\p{L}'’-]+\b)/gu;

const buildDecoratedHtml = (text, wordClasses, spellingIssues) => {
  if (!text) {
    return '';
  }
  const classMap = new Map();
  wordClasses.forEach((entry) => {
    const key = normalise(entry.text);
    if (!classMap.has(key)) {
      classMap.set(key, entry.partOfSpeech);
    }
  });

  const spellingMap = new Map();
  spellingIssues.forEach((issue) => {
    spellingMap.set(normalise(issue.word), issue.suggestions ?? []);
  });

  const fragments = [];
  let lastIndex = 0;
  for (const match of text.matchAll(WORD_PATTERN)) {
    const [word] = match;
    const start = match.index ?? 0;
    if (start > lastIndex) {
      fragments.push(escapeHtml(text.slice(lastIndex, start)));
    }

    const normalised = normalise(word);
    const classes = ['word-token'];
    const part = classMap.get(normalised);
    if (part) {
      classes.push(`word-token--${part}`);
    }
    if (spellingMap.has(normalised)) {
      classes.push('word-token--misspelled');
    }

    fragments.push(
      `<span class="${classes.join(' ')}" data-word="${escapeHtml(word)}">${escapeHtml(word)}</span>`
    );
    lastIndex = start + word.length;
  }

  if (lastIndex < text.length) {
    fragments.push(escapeHtml(text.slice(lastIndex)));
  }

  return fragments.join('');
};

const ensureEditorFocus = (editor) => {
  if (editor && document.activeElement !== editor) {
    editor.focus();
  }
};

const getCaretOffset = (root) => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) {
    return null;
  }
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(root);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  return preCaretRange.toString().length;
};

const restoreCaretOffset = (root, offset) => {
  if (offset == null) {
    return;
  }
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let node;
  while ((node = walker.nextNode())) {
    const nextOffset = currentOffset + node.textContent.length;
    if (offset <= nextOffset) {
      const range = document.createRange();
      range.setStart(node, Math.max(0, offset - currentOffset));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    currentOffset = nextOffset;
  }
  const fallbackRange = document.createRange();
  fallbackRange.selectNodeContents(root);
  fallbackRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(fallbackRange);
};

ToolbarButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired
};

SuggestionGhost.propTypes = {
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

const EALDocs = () => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [docTitle, setDocTitle] = useState('Untitled writing hub');
  const [supportLevel, setSupportLevel] = useState('beginner');
  const [activeCategory, setActiveCategory] = useState(wordBankCategories[0].id);
  const [wordCount, setWordCount] = useState(0);
  const [focusTip, setFocusTip] = useState('Pop a starter from the bank into the centre to begin.');
  const [plainText, setPlainText] = useState('');
  const [caretContext, setCaretContext] = useState({
    prefix: '',
    previousWord: '',
    textBeforeCaret: ''
  });
  const [spellIssues, setSpellIssues] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [wordClasses, setWordClasses] = useState([]);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState(null);
  const [grammarInsights, setGrammarInsights] = useState({ met: [], targets: [] });

  const {
    voices: voiceOptions,
    selectedVoice,
    setSelectedVoice,
    speak,
    cancel: cancelSpeech,
    pause,
    resume,
    speaking,
    paused,
    loading: speechLoading
  } = useOpenAITts();

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

 const syncEditorState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const currentText = editor.innerText.replace(/\u00a0/g, ' ');
    setPlainText(currentText);
    const words = currentText.trim() ? currentText.trim().split(/\s+/) : [];
    setWordCount(words.length);
    editor.dataset.empty = words.length ? 'false' : 'true';
  }, []);

  const applyCommand = useCallback(
    (command, value) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      ensureEditorFocus(editor);
      document.execCommand(command, false, value);
      updateCaretContext();
      syncEditorState();
    },
    [syncEditorState, updateCaretContext]
  );

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
    const regex = new RegExp(`\\b${targetWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
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
    const safeTitle = docTitle.trim() || 'writing-hub';
    link.download = `${safeTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [docTitle]);

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

  const handleEditorInput = useCallback(() => {
    syncEditorState();
    updateCaretContext();
  }, [syncEditorState, updateCaretContext]);

  const handleEditorFocus = useCallback(() => {
    updateCaretContext();
  }, [updateCaretContext]);

  useEffect(() => {
    const trimmed = plainText.trim();
    if (!trimmed) {
      setFocusTip('Pop a starter from the bank into the centre to begin.');
      return;
    }

    const wordTotal = trimmed.split(/\s+/).length;
    if (wordTotal < 5) {
      setFocusTip('Add a describing word to bring the picture to life.');
      return;
    }

    if (!/[.!?]$/.test(trimmed)) {
      setFocusTip('End the idea with a full stop, question mark, or exclamation mark.');
      return;
    }

    if (levelRank[supportLevel] >= levelRank.intermediate) {
      setFocusTip('Try sliding in a conjunction like "because" to link your ideas.');
      return;
    }

    setFocusTip('Lovely writing! Could you add how someone felt?');
  }, [plainText, supportLevel]);

  useEffect(() => {
    setGrammarInsights(evaluateGrammarAgainstCurriculum(plainText));
  }, [plainText]);

  useEffect(() => {
    const controller = new AbortController();
    const trimmed = plainText.trim();

    if (!trimmed) {
      setSpellIssues([]);
      setAiSuggestions([]);
      setWordClasses([]);
      setIntelLoading(false);
      setIntelError(null);
      return () => controller.abort();
    }

    setIntelLoading(true);
    setIntelError(null);
    const timer = setTimeout(() => {
      fetchWritingIntel({ text: trimmed, supportLevel, signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) {
            return;
          }
          setSpellIssues(result.spellingIssues ?? []);
          setAiSuggestions(result.suggestedWords ?? []);
          setWordClasses(result.wordClasses ?? []);
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          console.error('Unable to fetch writing intel', error);
          setIntelError('AI writing support is taking a short break.');
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIntelLoading(false);
          }
        });
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [plainText, supportLevel]);

  const decoratedHtml = useMemo(
    () => buildDecoratedHtml(plainText, wordClasses, spellIssues),
    [plainText, wordClasses, spellIssues]
  );

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const html = decoratedHtml;
    const targetHtml = html || '';
    const currentHtml = editor.innerHTML;
    const normalizedCurrent = currentHtml === '<br>' ? '' : currentHtml;
    if (normalizedCurrent === targetHtml) {
      return;
    }

    const caretOffset = getCaretOffset(editor);
    editor.innerHTML = targetHtml || '<br />';
    restoreCaretOffset(editor, caretOffset);
  }, [decoratedHtml]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    editor.dataset.empty = plainText.trim() ? 'false' : 'true';
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

      <div className="hub-grid">
        <section className="hub-top">
          <div className="hub-top__meta">
            <div className="doc-identity">
              <span className="doc-identity__icon">
                <FileText size={20} />
              </span>
              <div className="doc-identity__text">
                <input
                  className="doc-title-input"
                  value={docTitle}
                  onChange={(event) => setDocTitle(event.target.value)}
                  aria-label="Document title"
                />
                <p className="doc-subtitle">Everything revolves around your words.</p>
              </div>
            </div>
            <div className="hub-top__actions">
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
                Share
              </button>
              <div className="file-actions">
                <button type="button" onClick={handleImportClick} aria-label="Import text">
                  <Upload size={18} />
                  Import
                </button>
                <button type="button" onClick={handleExport} aria-label="Download text">
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="format-toolbar">
            <ToolbarButton
              icon={Bold}
              label="Bold"
              onClick={() => applyCommand('bold')}
            />
            <ToolbarButton
              icon={Italic}
              label="Italic"
              onClick={() => applyCommand('italic')}
            />
            <ToolbarButton
              icon={Underline}
              label="Underline"
              onClick={() => applyCommand('underline')}
            />
            <ToolbarButton
              icon={Highlighter}
              label="Highlight"
              onClick={() => applyCommand('backColor', '#fffac4')}
            />
            <span className="format-toolbar__divider" />
            <ToolbarButton
              icon={AlignLeft}
              label="Align left"
              onClick={() => applyCommand('justifyLeft')}
            />
            <ToolbarButton
              icon={AlignCenter}
              label="Align centre"
              onClick={() => applyCommand('justifyCenter')}
            />
            <ToolbarButton
              icon={AlignJustify}
              label="Justify"
              onClick={() => applyCommand('justifyFull')}
            />
            <span className="format-toolbar__divider" />
            <ToolbarButton
              icon={List}
              label="Bullet list"
              onClick={() => applyCommand('insertUnorderedList')}
            />
            <ToolbarButton
              icon={ListOrdered}
              label="Numbered list"
              onClick={() => applyCommand('insertOrderedList')}
            />
            <div className="format-toolbar__spacer" />
            <div className="format-toolbar__tip">
              <Sparkles size={16} />
              <span>{focusTip}</span>
            </div>
          </div>
        </section>

        <aside className="hub-side hub-side--left">
          <div className="panel">
            <div className="panel__header">
              <BookOpen size={18} />
              <div>
                <h2>Word orbit</h2>
                <p>Tap to sling a word into the centre.</p>
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
                activeItems.map((item) => <WordBankItem key={item.text} item={item} onInsert={handleWordInsert} />)
              ) : (
                <p className="word-bank-empty">No words at this level yet. Try switching orbit.</p>
              )}
            </div>
          </div>
          <div className="panel panel--coach">
            <h3>Writing coach</h3>
            <p>{focusTip}</p>
            <ul>
              <li>Use connectors to stretch ideas.</li>
              <li>Say it aloud before you write.</li>
              <li>Check your ending punctuation.</li>
            </ul>
          </div>
        </aside>

        <main className="hub-centre">
          <div className="writing-stage">
            <div className="writing-stage__halo" aria-hidden="true" />
            <div className="writing-stage__surface">
              <div
                ref={editorRef}
                className="writing-editor"
                contentEditable
                role="textbox"
                aria-label="Document editor"
                data-placeholder="Spin your story here..."
                data-empty="true"
                onInput={handleEditorInput}
                onKeyUp={updateCaretContext}
                onMouseUp={updateCaretContext}
                onFocus={handleEditorFocus}
                suppressContentEditableWarning
                spellCheck={false}
              />
              <div className="ghost-suggestions__wrap">
                {intelLoading ? (
                  <div className="ghost-suggestion ghost-suggestion--loading">Thinking up ideas…</div>
                ) : aiSuggestions.length ? (
                  aiSuggestions.map((suggestion) => (
                    <SuggestionGhost
                      key={suggestion.text}
                      suggestion={suggestion}
                      onSelect={handleSuggestionSelect}
                    />
                  ))
                ) : intelError ? (
                  <div className="ghost-suggestion ghost-suggestion--error">{intelError}</div>
                ) : (
                  <div className="ghost-suggestion ghost-suggestion--hint">Suggestions will appear here.</div>
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="hub-side hub-side--right">
          <div className="panel">
            <div className="panel__header">
              <AlertTriangle size={18} />
              <div>
                <h2>Spell spotlight</h2>
                <p>Words with a red wave need checking.</p>
              </div>
            </div>
            {intelLoading && hasContent ? (
              <p className="panel__loading">Checking spelling…</p>
            ) : !hasContent ? (
              <p className="panel__hint">Start writing to see spell support.</p>
            ) : spellIssues.length ? (
              <ul className="insight-list">
                {spellIssues.map((issue) => {
                  const suggestionList = issue.suggestions ?? [];
                  return (
                    <li key={issue.word} className="spell-issue">
                      <div className="spell-issue__meta">
                        <span className="spell-issue__word">{issue.word}</span>
                        {suggestionList.length ? (
                          <span className="spell-issue__count">{suggestionList.length} ideas</span>
                        ) : null}
                      </div>
                      <div className="spell-issue__actions">
                        {suggestionList.length ? (
                          suggestionList.slice(0, 3).map((suggestion) => (
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
                          <span className="spell-issue__no-suggestion">No suggestions yet</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="panel__success">No spelling concerns found.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel__header">
              <Brain size={18} />
              <div>
                <h2>Grammar goals</h2>
                <p>Linked to the UK national curriculum.</p>
              </div>
            </div>
            <div className="panel__section">
              <h4>Next steps</h4>
              {!hasContent ? (
                <p className="panel__hint">Start writing to see curriculum goals.</p>
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
                <p className="panel__success">You have met every grammar focus for this level.</p>
              )}
            </div>
            {hasContent && achievedGrammar.length ? (
              <div className="panel__section panel__section--success">
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

          <div className="panel panel--legend">
            <h3>Word class colours</h3>
            <ul>
              <li><span className="legend legend--noun" />Nouns</li>
              <li><span className="legend legend--verb" />Verbs</li>
              <li><span className="legend legend--adjective" />Adjectives</li>
              <li><span className="legend legend--adverb" />Adverbs</li>
              <li><span className="legend legend--pronoun" />Pronouns</li>
              <li><span className="legend legend--determiner" />Determiners</li>
              <li><span className="legend legend--preposition" />Prepositions</li>
              <li><span className="legend legend--conjunction" />Conjunctions</li>
              <li><span className="legend legend--interjection" />Interjections</li>
            </ul>
          </div>
        </aside>

        <section className="hub-bottom">
          <div className="hub-bottom__tts">
            <div className="panel panel--tts">
              <div className="panel__header">
                <Volume2 size={18} />
                <div>
                  <h2>Read it aloud</h2>
                  <p>OpenAI voices bring your story to life.</p>
                </div>
              </div>
              <div className="tts-controls">
                <label htmlFor="tts-voice">Voice</label>
                <select
                  id="tts-voice"
                  value={selectedVoice}
                  onChange={(event) => setSelectedVoice(event.target.value)}
                >
                  {voiceOptions.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                <div className="tts-controls__buttons">
                  <button
                    type="button"
                    className="tts-button"
                    onClick={handleSpeakDocument}
                    disabled={!hasContent || speechLoading}
                  >
                    <PlayCircle size={20} />
                    {speaking && !paused ? 'Restart' : speechLoading ? 'Loading' : 'Play'}
                  </button>
                  <button type="button" className="tts-button" onClick={handlePauseResume} disabled={!speaking}>
                    {paused ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
                    {paused ? 'Resume' : 'Pause'}
                  </button>
                  <button type="button" className="tts-button" onClick={handleStopSpeech} disabled={!speaking}>
                    <StopCircle size={20} />
                    Stop
                  </button>
                </div>
              </div>
            </div>
            <div className="hub-bottom__status">
              <span>
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
              <span className="hub-bottom__status-tip">{focusTip}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EALDocs;
