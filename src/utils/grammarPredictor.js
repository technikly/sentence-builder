// src/utils/grammarPredictor.js

import {
  determiners,
  highFrequencyWords,
  linkingVerbs,
  modalHelpers,
  pronounFriendlyVerbs,
  pronouns,
  supportiveSentenceFrames,
  timeMarkers,
  levelRank
} from '../data/ealWordBank';
import {
  adverbialsOfTime,
  clauseOpeners,
  coordinatingConjunctions,
  expandedNounPhrasePrompts,
  frontedAdverbials,
  grammarAppendixLookups,
  imperativeVerbs,
  modalVerbs,
  perfectAspectHelpers,
  progressiveAspectHelpers,
  punctuationPrompts,
  questionOpenersUk,
  relativeClauseStarters,
  subordinatingConjunctions
} from '../data/grammarAppendix';

const normalise = (value) => value?.toLowerCase().replace(/[^\p{L}'’-]+/gu, '') ?? '';

const getLevelRank = (level) => levelRank[level] ?? 0;

const addSuggestions = (target, items, supportLevel, seen) => {
  const supportRank = getLevelRank(supportLevel);
  items.forEach((item) => {
    const suggestion = typeof item === 'string' ? item : item.text;
    const level = typeof item === 'string' ? 'beginner' : item.level ?? 'beginner';
    if (!suggestion || getLevelRank(level) > supportRank) {
      return;
    }
    const key = suggestion.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      target.push(suggestion);
    }
  });
};

const extractActions = (categoryLookup) =>
  categoryLookup?.get('actions')?.items?.map((item) => item.text) ?? [];

const extractDescriptions = (categoryLookup) =>
  categoryLookup?.get('descriptions')?.items?.map((item) => item.text) ?? [];

const extractPeople = (categoryLookup) =>
  categoryLookup?.get('people')?.items?.map((item) => item.text) ?? [];

const hasCommaList = (text) => /,\s*[^,]+,\s*[^,]+$/.test(text);

const getWords = (text) => {
  const trimmed = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return [];
  }
  return trimmed.split(' ');
};

const getLastWords = (words, count) => words.slice(-count);

export const generateGrammarSuggestions = ({
  prefix,
  previousWord,
  textBeforeCaret,
  supportLevel,
  categoryLookup,
  uniqueWordList
}) => {
  const suggestions = [];
  const seen = new Set();

  const prefixNormalised = normalise(prefix);
  const previousNormalised = normalise(previousWord);
  const words = getWords(textBeforeCaret);
  const [lastWord = '', secondLastWord = ''] = getLastWords(words, 2).map(normalise);
  const trimmed = textBeforeCaret.replace(/\u00a0/g, ' ');
  const isNewSentence = !trimmed.trim() || /[.!?]\s*$/.test(trimmed);
  const endsWithComma = /,\s*$/.test(trimmed);
  const previousTwo = `${secondLastWord} ${lastWord}`.trim();

  if (prefixNormalised) {
    const prefixMatches = uniqueWordList
      .filter((word) => {
        const lower = normalise(word);
        return lower.startsWith(prefixNormalised) && lower !== prefixNormalised;
      })
      .slice(0, 6);
    addSuggestions(suggestions, prefixMatches, supportLevel, seen);
  }

  if (isNewSentence) {
    addSuggestions(suggestions, frontedAdverbials, supportLevel, seen);
    addSuggestions(suggestions, supportiveSentenceFrames, supportLevel, seen);
    addSuggestions(suggestions, questionOpenersUk, supportLevel, seen);
    addSuggestions(suggestions, imperativeVerbs, supportLevel, seen);
  }

  if (pronouns.includes(previousNormalised)) {
    addSuggestions(suggestions, modalVerbs, supportLevel, seen);
    addSuggestions(suggestions, pronounFriendlyVerbs, supportLevel, seen);
    addSuggestions(suggestions, extractActions(categoryLookup), supportLevel, seen);
  }

  if (modalVerbs.find((item) => item.text === previousNormalised) || modalHelpers.includes(previousNormalised)) {
    const actionItems = extractActions(categoryLookup).filter((item) => /\b[a-z]+\b/iu.test(item));
    addSuggestions(suggestions, actionItems, supportLevel, seen);
  }

  if (progressiveAspectHelpers.find((item) => item.text === previousNormalised)) {
    const ingVerbs = extractActions(categoryLookup).filter((item) => /ing\b/.test(item));
    addSuggestions(suggestions, ingVerbs, supportLevel, seen);
  }

  if (perfectAspectHelpers.find((item) => item.text === previousNormalised)) {
    const pastParticiples = extractActions(categoryLookup).filter((item) => /ed\b/.test(item));
    addSuggestions(suggestions, pastParticiples, supportLevel, seen);
  }

  if (determiners.includes(previousNormalised)) {
    addSuggestions(suggestions, expandedNounPhrasePrompts, supportLevel, seen);
    addSuggestions(suggestions, extractPeople(categoryLookup), supportLevel, seen);
    addSuggestions(suggestions, extractActions(categoryLookup), supportLevel, seen);
  }

  if (linkingVerbs.includes(previousNormalised)) {
    addSuggestions(suggestions, extractDescriptions(categoryLookup), supportLevel, seen);
  }

  if (subordinatingConjunctions.find((item) => item.text === previousNormalised)) {
    addSuggestions(suggestions, determiners, supportLevel, seen);
    addSuggestions(suggestions, pronouns, supportLevel, seen);
  }

  if (coordinatingConjunctions.find((item) => item.text === previousNormalised)) {
    addSuggestions(suggestions, determiners, supportLevel, seen);
    addSuggestions(suggestions, pronouns, supportLevel, seen);
    addSuggestions(suggestions, extractPeople(categoryLookup), supportLevel, seen);
  }

  if (relativeClauseStarters.find((item) => item.text === previousNormalised)) {
    addSuggestions(suggestions, extractActions(categoryLookup), supportLevel, seen);
    addSuggestions(suggestions, adverbialsOfTime, supportLevel, seen);
  }

  if (timeMarkers.includes(previousNormalised) || clauseOpeners.find((item) => item.text === previousTwo)) {
    addSuggestions(suggestions, extractActions(categoryLookup), supportLevel, seen);
  }

  if (endsWithComma) {
    addSuggestions(suggestions, clauseOpeners, supportLevel, seen);
    addSuggestions(suggestions, adverbialsOfTime, supportLevel, seen);
  }

  if (hasCommaList(trimmed)) {
    addSuggestions(suggestions, punctuationPrompts.filter((item) => item.text === ','), supportLevel, seen);
    addSuggestions(suggestions, coordinatingConjunctions, supportLevel, seen);
  }

  if (!suggestions.length) {
    addSuggestions(suggestions, highFrequencyWords, supportLevel, seen);
  }

  return suggestions.slice(0, 10);
};

export const getGrammarFocusForLevel = (level) =>
  grammarAppendixLookups.frontedAdverbials.find((item) => item.level === level)?.focus ?? '';
