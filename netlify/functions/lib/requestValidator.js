const MAX_CONTEXT_CHAR_LENGTH = 1000;
const MAX_CONTEXT_WORDS = 40;
const MAX_METADATA_VALUE_LENGTH = 40;
const DISALLOWED_PATTERNS = [/<script/i, /select\s+\*/i];

export class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

const replaceControlCharacters = (value = '') => {
  let output = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if ((code >= 0 && code <= 31) || code === 127) {
      output += ' ';
    } else {
      output += char;
    }
  }
  return output;
};

const sanitizeText = (value = '') =>
  replaceControlCharacters(value)
    .replace(/\s+/g, ' ')
    .trim();

const enforceBasicSafety = (value) => {
  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(value)) {
      throw new ValidationError('Potentially unsafe content was rejected.');
    }
  }
};

const normalizeContext = (value) => {
  const sanitized = sanitizeText(value).slice(0, MAX_CONTEXT_CHAR_LENGTH);
  const words = sanitized.split(' ').filter(Boolean);
  const trimmedWords = words.slice(-MAX_CONTEXT_WORDS);
  return trimmedWords.join(' ');
};

const normalizeMetadata = (metadata = {}) => {
  if (metadata == null) {
    return {};
  }
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new ValidationError('metadata must be an object when provided.');
  }

  const normalized = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value == null) continue;
    if (typeof value !== 'string') {
      throw new ValidationError(`metadata.${key} must be a string.`);
    }
    const sanitized = sanitizeText(value).slice(0, MAX_METADATA_VALUE_LENGTH);
    if (sanitized) {
      normalized[key] = sanitized;
    }
  }
  return normalized;
};

export const validateAndNormalizeRequest = (body) => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const rawContext = typeof body.context === 'string' ? body.context : body.sentence;
  if (typeof rawContext !== 'string' || !rawContext.trim()) {
    throw new ValidationError('context is required and must be a non-empty string.');
  }

  enforceBasicSafety(rawContext);
  const context = normalizeContext(rawContext);
  if (!context) {
    throw new ValidationError('context must include at least one word.');
  }

  const metadata = normalizeMetadata(body.metadata);
  const request = { context, metadata };
  return request;
};
