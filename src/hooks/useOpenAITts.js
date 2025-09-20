import { useCallback, useRef, useState } from 'react';

export const useOpenAITts = () => {
  const audioRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlaying(false);
    setPaused(false);
  }, []);

  const speak = useCallback(
    async (text, voice = 'alloy') => {
      const trimmed = text?.trim();
      if (!trimmed) {
        return;
      }

      cleanupAudio();
      setLoading(true);

      try {
        const response = await fetch('/.netlify/functions/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: trimmed, voice })
        });

        if (!response.ok) {
          throw new Error('Unable to start speech');
        }

        const payload = await response.json();
        if (!payload?.audio) {
          throw new Error('No audio received');
        }

        const source = `data:audio/${payload.format || 'mp3'};base64,${payload.audio}`;
        const audio = new Audio(source);
        audioRef.current = audio;

        audio.onended = () => cleanupAudio();
        audio.onpause = () => setPaused(true);
        audio.onplay = () => {
          setPlaying(true);
          setPaused(false);
        };

        await audio.play();
      } catch (error) {
        console.error('speak failed', error);
        cleanupAudio();
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [cleanupAudio]
  );

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setPaused(false);
      setPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    cleanupAudio();
  }, [cleanupAudio]);

  return {
    speak,
    pause,
    resume,
    stop,
    loading,
    playing,
    paused
  };
};
