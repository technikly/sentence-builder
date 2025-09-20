export const fetchLanguageInsights = async ({ text, tokens, signal } = {}) => {
  if (!Array.isArray(tokens) || tokens.length === 0 || !text?.trim()) {
    return {
      suggestions: [],
      ghostSuggestion: '',
      tokenAnalyses: []
    };
  }

  try {
    const response = await fetch('/.netlify/functions/languageInsights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        tokens: tokens.map((token) => token.text)
      }),
      signal
    });

    if (!response.ok) {
      throw new Error('Language insight request failed');
    }

    const payload = await response.json();
    return {
      suggestions: payload.suggestions ?? [],
      ghostSuggestion: payload.ghostSuggestion ?? '',
      tokenAnalyses: payload.tokenAnalyses ?? []
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('fetchLanguageInsights failed', error);
    throw new Error('Unable to fetch language insights');
  }
};
