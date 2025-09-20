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

import { filterItemsByLevel, levelRank, wordBankCategories } from '../data/ealWordBank';
import { useOpenAITts } from '../hooks/useOpenAITts';
import { evaluateGrammarAgainstCurriculum } from '../utils/grammarInsights';
import { fetchLanguageInsights } from '../utils/languageInsights';

const ToolbarButton = ({ icon: Icon, label, onClick }) => (
  <button type="button" className="format-button" onClick={onClick} aria-label={label} title={label}>
    <Icon size={16} />
  </button>
);

const WordBankItem = ({ item, onInsert }) => (
  <button type="button" className="word-bank-item" onClick={() => onInsert(item)}>
    <span className="word-bank-item__text">{item.text}</span>
    {item.hint ? <span className="word-bank-item__hint">{item.hint}</span> : null}
  </button>
);

ToolbarButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired
};

WordBankItem.propTypes = {
  item: PropTypes.shape({
    text: PropTypes.string.isRequired,
    hint: PropTypes.string
  }).isRequired,
  onInsert: PropTypes.func.isRequired
};

const WORD_CLASS_META = {
  noun: { label: 'Nouns', color: '#2563eb' },
  verb: { label: 'Verbs', color: '#16a34a' },
  adjective: { label: 'Adjectives', color: '#9333ea' },
  adverb: { label: 'Adverbs', color: '#f97316' },
  pronoun: { label: 'Pronouns', color: '#0ea5e9' },
  determiner: { label: 'Determiners', color: '#64748b' },
  preposition: { label: 'Prepositions', color: '#059669' },
  conjunction: { label: 'Conjunctions', color: '#dc2626' },
  interjection: { label: 'Interjections', color: '#facc15' },
  number: { label: 'Numbers', color: '#ea580c' },
  punctuation: { label: 'Punctuation', color: '#6b7280' },
  other: { label: 'Other', color: '#94a3b8' }
};

const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy (friendly)' },
  { value: 'verse', label: 'Verse (storyteller)' },
  { value: 'lily', label: 'Lily (bright)' }
];

