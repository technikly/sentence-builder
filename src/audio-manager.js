class AudioManager {
  constructor() {
    this.sounds = {
      select: new Audio('/sounds/select.mp3'),
      add: new Audio('/sounds/add.mp3'),
      change: new Audio('/sounds/change.mp3'),
      save: new Audio('/sounds/save.mp3')
    };
  }

  play(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].currentTime = 0;
      this.sounds[soundName].play().catch(error => {
        console.log('Audio playback failed:', error);
      });
    }
  }
}

export const audioManager = new AudioManager();