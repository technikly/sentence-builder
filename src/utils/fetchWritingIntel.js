export const fetchWritingIntel = async ({ text, supportLevel, signal }) => {
  const response = await fetch('/.netlify/functions/writingIntel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, supportLevel }),
    signal
  });

  if (!response.ok) {
    throw new Error('Failed to fetch writing insight');
  }

  return response.json();
};
