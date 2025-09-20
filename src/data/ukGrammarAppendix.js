export const grammarAppendixStrands = [
  {
    id: 'nouns',
    label: 'Nouns & noun phrases',
    curriculumNote:
      'NC Grammar Appendix: use nouns and expanded noun phrases to name people, places and things.',
    prompt:
      'Add a clear noun or noun phrase so the reader knows who or what you are writing about.',
    success:
      'Great job – your nouns make it clear who or what is involved.',
    tags: ['Noun', 'ProperNoun', 'Singular', 'Plural'],
    examples: ['the scientist', 'curious children', 'our community', 'London']
  },
  {
    id: 'pronouns',
    label: 'Pronouns',
    curriculumNote:
      'NC Grammar Appendix: choose pronouns to avoid repeating the noun.',
    prompt: 'Swap in a pronoun such as "they" or "it" to avoid repeating the noun.',
    success: 'You used pronouns to link ideas smoothly.',
    tags: ['Pronoun'],
    examples: ['they', 'she', 'it', 'we']
  },
  {
    id: 'verbs',
    label: 'Verbs & verb phrases',
    curriculumNote:
      'NC Grammar Appendix: use powerful verbs to show action or state.',
    prompt: 'Choose a precise verb to show what is happening.',
    success: 'Well done – your verb choices clearly show the action.',
    tags: ['Verb', 'PresentTense', 'PastTense', 'Infinitive', 'Gerund'],
    examples: ['investigate', 'describe', 'explain', 'wonder']
  },
  {
    id: 'adjectives',
    label: 'Adjectives',
    curriculumNote:
      'NC Grammar Appendix: use adjectives to add detail to nouns.',
    prompt: 'Try an adjective from the grammar appendix to add colour, size or quality.',
    success: 'Those adjectives paint a vivid picture.',
    tags: ['Adjective'],
    examples: ['vibrant', 'careful', 'ancient', 'confident']
  },
  {
    id: 'adverbs',
    label: 'Adverbs & fronted adverbials',
    curriculumNote:
      'NC Grammar Appendix: use adverbs and fronted adverbials to show how, when or where.',
    prompt: 'Add an adverbial opener such as "Carefully," or "Afterwards,".',
    success: 'You used adverbials to show how or when things happen.',
    tags: ['Adverb', 'AdverbPhrase', 'Adverbial'],
    examples: ['carefully', 'suddenly', 'Afterwards,', 'In the morning,']
  },
  {
    id: 'conjunctions',
    label: 'Conjunctions',
    curriculumNote:
      'NC Grammar Appendix: use co-ordinating and subordinating conjunctions to link clauses.',
    prompt: 'Join ideas with a conjunction such as "because" or "although".',
    success: 'Excellent – that conjunction links your ideas clearly.',
    tags: ['Conjunction', 'CoordinatingConjunction', 'SubordinatingConjunction'],
    examples: ['because', 'although', 'so that', 'while']
  },
  {
    id: 'prepositions',
    label: 'Prepositions',
    curriculumNote:
      'NC Grammar Appendix: use prepositions to explain where or when things happen.',
    prompt: 'Add a preposition such as "under" or "during" to add detail.',
    success: 'The preposition helps the reader picture the scene.',
    tags: ['Preposition'],
    examples: ['during', 'beneath', 'throughout', 'near']
  },
  {
    id: 'determiners',
    label: 'Determiners',
    curriculumNote:
      'NC Grammar Appendix: use determiners to introduce nouns.',
    prompt: 'Introduce your noun with a determiner like "this" or "another".',
    success: 'You selected a determiner that fits neatly with the noun.',
    tags: ['Determiner'],
    examples: ['this', 'those', 'another', 'each']
  },
  {
    id: 'punctuation',
    label: 'Sentence punctuation',
    curriculumNote:
      'NC Grammar Appendix: demarcate sentences with capital letters and full stops, question marks or exclamation marks.',
    prompt: 'Finish the idea with a full stop, question mark or exclamation mark.',
    success: 'Your punctuation follows the grammar appendix guidance.',
    tags: ['Period', 'QuestionMark', 'ExclamationPoint'],
    examples: ['.', '?', '!']
  }
];

export const matchStrandsByTags = (tagSet) =>
  grammarAppendixStrands.filter((strand) =>
    strand.tags.some((tag) => tagSet.has(tag))
  );

export const getStrandById = (id) =>
  grammarAppendixStrands.find((strand) => strand.id === id);

export const grammarStrandPrompts = grammarAppendixStrands.reduce((acc, strand) => {
  acc[strand.id] = strand.prompt;
  return acc;
}, {});
