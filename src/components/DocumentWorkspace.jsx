import { useEffect, useMemo, useRef, useState } from 'react';
import { Cloud, MessageSquarePlus, Share2, Smile } from 'lucide-react';
import EditorToolbar from './EditorToolbar';
import WordBankPanel from './WordBankPanel';
import PredictiveSuggestions from './PredictiveSuggestions';
import {
  confidenceFrames,
  languageFocusTips,
  predictiveLexicon,
  wordBankCategories
} from '../utils/ealResources';

const formatTime = (date) =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

const getSelectionState = () => {
  if (typeof window === 'undefined') return {};
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return {};
  const range = selection.getRangeAt(0);
  const parent = range.commonAncestorContainer;
  const element = parent.nodeType === 1 ? parent : parent.parentElement;
  if (!element) return {};

  return {
    blockType: element.closest('h1')
      ? 'h1'
      : element.closest('h2')
        ? 'h2'
        : element.closest('h3')
          ? 'h3'
          : 'p',
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    highlight: document.queryCommandValue('backColor') === '#fff475'
  };
};

const DocumentWorkspace = () => {
  const editorRef = useRef(null);
  const [docTitle, setDocTitle] = useState('EAL Writing Journal');
  const [documentText, setDocumentText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [lastSaved, setLastSaved] = useState(new Date());
  const [selectionState, setSelectionState] = useState({});
  const [focusTipIndex, setFocusTipIndex] = useState(0);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  const activeTip = languageFocusTips[focusTipIndex];
  const activeFrame = confidenceFrames[activeFrameIndex];
  const quickWordList = useMemo(() => Object.values(wordBankCategories).flat().slice(0, 16), []);

  useEffect(() => {
    updateSuggestions('');
  }, []);

  useEffect(() => {
    const handler = () => setSelectionState(getSelectionState());
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setLastSaved(new Date()), 1500);
    return () => clearTimeout(timeout);
  }, [documentText, docTitle]);

  const wordCount = useMemo(() => {
    const words = documentText.trim().split(/\s+/);
    return documentText.trim() ? words.length : 0;
  }, [documentText]);

  const readingTime = useMemo(() => {
    if (wordCount === 0) return 'Less than a minute';
    const minutes = Math.max(1, Math.round(wordCount / 130));
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }, [wordCount]);

  const updateSuggestions = (text) => {
    const cleaned = text.toLowerCase().replace(/[^a-z\s']/g, ' ').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    const candidates = [];

    const maxLength = Math.min(3, words.length);
    for (let i = maxLength; i >= 1; i -= 1) {
      const key = words.slice(-i).join(' ');
      if (key) {
        candidates.push(key);
      }
    }

    const pool = [];
    for (const key of candidates) {
      if (predictiveLexicon[key]) {
        pool.push(...predictiveLexicon[key]);
        break;
      }
    }

    if (pool.length === 0) {
      pool.push(...predictiveLexicon['']);
    }

    setSuggestions([...new Set(pool)].slice(0, 4));
  };

  const ensureFocus = () => {
    const node = editorRef.current;
    if (!node) return;
    node.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const handleCommand = (command, value) => {
    ensureFocus();
    if (command === 'formatBlock') {
      document.execCommand('formatBlock', false, value);
    } else if (command === 'backColor') {
      document.execCommand('backColor', false, value);
    } else {
      document.execCommand(command, false, value || null);
    }
    setDocumentText(editorRef.current?.innerText || '');
    setSelectionState(getSelectionState());
  };

  const insertTextAtCursor = (text) => {
    ensureFocus();
    const currentText = editorRef.current?.innerText ?? '';
    const needsSpace = currentText.length > 0 && !currentText.endsWith(' ');
    const insertion = `${needsSpace ? ' ' : ''}${text} `;
    document.execCommand('insertText', false, insertion);
    const updatedText = editorRef.current?.innerText || '';
    setDocumentText(updatedText);
    updateSuggestions(updatedText);
  };

  const handleSuggestionSelect = (text) => {
    insertTextAtCursor(text);
    setSuggestions([]);
  };

  const handleInput = (event) => {
    const text = event.currentTarget.innerText;
    setDocumentText(text);
    updateSuggestions(text);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Tab' && suggestions.length > 0) {
      event.preventDefault();
      handleSuggestionSelect(suggestions[0]);
    }
  };

  const handleTitleChange = (event) => setDocTitle(event.target.value);

  const handleEditorClick = () => {
    updateSuggestions(editorRef.current?.innerText || '');
  };

  const rotateTip = () => {
    setFocusTipIndex((index) => (index + 1) % languageFocusTips.length);
  };

  const rotateFrame = () => {
    setActiveFrameIndex((index) => (index + 1) % confidenceFrames.length);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f3f4] text-slate-800">
      <header className="border-b border-[#dadce0] bg-[#f1f3f4]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1a73e8] text-white shadow">
            <span className="text-lg font-semibold">E</span>
          </div>
          <div>
            <input
              value={docTitle}
              onChange={handleTitleChange}
              className="w-56 border border-transparent bg-transparent text-lg font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
              aria-label="Document title"
            />
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Cloud className="h-3.5 w-3.5" />
              <span>Saved at {formatTime(lastSaved)}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-[#dadce0] bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-500 hover:bg-sky-50"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-[#1a73e8] px-4 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-[#1559b2]"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Start activity
            </button>
            <button
              type="button"
              onClick={rotateFrame}
              className="hidden items-center gap-2 rounded-full border border-[#dadce0] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-500 hover:bg-sky-50 md:flex"
            >
              <Smile className="h-4 w-4" />
              {activeFrame}
            </button>
          </div>
        </div>
        <EditorToolbar onCommand={handleCommand} selectionState={selectionState} />
      </header>

      <div className="flex flex-1">
        <main className="flex-1 overflow-auto">
          <div className="flex justify-center px-6 pb-16 pt-8">
            <div className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#dadce0] bg-[#f8f9fa] px-10 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Language focus</p>
                  <h2 className="text-lg font-semibold text-slate-800">{activeTip.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={rotateTip}
                  className="rounded-full border border-[#dadce0] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-sky-500 hover:bg-sky-50"
                >
                  Next tip
                </button>
              </div>

              <div className="px-10 pt-4 text-sm text-slate-600">
                <p className="font-medium text-slate-700">Tip</p>
                <p className="mt-1 leading-relaxed">{activeTip.tip}</p>
                <p className="mt-3 font-medium text-slate-700">Example</p>
                <p className="mt-1 rounded-lg bg-sky-50 px-3 py-2 text-slate-700 shadow-inner">{activeTip.example}</p>
              </div>

              <div className="relative">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  onClick={handleEditorClick}
                  className="min-h-[60vh] px-10 pb-20 pt-10 text-lg leading-relaxed text-slate-800 focus:outline-none"
                  aria-label="Document editor"
                />
                <PredictiveSuggestions suggestions={suggestions} onSelect={handleSuggestionSelect} />
              </div>

              <footer className="flex flex-col gap-6 border-t border-[#dadce0] bg-[#f8f9fa] px-10 py-4 text-sm text-slate-600">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-slate-800">{wordCount} words</span>
                    <span>Reading time: {readingTime}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Press <span className="rounded bg-white px-1 font-semibold text-slate-700 shadow-sm">Tab</span> to accept the
                    first prediction.
                  </p>
                </div>

                <div className="grid gap-3 rounded-lg border border-[#dadce0] bg-white px-4 py-3 shadow-sm lg:hidden">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick word bank</p>
                  <div className="flex flex-wrap gap-2">
                    {quickWordList.map((word) => (
                      <button
                        key={word}
                        type="button"
                        onClick={() => insertTextAtCursor(word)}
                        className="rounded-full border border-[#dadce0] bg-sky-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-sky-500 hover:bg-sky-100"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {confidenceFrames.map((frame) => (
                    <button
                      key={frame}
                      type="button"
                      onClick={() => insertTextAtCursor(frame)}
                      className="rounded-full border border-[#dadce0] bg-white px-3 py-1 font-medium text-slate-700 shadow-sm transition hover:border-sky-500 hover:bg-sky-50"
                    >
                      {frame}
                    </button>
                  ))}
                </div>
              </footer>
            </div>
          </div>
        </main>

        <div className="hidden w-80 border-l border-[#dadce0] bg-white lg:block">
          <WordBankPanel categories={wordBankCategories} onInsertWord={insertTextAtCursor} />
          <div className="border-t border-[#dadce0] bg-[#f8f9fa] px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Quick help</p>
            <p className="mt-1 leading-relaxed">
              Invite learners to read suggestions aloud. Choose a connector or feeling word to add detail to each sentence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentWorkspace;
