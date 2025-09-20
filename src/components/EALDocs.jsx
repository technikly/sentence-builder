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

import {
  determiners,
  filterItemsByLevel,
  flattenWordBank,
  highFrequencyWords,
  levelRank,
  linkingVerbs,
  modalHelpers,
  pronounFriendlyVerbs,
  pronouns,
  questionOpeners,
  supportiveSentenceFrames,
  timeMarkers,
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

const normaliseText = (text) => text?.toLowerCase().trim() ?? '';

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

  const suggestions = useMemo(() => {
    const results = [];
    const prefix = normaliseText(caretContext.prefix);
    const previous = normaliseText(caretContext.previousWord);
    const textBefore = caretContext.textBeforeCaret.trim();

    if (prefix) {
      const matches = uniqueWordList.filter((word) => {
        const lower = normaliseText(word);
        return lower.startsWith(prefix) && lower !== prefix;
      });
      results.push(...matches.slice(0, 5));
    }

    const isNewSentence = !textBefore || /[.!?]\s*$/.test(textBefore);
    let contextualPool = [];

    if (isNewSentence) {
      contextualPool = supportiveSentenceFrames;
    } else if (pronouns.includes(previous)) {
      contextualPool = pronounFriendlyVerbs;
    } else if (determiners.includes(previous)) {
      contextualPool = categoryLookup.get('descriptions')?.items.map((item) => item.text) ?? [];
      contextualPool = contextualPool.concat(categoryLookup.get('people')?.items.map((item) => item.text) ?? []);
    } else if (linkingVerbs.includes(previous)) {
      contextualPool = categoryLookup.get('descriptions')?.items.map((item) => item.text) ?? [];
    } else if (questionOpeners.includes(previous)) {
      contextualPool = categoryLookup.get('people')?.items.map((item) => item.text) ?? [];
    } else if (timeMarkers.includes(previous)) {
      contextualPool = categoryLookup.get('actions')?.items.map((item) => item.text) ?? [];
    } else if (modalHelpers.includes(previous)) {
      contextualPool = categoryLookup.get('actions')?.items.map((item) => item.text) ?? [];
    } else {
      contextualPool = highFrequencyWords;
    }

    contextualPool.forEach((item) => {
      const word = typeof item === 'string' ? item : item.text;
      if (!results.find((existing) => existing.toLowerCase() === word.toLowerCase())) {
        results.push(word);
      }
    });

    return results.slice(0, 6);
  }, [caretContext, categoryLookup, uniqueWordList]);

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

