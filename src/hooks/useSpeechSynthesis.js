import { useCallback, useEffect, useMemo, useState } from 'react';

const getSpeechSynthesis = () => (typeof window !== 'undefined' ? window.speechSynthesis : undefined);

export const useSpeechSynthesis = ({ preferredLang = 'en-GB' } = {}) => {
  const synthesis = getSpeechSynthesis();
  const supported = Boolean(synthesis);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!supported) {
      return undefined;
    }

    const loadVoices = () => {
      const availableVoices = synthesis.getVoices();
      setVoices(availableVoices);
      if (!selectedVoice && availableVoices.length > 0) {
        const preferredVoice =
          availableVoices.find((voice) => voice.lang === preferredLang) ||
          availableVoices.find((voice) => voice.lang.startsWith(preferredLang)) ||
          availableVoices[0];
        setSelectedVoice(preferredVoice?.name ?? '');
      }
    };

    loadVoices();
    synthesis.addEventListener('voiceschanged', loadVoices);
    return () => synthesis.removeEventListener('voiceschanged', loadVoices);
  }, [preferredLang, selectedVoice, supported, synthesis]);

  const speak = useCallback(
    (text) => {
      if (!supported || !text?.trim()) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const selected = voices.find((voice) => voice.name === selectedVoice);
      if (selected) {
        utterance.voice = selected;
      } else {
        const fallback =
          voices.find((voice) => voice.lang === preferredLang) ||
          voices.find((voice) => voice.lang.startsWith(preferredLang));
        if (fallback) {
          utterance.voice = fallback;
        }
      }
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setSpeaking(true);
        setPaused(false);
      };
      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
      };
      utterance.onerror = () => {
        setSpeaking(false);
        setPaused(false);
      };

      synthesis.cancel();
      synthesis.speak(utterance);
    },
    [preferredLang, selectedVoice, supported, synthesis, voices]
  );

  const cancel = useCallback(() => {
    if (!supported) {
      return;
    }
    synthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, [supported, synthesis]);

  const pause = useCallback(() => {
    if (!supported) {
      return;
    }
    if (synthesis.speaking && !synthesis.paused) {
      synthesis.pause();
      setPaused(true);
    }
  }, [supported, synthesis]);

  const resume = useCallback(() => {
    if (!supported) {
      return;
    }
    if (synthesis.paused) {
      synthesis.resume();
      setPaused(false);
    }
  }, [supported, synthesis]);

  const voiceOptions = useMemo(
    () =>
      voices
        .filter((voice) => voice.lang.startsWith('en'))
        .map((voice) => ({
          name: voice.name,
          label: `${voice.name} (${voice.lang})`
        })),
    [voices]
  );

  return {
    supported,
    voices: voiceOptions,
    selectedVoice,
    setSelectedVoice,
    speaking,
    paused,
    speak,
    cancel,
    pause,
    resume
  };
};
