import { splitIntoSentences, tokenizeWords, getLastWords } from './textAnalysis.js';

const coordinatingConjunctions = ['and', 'but', 'or', 'so', 'for', 'nor', 'yet'];
const subordinatingConjunctions = [
  'because',
  'if',
  'when',
  'after',
  'before',
  'while',
  'although',
  'since',
  'that',
  'as',
  'once'
];

const adjectiveSamples = [
  'bright',
  'quiet',
  'curious',
  'happy',
  'colourful',
  'gentle',
  'excited',
  'determined',
  'brave',
  'spectacular'
];

const features = [
  {
    id: 'capitalLetters',
    stage: 'KS1',
    label: 'Capital letters to start sentences',
    description: 'Every sentence should begin with a capital letter.',
    check: (sentences) => sentences.every((sentence) => /^[A-Z]/.test(sentence)),
    suggestions: ['Remember to start with a capital letter.']
  },
  {
    id: 'endPunctuation',
    stage: 'KS1',
    label: 'Sentence punctuation',
    description: 'Sentences should finish with a full stop, question mark, or exclamation mark.',
    check: (sentences) =>
      sentences.length === 0 || sentences.every((sentence) => /[.!?]$/.test(sentence)),
    suggestions: ['Add a full stop or question mark to finish your sentence.']
  },
  {
    id: 'coordinatingConjunctions',
    stage: 'KS1',
    label: 'Coordinating conjunctions',
    description: 'Use words like "and", "but", and "so" to join clauses.',
    check: (sentences, words) => words.some((word) => coordinatingConjunctions.includes(word)),
    suggestions: ['Try joining ideas with "and", "but", or "so".'],
    recommendationWords: ['and', 'but', 'so']
  },
  {
    id: 'expandedNounPhrases',
    stage: 'KS1',
    label: 'Expanded noun phrases',
    description: 'Use adjectives before nouns to give more detail.',
    check: (sentences, words) => {
      for (let index = 0; index < words.length - 1; index += 1) {
        const current = words[index];
        const next = words[index + 1];
        if (adjectiveSamples.includes(current) && /[a-z]+/.test(next)) {
          return true;
        }
      }
      return false;
    },
    suggestions: ['Add an adjective before your noun, e.g. "the bright garden".'],
    recommendationWords: ['bright', 'colourful', 'exciting']
  },
  {
    id: 'progressiveForm',
    stage: 'Lower KS2',
    label: 'Progressive form verbs',
    description: 'Combine "is/are/was/were" with verbs ending in -ing.',
    check: (sentences) =>
      sentences.some((sentence) => /\b(am|is|are|was|were)\s+\w+ing\b/i.test(sentence)),
    suggestions: ['Use verbs like "is running" or "were exploring" to show ongoing action.'],
    recommendationWords: ['is exploring', 'are investigating']
  },
  {
    id: 'subordination',
    stage: 'Lower KS2',
    label: 'Subordinating conjunctions',
    description: 'Use words such as "because", "if", or "when" to link clauses.',
    check: (sentences, words) =>
      words.some((word) => subordinatingConjunctions.includes(word)),
    suggestions: ['Link ideas using "because", "when", or "if".'],
    recommendationWords: ['because', 'when', 'if']
  },
  {
    id: 'frontedAdverbials',
    stage: 'Upper KS2',
    label: 'Fronted adverbials',
    description: 'Start a sentence with an adverbial phrase followed by a comma.',
    check: (sentences) =>
      sentences.some(
        (sentence) =>
          /,\s/.test(sentence.slice(0, 30)) ||
          ['After', 'Before', 'When', 'While', 'As soon as', 'Later', 'Next', 'Suddenly', 'Carefully', 'Eventually'].some(
            (starter) => sentence.startsWith(starter)
          )
      ),
    suggestions: ['Begin a sentence with a time or manner phrase, then add a comma.'],
    recommendationWords: ['Suddenly,', 'After that,', 'Carefully,']
  },
  {
    id: 'possessiveApostrophes',
    stage: 'Upper KS2',
    label: 'Possessive apostrophes',
    description: 'Use apostrophes to show belonging.',
    check: (sentences) => /\w+'s|\w+s'/.test(sentences.join(' ')),
    suggestions: ['Show who something belongs to using an apostrophe, e.g. "the teacher\'s desk".'],
    recommendationWords: ["teacher's", "friend's", "school's"]
  }
];

export const evaluateGrammarAgainstCurriculum = (text = '') => {
  const sentences = splitIntoSentences(text);
  const wordTokens = tokenizeWords(text).map((word) => word.toLowerCase());
  const met = [];
  const targets = [];

  features.forEach((feature) => {
    const achieved = feature.check(sentences, wordTokens, getLastWords(text));
    const payload = {
      id: feature.id,
      stage: feature.stage,
      label: feature.label,
      description: feature.description,
      suggestions: feature.suggestions,
      recommendationWords: feature.recommendationWords ?? []
    };
    if (achieved) {
      met.push(payload);
    } else {
      targets.push(payload);
    }
  });

  return { met, targets };
};

export const getCurriculumTargets = (text) => evaluateGrammarAgainstCurriculum(text).targets;
