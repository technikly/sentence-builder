const PREDICT_ENDPOINT = '/.netlify/functions/predict';

const formatConfidence = (confidence) => {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return null;
  }
  const percent = Math.round(confidence * 100);
  if (!Number.isFinite(percent)) return null;
  return `${percent}% sure`;
};

const legacyParser = (text) => {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
};

const buildOfflineResponse = (warning) => ({
  spellings: [],
  improvements: [],
  insertions: [],
  notes: ['We could not fetch suggestions right now. Try again in a little while.'],
  metadata: {
    warnings: warning ? [warning] : []
  }
});

export const getNanoFeedback = async (context, metadata = {}) => {
  try {
    const res = await fetch(PREDICT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ context, metadata })
    });

    if (!res.ok) {
      const warning = `Prediction service responded with status ${res.status}.`;
      console.error('Nano feedback request failed', res.status, await res.text());
      return buildOfflineResponse(warning);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Nano feedback failed', err);
    return buildOfflineResponse('Prediction service is currently unavailable.');
  }
};

export const parseNanoFeedback = (payload) => {
  if (!payload) {
    return [];
  }

  if (typeof payload === 'string') {
    return legacyParser(payload);
  }

  const lines = [];
  const { spellings = [], improvements = [], insertions = [], notes = [], metadata = {} } = payload;

  spellings.forEach(({ word, suggestion, index, reason, confidence }) => {
    const position = typeof index === 'number' ? `word ${index + 1}` : 'this word';
    const confidenceLabel = formatConfidence(confidence);
    const reasonText = reason ? ` ${reason}` : '';
    const confidenceText = confidenceLabel ? ` (${confidenceLabel})` : '';
    lines.push(`Fix the spelling of "${word}" to "${suggestion}" at ${position}.${reasonText}${confidenceText}`);
  });

  improvements.forEach(({ from, to, index, reason, confidence }) => {
    const position = typeof index === 'number' ? `starting at word ${index + 1}` : 'here';
    const confidenceLabel = formatConfidence(confidence);
    const reasonText = reason ? ` ${reason}` : '';
    const confidenceText = confidenceLabel ? ` (${confidenceLabel})` : '';
    lines.push(`Improve "${from}" to "${to}" ${position}.${reasonText}${confidenceText}`);
  });

  insertions.forEach(({ word, afterIndex, reason, confidence }) => {
    const position =
      typeof afterIndex === 'number'
        ? afterIndex === -1
          ? 'at the beginning of the sentence'
          : `after word ${afterIndex + 1}`
        : 'in the sentence';
    const confidenceLabel = formatConfidence(confidence);
    const reasonText = reason ? ` ${reason}` : '';
    const confidenceText = confidenceLabel ? ` (${confidenceLabel})` : '';
    lines.push(`Add "${word}" ${position}.${reasonText}${confidenceText}`);
  });

  notes.forEach((note) => {
    if (note) {
      lines.push(note);
    }
  });

  if (Array.isArray(metadata?.warnings)) {
    metadata.warnings.forEach((warning) => {
      lines.push(`⚠️ ${warning}`);
    });
  }

  if (!lines.length) {
    lines.push('Great job! There are no suggestions right now.');
  }

  return lines;
};
