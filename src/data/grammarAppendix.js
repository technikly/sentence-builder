// src/data/grammarAppendix.js

export const frontedAdverbials = [
  {
    text: 'After a while,',
    level: 'intermediate',
    focus: 'fronted adverbial of time'
  },
  {
    text: 'Before long,',
    level: 'intermediate',
    focus: 'fronted adverbial of time'
  },
  {
    text: 'In the morning,',
    level: 'beginner',
    focus: 'fronted adverbial of time'
  },
  {
    text: 'Without a sound,',
    level: 'advanced',
    focus: 'fronted adverbial of manner'
  },
  {
    text: 'Beyond the playground,',
    level: 'advanced',
    focus: 'fronted adverbial of place'
  },
  {
    text: 'Later that day,',
    level: 'intermediate',
    focus: 'fronted adverbial of time'
  }
];

export const subordinatingConjunctions = [
  { text: 'because', level: 'beginner' },
  { text: 'when', level: 'beginner' },
  { text: 'if', level: 'beginner' },
  { text: 'that', level: 'beginner' },
  { text: 'before', level: 'beginner' },
  { text: 'after', level: 'beginner' },
  { text: 'although', level: 'advanced' },
  { text: 'since', level: 'intermediate' },
  { text: 'while', level: 'intermediate' },
  { text: 'unless', level: 'advanced' }
];

export const coordinatingConjunctions = [
  { text: 'and', level: 'beginner' },
  { text: 'but', level: 'beginner' },
  { text: 'or', level: 'beginner' },
  { text: 'so', level: 'beginner' },
  { text: 'yet', level: 'advanced' }
];

export const modalVerbs = [
  { text: 'can', level: 'beginner' },
  { text: 'will', level: 'beginner' },
  { text: 'could', level: 'intermediate' },
  { text: 'might', level: 'intermediate' },
  { text: 'should', level: 'intermediate' },
  { text: 'must', level: 'advanced' }
];

export const progressiveAspectHelpers = [
  { text: 'is', level: 'beginner' },
  { text: 'are', level: 'beginner' },
  { text: 'was', level: 'intermediate' },
  { text: 'were', level: 'intermediate' }
];

export const perfectAspectHelpers = [
  { text: 'has', level: 'intermediate' },
  { text: 'have', level: 'intermediate' },
  { text: 'had', level: 'advanced' }
];

export const relativeClauseStarters = [
  { text: 'who', level: 'intermediate' },
  { text: 'which', level: 'intermediate' },
  { text: 'that', level: 'intermediate' },
  { text: 'whose', level: 'advanced' }
];

export const yearGroupGuidance = [
  {
    level: 'beginner',
    reminder:
      'Use capital letters and full stops, and try adding an expanded noun phrase such as "the shiny red ball".'
  },
  {
    level: 'intermediate',
    reminder:
      'Combine clauses with subordinating conjunctions like "when" or "because" to show clear relationships.'
  },
  {
    level: 'advanced',
    reminder:
      'Experiment with fronted adverbials and relative clauses to add detail, just like in the grammar appendix.'
  }
];

export const punctuationPrompts = [
  { text: ',', level: 'intermediate', focus: 'comma in a list or fronted adverbial' },
  { text: ';', level: 'advanced', focus: 'semicolon to link closely related clauses' },
  { text: "'", level: 'beginner', focus: 'apostrophe for possession or contraction' }
];

export const questionOpenersUk = [
  { text: 'Who', level: 'beginner' },
  { text: 'What', level: 'beginner' },
  { text: 'Where', level: 'beginner' },
  { text: 'When', level: 'beginner' },
  { text: 'Why', level: 'beginner' },
  { text: 'How', level: 'beginner' },
  { text: 'Which', level: 'intermediate' }
];

export const adverbialsOfTime = [
  { text: 'quickly', level: 'beginner' },
  { text: 'carefully', level: 'beginner' },
  { text: 'suddenly', level: 'intermediate' },
  { text: 'silently', level: 'intermediate' },
  { text: 'cautiously', level: 'advanced' },
  { text: 'gracefully', level: 'advanced' }
];

export const expandedNounPhrasePrompts = [
  { text: 'the enormous', level: 'beginner' },
  { text: 'the sparkling', level: 'beginner' },
  { text: 'the curious young', level: 'intermediate' },
  { text: 'the determined', level: 'intermediate' },
  { text: 'the remarkably talented', level: 'advanced' }
];

export const clauseOpeners = [
  { text: 'so that', level: 'intermediate' },
  { text: 'even though', level: 'advanced' },
  { text: 'as soon as', level: 'intermediate' }
];

export const imperativeVerbs = [
  { text: 'Imagine', level: 'intermediate' },
  { text: 'Remember', level: 'beginner' },
  { text: 'Describe', level: 'intermediate' },
  { text: 'Explain', level: 'advanced' }
];

export const grammarAppendixLookups = {
  frontedAdverbials,
  subordinatingConjunctions,
  coordinatingConjunctions,
  modalVerbs,
  progressiveAspectHelpers,
  perfectAspectHelpers,
  relativeClauseStarters,
  punctuationPrompts,
  questionOpenersUk,
  adverbialsOfTime,
  expandedNounPhrasePrompts,
  clauseOpeners,
  imperativeVerbs
};
