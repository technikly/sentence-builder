export const wordBank = [
  {
    id: 'starters',
    label: 'Sentence starters',
    color: '#1a73e8',
    entries: [
      { text: 'I feel', hint: 'Share a feeling to begin your idea.', emoji: '💬' },
      { text: 'I can', hint: 'Talk about something you are able to do.', emoji: '💪' },
      { text: 'Today I', hint: 'Explain what is happening today.', emoji: '📅' },
      { text: 'When I', hint: 'Describe what happens in a moment.', emoji: '⏰' },
      { text: 'My friend and I', hint: 'Write about working together.', emoji: '🤝', replaceCurrent: false },
      { text: 'In my classroom', hint: 'Describe your learning space.', emoji: '🏫', replaceCurrent: false }
    ]
  },
  {
    id: 'feelings',
    label: 'Feelings & people',
    color: '#fbbc04',
    entries: [
      { text: 'happy', hint: 'Feeling good or joyful.', emoji: '😊' },
      { text: 'worried', hint: 'Feeling a little unsure.', emoji: '😟', autoCapitalize: false },
      { text: 'excited', hint: 'Feeling very interested.', emoji: '🤩', autoCapitalize: false },
      { text: 'proud', hint: 'Feeling good about what you did.', emoji: '🌟', autoCapitalize: false },
      { text: 'teacher', hint: 'A grown-up who helps you learn.', emoji: '👩‍🏫', autoCapitalize: false },
      { text: 'classmates', hint: 'Friends learning with you.', emoji: '🧑‍🤝‍🧑', autoCapitalize: false }
    ]
  },
  {
    id: 'actions',
    label: 'Action words',
    color: '#34a853',
    entries: [
      { text: 'explore', hint: 'Find out more about something.', emoji: '🔍', autoCapitalize: false },
      { text: 'build', hint: 'Make or create something.', emoji: '🧱', autoCapitalize: false },
      { text: 'share', hint: 'Give ideas to someone else.', emoji: '💡', autoCapitalize: false },
      { text: 'practice', hint: 'Do it again to get better.', emoji: '🎯', autoCapitalize: false },
      { text: 'listen', hint: 'Pay attention with your ears.', emoji: '👂', autoCapitalize: false },
      { text: 'celebrate', hint: 'Enjoy something special.', emoji: '🎉', autoCapitalize: false }
    ]
  },
  {
    id: 'connectors',
    label: 'Connectors',
    color: '#ea4335',
    entries: [
      { text: 'because', hint: 'Give a reason for your idea.', emoji: '🧠', autoCapitalize: false, prependSpace: true },
      { text: 'so', hint: 'Show what happens next.', emoji: '➡️', autoCapitalize: false, prependSpace: true },
      { text: 'then', hint: 'Add the next step.', emoji: '⏩', autoCapitalize: false, prependSpace: true },
      { text: 'after', hint: 'Tell what came later.', emoji: '🔁', autoCapitalize: false, prependSpace: true },
      { text: 'but', hint: 'Show a different idea.', emoji: '🔄', autoCapitalize: false, prependSpace: true },
      { text: 'also', hint: 'Add another idea.', emoji: '➕', autoCapitalize: false, prependSpace: true }
    ]
  },
  {
    id: 'places',
    label: 'Places & time',
    color: '#a142f4',
    entries: [
      { text: 'playground', hint: 'The place where you play.', emoji: '🛝', autoCapitalize: false },
      { text: 'library', hint: 'A room with many books.', emoji: '📚', autoCapitalize: false },
      { text: 'outside', hint: 'Out in the fresh air.', emoji: '🌤️', autoCapitalize: false },
      { text: 'after school', hint: 'What happens when school finishes.', emoji: '🏡', replaceCurrent: false },
      { text: 'during the lesson', hint: 'Explain what happened in learning time.', emoji: '🕒', replaceCurrent: false },
      { text: 'in the playground', hint: 'Say where the action happened.', emoji: '🎠', replaceCurrent: false }
    ]
  }
];

export const nextWordMap = {
  i: ['feel', 'can', 'will', 'want', 'am'],
  we: ['are', 'can', 'will', 'learn'],
  they: ['are', 'can', 'helped'],
  my: ['friend', 'teacher', 'family'],
  because: ['I', 'we', 'it'],
  so: ['we', 'I', 'it'],
  then: ['we', 'I'],
  after: ['that', 'we'],
  first: ['we', 'I'],
  next: ['we', 'I'],
  finally: ['we', 'I']
};

export const phraseContinuations = [
  {
    id: 'feelings',
    label: 'Feeling ideas',
    pattern: /i feel$/i,
    suggestions: [
      {
        text: 'happy when',
        hint: 'Share when this feeling happens.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'worried when',
        hint: 'Explain what makes you unsure.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'proud because',
        hint: 'Tell the reason you feel proud.',
        prependSpace: true,
        replaceCurrent: false
      }
    ]
  },
  {
    id: 'can',
    label: 'Action ideas',
    pattern: /i can$/i,
    suggestions: [
      {
        text: 'learn new words',
        hint: 'Explain what you are learning.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'ask my teacher',
        hint: 'Say who can help you.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'practice every day',
        hint: 'Show how you get better.',
        prependSpace: true,
        replaceCurrent: false
      }
    ]
  },
  {
    id: 'then',
    label: 'Sequencing',
    pattern: /then$/i,
    suggestions: [
      {
        text: 'we',
        hint: 'Add what happened next.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'I',
        hint: 'Say what you did afterwards.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'after that',
        hint: 'Use a time phrase to continue.',
        prependSpace: true,
        replaceCurrent: false
      }
    ]
  },
  {
    id: 'because',
    label: 'Reasoning',
    pattern: /because$/i,
    suggestions: [
      {
        text: 'I can understand',
        hint: 'Explain what you now know.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'we worked together',
        hint: 'Share how teamwork helped.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'it was new for me',
        hint: 'Give a reason why it felt different.',
        prependSpace: true,
        replaceCurrent: false
      }
    ]
  },
  {
    id: 'first',
    label: 'Story order',
    pattern: /first$/i,
    suggestions: [
      {
        text: 'we',
        hint: 'Explain who started.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'I',
        hint: 'Describe your first step.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'First,',
        hint: 'Use a comma after "First".',
        replaceCurrent: true
      }
    ]
  },
  {
    id: 'next',
    label: 'Order clue',
    pattern: /next$/i,
    suggestions: [
      {
        text: 'we',
        hint: 'Continue with the next action.',
        prependSpace: true,
        replaceCurrent: false
      },
      {
        text: 'Next,',
        hint: 'Add a comma to keep it neat.',
        replaceCurrent: true
      },
      {
        text: 'after that',
        hint: 'Link to the next part.',
        prependSpace: true,
        replaceCurrent: false
      }
    ]
  }
];

export const languageFrames = [
  {
    title: 'Feeling and reason',
    frame: 'I feel ___ because ___',
    description: 'Share a feeling and give a reason to explain it.'
  },
  {
    title: 'Working together',
    frame: 'First, we ___ . Then, we ___ .',
    description: 'Use time words to show the order of events.'
  },
  {
    title: 'Learning reflection',
    frame: 'I found ___ tricky but I ___ to keep going.',
    description: 'Explain a challenge and how you solved it.'
  },
  {
    title: 'Future plan',
    frame: 'Next time I will ___ so that ___',
    description: 'Talk about your next steps and why they matter.'
  }
];

export const focusQuestions = [
  'What happened first, next and last?',
  'How did you feel and why?',
  'Who helped you during the learning?',
  'What new words did you use today?',
  'What will you try again next time?'
];
