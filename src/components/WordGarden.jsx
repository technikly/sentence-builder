import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Dot, Save, Volume2 } from 'lucide-react';

const DICTIONARY = [
  'cat',
  'catch',
  'caterpillar',
  'castle',
  'car',
  'card',
  'care',
  'careful',
  'dog',
  'door',
  'down',
  'draw',
  'dream',
  'drift',
  'dragon',
  'drop',
  'apple',
  'apricot',
  'astronaut',
  'ask',
  'asleep',
  'after',
  'again',
  'quick',
  'quiet',
  'quiver',
  'queen',
  'question',
  'quack',
  'happy',
  'happen',
  'harbor',
  'harmony',
  'harvest',
  'hat',
  'play',
  'plane',
  'planet',
  'please',
  'place',
  'story',
  'stork',
  'storm',
  'store',
  'stone',
  'strong',
  'bright',
  'bring',
  'breeze',
  'bread',
  'break',
  'blue',
  'black',
  'brown',
  'brave',
  'broom',
  'green',
  'gold',
  'glow',
  'glide',
  'glitter',
  'sun',
  'sand',
  'song',
  'sound',
  'soft',
  'some',
  'time',
  'tiny',
  'tiger',
  'tired',
  'tickle',
  'magic',
  'make',
  'made',
  'many',
  'march',
  'marble'
];

const PUNCT = ['.', ',', '!', '?', '…', ';', ':'];

const GRADIENTS = [
  'linear-gradient(135deg, rgba(255,0,132,1) 0%, rgba(255,140,0,1) 50%, rgba(255,237,0,1) 100%)',
  'linear-gradient(135deg, rgba(0,167,255,1) 0%, rgba(0,242,195,1) 50%, rgba(255,0,224,1) 100%)',
  'linear-gradient(135deg, rgba(98,0,234,1) 0%, rgba(236,64,122,1) 50%, rgba(253,216,53,1) 100%)',
  'linear-gradient(135deg, rgba(0,200,83,1) 0%, rgba(0,176,255,1) 50%, rgba(156,39,176,1) 100%)',
  'linear-gradient(135deg, rgba(13,71,161,1) 0%, rgba(3,155,229,1) 50%, rgba(0,230,118,1) 100%)'
];

const PLACEHOLDER_ROOT = 'Start your story';

