// src/utils/dictionary.js
// Utility functions to interact with the Datamuse API for
// fetching part-of-speech information and predictive suggestions.

import nlp from 'compromise';
import { filterChildFriendly } from './filterSuggestions.js';

// Fetch the part of speech for a word. If a sentence context is provided,
// attempt to determine the word's type using the surrounding words. Falls back
// to the Datamuse API when the context is insufficient. Returns 'unknown' if no
// type can be determined.
export const fetchWordClass = async (word, sentence = '') => {
  if (!word) return 'unknown';

  if (sentence) {
    try {
      const doc = nlp(sentence);
      const match = doc.match(word).terms().data()[0];
      const tags = match?.terms?.[0]?.tags || [];
      if (tags.length) {
        const tagMap = {
          Noun: 'noun',
          Verb: 'verb',
          Adjective: 'adjective',
          Adverb: 'adverb',
          Preposition: 'preposition',
          Conjunction: 'conjunction',
          Determiner: 'determiner',
          Pronoun: 'pronoun'
        };
        for (const tag of tags) {
          if (tagMap[tag]) {
            return tagMap[tag];
          }
        }
      }
    } catch {
      // Ignore errors and fall back to Datamuse
    }
  }

  try {
    const response = await fetch(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=p&max=1`
    );
    if (!response.ok) return 'unknown';
    const data = await response.json();
    if (!data.length || !data[0].tags) return 'unknown';
    const tag = data[0].tags.find((t) =>
      ['n', 'v', 'adj', 'adv', 'pron', 'prep', 'conj', 'det'].includes(t)
    );
    const tagMap = {
      n: 'noun',
      v: 'verb',
      adj: 'adjective',
      adv: 'adverb',
      pron: 'pronoun',
      prep: 'preposition',
      conj: 'conjunction',
      det: 'determiner'
    };
    return tagMap[tag] || 'unknown';
  } catch {
    return 'unknown';
  }
};

// Fetch up to ten predictive suggestions for the given fragment.
export const fetchSuggestions = async (fragment) => {
  if (!fragment) return [];
  try {
    const response = await fetch(
      `https://api.datamuse.com/sug?s=${encodeURIComponent(fragment)}&max=10`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return filterChildFriendly(data.map((item) => item.word));
  } catch {
    return [];
  }
};
