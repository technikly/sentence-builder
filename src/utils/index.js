// src/utils/index.js
export const generateNewSentence = (vocabulary) => {
  const startingPhrase = vocabulary.startingPhrases[
    Math.floor(Math.random() * vocabulary.startingPhrases.length)
  ];
  const subject = vocabulary.subjects[
    Math.floor(Math.random() * vocabulary.subjects.length)
  ];
  
  return {
    words: [
      { word: startingPhrase, punctuation: '' },
      { word: subject, punctuation: '.' }
    ]
  };
};

export const toggleCase = (sentences, sentenceIndex, wordIndex, setSentences) => {
  const newSentences = [...sentences];
  const word = newSentences[sentenceIndex].words[wordIndex].word;
  newSentences[sentenceIndex].words[wordIndex].word = 
    word[0] === word[0].toUpperCase() 
      ? word.toLowerCase() 
      : word[0].toUpperCase() + word.slice(1);
  return newSentences;
};

export const saveSentencesToFile = (sentences) => {
  const text = sentences.map(sentence => 
    sentence.words.map(w => w.word + w.punctuation).join(' ')
  ).join('\n');
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-story.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const handleWordClick = (e, sentenceIndex, wordIndex, setContextMenu) => {
  e.preventDefault();
  e.stopPropagation();

  let x = e.clientX + window.scrollX;
  let y = e.clientY + window.scrollY;

  const menuWidth = 150;
  const menuHeight = 160;

  if (x + menuWidth > window.innerWidth + window.scrollX) {
    x = window.innerWidth + window.scrollX - menuWidth - 10;
  }

  if (y + menuHeight > window.innerHeight + window.scrollY) {
    y = window.innerHeight + window.scrollY - menuHeight - 10;
  }

  setContextMenu({
    visible: true,
    x,
    y,
    sentenceIndex,
    wordIndex
  });
};

export const togglePunctuation = (sentences, sentenceIndex, wordIndex, setSentences) => {
  const newSentences = [...sentences];
  const currentPunct = newSentences[sentenceIndex].words[wordIndex].punctuation;
  const punctOptions = ['', '.', ',', '!', '?', ';'];
  const currentIndex = punctOptions.indexOf(currentPunct);
  const nextPunct = punctOptions[(currentIndex + 1) % punctOptions.length];
  
  newSentences[sentenceIndex].words[wordIndex].punctuation = nextPunct;
  return newSentences;
};

export const addWord = (sentences, activeSentence, activeIndex, word) => {
  const newSentences = [...sentences];
  const currentSentence = newSentences[activeSentence];
  
  const newWord = {
    word: word,
    punctuation: ''
  };
  
  if (activeIndex === currentSentence.words.length) {
    currentSentence.words.push(newWord);
  } else {
    currentSentence.words.splice(activeIndex, 0, newWord);
  }
  
  return newSentences;
};
