// src/vocabulary.js
import Papa from 'papaparse';

export const vocabularyDB = {
  startingPhrases: ['The', 'A', 'That', 'This'],
  subjects: ['dog', 'cat', 'bird', 'rabbit', 'fish'],
  adjectives: ['happy', 'quick', 'sleepy', 'hungry', 'playful'],
  verbs: ['ran', 'jumped', 'walked', 'slept', 'played'],
  prepositions: ['with', 'under', 'behind', 'near', 'beside'],
  objects: ['a bone', 'a ball', 'a toy', 'some food', 'a stick']
};

export const loadVocabularyFromCSV = () => {
  return new Promise((resolve, reject) => {
    Papa.parse('/vocabulary.csv', {
      download: true,
      header: true,
      complete: (results) => {
        const data = results.data;

        if (!Array.isArray(data) || data.length === 0) {
          console.warn('CSV data is empty or not an array. Using fallback vocabulary.');
          resolve(vocabularyDB);
          return;
        }

        const csvVocabulary = {
          startingPhrases: data.map(row => row.startingPhrases).filter(Boolean),
          subjects: data.map(row => row.subjects).filter(Boolean),
          adjectives: data.map(row => row.adjectives).filter(Boolean),
          verbs: data.map(row => row.verbs).filter(Boolean),
          prepositions: data.map(row => row.prepositions).filter(Boolean),
          objects: data.map(row => row.objects).filter(Boolean)
        };

        const mergedVocabulary = { ...vocabularyDB };
        Object.keys(csvVocabulary).forEach(category => {
          if (csvVocabulary[category].length > 0) {
            mergedVocabulary[category] = csvVocabulary[category];
          }
        });

        resolve(mergedVocabulary);
      },
      error: (err) => {
        console.error('Error loading CSV:', err);
        reject(err);
      }
    });
  });
};
