export interface CutPoint {
  time: number;
  id: string;
}

export interface AudioSegment {
  audioBuffer: AudioBuffer;
  startTime: number;
  endTime: number;
  index: number;
}

export const loadAudioFile = async (file: File): Promise<AudioBuffer> => {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
};

export const cutAudioIntoSegments = (
  audioBuffer: AudioBuffer,
  cutPoints: CutPoint[]
): AudioSegment[] => {
  const sortedPoints = [...cutPoints].sort((a, b) => a.time - b.time);
  const segments: AudioSegment[] = [];

  const breakpoints = [0, ...sortedPoints.map(p => p.time), audioBuffer.duration];

  for (let i = 0; i < breakpoints.length - 1; i++) {
    const startTime = breakpoints[i];
    const endTime = breakpoints[i + 1];

    if (endTime > startTime) {
      const segment = extractSegment(audioBuffer, startTime, endTime);
      segments.push({
        audioBuffer: segment,
        startTime,
        endTime,
        index: i,
      });
    }
  }

  return segments;
};

const extractSegment = (
  sourceBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer => {
  const sampleRate = sourceBuffer.sampleRate;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const segmentLength = endSample - startSample;

  const audioContext = new AudioContext();
  const segmentBuffer = audioContext.createBuffer(
    sourceBuffer.numberOfChannels,
    segmentLength,
    sampleRate
  );

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel++) {
    const sourceData = sourceBuffer.getChannelData(channel);
    const segmentData = segmentBuffer.getChannelData(channel);

    for (let i = 0; i < segmentLength; i++) {
      segmentData[i] = sourceData[startSample + i];
    }
  }

  return segmentBuffer;
};

export const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const data = interleave(audioBuffer);
  const dataLength = data.length * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  floatTo16BitPCM(view, 44, data);

  return new Blob([buffer], { type: 'audio/wav' });
};

const interleave = (audioBuffer: AudioBuffer): Float32Array => {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numberOfChannels;
  const result = new Float32Array(length);

  let index = 0;
  const inputL = audioBuffer.getChannelData(0);
  const inputR = numberOfChannels > 1 ? audioBuffer.getChannelData(1) : inputL;

  for (let i = 0; i < audioBuffer.length; i++) {
    result[index++] = inputL[i];
    if (numberOfChannels > 1) {
      result[index++] = inputR[i];
    }
  }

  return result;
};

const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (
  view: DataView,
  offset: number,
  input: Float32Array
): void => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
};

export const downloadAudioFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

/** Parsea "mm:ss", "mm:ss.cc", "ss" o "hh:mm:ss" a segundos. Devuelve null si no es válido. */
export const parseTimeToSeconds = (input: string): number | null => {
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
