export const inappropriateWords = [
  'sex',
  'porn',
  'drugs',
  'alcohol',
  'violence',
  'kill',
  'murder',
  'damn',
  'hell',
  'shit'
];

export const filterChildFriendly = (words) => {
  return words.filter(
    (word) =>
      /^[a-zA-Z]+$/.test(word) &&
      !inappropriateWords.includes(word.toLowerCase())
  );
};
