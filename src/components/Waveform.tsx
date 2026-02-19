import { useEffect, useRef, useState, useCallback } from 'react';
import { Scissors, X, ZoomIn, ZoomOut, Play } from 'lucide-react';
import { CutPoint, formatTime, parseTimeToSeconds } from '../utils/audioProcessor';

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const WAVEFORM_HEIGHT = 128;

interface WaveformProps {
  audioBuffer: AudioBuffer;
  cutPoints: CutPoint[];
  onAddCutPoint: (time: number) => void;
  onRemoveCutPoint: (id: string) => void;
  onUpdateCutPoint: (id: string, newTime: number) => void;
  onPlayFromTime?: (time: number) => void;
  currentTime: number;
}

export const Waveform = ({
  audioBuffer,
  cutPoints,
  onAddCutPoint,
  onRemoveCutPoint,
  onUpdateCutPoint,
  onPlayFromTime,
  currentTime,
}: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setContainerWidth(width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const canvasWidth = Math.max(1, Math.floor(containerWidth * zoomLevel));
  const duration = audioBuffer?.duration ?? 0;

  const draw = useCallback(() => {
    if (!canvasRef.current || !audioBuffer || containerWidth <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvasWidth * dpr;
    canvas.height = WAVEFORM_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const width = canvasWidth;
    const height = WAVEFORM_HEIGHT;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx >= data.length) break;
        const datum = data[idx];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const x = i;
      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;

      if (i === 0) {
        ctx.moveTo(x, y1);
      } else {
        ctx.lineTo(x, y1);
      }
      ctx.lineTo(x, y2);
    }

    ctx.stroke();

    const progressX = duration > 0 ? (currentTime / duration) * width : 0;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    cutPoints.forEach((point) => {
      const x = (point.time / duration) * width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [audioBuffer, cutPoints, currentTime, canvasWidth, containerWidth, duration]);

  useEffect(() => {
    draw();
  }, [draw]);

  const scrollPlayheadIntoView = useCallback(() => {
    if (!containerRef.current || duration <= 0) return;
    const progressX = (currentTime / duration) * canvasWidth;
    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;
    const visibleRight = scrollLeft + container.clientWidth;
    if (progressX < scrollLeft || progressX > visibleRight - 20) {
      container.scrollLeft = Math.max(0, progressX - container.clientWidth / 2);
    }
  }, [currentTime, duration, canvasWidth]);

  useEffect(() => {
    const t = setTimeout(scrollPlayheadIntoView, 100);
    return () => clearTimeout(t);
  }, [currentTime, scrollPlayheadIntoView]);

  const getCanvasX = (clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return clientX - rect.left + containerRef.current.scrollLeft;
  };

  const clientXToTime = (clientX: number): number => {
    if (duration <= 0) return 0;
    const x = getCanvasX(clientX);
    const t = (x / canvasWidth) * duration;
    return Math.max(0, Math.min(duration, t));
  };

  const timeToX = (time: number): number => (duration > 0 ? (time / duration) * canvasWidth : 0);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer) return;
    const time = clientXToTime(e.clientX);
    const clickX = getCanvasX(e.clientX);

    const clickThresholdPx = 10;
    const clickedPoint = cutPoints.find((point) => {
      const pointX = timeToX(point.time);
      return Math.abs(pointX - clickX) < clickThresholdPx;
    });

    if (clickedPoint) {
      onRemoveCutPoint(clickedPoint.id);
    } else {
      onAddCutPoint(time);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current || !audioBuffer) return;
    const clickX = getCanvasX(e.clientX);

    const clickThreshold = 10;
    const hoveredCutPoint = cutPoints.find((point) => {
      const pointX = timeToX(point.time);
      return Math.abs(pointX - clickX) < clickThreshold;
    });

    setHoveredPoint(hoveredCutPoint ? hoveredCutPoint.id : null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Scissors className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Forma de Onda</h3>
          <span className="text-sm text-gray-400 ml-auto">
            Haz clic para agregar puntos de corte
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(MIN_ZOOM, z - 1))}
              disabled={zoomLevel <= MIN_ZOOM}
              className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Menos zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-gray-400 text-sm min-w-[3rem] text-center">
              {zoomLevel}x
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(MAX_ZOOM, z + 1))}
              disabled={zoomLevel >= MAX_ZOOM}
              className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Más zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="overflow-x-auto overflow-y-hidden rounded border border-gray-600"
          style={{ maxHeight: WAVEFORM_HEIGHT + 2 }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={WAVEFORM_HEIGHT}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            className={`block rounded ${hoveredPoint ? 'cursor-pointer' : 'cursor-crosshair'}`}
            style={{ width: canvasWidth, height: WAVEFORM_HEIGHT, minWidth: '100%' }}
          />
        </div>
      </div>

      {cutPoints.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">
            Puntos de Corte ({cutPoints.length})
          </h4>
          <div className="space-y-2">
            {cutPoints
              .sort((a, b) => a.time - b.time)
              .map((point, index) => {
                const isEditing = editingId === point.id;
                const displayValue = isEditing ? editingValue : formatTime(point.time);
                const commitEdit = () => {
                  if (!isEditing) return;
                  const parsed = parseTimeToSeconds(editingValue);
                  const duration = audioBuffer?.duration ?? 0;
                  if (parsed !== null && duration > 0) {
                    const clamped = Math.max(0, Math.min(duration, parsed));
                    onUpdateCutPoint(point.id, clamped);
                  }
                  setEditingId(null);
                };
                return (
                  <div
                    key={point.id}
                    className="flex items-center gap-2 bg-gray-700 rounded px-3 py-2"
                  >
                    <span className="text-gray-300 text-sm shrink-0">
                      Corte {index + 1}:
                    </span>
                    <input
                      type="text"
                      value={displayValue}
                      onChange={(e) => {
                        setEditingId(point.id);
                        setEditingValue(e.target.value);
                      }}
                      onFocus={() => {
                        setEditingId(point.id);
                        setEditingValue(formatTime(point.time));
                      }}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="flex-1 min-w-0 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-gray-100 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="mm:ss"
                    />
                    {onPlayFromTime && (
                      <button
                        type="button"
                        onClick={() => onPlayFromTime(point.time)}
                        className="shrink-0 p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        title="Reproducir desde aquí"
                      >
                        <Play className="w-4 h-4" fill="currentColor" />
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveCutPoint(point.id)}
                      className="shrink-0 p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Eliminar punto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
