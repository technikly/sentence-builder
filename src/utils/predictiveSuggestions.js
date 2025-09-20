import nlp from 'compromise';
import {
  grammarAppendixStrands,
  matchStrandsByTags
} from '../data/ukGrammarAppendix.js';
import {
  determiners,
  highFrequencyWords,
  modalHelpers,
  pronounFriendlyVerbs,
  pronouns,
  supportiveSentenceFrames,
  wordBankCategories
} from '../data/ealWordBank.js';

const cleanText = (text) => text?.replace(/\s+/g, ' ').trim();

const addToCollector = (collector, suggestion) => {
  const text = cleanText(suggestion.text);
  if (!text) {
    return;
  }
  const key = text.toLowerCase();
  if (collector.map.has(key)) {
    return;
  }
  collector.map.set(key, { ...suggestion, text });
  collector.list.push({ ...suggestion, text });
};

const buildContextualPool = (previousWord, categoryLookup) => {
  if (!previousWord) {
    return supportiveSentenceFrames;
  }

  const lower = previousWord.toLowerCase();
  if (pronouns.includes(lower)) {
    return pronounFriendlyVerbs;
  }
  if (determiners.includes(lower)) {
    const descriptionWords = categoryLookup
      .get('descriptions')
      ?.items.map((item) => item.text);
    const peopleWords = categoryLookup
      .get('people')
      ?.items.map((item) => item.text);
    return [...(descriptionWords ?? []), ...(peopleWords ?? [])];
  }
  if (modalHelpers.includes(lower)) {
    return categoryLookup.get('actions')?.items.map((item) => item.text) ?? [];
  }

  return highFrequencyWords;
};

const getSentenceAndTagInfo = (text) => {
  if (!text) {
    return {
      tagSet: new Set(),
      lastTermTagSet: new Set(),
      lastSentenceText: ''
    };
  }

  const doc = nlp(text);
  const sentencesJson = doc.sentences().json();
  const lastSentence = sentencesJson[sentencesJson.length - 1];
  if (!lastSentence) {
    return {
      tagSet: new Set(),
      lastTermTagSet: new Set(),
      lastSentenceText: ''
    };
  }

  const sentenceTags = new Set();
  const termList = lastSentence.terms ?? [];
  const lastTerm = termList[termList.length - 1];
  termList.forEach((term) => {
    (term.tags ?? []).forEach((tag) => sentenceTags.add(tag));
  });

  const lastTermTags = new Set(lastTerm?.tags ?? []);
  return {
    tagSet: sentenceTags,
    lastTermTagSet: lastTermTags,
    lastSentenceText: lastSentence.text ?? ''
  };
};

const suggestFromGrammar = (collector, tagSet) => {
  const matches = matchStrandsByTags(tagSet);
  matches.forEach((strand) => {
    strand.examples.slice(0, 3).forEach((example) => {
      addToCollector(collector, {
        text: example,
        hint: `${strand.label} – ${strand.curriculumNote}`
      });
    });
  });

  if (!matches.length) {
    const nounStrand = grammarAppendixStrands.find((strand) => strand.id === 'nouns');
    if (nounStrand) {
      nounStrand.examples.slice(0, 2).forEach((example) => {
        addToCollector(collector, {
          text: example,
          hint: `${nounStrand.label} – ${nounStrand.prompt}`
        });
      });
    }
  }
};

export const buildPredictiveSuggestions = ({
  caretContext,
  categoryLookup,
  uniqueWordList,
  misspellings
}) => {
  const collector = { map: new Map(), list: [] };
  const prefix = (caretContext.prefix ?? '').toLowerCase();
  const previousWord = caretContext.previousWord ?? '';
  const textBefore = caretContext.textBeforeCaret ?? '';
  const isNewSentence = !textBefore || /[.!?]\s*$/.test(textBefore);

  if (prefix) {
    uniqueWordList
      .filter((word) => {
        const lower = word.toLowerCase();
        return lower.startsWith(prefix) && lower !== prefix;
      })
      .slice(0, 5)
      .forEach((word) => {
        addToCollector(collector, {
          text: word,
          hint: 'Complete the word using the word bank.'
        });
      });
  }

  if (misspellings?.length) {
    const targetWord = prefix || previousWord;
    const flagged = misspellings.find(
      (item) => {
        const base = item.normalized ?? item.word.toLowerCase();
        return base === targetWord.toLowerCase();
      }
    );
    if (flagged) {
      flagged.suggestions.slice(0, 3).forEach((suggestion) => {
        addToCollector(collector, {
          text: suggestion,
          hint: 'Spelling correction from the UK dictionary.'
        });
      });
    }
  }

  if (isNewSentence) {
    supportiveSentenceFrames.slice(0, 4).forEach((frame) => {
      addToCollector(collector, {
        text: frame,
        hint: 'Start a new sentence with a capital letter.'
      });
    });
  }

  const contextualPool = buildContextualPool(previousWord, categoryLookup);
  contextualPool.slice(0, 6).forEach((item) => {
    const text = typeof item === 'string' ? item : item.text;
    addToCollector(collector, {
      text,
      hint: 'Contextual suggestion based on your last word.'
    });
  });

  const { tagSet, lastTermTagSet } = getSentenceAndTagInfo(textBefore);
  suggestFromGrammar(collector, lastTermTagSet.size ? lastTermTagSet : tagSet);

  if (!collector.list.length) {
    const defaultWords = wordBankCategories
      .flatMap((category) => category.items.map((item) => item.text))
      .slice(0, 6);
    defaultWords.forEach((word) => {
      addToCollector(collector, {
        text: word,
        hint: 'Helpful vocabulary from the curriculum-aligned bank.'
      });
    });
  }

  return collector.list.slice(0, 8);
};
