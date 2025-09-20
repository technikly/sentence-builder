import nlp from 'compromise';
import { determiners, pronouns } from '../data/ealWordBank';
import { grammarObjectives } from '../data/ukGrammarAppendix';

const coordinatingConjunctions = ['and', 'but', 'or', 'so', 'yet'];
const subordinatingConjunctions = [
  'because',
  'when',
  'if',
  'that',
  'although',
  'since',
  'after',
  'before',
  'while',
  'until',
  'unless'
];
const prepositions = [
  'before',
  'after',
  'under',
  'over',
  'into',
  'onto',
  'during',
  'beyond',
  'inside',
  'outside',
  'between',
  'across',
  'through'
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sentenceSplitter = (text) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const detectors = {
  capitalLetters: ({ sentences }) =>
    sentences.length > 0 &&
    sentences.every((sentence) => {
      const firstChar = sentence.trim()[0];
      if (!firstChar) {
        return true;
      }
      return firstChar === firstChar.toUpperCase() && /[A-Z]/.test(firstChar);
    }),
  fullStops: ({ sentences }) =>
    sentences.length > 0 &&
    sentences.every((sentence) => /[.!?]$/.test(sentence)),
  questionMarks: ({ text }) => /\?/u.test(text),
  exclamationMarks: ({ text }) => /!/u.test(text),
  conjunctions: ({ text }) =>
    new RegExp(`\\b(${coordinatingConjunctions.map(escapeRegex).join('|')})\\b`, 'i').test(
      text
    ),
  subordinateConjunctions: ({ text }) =>
    new RegExp(`\\b(${subordinatingConjunctions.map(escapeRegex).join('|')})\\b`, 'i').test(
      text
    ),
  nounPhrases: ({ doc }) => doc?.match('#Determiner? #Adjective+ #Noun').found ?? false,
  adjectives: ({ doc }) => (doc?.adjectives().out('array').length ?? 0) > 0,
  adverbs: ({ doc }) => (doc?.adverbs().out('array').length ?? 0) > 0,
  verbs: ({ doc }) => (doc?.verbs().out('array').length ?? 0) > 0,
  progressiveVerbs: ({ text }) => /\b(?:is|are|was|were)\s+\w+ing\b/i.test(text),
  pronouns: ({ text }) =>
    new RegExp(`\\b(${pronouns.map(escapeRegex).join('|')})\\b`, 'i').test(text),
  determiners: ({ text }) =>
    new RegExp(`\\b(${determiners.map(escapeRegex).join('|')})\\b`, 'i').test(text),
  prepositions: ({ text }) =>
    new RegExp(`\\b(${prepositions.map(escapeRegex).join('|')})\\b`, 'i').test(text),
  commasInLists: ({ text }) => /\w+,\s+\w+,\s+(?:and|or)\s+\w+/i.test(text),
  apostrophes: ({ text }) => /['’]/.test(text)
};

export const analyseTextAgainstGrammar = (text) => {
  const trimmed = text.trim();
  const sentences = trimmed ? sentenceSplitter(trimmed) : [];
  const doc = trimmed ? nlp(trimmed) : null;
  const context = { text: trimmed, sentences, doc };

  return grammarObjectives.map((objective) => ({
    ...objective,
    met: detectors[objective.id]?.(context) ?? false
  }));
};

export const summariseGrammarNeeds = (analysis) =>
  analysis.filter((item) => !item.met).map((item) => ({
    id: item.id,
    label: item.label,
    tip: item.tip,
    stage: item.stage,
    examples: item.examples
  }));
