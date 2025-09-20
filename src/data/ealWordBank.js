export const levelRank = {
  beginner: 0,
  intermediate: 1,
  advanced: 2
};

export const wordBankCategories = [
  {
    id: 'sentence_starters',
    label: 'Sentence starters',
    color: '#1a73e8',
    description: 'Open your ideas with friendly sentence beginnings.',
    items: [
      { text: 'I can see', level: 'beginner', hint: 'Use for describing what is in front of you.' },
      { text: 'This is', level: 'beginner', hint: 'Introduce a person, place, or thing.' },
      { text: 'Today I', level: 'beginner', hint: 'Talk about something that is happening now.' },
      { text: 'I like to', level: 'beginner', hint: 'Share something you enjoy doing.' },
      { text: 'My favourite part is', level: 'intermediate', hint: 'Explain the best part of your idea.' },
      { text: 'When I', level: 'intermediate', hint: 'Begin a sentence about a time something happened.' },
      { text: 'I would like', level: 'intermediate', hint: 'Use when you are making a polite request.' },
      { text: 'In my opinion', level: 'advanced', hint: 'Share your thinking or point of view.' }
    ]
  },
  {
    id: 'people',
    label: 'People & characters',
    color: '#0b8043',
    description: 'Choose who is in your sentence.',
    items: [
      { text: 'my friend', level: 'beginner', hint: 'A person you know and like.' },
      { text: 'the teacher', level: 'beginner', hint: 'An adult who helps you learn.' },
      { text: 'my family', level: 'beginner', hint: 'Use when more than one person is involved.' },
      { text: 'a scientist', level: 'intermediate', hint: 'Someone who investigates and discovers things.' },
      { text: 'the explorer', level: 'intermediate', hint: 'A character who travels to new places.' },
      { text: 'a kind helper', level: 'beginner', hint: 'Someone who gives support.' },
      { text: 'the community', level: 'advanced', hint: 'Talk about many people together.' }
    ]
  },
  {
    id: 'actions',
    label: 'Actions & verbs',
    color: '#9334e6',
    description: 'Tell what the person or object is doing.',
    items: [
      { text: 'is running', level: 'beginner', hint: 'Moving quickly with your legs.' },
      { text: 'is learning', level: 'beginner', hint: 'Finding out new information.' },
      { text: 'can jump', level: 'beginner', hint: 'Able to move off the ground.' },
      { text: 'wants to explore', level: 'intermediate', hint: 'Feels excited to look around a new place.' },
      { text: 'is carefully drawing', level: 'intermediate', hint: 'Doing an action slowly and with care.' },
      { text: 'is thinking about', level: 'intermediate', hint: 'Planning or imagining something.' },
      { text: 'is investigating', level: 'advanced', hint: 'Looking closely to find clues or answers.' }
    ]
  },
  {
    id: 'descriptions',
    label: 'Describing words',
    color: '#ff8c00',
    description: 'Add detail so your reader can imagine the scene.',
    items: [
      { text: 'bright and colourful', level: 'beginner', hint: 'Full of light and colour.' },
      { text: 'very quiet', level: 'beginner', hint: 'Almost no sound at all.' },
      { text: 'soft and fluffy', level: 'beginner', hint: 'Gentle to touch like a cloud.' },
      { text: 'excited', level: 'beginner', hint: 'Feeling happy energy.' },
      { text: 'brave', level: 'intermediate', hint: 'Ready to do something even if it is difficult.' },
      { text: 'curious', level: 'intermediate', hint: 'Wanting to know more about something.' },
      { text: 'spectacular', level: 'advanced', hint: 'So amazing that it stands out.' }
    ]
  },
  {
    id: 'connectors',
    label: 'Connectors',
    color: '#00acc1',
    description: 'Join ideas together so they flow smoothly.',
    items: [
      { text: 'and', level: 'beginner', hint: 'Add another idea to your sentence.' },
      { text: 'because', level: 'beginner', hint: 'Explain the reason for something.' },
      { text: 'so', level: 'beginner', hint: 'Show the result of an action.' },
      { text: 'but', level: 'beginner', hint: 'Show a different idea or change.' },
      { text: 'after that', level: 'intermediate', hint: 'Move your story forward in time.' },
      { text: 'so that', level: 'intermediate', hint: 'Explain the purpose of an action.' },
      { text: 'however', level: 'advanced', hint: 'Introduce a contrasting idea in formal writing.' },
      { text: 'therefore', level: 'advanced', hint: 'Show the result of earlier ideas.' }
    ]
  },
  {
    id: 'time',
    label: 'Time & sequence',
    color: '#ff7043',
    description: 'Explain when something happens.',
    items: [
      { text: 'first', level: 'beginner', hint: 'Use for the beginning of a sequence.' },
      { text: 'next', level: 'beginner', hint: 'Show what happens after the first thing.' },
      { text: 'then', level: 'beginner', hint: 'Add another step in the order.' },
      { text: 'finally', level: 'intermediate', hint: 'Finish a sequence or set of instructions.' },
      { text: 'today', level: 'beginner', hint: 'Something happening now.' },
      { text: 'yesterday', level: 'intermediate', hint: 'Something that happened in the past.' },
      { text: 'tomorrow', level: 'intermediate', hint: 'Something that will happen in the future.' }
    ]
  },
  {
    id: 'places',
    label: 'Places & settings',
    color: '#1a73e8',
    description: 'Choose where the action takes place.',
    items: [
      { text: 'in the classroom', level: 'beginner', hint: 'Inside a room where you learn.' },
      { text: 'at the park', level: 'beginner', hint: 'Outside where you can play.' },
      { text: 'near the library', level: 'beginner', hint: 'Close to the place with many books.' },
      { text: 'on the playground', level: 'beginner', hint: 'Where children can play outside.' },
      { text: 'inside the laboratory', level: 'intermediate', hint: 'A place for science experiments.' },
      { text: 'around the community', level: 'intermediate', hint: 'Different places near where people live.' },
      { text: 'across the mountains', level: 'advanced', hint: 'Far away in a natural setting.' }
    ]
  },
  {
    id: 'feelings',
    label: 'Feelings',
    color: '#d81b60',
    description: 'Describe how someone feels.',
    items: [
      { text: 'happy', level: 'beginner', hint: 'Feeling good and smiling.' },
      { text: 'nervous', level: 'beginner', hint: 'A little worried about what will happen.' },
      { text: 'proud', level: 'beginner', hint: 'Feeling pleased with yourself or others.' },
      { text: 'curious', level: 'intermediate', hint: 'Wanting to find out more.' },
      { text: 'calm', level: 'intermediate', hint: 'Feeling peaceful and relaxed.' },
      { text: 'determined', level: 'advanced', hint: 'Not giving up even when it is hard.' }
    ]
  },
  {
    id: 'classroom_language',
    label: 'Classroom language',
    color: '#5f6368',
    description: 'Useful phrases for asking for help.',
    items: [
      { text: 'Can you help me?', level: 'beginner', hint: 'Politely ask for support.' },
      { text: 'Please repeat that.', level: 'beginner', hint: 'Ask to hear the information again.' },
      { text: 'I do not understand yet.', level: 'beginner', hint: 'Share that you need more explanation.' },
      { text: 'May I check with a partner?', level: 'intermediate', hint: 'Ask to work together to understand.' },
      { text: 'Could you show me an example?', level: 'intermediate', hint: 'Ask to see how something is done.' },
      { text: 'I would like a glossary, please.', level: 'advanced', hint: 'Ask for vocabulary support politely.' }
    ]
  }
];

