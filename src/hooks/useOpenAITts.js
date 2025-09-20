import { useCallback, useMemo, useRef, useState } from 'react';

const VOICES = [
  { id: 'alloy', label: 'Alloy · bright' },
  { id: 'verse', label: 'Verse · balanced' },
  { id: 'aria', label: 'Aria · warm' },
  { id: 'sol', label: 'Sol · energetic' }
];

export const useOpenAITts = () => {
  const audioRef = useRef(null);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const voices = useMemo(() => VOICES, []);

  const stopCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
    setSpeaking(false);
    setPaused(false);
  }, []);

  const speak = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      stopCurrentAudio();
      setLoading(true);
      try {
        const response = await fetch('/.netlify/functions/generateSpeech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, voice: selectedVoice })
        });
        if (!response.ok) {
          throw new Error('Speech synthesis failed');
        }
        const { audioBase64, mimeType } = await response.json();
        const binary = Uint8Array.from(atob(audioBase64), (char) => char.charCodeAt(0));
        const blob = new Blob([binary], { type: mimeType || 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setSpeaking(false);
          setPaused(false);
        };
        await audio.play();
        setSpeaking(true);
        setPaused(false);
      } catch (error) {
        console.error(error);
        stopCurrentAudio();
      } finally {
        setLoading(false);
      }
    },
    [selectedVoice, stopCurrentAudio]
  );

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      setPaused(true);
      setSpeaking(true);
    }
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.paused) {
      audio
        .play()
        .then(() => {
          setPaused(false);
          setSpeaking(true);
        })
        .catch((error) => {
          console.error(error);
          stopCurrentAudio();
        });
    }
  }, [stopCurrentAudio]);

  const cancel = useCallback(() => {
    stopCurrentAudio();
  }, [stopCurrentAudio]);

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    pause,
    resume,
    cancel,
    speaking,
    paused,
    loading
  };
};
