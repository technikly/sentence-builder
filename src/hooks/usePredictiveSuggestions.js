import { useEffect, useMemo, useState } from 'react';
import {
  determiners,
  linkingVerbs,
  modalHelpers,
  pronounFriendlyVerbs,
  pronouns,
  supportiveSentenceFrames,
  timeMarkers
} from '../data/ealWordBank';
import { grammarObjectiveLookup } from '../data/ukGrammarAppendix';
import { fetchNextWords, fetchSuggestions } from '../utils/dictionary';

const normalise = (value = '') => value.toLowerCase().trim();

const formatForSentenceStart = (suggestion) => {
  if (!suggestion) {
    return suggestion;
  }
  const trimmed = suggestion.trimStart();
  if (!trimmed) {
    return suggestion;
  }
  const firstChar = trimmed[0];
  if (!/[a-zA-Z]/.test(firstChar)) {
    return suggestion;
  }
  return `${firstChar.toUpperCase()}${trimmed.slice(1)}`;
};

const gatherCategoryItems = (categoryLookup, categoryId) =>
  categoryLookup.get(categoryId)?.items.map((item) => item.text) ?? [];

export const usePredictiveSuggestions = ({
  caretContext,
  categoryLookup,
  uniqueWordList,
  grammarAnalysis
}) => {
  const prefix = caretContext.prefix ?? '';
  const previousWord = caretContext.previousWord ?? '';
  const textBeforeCaret = caretContext.textBeforeCaret ?? '';

  const isNewSentence = !textBeforeCaret || /[.!?]\s*$/.test(textBeforeCaret);

  const missingFeatureIds = useMemo(
    () =>
      new Set(
        (grammarAnalysis ?? [])
          .filter((item) => !item.met)
          .map((item) => item.id)
      ),
    [grammarAnalysis]
  );

  const [asyncSuggestions, setAsyncSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const trimmedPrefix = normalise(prefix);
    const trimmedPrevious = normalise(previousWord);

    if (!trimmedPrefix && !trimmedPrevious) {
      setAsyncSuggestions([]);
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const tasks = [];
        if (trimmedPrefix.length >= 2) {
          tasks.push(fetchSuggestions(trimmedPrefix));
        }
        if (trimmedPrevious) {
          tasks.push(fetchNextWords(trimmedPrevious));
        }
        const results = await Promise.all(tasks);
        const combined = results.flat();
        if (!cancelled) {
          setAsyncSuggestions(combined);
        }
      } catch {
        if (!cancelled) {
          setAsyncSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [prefix, previousWord]);

  const synchronousSuggestions = useMemo(() => {
    const candidates = new Set();
    const lowerPrefix = normalise(prefix);
    const lowerPrevious = normalise(previousWord);

    const addCandidate = (suggestion, { capitaliseForSentence = false } = {}) => {
      if (!suggestion) {
        return;
      }
      const trimmed = suggestion.trim();
      if (!trimmed) {
        return;
      }
      const formatted = capitaliseForSentence
        ? formatForSentenceStart(trimmed)
        : trimmed;
      candidates.add(formatted);
    };

    if (lowerPrefix) {
      uniqueWordList
        .filter((word) => {
          const normalisedWord = normalise(word);
          return normalisedWord.startsWith(lowerPrefix) && normalisedWord !== lowerPrefix;
        })
        .slice(0, 6)
        .forEach((word) => addCandidate(word, { capitaliseForSentence: isNewSentence }));
    }

    if (isNewSentence) {
      supportiveSentenceFrames.forEach((frame) =>
        addCandidate(frame, { capitaliseForSentence: true })
      );
    } else if (pronouns.includes(lowerPrevious)) {
      pronounFriendlyVerbs.forEach((verb) => addCandidate(verb));
    } else if (determiners.includes(lowerPrevious)) {
      gatherCategoryItems(categoryLookup, 'descriptions').forEach((item) => addCandidate(item));
      gatherCategoryItems(categoryLookup, 'people').forEach((item) => addCandidate(item));
    } else if (linkingVerbs.includes(lowerPrevious)) {
      gatherCategoryItems(categoryLookup, 'descriptions').forEach((item) => addCandidate(item));
    } else if (timeMarkers.includes(lowerPrevious)) {
      gatherCategoryItems(categoryLookup, 'actions').forEach((item) => addCandidate(item));
    } else if (modalHelpers.includes(lowerPrevious)) {
      gatherCategoryItems(categoryLookup, 'actions').forEach((item) => addCandidate(item));
    }

    if (missingFeatureIds.has('conjunctions')) {
      gatherCategoryItems(categoryLookup, 'connectors').forEach((item) => addCandidate(item));
    }
    if (missingFeatureIds.has('subordinateConjunctions')) {
      const examples = grammarObjectiveLookup.get('subordinateConjunctions')?.examples ?? [];
      examples.forEach((example) => addCandidate(example));
    }
    if (missingFeatureIds.has('nounPhrases') || missingFeatureIds.has('adjectives')) {
      gatherCategoryItems(categoryLookup, 'descriptions').forEach((item) =>
        addCandidate(item, { capitaliseForSentence: isNewSentence })
      );
    }
    if (missingFeatureIds.has('adverbs')) {
      const examples = grammarObjectiveLookup.get('adverbs')?.examples ?? [];
      examples.forEach((example) => addCandidate(example));
    }
    if (missingFeatureIds.has('prepositions')) {
      const examples = grammarObjectiveLookup.get('prepositions')?.examples ?? [];
      examples.forEach((example) => addCandidate(example));
    }
    if (missingFeatureIds.has('capitalLetters') && isNewSentence) {
      const examples = grammarObjectiveLookup.get('capitalLetters')?.examples ?? [];
      examples.forEach((example) => addCandidate(example, { capitaliseForSentence: true }));
    }
    if (missingFeatureIds.has('verbs')) {
      gatherCategoryItems(categoryLookup, 'actions').forEach((item) => addCandidate(item));
    }
    if (missingFeatureIds.has('pronouns')) {
      const examples = grammarObjectiveLookup.get('pronouns')?.examples ?? [];
      examples.forEach((example) => addCandidate(example));
    }
    if (missingFeatureIds.has('determiners')) {
      const examples = grammarObjectiveLookup.get('determiners')?.examples ?? [];
      examples.forEach((example) => addCandidate(example));
    }

    if (!lowerPrefix && !lowerPrevious && isNewSentence) {
      const capitalExamples = grammarObjectiveLookup.get('capitalLetters')?.examples ?? [];
      capitalExamples.forEach((example) => addCandidate(example, { capitaliseForSentence: true }));
    }

    return Array.from(candidates);
  }, [
    categoryLookup,
    uniqueWordList,
    prefix,
    previousWord,
    isNewSentence,
    missingFeatureIds
  ]);

  const insights = useMemo(() => {
    const unmet = (grammarAnalysis ?? []).filter((item) => !item.met);
    return unmet.slice(0, 3).map((item) => item.tip);
  }, [grammarAnalysis]);

  const suggestions = useMemo(() => {
    const seen = new Set();
    const ordered = [];

    const register = (suggestion) => {
      if (!suggestion) {
        return;
      }
      const key = normalise(suggestion);
      if (!key) {
        return;
      }
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(suggestion);
      }
    };

    synchronousSuggestions.forEach(register);
    asyncSuggestions.forEach((suggestion) => register(suggestion));

    return ordered.slice(0, 10);
  }, [asyncSuggestions, synchronousSuggestions]);

  return { suggestions, insights, isLoading };
};
