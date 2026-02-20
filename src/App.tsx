import { useState, useRef } from 'react';
import { Download, Music, AlertCircle } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { AudioPlayer, type AudioPlayerHandle } from './components/AudioPlayer';
import { Waveform } from './components/Waveform';
import {
  loadAudioFile,
  cutAudioIntoSegments,
  audioBufferToWav,
  downloadAudioFile,
  CutPoint,
} from './utils/audioProcessor';

function App() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [cutPoints, setCutPoints] = useState<CutPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string>('');
  const playerRef = useRef<AudioPlayerHandle>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError('');

    try {
      const buffer = await loadAudioFile(file);
      setAudioBuffer(buffer);
      setFileName(file.name);
      setCutPoints([]);
      setCurrentTime(0);
    } catch (err) {
      setError('Error al cargar el archivo. Por favor, intenta con otro archivo.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCutPoint = (time: number) => {
    const newCutPoint: CutPoint = {
      time,
      id: `${Date.now()}-${Math.random()}`,
    };
    setCutPoints([...cutPoints, newCutPoint]);
  };

  const handleRemoveCutPoint = (id: string) => {
    setCutPoints(cutPoints.filter((point) => point.id !== id));
  };

  const handleUpdateCutPoint = (id: string, newTime: number) => {
    if (!audioBuffer) return;
    const clamped = Math.max(0, Math.min(audioBuffer.duration, newTime));
    setCutPoints(
      cutPoints.map((point) => (point.id === id ? { ...point, time: clamped } : point))
    );
  };

  const handleExport = () => {
    if (!audioBuffer) return;

    if (cutPoints.length === 0) {
      setError('Por favor, agrega al menos un punto de corte.');
      return;
    }

    const segments = cutAudioIntoSegments(audioBuffer, cutPoints);
    const baseFileName = fileName.replace(/\.[^/.]+$/, '');

    segments.forEach((segment) => {
      const wavBlob = audioBufferToWav(segment.audioBuffer);
      const segmentFileName = `${baseFileName}_parte_${segment.index + 1}.wav`;
      downloadAudioFile(wavBlob, segmentFileName);
    });
  };

  const handleReset = () => {
    setAudioBuffer(null);
    setFileName('');
    setCutPoints([]);
    setCurrentTime(0);
    setError('');
  };

  if (!audioBuffer) {
    return (
      <div className="min-h-screen bg-gray-900 py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Music className="w-10 h-10 text-blue-500" />
              <h1 className="text-4xl font-bold text-white">
                AudioKut
              </h1>
            </div>
            <p className="text-gray-400">
              Importa, escucha y parte tus archivos de audio
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Music className="w-10 h-10 text-blue-500" />
            <h1 className="text-4xl font-bold text-white">
              Editor de Audio MP3
            </h1>
          </div>
          <p className="text-gray-400">
            Importa, escucha y corta tus archivos de audio
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-white font-semibold">{fileName}</p>
              <p className="text-sm text-gray-400">
                Duración: {Math.floor(audioBuffer.duration / 60)}:
                {Math.floor(audioBuffer.duration % 60)
                  .toString()
                  .padStart(2, '0')}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cargar Otro Archivo
          </button>
        </div>

        <AudioPlayer
          ref={playerRef}
          audioBuffer={audioBuffer}
          onTimeUpdate={setCurrentTime}
        />

        <Waveform
          audioBuffer={audioBuffer}
          cutPoints={cutPoints}
          onAddCutPoint={handleAddCutPoint}
          onRemoveCutPoint={handleRemoveCutPoint}
          onUpdateCutPoint={handleUpdateCutPoint}
          onPlayFromTime={(time) => playerRef.current?.seekToAndPlay(time)}
          currentTime={currentTime}
        />

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-white font-semibold text-lg mb-2">
                Información de Exportación
              </h3>
              <p className="text-gray-400 text-sm">
                {cutPoints.length === 0
                  ? 'Agrega puntos de corte en la forma de onda'
                  : `Se generarán ${cutPoints.length + 1} archivos`}
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={cutPoints.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <Download className="w-5 h-5" />
              Exportar Archivos Cortados
            </button>

            <p className="text-xs text-gray-500 text-center">
              Los archivos se descargarán en formato WAV
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