function pickRandom(arr, n) {
  const pool = [...arr];
  const result = [];
  while (result.length < n && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

function sizeForRank(rank) {
  if (rank === 0) return 'text-6xl md:text-7xl';
  if (rank === 1) return 'text-5xl md:text-6xl';
  return 'text-4xl md:text-5xl';
}

function tokensToText(list) {
  return list.reduce((acc, token) => {
    if (PUNCT.includes(token)) {
      return acc ? `${acc}${token}` : token;
    }
    return acc ? `${acc} ${token}` : token;
  }, '');
}

async function predictNext(context, currentWord) {
  await new Promise((resolve) => setTimeout(resolve, 120));

  const prefix = currentWord.toLowerCase();
  let candidates = DICTIONARY.filter((word) => word.startsWith(prefix));

  if (prefix.length === 0) {
    const tokens = context
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const last = tokens.at(-1) ?? '';
    candidates = last
      ? DICTIONARY.filter((word) => word.startsWith(last[0]))
      : pickRandom(DICTIONARY, 10);
  }

  const pool = candidates.length ? candidates : pickRandom(DICTIONARY, 10);
  return { words: pool.slice(0, 3), punctuation: PUNCT };
}

function randomGradientStep() {
  return 1 + Math.floor(Math.random() * (GRADIENTS.length - 1));
}

export default function WordGarden() {
  const [tokens, setTokens] = useState([]);
  const [current, setCurrent] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [punctuation, setPunctuation] = useState(PUNCT);
  const [bgIndex, setBgIndex] = useState(0);
  const [errorFlag, setErrorFlag] = useState(false);
  const [cursor, setCursor] = useState({ type: 'insert', index: 0 });
  const [activeToken, setActiveToken] = useState(null);
  const inputRef = useRef(null);

  const limitedIndex = Math.min(cursor.index ?? tokens.length, tokens.length);
  const contextBefore = useMemo(
    () => tokensToText(tokens.slice(0, limitedIndex)),
    [tokens, limitedIndex]
  );

  const focusNode = useMemo(() => {
    const trimmedCurrent = current.trim();
    if (trimmedCurrent) {
      return trimmedCurrent;
    }
    if (activeToken != null && tokens[activeToken]) {
      return tokens[activeToken];
    }
    const lastToken = tokens.at(-1);
    return lastToken || PLACEHOLDER_ROOT;
  }, [current, activeToken, tokens]);

  useEffect(() => {
    const prefix = current.trim().toLowerCase();
    if (prefix.length >= 3) {
      const exists = DICTIONARY.some((word) => word.startsWith(prefix));
      setErrorFlag(!exists);
    } else {
      setErrorFlag(false);
    }
  }, [current]);

  useEffect(() => {
    let alive = true;
    predictNext(contextBefore, current).then((result) => {
      if (!alive) return;
      setSuggestions(result.words);
      setPunctuation(result.punctuation);
    });
    return () => {
      alive = false;
    };
  }, [contextBefore, current]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCursor((prev) => {
      const maxIndex = tokens.length;
      const safeIndex = Math.min(prev.index ?? maxIndex, maxIndex);
      if (prev.type === 'replace' && safeIndex >= maxIndex) {
        return { type: 'insert', index: maxIndex };
      }
      if (safeIndex === (prev.index ?? maxIndex) && prev.type !== 'replace') {
        return prev;
      }
      if (safeIndex === prev.index && prev.type === 'replace') {
        return prev;
      }
      return { ...prev, index: safeIndex };
    });
    setActiveToken((prev) => (prev != null && prev >= tokens.length ? null : prev));
  }, [tokens.length]);

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: GRADIENTS[bgIndex % GRADIENTS.length]
    }),
    [bgIndex]
  );

  const ranked = suggestions.slice(0, 3);

  function syncInput(value) {
    if (inputRef.current) {
      inputRef.current.value = value;
      inputRef.current.focus();
      try {
        inputRef.current.setSelectionRange(value.length, value.length);
      } catch {
        // Ignore selection errors on some browsers
      }
    }
    setCurrent(value);
  }

  function resetInput() {
    syncInput('');
  }

  function commitWord(word) {
    const safeWord = word.trim();
    if (!safeWord) {
      resetInput();
      return;
    }

    let nextIndex = 0;
    setTokens((prev) => {
      const next = [...prev];
      if (cursor.type === 'replace' && cursor.index < next.length) {
        next[cursor.index] = safeWord;
        nextIndex = cursor.index + 1;
      } else {
        const insertAt = Math.min(cursor.index ?? prev.length, prev.length);
        next.splice(insertAt, 0, safeWord);
        nextIndex = insertAt + 1;
      }
      return next;
    });

    resetInput();
    setActiveToken(null);
    setCursor({ type: 'insert', index: nextIndex });
    setBgIndex((index) => (index + randomGradientStep()) % GRADIENTS.length);
  }

  function commitPunctuation(mark) {
    let nextIndex = 0;
    setTokens((prev) => {
      const next = [...prev];
      if (cursor.type === 'replace' && cursor.index < next.length) {
        next[cursor.index] = mark;
        nextIndex = cursor.index + 1;
      } else {
        const insertAt = Math.min(cursor.index ?? prev.length, prev.length);
        next.splice(insertAt, 0, mark);
        nextIndex = insertAt + 1;
      }
      return next;
    });

    resetInput();
    setActiveToken(null);
    setCursor({ type: 'insert', index: nextIndex });
    setBgIndex((index) => (index + randomGradientStep()) % GRADIENTS.length);
  }

  function speak(text) {
    if (typeof window === 'undefined' || !text) {
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('Speech synthesis failed', error);
    }
  }

  function handleChange(event) {
    const { value } = event.target;
    if (/\s/.test(value)) {
      const safe = current.trim();
      if (safe) {
        commitWord(safe);
      }
      resetInput();
      return;
    }
    setCurrent(value);
  }

  function removeToken(index) {
    if (index < 0) return;
    let nextIndex = 0;
    setTokens((prev) => {
      if (index >= prev.length) {
        return prev;
      }
      const next = [...prev];
      next.splice(index, 1);
      nextIndex = Math.min(index, next.length);
      return next;
    });
    setCursor({ type: 'insert', index: nextIndex });
    setActiveToken(null);
    setBgIndex((indexValue) => (indexValue + randomGradientStep()) % GRADIENTS.length);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const safe = current.trim();
      if (safe) {
        commitWord(safe);
      }
      return;
    }

    if (event.key === 'Backspace' && current.length === 0) {
      event.preventDefault();
      if (cursor.type === 'replace' && cursor.index < tokens.length) {
        removeToken(cursor.index);
        resetInput();
        return;
      }
      if (cursor.index > 0) {
        removeToken(cursor.index - 1);
        resetInput();
      }
    }
  }

  function handleSave() {
    try {
      const story = tokensToText(tokens).trim();
      const payload = { sentence: story, ts: Date.now() };
      const existing = JSON.parse(localStorage.getItem('wordgarden:saves') ?? '[]');
      const updated = [payload, ...existing].slice(0, 50);
      localStorage.setItem('wordgarden:saves', JSON.stringify(updated));
    } catch (error) {
      console.warn('Unable to save story', error);
    }
  }

  function handleTokenClick(index) {
    setActiveToken(index);
    inputRef.current?.focus();
  }

  function beginReplace(index) {
    const token = tokens[index] ?? '';
    setCursor({ type: 'replace', index });
    syncInput(token);
  }

  function beginAddBefore(index) {
    setCursor({ type: 'insert', index });
    resetInput();
    inputRef.current?.focus();
  }

  function beginAddAfter(index) {
    setCursor({ type: 'insert', index: index + 1 });
    resetInput();
    inputRef.current?.focus();
  }

  function deleteTokenAt(index) {
    removeToken(index);
    resetInput();
  }

  function continueAtEnd() {
    setActiveToken(null);
    setCursor({ type: 'insert', index: tokens.length });
    resetInput();
    inputRef.current?.focus();
  }

  const showPlaceholder = tokens.length === 0 && current.trim().length === 0;

  return (
    <div
      className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-black"
      onMouseDown={() => inputRef.current?.focus()}
    >
      <motion.div
        key={bgIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="absolute inset-0"
        style={{
          ...backgroundStyle,
          backgroundSize: '200% 200%',
          filter: 'saturate(1.1)'
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/50" />

      <div className="absolute right-4 top-4 z-30">
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 rounded-2xl bg-white/85 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur hover:bg-white"
        >
          <Save className="h-5 w-5" />
          Save
        </button>
      </div>

      <input
        ref={inputRef}
        type="text"
        autoFocus
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="absolute h-0 w-0 opacity-0"
        aria-hidden
      />

      <div className="relative z-20 flex h-full w-full flex-col items-center justify-center px-6">
        <div className="max-w-5xl text-center text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          <div className="flex flex-wrap items-center justify-center gap-y-2 text-2xl leading-relaxed md:text-3xl">
            {showPlaceholder ? (
              <span className="mx-2 rounded-xl bg-white/10 px-3 py-1 text-white/70">{PLACEHOLDER_ROOT}</span>
            ) : null}
            {tokens.map((token, index) => {
              const isActive = index === activeToken;
              const isPunctuation = PUNCT.includes(token);
              return (
                <button
                  type="button"
                  key={`${token}-${index}`}
                  onClick={() => handleTokenClick(index)}
                  className={`transition-colors ${
                    isPunctuation ? 'mx-1 px-1' : 'mx-1.5 px-1.5'
                  } rounded-lg text-white/95 hover:bg-white/15 ${
                    isActive ? 'bg-white/30 ring-2 ring-white/70 backdrop-blur' : ''
                  }`}
                >
                  {token}
                </button>
              );
            })}
            <span
              className={`inline-flex min-w-[1ch] border-b-2 px-1 ${
                errorFlag ? 'border-red-400' : 'border-white/80'
              }`}
            >
              {current}
            </span>
            <span className="ml-0.5 animate-pulse">|</span>
          </div>
          <AnimatePresence>
            {errorFlag ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-100 backdrop-blur"
              >
                <AlertTriangle className="h-4 w-4" />
                Keep an eye on that spelling – it looks unusual!
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {activeToken != null ? (
            <motion.div
              key="token-actions"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                type="button"
                onClick={() => beginReplace(activeToken)}
                className="rounded-xl bg-white/85 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-white"
              >
                Edit word
              </button>
              <button
                type="button"
                onClick={() => beginAddBefore(activeToken)}
                className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
              >
                Add before
              </button>
              <button
                type="button"
                onClick={() => beginAddAfter(activeToken)}
                className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
              >
                Add after
              </button>
              <button
                type="button"
                onClick={() => deleteTokenAt(activeToken)}
                className="rounded-xl bg-red-500/80 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={continueAtEnd}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                Continue at end
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-12 w-full max-w-6xl px-4">
          <div className="flex flex-col items-center gap-16">
            <motion.div
              key={focusNode}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative"
            >
              <div className="rounded-3xl bg-white/15 px-6 py-3 text-xl font-semibold text-white/90 shadow-xl backdrop-blur">
                {focusNode}
              </div>
              <div className="absolute -bottom-14 left-1/2 h-14 w-px -translate-x-1/2 bg-white/40" aria-hidden />
            </motion.div>

            <div className="relative flex w-full max-w-4xl items-start justify-center gap-10">
              <div className="absolute -top-8 left-[10%] right-[10%] h-px bg-white/35" aria-hidden />
              <AnimatePresence>
                {ranked.map((word, index) => (
                  <motion.div
                    key={word}
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="relative flex flex-col items-center"
                  >
                    <div className="absolute -top-8 h-8 w-px bg-white/35" aria-hidden />
                    <SuggestionNode
                      word={word}
                      rank={index}
                      onPick={() => commitWord(word)}
                      onSpeak={() => speak(word)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-white/90">
          {punctuation.map((mark) => (
            <button
              key={mark}
              type="button"
              onClick={() => commitPunctuation(mark)}
              className="rounded-xl bg-white/80 px-4 py-2 text-lg font-semibold text-slate-800 shadow hover:bg-white"
              aria-label={`Insert ${mark}`}
            >
              {mark}
            </button>
          ))}
          <span className="mx-2 text-white/60">|</span>
          <span className="inline-flex items-center gap-1 text-white/90">
            <AlertTriangle className="h-4 w-4" />
            error
          </span>
          <span className="inline-flex items-center gap-1 text-white/90">
            <Dot className="h-5 w-5" />
            pause
          </span>
        </div>
      </div>
    </div>
  );
}

function SuggestionNode({ word, rank, onPick, onSpeak }) {
  return (
    <div className="group flex flex-col items-center">
      <motion.button
        type="button"
        layout
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={onPick}
        className={`font-bold text-white ${sizeForRank(rank)} tracking-wide drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]`}
      >
        {word}
      </motion.button>
      <button
        type="button"
        onClick={onSpeak}
        className="mt-3 rounded-full bg-white/90 p-2 text-slate-900 opacity-0 shadow transition-opacity group-hover:opacity-100"
        aria-label={`Speak ${word}`}
      >
        <Volume2 className="h-4 w-4" />
      </button>
    </div>
  );
}

SuggestionNode.propTypes = {
  word: PropTypes.string.isRequired,
  rank: PropTypes.number.isRequired,
  onPick: PropTypes.func.isRequired,
  onSpeak: PropTypes.func.isRequired
};

