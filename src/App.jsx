import { useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  Highlighter,
  Languages,
  Lightbulb,
  List,
  PenSquare,
  Share,
  Sparkles,
  Underline,
  Wand2
} from 'lucide-react';
import './App.css';
import {
  focusQuestions,
  languageFrames,
  nextWordMap,
  phraseContinuations,
  wordBank
} from './data/ealContent';

const defaultFocus = {
  currentWord: '',
  previousWord: '',
  currentSentence: '',
  precedingText: ''
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function App() {
  const [documentTitle, setDocumentTitle] = useState('Untitled document');
  const [documentText, setDocumentText] = useState('');
  const [activeCategory, setActiveCategory] = useState(wordBank[0].id);
  const [focusState, setFocusState] = useState(defaultFocus);
  const editorRef = useRef(null);

  const activeWordBank = useMemo(
    () => wordBank.find((category) => category.id === activeCategory) ?? wordBank[0],
    [activeCategory]
  );

  const allWordOptions = useMemo(() => {
    const words = new Set();
    wordBank.forEach((category) => {
      category.entries.forEach((entry) => {
        entry.text
          .split(/\s+/)
          .filter(Boolean)
          .forEach((word) => words.add(word.toLowerCase()));
      });
    });
    return Array.from(words);
  }, []);

  const connectorWords = useMemo(() => {
    const connectorCategory = wordBank.find((category) => category.id === 'connectors');
    return connectorCategory ? connectorCategory.entries.map((entry) => entry.text) : [];
  }, []);

  const wordCount = useMemo(() => {
    const words = documentText.trim().match(/\b[\w']+\b/g);
    return words ? words.length : 0;
  }, [documentText]);

  const sentenceCount = useMemo(() => {
    const sentences = documentText.split(/[.!?]+/).map((sentence) => sentence.trim());
    return sentences.filter(Boolean).length;
  }, [documentText]);

  const connectorsUsed = useMemo(() => {
    const lowerText = documentText.toLowerCase();
    return connectorWords.filter((connector) => {
      const pattern = new RegExp(`\\b${escapeRegExp(connector.toLowerCase())}\\b`);
      return pattern.test(lowerText);
    });
  }, [connectorWords, documentText]);

  const estimatedReadingTime = useMemo(() => {
    if (wordCount === 0) return 0;
    return Math.max(1, Math.round(wordCount / 80));
  }, [wordCount]);

  const outline = useMemo(() => {
    return documentText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);
  }, [documentText]);

  const usedVocabulary = useMemo(() => {
    const matches = new Set();
    const lower = documentText.toLowerCase();
    wordBank.forEach((category) => {
      category.entries.forEach((entry) => {
        if (entry.text.includes(' ')) return;
        const pattern = new RegExp(`\\b${escapeRegExp(entry.text.toLowerCase())}\\b`);
        if (pattern.test(lower)) {
          matches.add(entry.text);
        }
      });
    });
    return Array.from(matches).sort();
  }, [documentText]);

  const supportMessage = useMemo(() => {
    if (wordCount < 10) {
      return 'Try to write one full sentence about your idea.';
    }
    if (sentenceCount < 2) {
      return 'Can you add another sentence to explain more?';
    }
    if (connectorsUsed.length === 0) {
      return 'Add a connector like "because" or "then" to join your ideas.';
    }
    return 'Great! Now check if your sentences have feelings, actions and reasons.';
  }, [wordCount, sentenceCount, connectorsUsed.length]);

  const updateCaretMetadata = () => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const cursorIndex = textarea.selectionStart;
    const textBefore = textarea.value.slice(0, cursorIndex);
    const trailingSpace = /\s$/.test(textBefore);
    const tokens = textBefore.split(/\s+/).filter(Boolean);

    const currentWord = trailingSpace ? '' : tokens[tokens.length - 1] || '';
    const previousWord = trailingSpace
      ? tokens[tokens.length - 1] || ''
      : tokens[tokens.length - 2] || '';

    const sentences = textBefore
      .split(/[.!?]/)
      .map((part) => part.trim())
      .filter(Boolean);

    setFocusState({
      currentWord,
      previousWord,
      currentSentence: sentences[sentences.length - 1] || '',
      precedingText: textBefore
    });
  };

  const handleEditorChange = (event) => {
    setDocumentText(event.target.value);
    requestAnimationFrame(updateCaretMetadata);
  };

  const handleSelectionUpdate = () => {
    requestAnimationFrame(updateCaretMetadata);
  };

  const applySuggestion = (suggestion) => {
    if (!editorRef.current || !suggestion?.text) return;

    const textarea = editorRef.current;
    const { replaceCurrent = true, appendSpace = true, prependSpace = false } = suggestion;
    let start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (replaceCurrent && focusState.currentWord) {
      start = Math.max(0, start - focusState.currentWord.length);
    }

    const before = documentText.slice(0, start);
    const after = documentText.slice(end);
    const isSentenceStart = !before || /[.!?\n]\s*$/.test(before);

    let insertText = suggestion.text;
    if (suggestion.autoCapitalize !== false && insertText.length) {
      if (isSentenceStart) {
        insertText = insertText.charAt(0).toUpperCase() + insertText.slice(1);
      }
    }

    if (suggestion.forceLowercase && insertText.length) {
      insertText = insertText.charAt(0).toLowerCase() + insertText.slice(1);
    }

    const needsLeadingSpace = prependSpace && before && !/\s$/.test(before);
    const needsTrailingSpace = appendSpace;

    const finalText = `${needsLeadingSpace ? ' ' : ''}${insertText}${needsTrailingSpace ? ' ' : ''}`;
    const newValue = `${before}${finalText}${after}`;
    const newCursor = before.length + finalText.length;

    setDocumentText(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = newCursor;
      textarea.selectionEnd = newCursor;
      updateCaretMetadata();
    });
  };

  const insertFromWordBank = (entry) => {
    applySuggestion({ ...entry, source: 'Word bank' });
  };

  const predictions = useMemo(() => {
    const suggestions = new Map();
    const prefix = (focusState.currentWord || '').toLowerCase();
    const previous = (focusState.previousWord || '').toLowerCase();
    const context = (focusState.precedingText || '').trimEnd().toLowerCase();

    if (prefix) {
      allWordOptions
        .filter((word) => word.startsWith(prefix) && word !== prefix)
        .slice(0, 4)
        .forEach((word) => {
          const key = `prefix-${word}`;
          if (!suggestions.has(key)) {
            suggestions.set(key, {
              id: key,
              text: word,
              source: 'Word match',
              hint: 'Complete the word from the bank.',
              appendSpace: true,
              replaceCurrent: true
            });
          }
        });
    }

    if (!prefix && previous) {
      (nextWordMap[previous] || []).forEach((word) => {
        const key = `next-${previous}-${word}`;
        if (!suggestions.has(key)) {
          suggestions.set(key, {
            id: key,
            text: word,
            source: 'Next word idea',
            hint: `Add "${word}" to grow the sentence.`,
            appendSpace: true,
            prependSpace: true,
            replaceCurrent: false,
            autoCapitalize: false
          });
        }
      });
    }

    phraseContinuations.forEach((rule) => {
      if (rule.pattern.test(context)) {
        rule.suggestions.forEach((item, index) => {
          const key = `phrase-${rule.id}-${index}-${item.text.toLowerCase()}`;
          if (!suggestions.has(key)) {
            suggestions.set(key, {
              id: key,
              text: item.text,
              source: rule.label,
              hint: item.hint,
              appendSpace: item.appendSpace ?? true,
              prependSpace: item.prependSpace ?? false,
              replaceCurrent: item.replaceCurrent ?? true,
              autoCapitalize: item.autoCapitalize ?? false
            });
          }
        });
      }
    });

    if (suggestions.size === 0) {
      ['I feel', 'We can', 'because'].forEach((phrase, index) => {
        const key = `starter-${index}`;
        suggestions.set(key, {
          id: key,
          text: phrase,
          source: 'Try this starter',
          hint: 'Use this phrase to begin a new idea.',
          appendSpace: true,
          replaceCurrent: true
        });
      });
    }

    return Array.from(suggestions.values()).slice(0, 6);
  }, [allWordOptions, focusState]);

  const statusHighlights = [
    { label: 'Word count', value: wordCount },
    { label: 'Sentences', value: sentenceCount },
    { label: 'Connectors used', value: connectorsUsed.length },
    { label: 'Reading time', value: estimatedReadingTime ? `${estimatedReadingTime} min` : '—' }
  ];

  return (
    <div className="app-shell">
      <header className="docs-top-bar">
        <div className="top-left">
          <div className="docs-logo">
            <BookOpen size={22} />
            <span>EAL Docs</span>
          </div>
          <input
            className="docs-title"
            value={documentTitle}
            onChange={(event) => setDocumentTitle(event.target.value)}
            aria-label="Document title"
          />
        </div>
        <div className="top-actions">
          <button className="assist-button" type="button">
            <Languages size={16} />
            Language help
          </button>
          <button className="share-button" type="button">
            <Share size={16} />
            Share
          </button>
        </div>
      </header>

      <div className="docs-toolbar">
        <div className="toolbar-group">
          <button type="button" className="toolbar-button" aria-label="Bold">
            <Bold size={16} />
          </button>
          <button type="button" className="toolbar-button" aria-label="Italic">
            <i>I</i>
          </button>
          <button type="button" className="toolbar-button" aria-label="Underline">
            <Underline size={16} />
          </button>
          <button type="button" className="toolbar-button" aria-label="Highlight">
            <Highlighter size={16} />
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" className="toolbar-button" aria-label="Align left">
            <AlignLeft size={16} />
          </button>
          <button type="button" className="toolbar-button" aria-label="Align centre">
            <AlignCenter size={16} />
          </button>
          <button type="button" className="toolbar-button" aria-label="Align right">
            <AlignRight size={16} />
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" className="toolbar-button" aria-label="Paragraph outline">
            <List size={16} />
          </button>
          <button type="button" className="toolbar-button" aria-label="Writing goals">
            <PenSquare size={16} />
          </button>
        </div>
      </div>

      <div className="workspace">
        <aside className="outline-panel">
          <div className="outline-header">
            <List size={16} />
            <span>Outline</span>
          </div>
          <div className="outline-content">
            {outline.length === 0 ? (
              <p className="outline-empty">
                Your headings will appear here. Try turning your first sentence into a heading!
              </p>
            ) : (
              <ol>
                {outline.map((line, index) => (
                  <li key={line + index}>{line}</li>
                ))}
              </ol>
            )}
          </div>
          <div className="outline-footer">
            <Lightbulb size={16} />
            <span>Need an idea? Choose a focus question from the right panel.</span>
          </div>
        </aside>

        <main className="document-area">
          <div className="document-page">
            <textarea
              ref={editorRef}
              className="doc-editor"
              value={documentText}
              onChange={handleEditorChange}
              onClick={handleSelectionUpdate}
              onKeyUp={handleSelectionUpdate}
              onSelect={handleSelectionUpdate}
              placeholder="Start writing about your learning..."
              spellCheck
            />
            <div className="doc-status">
              {statusHighlights.map((item) => (
                <div key={item.label} className="status-chip">
                  <span className="status-label">{item.label}</span>
                  <span className="status-value">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="support-message">{supportMessage}</div>
          </div>
        </main>

        <aside className="support-rail">
          <section className="panel-section">
            <div className="section-header">
              <Sparkles size={18} />
              <div>
                <h3>Word bank</h3>
                <p>Tap a word or phrase to add it to your writing.</p>
              </div>
            </div>
            <div className="word-bank-tabs">
              {wordBank.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`word-bank-tab ${category.id === activeCategory ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <span className="tab-indicator" style={{ backgroundColor: category.color }} />
                  {category.label}
                </button>
              ))}
            </div>
            <div className="word-bank-grid">
              {activeWordBank.entries.map((entry) => (
                <button
                  key={entry.text}
                  type="button"
                  className="word-bank-chip"
                  onClick={() => insertFromWordBank(entry)}
                >
                  <span className="chip-emoji" aria-hidden>
                    {entry.emoji}
                  </span>
                  <span className="chip-text">{entry.text}</span>
                  <span className="chip-hint">{entry.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-header">
              <Wand2 size={18} />
              <div>
                <h3>Smart predictions</h3>
                <p>Finish your sentence with a quick suggestion.</p>
              </div>
            </div>
            <div className="prediction-grid">
              {predictions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="prediction-card"
                  onClick={() => applySuggestion(suggestion)}
                >
                  <span className="prediction-text">{suggestion.text}</span>
                  <span className="prediction-meta">{suggestion.source}</span>
                  {suggestion.hint && <span className="prediction-hint">{suggestion.hint}</span>}
                </button>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-header">
              <PenSquare size={18} />
              <div>
                <h3>Language frames</h3>
                <p>Use a frame to organise your thinking.</p>
              </div>
            </div>
            <div className="frames-grid">
              {languageFrames.map((frame) => (
                <div key={frame.title} className="frame-card">
                  <h4>{frame.title}</h4>
                  <p className="frame-text">{frame.frame}</p>
                  <p className="frame-hint">{frame.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-header">
              <Lightbulb size={18} />
              <div>
                <h3>Focus questions</h3>
                <p>Pick one to add more detail.</p>
              </div>
            </div>
            <ul className="focus-list">
              {focusQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
            {usedVocabulary.length > 0 && (
              <div className="used-words">
                <h4>Words you used</h4>
                <div className="used-words-grid">
                  {usedVocabulary.map((word) => (
                    <span key={word} className="used-word">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;