export const supportiveSentenceFrames = [
  'I can see',
  'I feel',
  'I would like',
  'I think',
  'This text is about',
  'First',
  'Next',
  'After that'
];

export const highFrequencyWords = [
  'and',
  'then',
  'also',
  'because',
  'so',
  'but',
  'next',
  'after that',
  'for example',
  'finally'
];

export const pronouns = ['i', 'we', 'they', 'he', 'she', 'it', 'you'];

export const determiners = [
  'a',
  'an',
  'the',
  'this',
  'that',
  'these',
  'those',
  'my',
  'your',
  'our',
  'his',
  'her',
  'their',
  'some',
  'many'
];

export const linkingVerbs = [
  'am',
  'is',
  'are',
  'was',
  'were',
  'feel',
  'feels',
  'felt',
  'seem',
  'seems',
  'look',
  'looks',
  'sound',
  'sounds'
];

export const timeMarkers = [
  'first',
  'next',
  'then',
  'after',
  'before',
  'later',
  'finally',
  'today',
  'yesterday',
  'tomorrow'
];

export const questionOpeners = ['who', 'what', 'where', 'when', 'why', 'how', 'which'];

export const modalHelpers = ['can', 'could', 'should', 'might', 'will'];

export const pronounFriendlyVerbs = [
  'am',
  'are',
  'like',
  'want',
  'need',
  'can',
  'love',
  'enjoy'
];

export const filterItemsByLevel = (items, level) => {
  const targetRank = levelRank[level] ?? 0;
  return items.filter((item) => {
    const itemLevel = item.level ?? 'beginner';
    if (itemLevel === 'all') {
      return true;
    }
    const itemRank = levelRank[itemLevel] ?? 0;
    return itemRank <= targetRank;
  });
};

export const flattenWordBank = (categories, level) => {
  const words = new Set();
  categories.forEach((category) => {
    filterItemsByLevel(category.items, level).forEach((item) => {
      words.add(item.text);
    });
  });
  supportiveSentenceFrames.forEach((frame) => words.add(frame));
  highFrequencyWords.forEach((word) => words.add(word));
  return Array.from(words);
};

export const getCategoryById = (id) =>
  wordBankCategories.find((category) => category.id === id);

