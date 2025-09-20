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
  Underline,
  Upload
} from 'lucide-react';
import SpellCheckPanel from './SpellCheckPanel';
import GrammarCoach from './GrammarCoach';
import SpeechControls from './SpeechControls';
import { usePredictiveSuggestions } from '../hooks/usePredictiveSuggestions';
import { analyseTextAgainstGrammar } from '../utils/grammarAnalysis';

import {
  filterItemsByLevel,
  flattenWordBank,
  levelRank,
  wordBankCategories
} from '../data/ealWordBank';

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

  const grammarAnalysis = useMemo(
    () => analyseTextAgainstGrammar(plainText),
    [plainText]
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

  const handleGrammarExampleInsert = useCallback(
    (example) => {
      if (!example) {
        return;
      }
      const addition = example.endsWith(' ') ? example : `${example} `;
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

  const { suggestions, insights, isLoading: predictiveLoading } = usePredictiveSuggestions({
    caretContext,
    categoryLookup,
    uniqueWordList,
    grammarAnalysis
  });

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

  const replaceUsingRange = useCallback((target, replacement, options = {}) => {
    const editor = editorRef.current;
    if (!editor || !target) {
      return false;
    }

    const { contextIndex, includeLeadingSpace = false } = options;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let globalIndex = 0;
    const lowerTarget = target.toLowerCase();

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent ?? '';
      const lower = text.toLowerCase();
      let searchIndex = lower.indexOf(lowerTarget);

      while (searchIndex !== -1) {
        const absoluteIndex = globalIndex + searchIndex;
        const matchesContext =
          contextIndex == null ||
          Math.abs(absoluteIndex - contextIndex) <= lowerTarget.length + 1;

        if (matchesContext) {
          const range = document.createRange();
          const startIndex =
            includeLeadingSpace && searchIndex > 0 && text[searchIndex - 1] === ' '
              ? searchIndex - 1
              : searchIndex;
          range.setStart(node, startIndex);
          range.setEnd(node, searchIndex + target.length);

          const replacementText =
            replacement == null
              ? ''
              : /^[A-Z]/.test(target) && replacement
              ? replacement[0].toUpperCase() + replacement.slice(1)
              : replacement;

          range.deleteContents();
          if (replacementText) {
            range.insertNode(document.createTextNode(replacementText));
          }
          return true;
        }

        searchIndex = lower.indexOf(lowerTarget, searchIndex + lowerTarget.length);
      }

      globalIndex += text.length;
    }

    return false;
  }, []);

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

  const fixDoubleSpacing = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      node.textContent = node.textContent?.replace(/\s{2,}/g, ' ') ?? '';
    }
  }, []);

  const handleSpellSuggestion = useCallback(
    (action) => {
      const editor = editorRef.current;
      if (!editor || !action) {
        return;
      }

      if (action.type === 'spacing') {
        fixDoubleSpacing();
      } else if (action.type === 'spelling') {
        replaceUsingRange(action.original, action.replacement, {
          contextIndex: action.contextIndex
        });
      } else if (action.type === 'repetition') {
        replaceUsingRange(action.original, '', {
          contextIndex: action.contextIndex,
          includeLeadingSpace: true
        });
        fixDoubleSpacing();
      }

      const syntheticEvent = { currentTarget: editor };
      handleEditorInput(syntheticEvent);
    },
    [fixDoubleSpacing, handleEditorInput, replaceUsingRange]
  );

  useEffect(() => {
    const trimmed = plainText.trim();
    if (!trimmed) {
      setFocusTip('Start by choosing a sentence starter from the word bank.');
      return;
    }

    const wordTotal = trimmed.split(/\s+/).filter(Boolean).length;
    if (wordTotal < 5) {
      setFocusTip('Build a longer idea: aim for at least five words to create a full sentence.');
      return;
    }

    const priorityOrder = [
      'capitalLetters',
      'fullStops',
      'questionMarks',
      'conjunctions',
      'subordinateConjunctions',
      'nounPhrases',
      'adjectives',
      'adverbs',
      'prepositions',
      'commasInLists',
      'apostrophes'
    ];

    const missingById = new Map(
      (grammarAnalysis ?? [])
        .filter((item) => !item.met)
        .map((item) => [item.id, item])
    );

    let priorityTarget = null;
    for (const id of priorityOrder) {
      if (missingById.has(id)) {
        priorityTarget = missingById.get(id);
        break;
      }
    }

    if (!priorityTarget) {
      priorityTarget = (grammarAnalysis ?? []).find((item) => !item.met) ?? null;
    }

    if (priorityTarget) {
      setFocusTip(`Focus: ${priorityTarget.tip} (${priorityTarget.stage}).`);
      return;
    }

    if (!/[.!?]$/.test(trimmed)) {
      setFocusTip('Finish the sentence with a full stop, question mark, or exclamation mark.');
      return;
    }

    const supportRank = getLevelRank(supportLevel);
    if (supportRank >= levelRank.intermediate && wordTotal < 20) {
      setFocusTip('Extend with a second clause using a subordinating conjunction such as because or when.');
      return;
    }

    setFocusTip('Excellent! Your writing meets the current grammar targets from the curriculum.');
  }, [plainText, supportLevel, grammarAnalysis]);

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
        <div className="suggestion-bar__insights">
          {predictiveLoading ? (
            <span className="suggestion-insight">Thinking about the next curriculum-aligned words…</span>
          ) : insights.length ? (
            insights.map((insight, index) => (
              <span key={`${insight}-${index}`} className="suggestion-insight">
                {insight}
              </span>
            ))
          ) : (
            <span className="suggestion-insight">Great! Your sentence already uses these grammar targets.</span>
          )}
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

          <div className="word-bank-section">
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
          </div>

          <div className="support-card support-card--coach">
            <h3>Writing coach</h3>
            <p>{focusTip}</p>
            <ul>
              <li>Check the highlighted grammar focus above before you publish.</li>
              <li>Read your sentence aloud, then use the play button to hear it back.</li>
              <li>Add detail with noun phrases or conjunctions to meet curriculum goals.</li>
            </ul>
          </div>

          <GrammarCoach
            analysis={grammarAnalysis}
            onExampleSelect={handleGrammarExampleInsert}
            hasText={Boolean(plainText.trim())}
          />
          <SpellCheckPanel plainText={plainText} onApplySuggestion={handleSpellSuggestion} />
          <SpeechControls text={plainText} />
        </aside>
      </div>
    </div>
  );
};

export default EALDocs;

