import {
  supportiveSentenceFrames,
  highFrequencyWords,
  pronouns,
  pronounFriendlyVerbs,
  determiners,
  linkingVerbs,
  questionOpeners,
  timeMarkers,
  modalHelpers
} from '../data/ealWordBank.js';

const MAX_SUGGESTIONS = 8;

const normalise = (value) => value?.toLowerCase()?.trim() ?? '';

const pushUnique = (store, value) => {
  const text = value.trim();
  if (!text) {
    return;
  }
  const key = text.toLowerCase();
  if (!store.has(key)) {
    store.set(key, text);
  }
};

export const generatePredictiveSuggestions = ({
  caretContext,
  categoryLookup,
  uniqueWordList,
  grammarTargets = [],
  supportLevel
}) => {
  const store = new Map();
  const prefix = normalise(caretContext.prefix);
  const previous = normalise(caretContext.previousWord);
  const textBefore = caretContext.textBeforeCaret ?? '';

  if (prefix) {
    uniqueWordList
      .filter((word) => word.toLowerCase().startsWith(prefix) && word.toLowerCase() !== prefix)
      .slice(0, 6)
      .forEach((match) => pushUnique(store, match));
  }

  const isNewSentence = !textBefore || /[.!?]\s*$/.test(textBefore);
  let contextualPool = [];

  if (isNewSentence) {
    contextualPool = supportiveSentenceFrames;
  } else if (pronouns.includes(previous)) {
    contextualPool = pronounFriendlyVerbs;
  } else if (determiners.includes(previous)) {
    contextualPool = [
      ...(categoryLookup.get('descriptions')?.items.map((item) => item.text) ?? []),
      ...(categoryLookup.get('people')?.items.map((item) => item.text) ?? [])
    ];
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

  contextualPool.forEach((entry) => {
    const text = typeof entry === 'string' ? entry : entry.text;
    if (text) {
      pushUnique(store, text);
    }
  });

  grammarTargets.forEach((target) => {
    (target.recommendationWords ?? []).forEach((word) => pushUnique(store, word));
  });

  if (store.size < MAX_SUGGESTIONS && supportLevel !== 'beginner') {
    supportiveSentenceFrames.forEach((frame) => pushUnique(store, frame));
  }

  if (!prefix && store.size < MAX_SUGGESTIONS) {
    grammarTargets
      .flatMap((target) => target.suggestions ?? [])
      .forEach((tip) => {
        if (tip.length < 32) {
          pushUnique(store, tip);
        }
      });
  }

  return Array.from(store.values()).slice(0, MAX_SUGGESTIONS);
};
