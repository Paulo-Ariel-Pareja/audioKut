import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { formatTime } from '../utils/audioProcessor';

interface AudioPlayerProps {
  audioBuffer: AudioBuffer;
  onTimeUpdate: (time: number) => void;
}

export const AudioPlayer = ({ audioBuffer, onTimeUpdate }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [timeInput, setTimeInput] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(1);
  const intentionalStopRef = useRef(false);

  const duration = audioBuffer?.duration || 0;
  playbackRateRef.current = playbackRate;

  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {}
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const updateTime = () => {
    if (!audioContextRef.current || !isPlayingRef.current) return;

    const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) * playbackRateRef.current;
    const newTime = Math.min(pauseTimeRef.current + elapsed, duration);

    setCurrentTime(newTime);
    onTimeUpdate(newTime);

    if (newTime >= duration - 0.01) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      pauseTimeRef.current = 0;
      setCurrentTime(0);
      return;
    }

    animFrameRef.current = requestAnimationFrame(updateTime);
  };

  const play = () => {
    if (!audioBuffer) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (sourceRef.current) {
      intentionalStopRef.current = true;
      try {
        sourceRef.current.stop();
      } catch {}
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRateRef.current;
    source.connect(audioContextRef.current.destination);
    source.start(0, pauseTimeRef.current);

    startTimeRef.current = audioContextRef.current.currentTime;
    sourceRef.current = source;
    isPlayingRef.current = true;
    setIsPlaying(true);

    source.onended = () => {
      if (intentionalStopRef.current) {
        intentionalStopRef.current = false;
        return;
      }
      pauseTimeRef.current = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    animFrameRef.current = requestAnimationFrame(updateTime);
  };

  const pause = () => {
    if (!sourceRef.current || !audioContextRef.current) return;

    pauseTimeRef.current += (audioContextRef.current.currentTime - startTimeRef.current) * playbackRateRef.current;
    const position = Math.min(pauseTimeRef.current, duration);
    pauseTimeRef.current = position;
    setCurrentTime(position);
    onTimeUpdate(position);

    intentionalStopRef.current = true;
    try {
      sourceRef.current.stop();
    } catch {}

    isPlayingRef.current = false;
    setIsPlaying(false);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, pauseTimeRef.current + seconds));
    pauseTimeRef.current = newTime;
    setCurrentTime(newTime);
    onTimeUpdate(newTime);

    if (isPlaying) {
      pause();
      play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const parseTimeInput = (input: string): number | null => {
    const s = input.trim();
    if (!s) return null;
    const parts = s.split(':');
    if (parts.length === 1) {
      const sec = parseFloat(parts[0].replace(',', '.'));
      return isNaN(sec) ? null : Math.max(0, sec);
    }
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseFloat(parts[1].replace(',', '.'));
      if (isNaN(mins) || isNaN(secs)) return null;
      return Math.max(0, mins * 60 + secs);
    }
    if (parts.length === 3) {
      const hrs = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      const secs = parseFloat(parts[2].replace(',', '.'));
      if (isNaN(hrs) || isNaN(mins) || isNaN(secs)) return null;
      return Math.max(0, hrs * 3600 + mins * 60 + secs);
    }
    return null;
  };

  const seekTo = (newTime: number) => {
    const t = Math.max(0, Math.min(duration, newTime));
    pauseTimeRef.current = t;
    setCurrentTime(t);
    onTimeUpdate(t);
    setTimeInput('');
    if (isPlaying) {
      pause();
      play();
    }
  };

  const handleTimeInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseTimeInput(timeInput);
    if (parsed !== null) seekTo(parsed);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <form onSubmit={handleTimeInputSubmit} className="flex items-center gap-2">
            <label className="text-gray-500 whitespace-nowrap">Ir a:</label>
            <input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="mm:ss"
              className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs"
            >
              Ir
            </button>
          </form>
          <span>{formatTime(duration)}</span>
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => skip(-5)}
            className="p-2 text-gray-300 hover:text-white transition-colors"
            title="Retroceder 5 s"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={() => skip(5)}
            className="p-2 text-gray-300 hover:text-white transition-colors"
            title="Adelantar 5 s"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              setPlaybackRate((r) => (r === 1 ? 2 : 1));
              if (isPlaying) {
                pause();
                setTimeout(() => play(), 0);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              playbackRate === 2
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title="Velocidad de reproducción"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
