import { ealWordBank } from '../data/ealWordBank';

const starters = ealWordBank.sentenceStarters.words.map((word) => word.text);
const connectors = ealWordBank.connectors.words.map((word) => word.text);
const timeWords = ealWordBank.timeConnectives.words.map((word) => word.text);
const actionVerbs = ealWordBank.actions.words.map((word) => word.text);
const describingWords = ealWordBank.describers.words.map((word) => word.text);
const feelingWords = ealWordBank.feelings.words.map((word) => word.text);
const nounSupport = ealWordBank.commonNouns.words.map((word) => word.text);
const academicWords = ealWordBank.academic.words.map((word) => word.text);
const scaffoldPhrases = ealWordBank.scaffolds.words.map((word) => word.text);

const connectorSet = new Set(connectors.map((word) => word.toLowerCase()));
const pronouns = ['i', 'we', 'you', 'he', 'she', 'they', 'it'];
const linkingVerbs = ['is', 'am', 'are', 'was', 'were', 'feel', 'feels'];
const questionWords = ['who', 'what', 'when', 'where', 'why', 'how'];
const modalVerbs = ['will', 'can', 'could', 'should', 'might', 'must'];

const ensureUniquePush = (collection, seen, candidate) => {
  if (!candidate.text) return;
  const key = candidate.text.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  collection.push(candidate);
};

export const getPredictions = (rawText) => {
  const clean = rawText.replace(/\s+/g, ' ').trim();
  const suggestions = [];
  const seen = new Set();

  const addGroup = (words, reason, category) => {
    words.forEach((word) =>
      ensureUniquePush(suggestions, seen, {
        text: word,
        reason,
        category
      })
    );
  };

  if (clean.length === 0) {
    addGroup(starters, 'Choose a friendly way to begin your sentence.', 'sentenceStarters');
    addGroup(actionVerbs, 'Pick an action to explain what happens.', 'actions');
  } else {
    const tokens = clean.split(' ');
    const lastTokenRaw = tokens[tokens.length - 1] || '';
    const lastWord = lastTokenRaw.replace(/[^\w']/g, '').toLowerCase();
    const secondLast = tokens.length > 1 ? tokens[tokens.length - 2].replace(/[^\w']/g, '').toLowerCase() : '';
    const lastChar = clean.slice(-1);

    if (/[.!?]/.test(lastChar)) {
      addGroup(starters, 'Start a brand new sentence.', 'sentenceStarters');
    }

    if (pronouns.includes(lastWord)) {
      addGroup(actionVerbs, 'Add a strong verb after your subject.', 'actions');
      addGroup(describingWords, 'Describe who or what you are talking about.', 'describers');
    }

    if (linkingVerbs.includes(lastWord)) {
      addGroup(describingWords, 'Explain how it looks or feels.', 'describers');
      addGroup(feelingWords, 'Share the emotion that fits best.', 'feelings');
    }

    if (connectorSet.has(lastWord) || connectorSet.has(secondLast)) {
      addGroup(timeWords, 'Show when the next event happens.', 'timeConnectives');
      addGroup(describingWords, 'Give detail after your connector.', 'describers');
    }

    if (modalVerbs.includes(lastWord)) {
      addGroup(actionVerbs, 'Say what could happen next.', 'actions');
    }

    if (questionWords.includes(lastWord)) {
      addGroup(nounSupport, 'Answer your question with a person or place.', 'commonNouns');
    }

    if (['because', 'so', 'as'].includes(lastWord) || lastWord === 'therefore') {
      addGroup(academicWords, 'Give a clear reason with academic vocabulary.', 'academic');
    }

    if (tokens.length >= 12 && suggestions.length < 3) {
      addGroup(connectors, 'Link this idea to another one.', 'connectors');
    }
  }

  const topUpOrder = [
    ['connectors', connectors, 'Connect ideas clearly.'],
    ['timeConnectives', timeWords, 'Explain when things happen.'],
    ['describers', describingWords, 'Add extra detail with adjectives.'],
    ['feelings', feelingWords, 'Share emotions to show understanding.'],
    ['actions', actionVerbs, 'Choose a powerful verb.'],
    ['commonNouns', nounSupport, 'Name the people or places involved.'],
    ['academic', academicWords, 'Use precise academic vocabulary.'],
    ['scaffolds', scaffoldPhrases, 'Use a sentence frame to organise ideas.']
  ];

  for (const [category, words, reason] of topUpOrder) {
    if (suggestions.length >= 6) break;
    addGroup(words, reason, category);
  }

  return suggestions.slice(0, 6);
};

export const getWordHintsFor = (word) => {
  const lower = word.trim().toLowerCase();
  if (!lower) return null;
  for (const [categoryKey, category] of Object.entries(ealWordBank)) {
    const match = category.words.find((entry) => entry.text.toLowerCase() === lower);
    if (match) {
      return {
        ...match,
        category: categoryKey,
        categoryLabel: category.label
      };
    }
  }
  return null;
};
