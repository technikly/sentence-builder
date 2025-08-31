export const getNanoFeedback = async (sentence) => {
  const prompt = `You are a helpful writing assistant for children. Given the sentence fragment below, suggest improvements and the next word.
Return suggestions using the commands:

[SPELLING]: WORD INDEX
[IMPROVE]: WORD INDEX -> [IMPROVE_TO]: {NEW_WORD}
[ADDINNEWWORD]: {NEW_WORD} [AFTER]: WORD INDEX

Only include commands that apply.

Sentence: "${sentence}"`;

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: prompt,
        max_output_tokens: 150
      })
    });
    const data = await res.json();
    return data?.output_text || '';
  } catch (err) {
    console.error('Nano feedback failed', err);
    return '';
  }
};

export const parseNanoFeedback = (text) => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const suggestions = [];
  for (const line of lines) {
    if (
      line.startsWith('[SPELLING]:') ||
      line.startsWith('[IMPROVE]:') ||
      line.startsWith('[ADDINNEWWORD]:')
    ) {
      suggestions.push(line);
    }
  }
  return suggestions;
};
