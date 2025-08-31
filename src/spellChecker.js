// src/spellChecker.js

import nspell from 'nspell';
import dictionary from 'dictionary-en';
import { filterChildFriendly } from './utils/filterSuggestions.js';

let spell;

export const initializeSpellChecker = () => {
  return new Promise((resolve, reject) => {
    dictionary((err, dict) => {
      if (err) {
        reject(err);
      } else {
        spell = nspell(dict);
        resolve(spell);
      }
    });
  });
};

export const checkSpelling = (word) => {
  if (!spell) return true; // Assume correct if spell checker not initialized
  return spell.correct(word);
};

export const getSuggestions = (word) => {
  if (!spell) return [];
  const suggestions = spell.suggest(word);
  return filterChildFriendly(suggestions);
};
