import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlertTriangle,
  Bold,
  BookOpen,
  Download,
  Highlighter,
  Italic,
  Loader2,
  PauseCircle,
  PlayCircle,
  Share2,
  Sparkles,
  StopCircle,
  Underline,
  Upload,
  Volume2
} from 'lucide-react';

import { filterItemsByLevel, wordBankCategories } from '../data/ealWordBank';
import { evaluateGrammarAgainstCurriculum } from '../utils/grammarInsights';

const WORD_CLASS_COLORS = {
  noun: '#2563eb',
  verb: '#16a34a',
  adjective: '#d97706',
  adverb: '#9333ea',
  pronoun: '#ec4899',
  determiner: '#0ea5e9',
  preposition: '#0d9488',
  conjunction: '#f97316',
  interjection: '#facc15',
  punctuation: '#64748b',
  other: '#475569'
};

const WORD_CLASS_LABELS = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
  pronoun: 'Pronoun',
  determiner: 'Determiner',
  preposition: 'Preposition',
  conjunction: 'Conjunction',
  interjection: 'Interjection',
  punctuation: 'Punctuation',
  other: 'Other'
};

const EMPTY_ANALYSIS = {
  signature: '',
  suggestions: [],
  word_classes: [],
  spelling: []
};

const WORD_REGEX = /[\p{L}'’-]+/gu;

const escapeHtml = (value = '') =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const extractTokens = (text = '') => {
  const tokens = [];
  let match;
  while ((match = WORD_REGEX.exec(text)) !== null) {
    tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
};

const computeSignature = (tokens) => tokens.map((token) => `${token.start}:${token.text.toLowerCase()}`).join('|');

const ensureEditorFocus = (editor) => {
  if (editor && document.activeElement !== editor) {
    editor.focus();
  }
};

const getCaretOffset = (root) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) {
    return null;
  }
  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
};

const restoreCaretOffset = (root, offset) => {
  if (offset == null) {
    return;
  }
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  selection.removeAllRanges();
  const range = document.createRange();
  let remaining = offset;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  while (currentNode) {
    const length = currentNode.textContent.length;
    if (remaining <= length) {
      range.setStart(currentNode, remaining);
      range.collapse(true);
      selection.addRange(range);
      return;
    }
    remaining -= length;
    currentNode = walker.nextNode();
  }
  range.selectNodeContents(root);
  range.collapse(false);
  selection.addRange(range);
};

const ToolbarButton = ({ icon: Icon, label, onClick }) => (
  <button type="button" className="studio-button" onClick={onClick} aria-label={label} title={label}>
    <Icon size={18} />
  </button>
);

ToolbarButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired
};

const WordBankItem = ({ item, onInsert }) => (
  <button type="button" className="studio-word" onClick={() => onInsert(item)}>
    <span>{item.text}</span>
    {item.hint ? <small>{item.hint}</small> : null}
  </button>
);

WordBankItem.propTypes = {
  item: PropTypes.shape({
    text: PropTypes.string.isRequired,
    hint: PropTypes.string
  }).isRequired,
  onInsert: PropTypes.func.isRequired
};

const ClassLegend = ({ usedClasses }) => (
  <div className="studio-legend">
    {usedClasses.map((className) => (
      <div key={className} className="legend-chip">
        <span className="legend-dot" style={{ backgroundColor: WORD_CLASS_COLORS[className] }} />
        {WORD_CLASS_LABELS[className]}
      </div>
    ))}
  </div>
);

ClassLegend.propTypes = {
  usedClasses: PropTypes.arrayOf(PropTypes.string).isRequired
};

