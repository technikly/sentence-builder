import PropTypes from 'prop-types';
import { Lightbulb, ShieldCheck } from 'lucide-react';

const GrammarCoach = ({ analysis, onExampleSelect, hasText }) => {
  const needsFocus = hasText ? analysis.filter((item) => !item.met) : [];
  const strengths = hasText ? analysis.filter((item) => item.met) : [];

  return (
    <section className="support-card support-card--grammar">
      <div className="support-card__header">
        <div className="support-card__header-icon" aria-hidden="true">
          <Lightbulb size={20} />
        </div>
        <div>
          <h3>UK grammar check</h3>
          <p>Aligned with the national curriculum grammar appendix.</p>
        </div>
      </div>

      <div className="grammar-summary">
        <p>
          {hasText ? (
            needsFocus.length
              ? `${needsFocus.length} focus ${needsFocus.length === 1 ? 'area' : 'areas'} to strengthen.`
              : 'Great! All tracked grammar targets are present.'
          ) : (
            'Start typing to see the grammar targets update here.'
          )}
        </p>
      </div>

      {needsFocus.length ? (
        <ul className="grammar-focus-list">
          {needsFocus.map((item) => (
            <li key={item.id}>
              <div className="grammar-focus-list__details">
                <strong>{item.label}</strong>
                <span>{item.tip}</span>
                <small>{item.ncReference} – {item.stage}</small>
              </div>
              {item.examples?.length ? (
                <div className="grammar-focus-list__examples">
                  {item.examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="grammar-example-chip"
                      onClick={() => onExampleSelect?.(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {strengths.length ? (
        <details className="grammar-strengths">
          <summary>
            <ShieldCheck size={16} aria-hidden="true" /> Secure features
          </summary>
          <ul>
            {strengths.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
};

GrammarCoach.propTypes = {
  analysis: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      met: PropTypes.bool.isRequired,
      tip: PropTypes.string.isRequired,
      stage: PropTypes.string.isRequired,
      examples: PropTypes.arrayOf(PropTypes.string),
      ncReference: PropTypes.string.isRequired
    })
  ).isRequired,
  onExampleSelect: PropTypes.func,
  hasText: PropTypes.bool
};

export default GrammarCoach;