const tokenizeText = (text) => {
  const tokens = [];
  if (!text) {
    return tokens;
  }

  const regex = /[\p{L}'’-]+|\d+|[^\s]/gu;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  return tokens;
};

const restoreCaretPosition = (container, targetOffset) => {
  if (!container || targetOffset == null) {
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  let offset = Math.max(0, targetOffset);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let cumulative = 0;

  while (node) {
    const next = cumulative + node.textContent.length;
    if (offset <= next) {
      const range = document.createRange();
      range.setStart(node, Math.max(0, offset - cumulative));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    cumulative = next;
    node = walker.nextNode();
  }

  if (selection.rangeCount) {
    const range = selection.getRangeAt(0);
    range.selectNodeContents(container);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

const ensureEditorFocus = (editor) => {
  if (editor && document.activeElement !== editor) {
    editor.focus();
  }
};

const getLevelRank = (level) => levelRank[level] ?? 0;

const EALDocs = () => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const insightTimeoutRef = useRef(null);

  const [docTitle, setDocTitle] = useState('Untitled Writing Studio');
  const [supportLevel, setSupportLevel] = useState('beginner');
  const [activeCategory, setActiveCategory] = useState(wordBankCategories[0].id);
  const [wordCount, setWordCount] = useState(0);
  const [focusTip, setFocusTip] = useState('Start by choosing a sentence starter from the word bank.');
  const [plainText, setPlainText] = useState('');
  const [caretContext, setCaretContext] = useState({
    prefix: '',
    previousWord: '',
    textBeforeCaret: '',
    rawTextBeforeCaret: ''
  });
  const [grammarInsights, setGrammarInsights] = useState({ met: [], targets: [] });
  const [languageInsights, setLanguageInsights] = useState({
    tokenAnalyses: [],
    suggestions: [],
    ghostSuggestion: ''
  });
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].value);

  const { speak, pause, resume, stop, loading: ttsLoading, playing: ttsPlaying, paused: ttsPaused } = useOpenAITts();

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
    const editor = editorRef.current;
    if (editor) {
      editor.dataset.hasContent = 'false';
    }
  }, []);

  const tokens = useMemo(() => tokenizeText(plainText), [plainText]);

  const decoratedTokens = useMemo(() => {
    const map = new Map();
    (languageInsights.tokenAnalyses ?? []).forEach((entry) => {
      if (entry && typeof entry.index === 'number') {
        map.set(entry.index, entry);
      }
    });
    return tokens.map((token, index) => ({
      ...token,
      analysis: map.get(index)
    }));
  }, [tokens, languageInsights.tokenAnalyses]);

  const spellingConcerns = useMemo(() => {
    const store = new Map();
    decoratedTokens.forEach((token) => {
      const analysis = token.analysis;
      if (analysis?.correct === false) {
        const key = token.text.toLowerCase();
        const entry = store.get(key) ?? {
          word: token.text,
          count: 0,
          suggestions: analysis.suggestions ?? []
        };
        entry.count += 1;
        if (analysis.suggestions?.length) {
          entry.suggestions = analysis.suggestions;
        }
        store.set(key, entry);
      }
    });
    return Array.from(store.values()).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  }, [decoratedTokens]);

  const wordClassBreakdown = useMemo(() => {
    const breakdown = {};
    decoratedTokens.forEach((token) => {
      const pos = token.analysis?.pos?.toLowerCase();
      if (pos && WORD_CLASS_META[pos]) {
        breakdown[pos] = (breakdown[pos] ?? 0) + 1;
      }
    });
    return breakdown;
  }, [decoratedTokens]);

  const ghostSuggestion = (languageInsights.ghostSuggestion ?? '').trim();
  const suggestionList = useMemo(() => {
    const seen = new Set();
    const list = [];
    const push = (value, isGhost = false) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      list.push({ text: trimmed, ghost: isGhost });
    };

    if (ghostSuggestion) {
      push(ghostSuggestion, true);
    }
    (languageInsights.suggestions ?? []).forEach((suggestion) => push(suggestion));
    return list;
  }, [ghostSuggestion, languageInsights.suggestions]);

  const hasContent = plainText.trim().length > 0;

  const updateCaretContext = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || !selection.rangeCount) {
      setCaretContext({ prefix: '', previousWord: '', textBeforeCaret: '', rawTextBeforeCaret: '' });
      return;
    }

    const focusNode = selection.focusNode;
    if (!editor.contains(focusNode)) {
      setCaretContext({ prefix: '', previousWord: '', textBeforeCaret: '', rawTextBeforeCaret: '' });
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(editor);
    range.setEnd(selection.focusNode, selection.focusOffset);

    const raw = range.toString().replace(/\u00a0/g, ' ');
    const trimmed = raw.replace(/\s+/g, ' ').trimEnd();
    const prefixMatch = trimmed.match(/([\p{L}'’-]+)$/u);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const beforePrefix = prefixMatch ? trimmed.slice(0, -prefix.length) : trimmed;
    const previousMatch = beforePrefix.trim().match(/([\p{L}'’-]+)$/u);
    const previousWord = previousMatch ? previousMatch[1] : '';

    setCaretContext({
      prefix,
      previousWord,
      textBeforeCaret: trimmed,
      rawTextBeforeCaret: raw
    });
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => updateCaretContext();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateCaretContext]);

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

  const applyCommand = useCallback(
    (command, value) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      ensureEditorFocus(editor);
      document.execCommand(command, false, value);
      updateCaretContext();
    },
    [updateCaretContext]
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

  const handleSpeakDocument = useCallback(async () => {
    if (!plainText.trim()) {
      return;
    }
    try {
      await speak(plainText, selectedVoice);
    } catch (error) {
      console.error('Unable to play speech', error);
    }
  }, [plainText, selectedVoice, speak]);

  const handlePauseResume = useCallback(() => {
    if (ttsPaused) {
      resume();
    } else {
      pause();
    }
  }, [pause, resume, ttsPaused]);

  const handleStopSpeech = useCallback(() => {
    stop();
  }, [stop]);

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
    const safeTitle = docTitle.trim() || 'writing-studio';
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

  const applyTokenDecorations = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const offset = caretContext.rawTextBeforeCaret?.length ?? null;
    const selection = window.getSelection();
    const selectionInside = selection && selection.rangeCount > 0 && editor.contains(selection.focusNode);

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    decoratedTokens.forEach((token) => {
      if (token.start > lastIndex) {
        fragment.appendChild(document.createTextNode(plainText.slice(lastIndex, token.start)));
      }
      const span = document.createElement('span');
      span.textContent = plainText.slice(token.start, token.end);
      span.className = 'editor-token';
      const pos = token.analysis?.pos?.toLowerCase();
      if (pos && WORD_CLASS_META[pos]) {
        span.dataset.pos = pos;
        span.classList.add(`editor-token--${pos}`);
      }
      if (token.analysis?.correct === false) {
        span.classList.add('editor-token--misspelled');
      }
      fragment.appendChild(span);
      lastIndex = token.end;
    });

    if (lastIndex < plainText.length) {
      fragment.appendChild(document.createTextNode(plainText.slice(lastIndex)));
    }

    editor.innerHTML = '';
    editor.appendChild(fragment);

    if (selectionInside && offset != null) {
      restoreCaretPosition(editor, offset);
    }
  }, [decoratedTokens, plainText, caretContext.rawTextBeforeCaret]);

  useEffect(() => {
    applyTokenDecorations();
  }, [applyTokenDecorations]);

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
    if (insightTimeoutRef.current) {
      clearTimeout(insightTimeoutRef.current);
    }

    if (!plainText.trim()) {
      setLanguageInsights({ tokenAnalyses: [], suggestions: [], ghostSuggestion: '' });
      setInsightLoading(false);
      setInsightError(null);
      return;
    }

    const controller = new AbortController();
    setInsightLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchLanguageInsights({
          text: plainText,
          tokens,
          signal: controller.signal
        });
        setLanguageInsights(data);
        setInsightError(null);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Language insights failed', error);
          setInsightError('Unable to refresh writing insights right now.');
        }
      } finally {
        setInsightLoading(false);
      }
    }, 450);

    insightTimeoutRef.current = timer;

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [plainText, tokens]);

  const activeCategoryData = categoryLookup.get(activeCategory);
  const activeItems = activeCategoryData?.items ?? [];
  const curriculumTargets = grammarInsights.targets;
  const achievedGrammar = grammarInsights.met;

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
            <div className="doc-menu">
              <span onClick={handleImportClick} role="button" tabIndex={0}>
                Import
              </span>
              <span onClick={handleExport} role="button" tabIndex={0}>
                Export
              </span>
              <span>Insert</span>
              <span>Format</span>
              <span>Tools</span>
              <span>Help</span>
            </div>
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
            <Share2 size={18} />
            Share
          </button>
        </div>
      </header>

      <main className="studio">
        <aside className="studio__panel studio__panel--bank">
          <div className="panel-card panel-card--header">
            <BookOpen size={18} />
            <div>
              <h2>Word bank</h2>
              <p>Tap a word or phrase to add it to your writing.</p>
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
              <p className="word-bank-empty">No words at this support level yet. Try a different level.</p>
            )}
          </div>

          <div className="panel-card panel-card--legend">
            <h3>Word classes</h3>
            <ul className="word-class-legend">
              {Object.entries(WORD_CLASS_META).map(([key, meta]) => (
                <li key={key}>
                  <span className={`word-class-chip word-class-chip--${key}`} aria-hidden="true" />
                  <span>{meta.label}</span>
                  <span className="word-class-count">{wordClassBreakdown[key] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="studio__center">
          <div className="writing-hub">
            <div className="writing-hub__zone writing-hub__zone--north">
              <div className="ring-card">
                <div className="format-toolbar">
                  <ToolbarButton icon={Bold} label="Bold" onClick={() => applyCommand('bold')} />
                  <ToolbarButton icon={Italic} label="Italic" onClick={() => applyCommand('italic')} />
                  <ToolbarButton icon={Underline} label="Underline" onClick={() => applyCommand('underline')} />
                  <ToolbarButton icon={Highlighter} label="Highlight" onClick={() => applyCommand('hiliteColor', '#fff59d')} />
                  <div className="format-toolbar__divider" />
                  <ToolbarButton icon={AlignLeft} label="Align left" onClick={() => applyCommand('justifyLeft')} />
                  <ToolbarButton icon={AlignCenter} label="Align centre" onClick={() => applyCommand('justifyCenter')} />
                  <ToolbarButton icon={AlignJustify} label="Justify" onClick={() => applyCommand('justifyFull')} />
                  <div className="format-toolbar__divider" />
                  <ToolbarButton icon={List} label="Bullet list" onClick={() => applyCommand('insertUnorderedList')} />
                  <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => applyCommand('insertOrderedList')} />
                  <div className="format-toolbar__spacer" />
                  <div className="format-toolbar__meta">
                    <span className="format-toolbar__metric">
                      <Sparkles size={16} /> {wordCount} {wordCount === 1 ? 'word' : 'words'}
                    </span>
                    <span className="format-toolbar__metric format-toolbar__metric--status">
                      {insightLoading ? 'Analysing writing…' : insightError ?? 'Insights are up to date'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="writing-hub__zone writing-hub__zone--west">
              <div className="ring-card ring-card--vertical">
                <button type="button" className="ring-action" onClick={handleImportClick}>
                  <Upload size={16} />
                  Import text
                </button>
                <button type="button" className="ring-action" onClick={handleExport}>
                  <Download size={16} />
                  Download
                </button>
                <button type="button" className="ring-action" onClick={() => handleSuggestionSelect('and ')}>
                  <Sparkles size={16} />
                  Add connector
                </button>
              </div>
            </div>

            <div className="writing-hub__core">
              <div className="writing-surface" data-ghost={ghostSuggestion}>
                <div
                  ref={editorRef}
                  className="writing-editor"
                  contentEditable
                  role="textbox"
                  aria-label="Document editor"
                  spellCheck={false}
                  data-placeholder="Type your ideas here..."
                  onInput={handleEditorInput}
                  onKeyUp={updateCaretContext}
                  onMouseUp={updateCaretContext}
                  onFocus={updateCaretContext}
                  suppressContentEditableWarning
                />
                {ghostSuggestion ? (
                  <div className="writing-ghost" aria-hidden="true">
                    {ghostSuggestion}
                  </div>
                ) : null}
              </div>
              <div className="writing-hint">
                <span>{focusTip}</span>
              </div>
            </div>

            <div className="writing-hub__zone writing-hub__zone--east">
              <div className="ring-card">
                <h3>Hear it aloud</h3>
                <p>Use the OpenAI narrator to check the flow of your writing.</p>
                <div className="tts-voice-picker">
                  <Volume2 size={16} />
                  <label htmlFor="voice-choice">Voice</label>
                  <select
                    id="voice-choice"
                    value={selectedVoice}
                    onChange={(event) => setSelectedVoice(event.target.value)}
                  >
                    {VOICE_OPTIONS.map((voice) => (
                      <option key={voice.value} value={voice.value}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="tts-controls__buttons">
                  <button
                    type="button"
                    className="tts-button"
                    onClick={handleSpeakDocument}
                    disabled={!hasContent || ttsLoading}
                  >
                    <PlayCircle size={20} />
                    {ttsPlaying && !ttsPaused ? 'Restart' : ttsLoading ? 'Loading' : 'Play'}
                  </button>
                  <button type="button" className="tts-button" onClick={handlePauseResume} disabled={!ttsPlaying}>
                    {ttsPaused ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
                    {ttsPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button type="button" className="tts-button" onClick={handleStopSpeech} disabled={!ttsPlaying}>
                    <StopCircle size={20} />
                    Stop
                  </button>
                </div>
              </div>
            </div>

            <div className="writing-hub__zone writing-hub__zone--south">
              <div className="ring-card">
                <h3>Suggested words</h3>
                <p className="suggestion-caption">Tap a grey suggestion to add it instantly.</p>
                <div className="writing-suggestions">
                  {suggestionList.length ? (
                    suggestionList.map((suggestion) => (
                      <button
                        key={suggestion.text}
                        type="button"
                        className={`writing-suggestion ${suggestion.ghost ? 'writing-suggestion--ghost' : ''}`}
                        onClick={() => handleSuggestionSelect(suggestion.text)}
                      >
                        {suggestion.text}
                      </button>
                    ))
                  ) : (
                    <span className="writing-suggestions__empty">Suggestions will appear as you type.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="studio__panel studio__panel--insights">
          <div className="panel-card">
            <h3>Writing coach</h3>
            <p>{focusTip}</p>
            <ul>
              <li>Use the connectors tab to join short sentences.</li>
              <li>Try saying your sentence aloud before writing it.</li>
              <li>Remember to check punctuation at the end.</li>
            </ul>
          </div>

          <div className="panel-card">
            <div className="panel-card__header">
              <AlertTriangle size={18} />
              <div>
                <h3>Spell check</h3>
                <p>Powered by OpenAI with a focus on child-friendly language.</p>
              </div>
            </div>
            {insightLoading ? (
              <p className="insight-card__loading">Checking spelling…</p>
            ) : !hasContent ? (
              <p className="insight-card__loading">Start typing to see spelling support.</p>
            ) : spellingConcerns.length ? (
              <ul className="insight-list">
                {spellingConcerns.map((issue) => (
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
                        <span className="spell-issue__no-suggestion">No suggestions</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="insight-card__success">No spelling concerns found.</p>
            )}
          </div>

          <div className="panel-card">
            <div className="panel-card__header">
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
                      <Sparkles size={16} />
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default EALDocs;
