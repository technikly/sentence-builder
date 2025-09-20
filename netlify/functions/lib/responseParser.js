import { PROMPT_VERSION } from './promptBuilder.js';

export class ResponseParseError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ResponseParseError';
    this.warnings = options.warnings || [];
  }
}

const clampConfidence = (value) => {
  const numeric = Number.isFinite(value) ? Number(value) : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return 0.6;
  return Math.min(1, Math.max(0, numeric));
};

const toIntegerOrNull = (value) => {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : null;
};

const ensureString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeSpellings = (entries = []) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      word: ensureString(entry.word),
      index: toIntegerOrNull(entry.index),
      suggestion: ensureString(entry.suggestion),
      reason: ensureString(entry.reason),
      confidence: clampConfidence(entry.confidence)
    }))
    .filter((item) => item.word && item.suggestion && item.index !== null && item.index >= 0);
};

const normalizeImprovements = (entries = []) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      from: ensureString(entry.from),
      index: toIntegerOrNull(entry.index),
      to: ensureString(entry.to),
      reason: ensureString(entry.reason),
      confidence: clampConfidence(entry.confidence)
    }))
    .filter((item) => item.from && item.to && item.index !== null && item.index >= 0);
};

const normalizeInsertions = (entries = []) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      word: ensureString(entry.word),
      afterIndex: toIntegerOrNull(entry.afterIndex ?? entry.index),
      reason: ensureString(entry.reason),
      confidence: clampConfidence(entry.confidence)
    }))
    .filter((item) => item.word && item.afterIndex !== null && item.afterIndex >= -1);
};

const normalizeNotes = (entries = []) => {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ensureString(entry)).filter(Boolean);
};

const fallbackParse = (content) => {
  if (!content) {
    return { spellings: [], improvements: [], insertions: [], notes: [] };
  }
  const spellings = [];
  const improvements = [];
  const insertions = [];
  const notes = [];

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const spellingPattern = /^\[SPELLING\]:\s*(?<word>[^\s]+)\s+(?<index>\d+)(?:\s*->\s*(?<suggestion>[^\s]+))?/i;
  const improvePattern = /^\[IMPROVE\]:\s*(?<word>[^\s]+)\s+(?<index>\d+)\s*->\s*\[IMPROVE_TO\]:\s*{(?<to>[^}]+)}/i;
  const insertionPattern = /^\[ADDINNEWWORD\]:\s*{(?<word>[^}]+)}\s*\[AFTER\]:\s*(?<index>\d+)/i;

  for (const line of lines) {
    const spellingMatch = line.match(spellingPattern);
    if (spellingMatch) {
      const { word, index, suggestion } = spellingMatch.groups;
      spellings.push({
        word,
        index: Number.parseInt(index, 10),
        suggestion: suggestion || word,
        reason: 'Check the spelling of this word.',
        confidence: 0.5
      });
      continue;
    }
    const improveMatch = line.match(improvePattern);
    if (improveMatch) {
      const { word, index, to } = improveMatch.groups;
      improvements.push({
        from: word,
        index: Number.parseInt(index, 10),
        to,
        reason: 'Try this small improvement.',
        confidence: 0.5
      });
      continue;
    }
    const insertionMatch = line.match(insertionPattern);
    if (insertionMatch) {
      const { word, index } = insertionMatch.groups;
      insertions.push({
        word,
        afterIndex: Number.parseInt(index, 10),
        reason: 'Add this word to make the sentence flow.',
        confidence: 0.5
      });
      continue;
    }
    notes.push(line);
  }

  return { spellings, improvements, insertions, notes };
};

export const parseModelResponse = (
  openAIResult,
  { promptVersion = PROMPT_VERSION, latencyMs = null, requestId, inputMetadata = {} } = {}
) => {
  if (!openAIResult) {
    throw new ResponseParseError('Missing OpenAI response.');
  }

  const warnings = [];
  let candidate = null;

  const rawContent = ensureString(openAIResult.content);
  if (rawContent) {
    try {
      candidate = JSON.parse(rawContent);
    } catch (error) {
      console.warn('Model returned non-JSON output', { requestId, error });
      warnings.push('Model returned non-JSON output. Falling back to command parser.');
    }
  }

  if (!candidate || typeof candidate !== 'object') {
    candidate = fallbackParse(rawContent);
  }

  const spellings = normalizeSpellings(candidate.spellings);
  const improvements = normalizeImprovements(candidate.improvements);
  const insertions = normalizeInsertions(candidate.insertions);
  const notes = normalizeNotes(candidate.notes);

  if (!spellings.length && !improvements.length && !insertions.length && !notes.length) {
    warnings.push('Model response did not include actionable suggestions.');
  }

  const metadata = {
    promptVersion,
    model: openAIResult?.payload?.model,
    latencyMs,
    requestId,
    usage: openAIResult?.payload?.usage,
    warnings,
    inputMetadata
  };

  return {
    spellings,
    improvements,
    insertions,
    notes,
    metadata
  };
};
