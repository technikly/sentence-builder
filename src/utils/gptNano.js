export const getNanoFeedback = async (sentence) => {
  try {
    const res = await fetch('/.netlify/functions/gptNano', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sentence })
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
