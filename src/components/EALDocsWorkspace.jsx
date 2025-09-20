import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  FileDown,
  Highlighter,
  Italic,
  Languages,
  List,
  Sparkles,
  Underline,
  Undo,
  Redo,
  Volume2,
  BookOpen,
  Lightbulb,
  UserRound,
  NotebookPen
} from 'lucide-react';
import { ealWordBank, languageTips, quickPhraseGroups } from '../data/ealWordBank';
import { getPredictions, getWordHintsFor } from '../utils/predictionEngine';

const wordEntryShape = PropTypes.shape({
  text: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired
});

const suggestionShape = PropTypes.shape({
  text: PropTypes.string.isRequired,
  reason: PropTypes.string.isRequired,
  category: PropTypes.string
});

const statsShape = PropTypes.shape({
  wordCount: PropTypes.number.isRequired,
  sentences: PropTypes.number.isRequired,
  speakingTime: PropTypes.string.isRequired,
  uniqueWords: PropTypes.number.isRequired
});

const ToolbarButton = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
    aria-label={label}
  >
    <Icon className="h-4 w-4" />
  </button>
);

const SuggestionBar = ({ suggestions, onSelect }) => {
  if (!suggestions.length) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Keep typing to see smart suggestions that can build your next sentence.
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {suggestions.map((suggestion) => (
        <button
          key={`${suggestion.category}-${suggestion.text}`}
          type="button"
          onClick={() => onSelect(suggestion.text)}
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{suggestion.text}</p>
            <p className="text-xs text-slate-500">{suggestion.reason}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

const WordBankPanel = ({
  categories,
  activeCategory,
  onSelectCategory,
  onInsertWord
}) => {
  const active = categories[activeCategory] ?? Object.values(categories)[0];

  if (!active) return null;

  return (
    <aside className="w-full border-t border-slate-200 bg-white shadow-inner lg:w-80 lg:border-t-0 lg:border-l">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <NotebookPen className="h-5 w-5 text-slate-600" />
        <div>
          <p className="text-sm font-semibold text-slate-800">Word bank</p>
          <p className="text-xs text-slate-500">Tap a word or frame to add it to the document.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
        {Object.entries(categories).map(([key, category]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectCategory(key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              key === activeCategory
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
      <div className="flex h-full flex-col overflow-y-auto px-5 py-5">
        <p className={`mb-4 rounded-lg border px-3 py-2 text-sm font-medium ${active.badgeClass}`}>
          {active.description}
        </p>
        <div className="flex flex-wrap gap-3">
          {active.words.map((word) => (
            <button
              key={word.text}
              type="button"
              onClick={() => onInsertWord(word.text)}
              className={`w-full rounded-lg border px-3 py-3 text-left text-sm shadow-sm transition hover:-translate-y-0.5 ${active.chipClass}`}
            >
              <span className="block font-semibold">{word.text}</span>
              <span className="mt-1 block text-xs opacity-80">{word.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

const QuickPhrasePanel = ({ groups, onInsert, visible }) => {
  if (!visible) return null;
  return (
    <section className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-6">
      <div className="mb-4 flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-sky-600" />
        <div>
          <h3 className="text-base font-semibold text-slate-800">Language buddy</h3>
          <p className="text-sm text-slate-500">Choose a phrase when you need support while writing or collaborating.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.label} className={`rounded-xl border px-4 py-4 shadow-sm ${group.colourClass}`}>
            <p className="text-sm font-semibold text-slate-700">{group.label}</p>
            <div className="mt-3 flex flex-col gap-2">
              {group.phrases.map((phrase) => (
                <button
                  key={phrase.text}
                  type="button"
                  onClick={() =>
                    onInsert(phrase.text, { newLine: true, prependNewLine: true })
                  }
                  className="rounded-lg border border-transparent bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-100"
                >
                  <span className="block font-medium">{phrase.text}</span>
                  <span className="block text-xs text-slate-500">{phrase.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const DocumentStats = ({ stats }) => (
  <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">Word count</p>
      <p className="text-xl font-semibold text-slate-800">{stats.wordCount}</p>
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">Sentences</p>
      <p className="text-xl font-semibold text-slate-800">{stats.sentences}</p>
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">Speaking time</p>
      <p className="text-xl font-semibold text-slate-800">{stats.speakingTime}</p>
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">Unique words</p>
      <p className="text-xl font-semibold text-slate-800">{stats.uniqueWords}</p>
    </div>
  </div>
);

const SelectedWordHint = ({ hint }) => {
  if (!hint) return null;
  return (
    <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <Lightbulb className="mt-0.5 h-5 w-5 text-amber-500" />
      <div>
        <p className="text-sm font-semibold text-amber-700">{hint.text}</p>
        <p className="text-xs text-amber-600">{hint.hint}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-500">From {hint.categoryLabel}</p>
      </div>
    </div>
  );
};

const TopBar = ({ title, onTitleChange, stats, onSpeak, onDownload }) => (
  <header className="flex items-center gap-6 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-600 text-lg font-semibold text-white">
        Ed
      </div>
      <div>
        <input
          value={title}
          onChange={onTitleChange}
          className="w-64 rounded-md border border-transparent bg-transparent text-lg font-semibold text-slate-800 focus:border-sky-400 focus:outline-none"
          aria-label="Document title"
        />
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{stats.wordCount} words</span>
          <span>•</span>
          <span>{stats.sentences} sentences</span>
          <span>•</span>
          <span>{stats.speakingTime} to read aloud</span>
        </div>
      </div>
    </div>
    <div className="ml-auto flex items-center gap-2">
      <button
        type="button"
        onClick={onSpeak}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
      >
        <Volume2 className="h-4 w-4" />
        Listen
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
      >
        <FileDown className="h-4 w-4" />
        Download
      </button>
      <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        Ready to collaborate
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600">
        <UserRound className="h-4 w-4" />
      </div>
    </div>
  </header>
);

const FormattingToolbar = ({ onCommand, onToggleBuddy, showBuddy }) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-6 py-3">
    <ToolbarButton icon={Bold} label="Bold" onClick={() => onCommand('bold')} />
    <ToolbarButton icon={Italic} label="Italic" onClick={() => onCommand('italic')} />
    <ToolbarButton icon={Underline} label="Underline" onClick={() => onCommand('underline')} />
    <ToolbarButton
      icon={Highlighter}
      label="Highlight"
      onClick={() => onCommand('backColor', '#fef08a')}
    />
    <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
    <ToolbarButton icon={AlignLeft} label="Align left" onClick={() => onCommand('justifyLeft')} />
    <ToolbarButton icon={AlignCenter} label="Align centre" onClick={() => onCommand('justifyCenter')} />
    <ToolbarButton icon={AlignRight} label="Align right" onClick={() => onCommand('justifyRight')} />
    <ToolbarButton icon={List} label="Bullet list" onClick={() => onCommand('insertUnorderedList')} />
    <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
    <ToolbarButton icon={Undo} label="Undo" onClick={() => onCommand('undo')} />
    <ToolbarButton icon={Redo} label="Redo" onClick={() => onCommand('redo')} />
    <div className="ml-auto flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleBuddy}
        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
          showBuddy
            ? 'border-sky-400 bg-sky-50 text-sky-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
        }`}
      >
        <Languages className="h-4 w-4" />
        Language buddy
      </button>
    </div>
  </div>
);

ToolbarButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired
};

SuggestionBar.propTypes = {
  suggestions: PropTypes.arrayOf(suggestionShape).isRequired,
  onSelect: PropTypes.func.isRequired
};

WordBankPanel.propTypes = {
  categories: PropTypes.objectOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      badgeClass: PropTypes.string.isRequired,
      chipClass: PropTypes.string.isRequired,
      words: PropTypes.arrayOf(wordEntryShape).isRequired
    })
  ).isRequired,
  activeCategory: PropTypes.string.isRequired,
  onSelectCategory: PropTypes.func.isRequired,
  onInsertWord: PropTypes.func.isRequired
};

QuickPhrasePanel.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      colourClass: PropTypes.string.isRequired,
      phrases: PropTypes.arrayOf(wordEntryShape).isRequired
    })
  ).isRequired,
  onInsert: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired
};

DocumentStats.propTypes = {
  stats: statsShape.isRequired
};

SelectedWordHint.propTypes = {
  hint: PropTypes.shape({
    text: PropTypes.string.isRequired,
    hint: PropTypes.string.isRequired,
    categoryLabel: PropTypes.string.isRequired
  })
};

TopBar.propTypes = {
  title: PropTypes.string.isRequired,
  onTitleChange: PropTypes.func.isRequired,
  stats: statsShape.isRequired,
  onSpeak: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired
};

FormattingToolbar.propTypes = {
  onCommand: PropTypes.func.isRequired,
  onToggleBuddy: PropTypes.func.isRequired,
  showBuddy: PropTypes.bool.isRequired
};

const useDocumentStats = (text) =>
  useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    const sentences = text.trim() ? text.split(/[.!?]+/).filter((chunk) => chunk.trim().length > 0).length : 0;
    const speakingSeconds = Math.ceil((words.length / 115) * 60);
    const minutes = Math.floor(speakingSeconds / 60);
    const seconds = speakingSeconds % 60;
    const speakingTime = words.length === 0 ? 'Less than 1 min' : `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    const uniqueWords = text
      .toLowerCase()
      .match(/[a-zA-Z']+/g);
    return {
      wordCount: words.length,
      sentences,
      speakingTime,
      uniqueWords: uniqueWords ? new Set(uniqueWords).size : 0
    };
  }, [text]);

const EALDocsWorkspace = () => {
  const [title, setTitle] = useState('EAL writing document');
  const [documentText, setDocumentText] = useState('');
  const [suggestions, setSuggestions] = useState(() => getPredictions(''));
  const [activeCategory, setActiveCategory] = useState('sentenceStarters');
  const [showLanguageBuddy, setShowLanguageBuddy] = useState(true);
  const [selectedWordHint, setSelectedWordHint] = useState(null);
  const editorRef = useRef(null);

  const stats = useDocumentStats(documentText);

  useEffect(() => {
    setSuggestions(getPredictions(documentText));
  }, [documentText]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !editorRef.current) {
        setSelectedWordHint(null);
        return;
      }
      const anchorNode = selection.anchorNode;
      if (!editorRef.current.contains(anchorNode)) {
        setSelectedWordHint(null);
        return;
      }
      const selected = selection.toString().trim();
      if (!selected || selected.split(/\s+/).length !== 1) {
        setSelectedWordHint(null);
        return;
      }
      setSelectedWordHint(getWordHintsFor(selected));
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    setDocumentText(editorRef.current.innerText.replace(/\u00A0/g, ' '));
  };

  const applyCommand = (command, value = null) => {
    focusEditor();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const shouldAddLeadingSpace = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      return documentText.length > 0 && !/\s$/.test(documentText);
    }
    const range = selection.getRangeAt(0).cloneRange();
    try {
      range.setStart(editorRef.current, 0);
    } catch {
      return documentText.length > 0 && !/\s$/.test(documentText);
    }
    const textBefore = range.toString();
    return textBefore.length > 0 && !/[\s\n]$/.test(textBefore);
  };

  const insertContent = (
    content,
    { newLine = false, appendSpace = true, prependNewLine = false } = {}
  ) => {
    if (!editorRef.current) return;
    focusEditor();
    const leading = shouldAddLeadingSpace() ? ' ' : '';
    const prefix = prependNewLine && documentText.trim().length > 0 ? '\n' : leading;
    const trailing = newLine ? '\n' : appendSpace ? ' ' : '';
    document.execCommand('insertText', false, `${prefix}${content}${trailing}`);
    setTimeout(handleEditorInput, 0);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    focusEditor();
    document.execCommand('insertText', false, text);
    setTimeout(handleEditorInput, 0);
  };

  const speakDocument = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const text = editorRef.current?.innerText.trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    window.speechSynthesis.speak(utterance);
  };

  const downloadDocument = () => {
    const blob = new Blob([documentText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'EAL-document'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const insertSuggestion = (text) => insertContent(text);

  const insertWord = (text) => insertContent(text);

  const insertPhrase = (text, options) => insertContent(text, options);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        title={title}
        onTitleChange={(event) => setTitle(event.target.value)}
        stats={stats}
        onSpeak={speakDocument}
        onDownload={downloadDocument}
      />
      <FormattingToolbar
        onCommand={applyCommand}
        onToggleBuddy={() => setShowLanguageBuddy((value) => !value)}
        showBuddy={showLanguageBuddy}
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        <main className="flex-1 overflow-y-auto px-4 pb-16 pt-6 sm:px-10">
          <div className="mx-auto w-full max-w-4xl">
            <SuggestionBar suggestions={suggestions} onSelect={insertSuggestion} />
            <SelectedWordHint hint={selectedWordHint} />
            <div className="mt-6 rounded-3xl bg-white p-10 shadow-lg">
              <div
                ref={editorRef}
                className="docs-editor min-h-[640px] whitespace-pre-wrap text-[16px] leading-relaxed text-slate-800 focus:outline-none"
                contentEditable
                role="textbox"
                aria-multiline="true"
                data-placeholder="Type your ideas here. Use the word bank if you need help."
                onInput={handleEditorInput}
                onBlur={handleEditorInput}
                onPaste={handlePaste}
                suppressContentEditableWarning
              />
            </div>
            <DocumentStats stats={stats} />
            <QuickPhrasePanel groups={quickPhraseGroups} onInsert={insertPhrase} visible={showLanguageBuddy} />
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800">Teacher tips</h3>
              <p className="mt-1 text-sm text-slate-500">
                Share these ideas with pupils to help them build confidence in English writing.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {languageTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
        <WordBankPanel
          categories={ealWordBank}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onInsertWord={insertWord}
        />
      </div>
    </div>
  );
};

export default EALDocsWorkspace;
