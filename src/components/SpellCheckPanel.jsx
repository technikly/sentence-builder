import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Sparkles, Wand2 } from 'lucide-react';
import {
  initializeSpellChecker,
  checkSpelling,
  getSuggestions
} from '../spellChecker';

const wordRegex = /[\p{L}'’-]+/gu;

const makeIssueId = (issue) =>
  `${issue.type}-${issue.word ?? issue.message}-${issue.contextIndex ?? 0}`;

const SpellCheckPanel = ({ plainText, onApplySuggestion }) => {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    initializeSpellChecker()
      .then(() => {
        if (active) {
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setReady(false);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const text = plainText ?? '';
    if (!text.trim()) {
      setIssues([]);
      return;
    }

    const matches = Array.from(text.matchAll(wordRegex));
    const uniqueWords = new Map();

    matches.forEach((match) => {
      const [word] = match;
      const index = match.index ?? 0;
      const lower = word.toLowerCase();
      if (!uniqueWords.has(lower)) {
        uniqueWords.set(lower, { original: word, index });
      }
    });

    const detectedIssues = [];

    uniqueWords.forEach(({ original, index }) => {
      if (!checkSpelling(original)) {
        const suggestions = getSuggestions(original).slice(0, 4);
        detectedIssues.push({
          type: 'spelling',
          word: original,
          message: `Check the spelling of "${original}"`,
          suggestions,
          contextIndex: index
        });
      }
    });

    for (let i = 1; i < matches.length; i += 1) {
      const current = matches[i][0];
      const previous = matches[i - 1][0];
      if (current && previous && current.toLowerCase() === previous.toLowerCase()) {
        detectedIssues.push({
          type: 'repetition',
          word: current,
          message: `"${current}" is repeated. Decide if you need both instances.`,
          contextIndex: matches[i].index ?? 0
        });
      }
    }

    if (/\s{2,}/.test(text)) {
      detectedIssues.push({
        type: 'spacing',
        message: 'There are extra spaces. Replace double spaces with single spaces.'
      });
    }

    setIssues(detectedIssues);
  }, [plainText, ready]);

  const summary = useMemo(() => {
    if (!ready) {
      return 'Preparing UK dictionary…';
    }
    if (!issues.length) {
      return 'No spelling concerns found.';
    }
    return `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} to review.`;
  }, [issues.length, ready]);

  return (
    <section className="support-card support-card--spelling">
      <div className="support-card__header">
        <div className="support-card__header-icon" aria-hidden="true">
          <Sparkles size={20} />
        </div>
        <div>
          <h3>Spell smart</h3>
          <p>UK English dictionary with child-friendly suggestions.</p>
        </div>
      </div>

      <p className="support-card__message">{summary}</p>

      {loading ? (
        <p className="support-card__message">Loading dictionary…</p>
      ) : (
        <ul className="spellcheck-list">
          {issues.length === 0 ? (
            <li className="spellcheck-list__item spellcheck-list__item--clear">
              <span className="spellcheck-clear-message">
                <CheckCircle2 size={18} aria-hidden="true" /> Everything looks accurate.
              </span>
            </li>
          ) : (
            issues.map((issue) => (
              <li key={makeIssueId(issue)} className="spellcheck-list__item">
                <div className="spellcheck-list__details">
                  <strong>{issue.word ?? issue.type}</strong>
                  <span>{issue.message}</span>
                </div>
                {issue.type === 'spelling' && issue.suggestions?.length ? (
                  <div className="spellcheck-list__suggestions">
                    {issue.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="spellcheck-suggestion"
                        onClick={() =>
                          onApplySuggestion({
                            type: 'spelling',
                            original: issue.word,
                            replacement: suggestion,
                            contextIndex: issue.contextIndex
                          })
                        }
                      >
                        <Wand2 size={14} aria-hidden="true" /> {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
                {issue.type === 'spacing' ? (
                  <button
                    type="button"
                    className="spellcheck-suggestion"
                    onClick={() =>
                      onApplySuggestion({ type: 'spacing', original: '  ', replacement: ' ' })
                    }
                  >
                    <Wand2 size={14} aria-hidden="true" /> Fix spacing
                  </button>
                ) : null}
                {issue.type === 'repetition' ? (
                  <button
                    type="button"
                    className="spellcheck-suggestion"
                    onClick={() =>
                      onApplySuggestion({
                        type: 'repetition',
                        original: issue.word,
                        replacement: issue.word,
                        contextIndex: issue.contextIndex
                      })
                    }
                  >
                    <Wand2 size={14} aria-hidden="true" /> Remove duplicate
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
};

SpellCheckPanel.propTypes = {
  plainText: PropTypes.string.isRequired,
  onApplySuggestion: PropTypes.func.isRequired
};

export default SpellCheckPanel;
