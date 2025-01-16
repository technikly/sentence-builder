// mappings.js

// Maps CSV headers to your vocabulary database categories
export const csvToVocabCategory = {
  determiner: 'determiners',
  noun: 'nouns',
  verb: 'verbs',
  adjective: 'adjectives',
  adverb: 'adverbs',
  preposition: 'prepositions',
  conjunction: 'conjunctions'
};

// Colour mapping for word classes (used in sentences)
export const wordClassColours = {
  determiner: 'text-purple-600',
  noun: 'text-blue-600',
  verb: 'text-green-600',
  adjective: 'text-yellow-600',
  adverb: 'text-pink-600',
  preposition: 'text-indigo-600',
  conjunction: 'text-red-600',
  unknown: 'text-black' // Added comma and 'unknown' key
};

// Colour mapping for word classes (used in the word chooser modal)
export const wordClassBackgroundColours = {
  determiner: 'bg-purple-500 hover:bg-purple-600',
  noun: 'bg-blue-500 hover:bg-blue-600',
  verb: 'bg-green-500 hover:bg-green-600',
  adjective: 'bg-yellow-500 hover:bg-yellow-600',
  adverb: 'bg-pink-500 hover:bg-pink-600',
  preposition: 'bg-indigo-500 hover:bg-indigo-600',
  conjunction: 'bg-red-500 hover:bg-red-600',
  unknown: 'bg-black hover:bg-black' // Added 'unknown' key
};
