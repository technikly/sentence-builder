// src/utils/dictionary.js
// Utility functions to interact with the Datamuse API for
// fetching part-of-speech information and predictive suggestions.

// Fetch the part of speech for a word. Returns 'unknown' if not found.
export const fetchWordClass = async (word) => {
  if (!word) return 'unknown';
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
    return data.map((item) => item.word);
  } catch {
    return [];
  }
};
