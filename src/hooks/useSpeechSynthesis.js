import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const splitIntoSentences = (text) =>
  text
    .match(/[^.!?]+[.!?]*/g)
    ?.map((part) => part.trim())
    .filter(Boolean) ?? [text.trim()].filter(Boolean);

export const useSpeechSynthesis = () => {
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(0.95);
  const [pitch, setPitch] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const defaultVoiceSetRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (!defaultVoiceSetRef.current && available.length) {
        const preferred =
          available.find((voice) => voice.lang?.toLowerCase().startsWith('en-gb')) ??
          available.find((voice) => voice.lang?.toLowerCase().startsWith('en')) ??
          available[0];
        if (preferred) {
          setVoiceURI(preferred.voiceURI);
          defaultVoiceSetRef.current = true;
        }
      }
    };

    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);

    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
    };
  }, []);

  const selectedVoice = useMemo(() => {
    if (!voiceURI) {
      return null;
    }
    return voices.find((voice) => voice.voiceURI === voiceURI) ?? null;
  }, [voiceURI, voices]);

  const stop = useCallback(() => {
    if (!isSupported) {
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentSentenceIndex(null);
  }, [isSupported]);

  const speak = useCallback(
    (text, { onSentenceStart } = {}) => {
      if (!isSupported) {
        return;
      }
      const trimmed = text?.trim();
      if (!trimmed) {
        return;
      }

      stop();

      const sentences = splitIntoSentences(trimmed);
      if (!sentences.length) {
        return;
      }

      const voiceToUse = selectedVoice ?? voices.find((voice) => voice.lang?.startsWith('en')) ?? null;

      sentences.forEach((sentence, index) => {
        const utterance = new SpeechSynthesisUtterance(sentence);
        if (voiceToUse) {
          utterance.voice = voiceToUse;
        }
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          setCurrentSentenceIndex(index);
          onSentenceStart?.(index, sentence);
        };
        utterance.onend = () => {
          if (index === sentences.length - 1) {
            setIsSpeaking(false);
            setCurrentSentenceIndex(null);
            onSentenceStart?.(null, '');
          }
        };
        window.speechSynthesis.speak(utterance);
      });
    },
    [isSupported, rate, pitch, selectedVoice, stop, voices]
  );

  const pause = useCallback(() => {
    if (!isSupported) {
      return;
    }
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) {
      return;
    }
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  return {
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
  };
};