const SpellIssueList = ({ issues, tokens, onApply }) => (
  <div className="panel-card">
    <div className="panel-card__header">
      <AlertTriangle size={18} />
      <div>
        <h3>Spelling watch</h3>
        <p>Tap a fix to update your writing.</p>
      </div>
    </div>
    {issues.length === 0 ? (
      <p className="panel-card__empty">Everything looks great so far!</p>
    ) : (
      <ul className="issue-list">
        {issues.map((issue) => {
          const token = tokens[issue.index];
          if (!token) {
            return null;
          }
          return (
            <li key={`${issue.index}-${token.text}`} className="issue-item">
              <div className="issue-item__word">
                <span>{token.text}</span>
                {issue.reason ? <small>{issue.reason}</small> : null}
              </div>
              <div className="issue-item__actions">
                {issue.suggestions?.length ? (
                  issue.suggestions.map((suggestion) => (
                    <button
                      key={`${issue.index}-${suggestion}`}
                      type="button"
                      className="issue-item__chip"
                      onClick={() => onApply(issue.index, suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))
                ) : (
                  <span className="issue-item__no-options">No suggestions yet</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

SpellIssueList.propTypes = {
  issues: PropTypes.arrayOf(
    PropTypes.shape({
      index: PropTypes.number.isRequired,
      reason: PropTypes.string,
      suggestions: PropTypes.arrayOf(PropTypes.string)
    })
  ).isRequired,
  tokens: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired
    })
  ).isRequired,
  onApply: PropTypes.func.isRequired
};

const SuggestionOrbit = ({ suggestions, onSelect, disabled }) => (
  <div className="suggestion-orbit" role="list">
    {suggestions.length === 0 ? (
      <div className="suggestion-orbit__hint">Start writing to see gentle prompts.</div>
    ) : (
      suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className="suggestion-ghost"
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
        >
          {suggestion}
        </button>
      ))
    )}
  </div>
);

SuggestionOrbit.propTypes = {
  suggestions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

SuggestionOrbit.defaultProps = {
  disabled: false
};

const getLevelTip = (wordTotal, supportLevel) => {
  if (wordTotal === 0) {
    return 'Drop in a sentence starter to begin your idea.';
  }
  if (wordTotal < 6) {
    return 'Try adding a describing word or feeling to paint the picture.';
  }
  if (supportLevel === 'beginner') {
    return 'Can you join two ideas with “and” or “because” next?';
  }
  if (supportLevel === 'intermediate') {
    return 'See if you can add a connective or a time word to guide the reader.';
  }
  return 'Challenge yourself with a precise verb or a contrasting conjunction.';
};

const fetchAnalysis = async ({ text, tokens, signature }) => {
  const response = await fetch('/.netlify/functions/writingAnalysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, tokens, signature })
  });
  if (!response.ok) {
    throw new Error('Analysis request failed');
  }
  return response.json();
};

const fetchSpeech = async ({ text, voice }) => {
  const response = await fetch('/.netlify/functions/textToSpeech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, voice })
  });
  if (!response.ok) {
    throw new Error('Unable to synthesise speech');
  }
  return response.json();
};

const EALDocs = () => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const decorateLockRef = useRef(false);
  const latestSignatureRef = useRef('');
  const requestCounterRef = useRef(0);

  const [docTitle, setDocTitle] = useState('Writer Orbit');
  const [supportLevel, setSupportLevel] = useState('beginner');
  const [activeCategory, setActiveCategory] = useState(wordBankCategories[0].id);
  const [wordCount, setWordCount] = useState(0);
  const [focusTip, setFocusTip] = useState('Drop in a sentence starter to begin your idea.');
  const [plainText, setPlainText] = useState('');
  const [tokenData, setTokenData] = useState([]);
  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [grammarInsights, setGrammarInsights] = useState({ met: [], targets: [] });
  const [caretContext, setCaretContext] = useState({ prefix: '', previousWord: '', textBeforeCaret: '' });
  const [ttsStatus, setTtsStatus] = useState('idle');
  const [ttsError, setTtsError] = useState('');

  const categoriesForLevel = useMemo(
    () =>
      wordBankCategories.map((category) => ({
        ...category,
        items: filterItemsByLevel(category.items, supportLevel)
      })),
    [supportLevel]
  );

  useEffect(() => {
    const available = categoriesForLevel.filter((category) => category.items.length > 0);
    if (!available.length) {
      return;
    }
    if (!available.find((category) => category.id === activeCategory)) {
      setActiveCategory(available[0].id);
    }
  }, [activeCategory, categoriesForLevel]);

  const activeCategoryData = useMemo(
    () => categoriesForLevel.find((category) => category.id === activeCategory),
    [categoriesForLevel, activeCategory]
  );

  const syncEditorState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const currentText = editor.innerText.replace(/\u00a0/g, ' ');
    const trimmed = currentText.trim();
    setPlainText(currentText);
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0);
    const tokens = extractTokens(currentText);
    setTokenData(tokens);
    latestSignatureRef.current = computeSignature(tokens);
  }, []);

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

  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      ensureEditorFocus(editor);
      const prefix = caretContext.prefix;
      if (prefix && suggestion.toLowerCase().startsWith(prefix.toLowerCase())) {
        const remainder = suggestion.slice(prefix.length);
        const addition = remainder.endsWith(' ') ? remainder : `${remainder} `;
        document.execCommand('insertText', false, addition);
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

  const handleWordInsert = useCallback(
    (item) => {
      const addition = item.text.endsWith(' ') ? item.text : `${item.text} `;
      insertTextAtCursor(addition);
    },
    [insertTextAtCursor]
  );

  const handleSpellApply = useCallback(
    (tokenIndex, suggestion) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      const target = editor.querySelector(`span[data-index="${tokenIndex}"]`);
      if (!target) {
        return;
      }
      target.textContent = suggestion;
      syncEditorState();
      updateCaretContext();
    },
    [syncEditorState, updateCaretContext]
  );

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
    link.download = `${docTitle.trim() || 'writing'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [docTitle]);

  const decorateEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    if (decorateLockRef.current) {
      return;
    }
    const signature = computeSignature(tokenData);
    if (!analysis.signature || analysis.signature !== signature) {
      return;
    }

    const caretOffset = getCaretOffset(editor);
    const text = plainText;
    const classLookup = new Map();
    analysis.word_classes.forEach((entry) => {
      if (WORD_CLASS_COLORS[entry.class]) {
        classLookup.set(entry.index, entry.class);
      } else {
        classLookup.set(entry.index, 'other');
      }
    });
    const spellingLookup = new Set(analysis.spelling.map((issue) => issue.index));

    let cursor = 0;
    const fragments = [];
    tokenData.forEach((token, index) => {
      if (cursor < token.start) {
        fragments.push(escapeHtml(text.slice(cursor, token.start)));
      }
      const classes = ['writing-token'];
      const cls = classLookup.get(index);
      if (cls) {
        classes.push(`writing-token--${cls}`);
      }
      if (spellingLookup.has(index)) {
        classes.push('writing-token--error');
      }
      fragments.push(
        `<span data-index="${index}" class="${classes.join(' ')}">${escapeHtml(token.text)}</span>`
      );
      cursor = token.end;
    });
    if (cursor < text.length) {
      fragments.push(escapeHtml(text.slice(cursor)));
    }

    const html = fragments.join('');
    if (editor.innerHTML === html) {
      return;
    }

    decorateLockRef.current = true;
    editor.innerHTML = html;
    restoreCaretOffset(editor, caretOffset);
    updateCaretContext();
    decorateLockRef.current = false;
  }, [analysis, plainText, tokenData, updateCaretContext]);

  const handleEditorInput = useCallback(() => {
    if (decorateLockRef.current) {
      return;
    }
    syncEditorState();
    updateCaretContext();
  }, [syncEditorState, updateCaretContext]);

  useEffect(() => {
    syncEditorState();
  }, [syncEditorState]);

  useEffect(() => {
    const trimmed = plainText.trim();
    if (!trimmed) {
      setFocusTip('Drop in a sentence starter to begin your idea.');
      setGrammarInsights({ met: [], targets: [] });
      return;
    }
    const wordTotal = trimmed.split(/\s+/).length;
    setFocusTip(getLevelTip(wordTotal, supportLevel));
    setGrammarInsights(evaluateGrammarAgainstCurriculum(plainText));
  }, [plainText, supportLevel]);

  useEffect(() => {
    const trimmed = plainText.trim();
    if (!trimmed) {
      setAnalysis(EMPTY_ANALYSIS);
      setAnalysisLoading(false);
      setAnalysisError('');
      return;
    }

    const signature = latestSignatureRef.current;
    const tokens = tokenData.map((token) => token.text);
    const requestId = ++requestCounterRef.current;
    setAnalysisLoading(true);
    setAnalysisError('');

    const handler = setTimeout(async () => {
      try {
        const payload = await fetchAnalysis({ text: trimmed, tokens, signature });
        if (requestId !== requestCounterRef.current) {
          return;
        }
        setAnalysis({
          signature: payload.signature ?? signature,
          suggestions: payload.suggestions ?? [],
          word_classes: payload.word_classes ?? [],
          spelling: payload.spelling ?? []
        });
      } catch (error) {
        if (requestId === requestCounterRef.current) {
          setAnalysis(EMPTY_ANALYSIS);
          setAnalysisError('We could not refresh AI support just now.');
        }
      } finally {
        if (requestId === requestCounterRef.current) {
          setAnalysisLoading(false);
        }
      }
    }, 600);

    return () => {
      clearTimeout(handler);
    };
  }, [plainText, tokenData]);

  useEffect(() => {
    decorateEditor();
  }, [decorateEditor]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }
  }, []);

  const handleSpeakDocument = useCallback(async () => {
    const text = plainText.trim();
    if (!text) {
      return;
    }
    try {
      setTtsStatus('loading');
      setTtsError('');
      const payload = await fetchSpeech({ text, voice: 'alloy' });
      const binary = Uint8Array.from(atob(payload.audio), (char) => char.charCodeAt(0));
      const blob = new Blob([binary], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setTtsStatus('idle');
      audio.onerror = () => setTtsStatus('idle');
      await audio.play();
      setTtsStatus('playing');
    } catch (error) {
      setTtsError('Unable to play AI voice just now.');
      setTtsStatus('idle');
    }
  }, [plainText]);

  const handlePauseResume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (ttsStatus === 'playing') {
      audio.pause();
      setTtsStatus('paused');
    } else if (ttsStatus === 'paused') {
      audio.play();
      setTtsStatus('playing');
    }
  }, [ttsStatus]);

  const handleStopSpeech = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
    setTtsStatus('idle');
  }, []);

  const usedClasses = useMemo(() => {
    const seen = new Set();
    analysis.word_classes.forEach((entry) => {
      if (WORD_CLASS_COLORS[entry.class]) {
        seen.add(entry.class);
      } else {
        seen.add('other');
      }
    });
    return Array.from(seen);
  }, [analysis.word_classes]);

  return (
    <div className="studio-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        className="visually-hidden"
        onChange={handleFileImport}
      />

      <header className="studio-toolbar">
        <div className="studio-toolbar__main">
          <div className="studio-toolbar__logo">
            <Sparkles size={22} />
          </div>
          <div className="studio-toolbar__meta">
            <input
              className="studio-title"
              value={docTitle}
              onChange={(event) => setDocTitle(event.target.value)}
              aria-label="Document title"
            />
            <div className="studio-toolbar__actions">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} /> Import
              </button>
              <button type="button" onClick={handleExport}>
                <Download size={16} /> Export
              </button>
              <button type="button" className="studio-toolbar__share">
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>
        </div>
        <div className="studio-toolbar__right">
          <label className="studio-select">
            <span>Support level</span>
            <select value={supportLevel} onChange={(event) => setSupportLevel(event.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>
      </header>

      <div className="studio-grid">
        <aside className="studio-panel studio-panel--left">
          <div className="panel-card">
            <div className="panel-card__header">
              <BookOpen size={18} />
              <div>
                <h3>Word orbit</h3>
                <p>Tap a word to pull it into your writing.</p>
              </div>
            </div>
            <div className="studio-tabs">
              {categoriesForLevel
                .filter((category) => category.items.length > 0)
                .map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`studio-tab ${activeCategory === category.id ? 'studio-tab--active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <span className="studio-tab__dot" style={{ backgroundColor: category.color }} />
                    {category.label}
                  </button>
                ))}
            </div>
            <div className="studio-wordbank">
              {activeCategoryData?.items?.length ? (
                activeCategoryData.items.map((item) => (
                  <WordBankItem key={item.text} item={item} onInsert={handleWordInsert} />
                ))
              ) : (
                <p className="panel-card__empty">No words at this level yet.</p>
              )}
            </div>
          </div>
          <div className="panel-card">
            <h3>Writing coach</h3>
            <p>{focusTip}</p>
            <ul className="panel-hints">
              <li>Use colour-coded words to spot missing ingredients.</li>
              <li>Click a grey whisper to add it instantly.</li>
              <li>Listen back to hear how your sentence flows.</li>
            </ul>
          </div>
        </aside>

        <main className="studio-canvas">
          <div className="canvas-toolbar">
            <ToolbarButton icon={Bold} label="Bold" onClick={() => applyCommand('bold')} />
            <ToolbarButton icon={Italic} label="Italic" onClick={() => applyCommand('italic')} />
            <ToolbarButton icon={Underline} label="Underline" onClick={() => applyCommand('underline')} />
            <ToolbarButton icon={Highlighter} label="Highlight" onClick={() => applyCommand('backColor', '#fff176')} />
            <span className="canvas-toolbar__divider" />
            <ToolbarButton icon={AlignLeft} label="Align left" onClick={() => applyCommand('justifyLeft')} />
            <ToolbarButton icon={AlignCenter} label="Align centre" onClick={() => applyCommand('justifyCenter')} />
            <ToolbarButton icon={AlignJustify} label="Justify" onClick={() => applyCommand('justifyFull')} />
          </div>

          <section className="writing-orbit">
            <div className="writing-halo">
              <div className="writing-editor__wrapper">
                <div
                  ref={editorRef}
                  className="writing-editor"
                  role="textbox"
                  contentEditable
                  spellCheck
                  aria-label="Writing canvas"
                  data-placeholder="Bring your words to the centre..."
                  onInput={handleEditorInput}
                  onFocus={updateCaretContext}
                  onKeyUp={updateCaretContext}
                  onMouseUp={updateCaretContext}
                  suppressContentEditableWarning
                />
                {analysisLoading ? (
                  <div className="writing-overlay">
                    <Loader2 className="writing-overlay__spinner" size={32} />
                    <span>Gathering ideas…</span>
                  </div>
                ) : null}
              </div>
              <SuggestionOrbit
                suggestions={analysis.suggestions}
                onSelect={handleSuggestionSelect}
                disabled={!plainText.trim()}
              />
            </div>

            <footer className="writing-status">
              <div className="writing-status__count">{wordCount} {wordCount === 1 ? 'word' : 'words'}</div>
              {analysisError ? <span className="writing-status__error">{analysisError}</span> : null}
            </footer>

            {usedClasses.length ? <ClassLegend usedClasses={usedClasses} /> : null}
          </section>

          <section className="tts-panel">
            <div className="tts-panel__controls">
              <button
                type="button"
                className="tts-button"
                onClick={handleSpeakDocument}
                disabled={!plainText.trim() || ttsStatus === 'loading'}
              >
                {ttsStatus === 'loading' ? <Loader2 size={18} className="spin" /> : <Volume2 size={18} />}
                Listen with AI voice
              </button>
              <button
                type="button"
                className="tts-button"
                onClick={handlePauseResume}
                disabled={!(ttsStatus === 'playing' || ttsStatus === 'paused')}
              >
                {ttsStatus === 'paused' ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
                {ttsStatus === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                className="tts-button"
                onClick={handleStopSpeech}
                disabled={ttsStatus === 'idle'}
              >
                <StopCircle size={18} /> Stop
              </button>
            </div>
            {ttsError ? <p className="tts-panel__error">{ttsError}</p> : null}
          </section>
        </main>

        <aside className="studio-panel studio-panel--right">
          <SpellIssueList issues={analysis.spelling} tokens={tokenData} onApply={handleSpellApply} />
          <div className="panel-card">
            <div className="panel-card__header">
              <Sparkles size={18} />
              <div>
                <h3>Grammar goals</h3>
                <p>Targets linked to curriculum milestones.</p>
              </div>
            </div>
            {grammarInsights.targets.length === 0 ? (
              <p className="panel-card__empty">Keep writing to unlock the next target.</p>
            ) : (
              <ul className="panel-hints">
                {grammarInsights.targets.slice(0, 4).map((target) => (
                  <li key={target.id}>
                    <strong>{target.label}</strong>
                    <br />
                    <span>{target.description}</span>
                  </li>
                ))}
              </ul>
            )}
            {grammarInsights.met.length ? (
              <div className="panel-success">
                <h4>Already shining</h4>
                <ul>
                  {grammarInsights.met.slice(0, 4).map((item) => (
                    <li key={item.id}>{item.label}</li>
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
