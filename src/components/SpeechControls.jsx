import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Volume2, VolumeX, PauseCircle, PlayCircle, RotateCw, Settings } from 'lucide-react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const formatVoiceLabel = (voice) => {
  if (!voice) {
    return '';
  }
  const lang = voice.lang ? voice.lang.replace('_', '-') : '';
  return `${voice.name}${lang ? ` (${lang})` : ''}`;
};

const SpeechControls = ({ text, onSentenceFocus }) => {
  const {
    voices,
    voiceURI,
    setVoiceURI,
    rate,
    setRate,
    pitch,
    setPitch,
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    currentSentenceIndex,
    isSupported
  } = useSpeechSynthesis();

  const [activeSentence, setActiveSentence] = useState('');

  const sortedVoices = useMemo(() => {
    return voices
      .slice()
      .sort((a, b) => {
        const aUK = a.lang?.toLowerCase().startsWith('en-gb') ? 0 : 1;
        const bUK = b.lang?.toLowerCase().startsWith('en-gb') ? 0 : 1;
        if (aUK !== bUK) {
          return aUK - bUK;
        }
        return a.name.localeCompare(b.name);
      });
  }, [voices]);

  const handleSpeak = () => {
    if (!text?.trim()) {
      return;
    }
    speak(text, {
      onSentenceStart: (index, sentence) => {
        setActiveSentence(sentence ?? '');
        onSentenceFocus?.(index, sentence);
      }
    });
  };

  const handleStop = () => {
    stop();
    setActiveSentence('');
    onSentenceFocus?.(null, '');
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  return (
    <section className="support-card support-card--tts">
      <div className="support-card__header">
        <div className="support-card__header-icon" aria-hidden="true">
          <Volume2 size={20} />
        </div>
        <div>
          <h3>Read it aloud</h3>
          <p>High quality speech using your device’s voices.</p>
        </div>
      </div>

      {!isSupported ? (
        <p className="support-card__message">
          <VolumeX size={16} aria-hidden="true" /> Text-to-speech is not supported in this browser.
        </p>
      ) : (
        <>
          <div className="tts-controls">
            <button
              type="button"
              className="tts-button"
              onClick={handleSpeak}
              disabled={!text?.trim()}
            >
              <PlayCircle size={20} />
              Play document
            </button>
            <button
              type="button"
              className="tts-button"
              onClick={handlePauseResume}
              disabled={!isSpeaking}
            >
              <PauseCircle size={20} />
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="tts-button" onClick={handleStop} disabled={!isSpeaking}>
              <RotateCw size={20} />
              Stop
            </button>
          </div>

          <details className="tts-settings">
            <summary>
              <Settings size={16} aria-hidden="true" /> Voice settings
            </summary>
            <div className="tts-settings__body">
              <label className="tts-field">
                <span>Voice</span>
                <select
                  value={voiceURI}
                  onChange={(event) => setVoiceURI(event.target.value)}
                  aria-label="Select speaking voice"
                  disabled={!sortedVoices.length}
                >
                  {sortedVoices.length ? (
                    sortedVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {formatVoiceLabel(voice)}
                      </option>
                    ))
                  ) : (
                    <option value="">No voices available</option>
                  )}
                </select>
              </label>
              <label className="tts-field">
                <span>Speed</span>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.05"
                  value={rate}
                  onChange={(event) => setRate(Number.parseFloat(event.target.value))}
                  aria-label="Speech speed"
                />
              </label>
              <label className="tts-field">
                <span>Pitch</span>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={pitch}
                  onChange={(event) => setPitch(Number.parseFloat(event.target.value))}
                  aria-label="Speech pitch"
                />
              </label>
            </div>
          </details>

          {isSpeaking && (
            <p className="tts-active-sentence">
              Reading sentence {currentSentenceIndex != null ? currentSentenceIndex + 1 : ''}: {activeSentence}
            </p>
          )}
        </>
      )}
    </section>
  );
};

SpeechControls.propTypes = {
  text: PropTypes.string.isRequired,
  onSentenceFocus: PropTypes.func
};

export default SpeechControls;
