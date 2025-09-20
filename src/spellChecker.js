// src/spellChecker.js

import nspell from 'nspell';
import {
  flattenWordBank,
  highFrequencyWords,
  supportiveSentenceFrames,
  wordBankCategories
} from './data/ealWordBank';
import { grammarObjectives } from './data/ukGrammarAppendix';
import { filterChildFriendly } from './utils/filterSuggestions.js';

let spell;

const dictionarySources = [
  {
    aff: 'https://cdn.jsdelivr.net/npm/dictionary-en-gb/index.aff',
    dic: 'https://cdn.jsdelivr.net/npm/dictionary-en-gb/index.dic'
  },
  {
    aff: 'https://cdn.jsdelivr.net/npm/dictionary-en/index.aff',
    dic: 'https://cdn.jsdelivr.net/npm/dictionary-en/index.dic'
  }
];

const sanitiseForLexicon = (word) => word.replace(/[^a-z'-]/gi, '').toLowerCase();

const extendDictionaryWithCurriculumWords = (instance) => {
  if (!instance) {
    return;
  }
  const customWords = new Set();
  flattenWordBank(wordBankCategories, 'advanced').forEach((phrase) => {
    phrase
      .split(/\s+/)
      .map(sanitiseForLexicon)
      .filter(Boolean)
      .forEach((word) => customWords.add(word));
  });
  supportiveSentenceFrames.forEach((frame) => {
    frame
      .split(/\s+/)
      .map(sanitiseForLexicon)
      .filter(Boolean)
      .forEach((word) => customWords.add(word));
  });
  highFrequencyWords
    .map(sanitiseForLexicon)
    .filter(Boolean)
    .forEach((word) => customWords.add(word));
  grammarObjectives.forEach((objective) => {
    (objective.examples ?? []).forEach((example) => {
      example
        .split(/\s+/)
        .map(sanitiseForLexicon)
        .filter(Boolean)
        .forEach((word) => customWords.add(word));
    });
  });

  customWords.forEach((word) => {
    try {
      instance.add(word);
    } catch {
      // Ignore words that cannot be added to the lexicon
    }
  });
};

export const initializeSpellChecker = async () => {
  if (spell) {
    return spell;
  }

  for (const source of dictionarySources) {
    try {
      const [aff, dic] = await Promise.all([
        fetch(source.aff).then((response) => response.text()),
        fetch(source.dic).then((response) => response.text())
      ]);
      spell = nspell(aff, dic);
      extendDictionaryWithCurriculumWords(spell);
      break;
    } catch {
      // try next dictionary source
    }
  }

  if (!spell) {
    throw new Error('Unable to load dictionary data');
  }

  return spell;
};

export const checkSpelling = (word) => {
  if (!spell) return true; // Assume correct if spell checker not initialized
  const sanitised = sanitiseForLexicon(word);
  if (!sanitised) {
    return true;
  }
  return spell.correct(sanitised);
};

export const getSuggestions = (word) => {
  if (!spell) return [];
  const sanitised = sanitiseForLexicon(word);
  if (!sanitised) {
    return [];
  }
  const suggestions = spell.suggest(sanitised);
  return filterChildFriendly(suggestions);
};
