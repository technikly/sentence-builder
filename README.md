# sentence-builder

## Features

- Words are coloured based on their part of speech.
- Built-in text-to-speech using the browser's SpeechSynthesis API.
- A bottom word mat groups vocabulary by type; toggle it with the palette button.

## Environment variables

Set `OPENAI_API_KEY` in your Netlify project settings. The key is read by the Netlify function and is not exposed to the client.

## AI prediction service

The Netlify function at `/.netlify/functions/predict` exposes a structured prediction API
that powers the in-app suggestions. Send a `POST` request with JSON:

```json
{
  "context": "the last part of the sentence the student is writing",
  "metadata": {
    "languageLevel": "grade 3",
    "tone": "excited"
  }
}
```

The response groups actionable feedback into arrays so the UI can render deterministic
options:

```json
{
  "spellings": [
    {
      "word": "hte",
      "index": 2,
      "suggestion": "the",
      "reason": "We usually spell it t-h-e.",
      "confidence": 0.92
    }
  ],
  "improvements": [],
  "insertions": [],
  "notes": ["Looks great!"],
  "metadata": {
    "promptVersion": "2024-12-14",
    "warnings": []
  }
}
```

Requests are validated, lightly rate limited, and forwarded to OpenAI with a
structured prompt. When parsing fails the service emits warnings so we can iterate
on prompt design safely.
