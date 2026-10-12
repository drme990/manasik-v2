/**
 * Shrinks a customer's video on their own phone before it is uploaded (owner,
 * 2026-10-12): like WhatsApp, a 1080p camera recording of a minute (well over
 * 100 MB) becomes a 720p video of about 10 MB, so the upload takes seconds,
 * not minutes. Uses the browser's own video encoder (WebCodecs) through
 * mediabunny, loaded only when needed. When the browser can't do it, or the
 * result isn't smaller, the original file is used as it is.
 */
const MAX_SHORT_SIDE = 720;
const VIDEO_BITRATE = 1_500_000;
const AUDIO_BITRATE = 96_000;
/** Below this the video is already small enough. */
const SKIP_BELOW_BYTES = 12 * 1024 * 1024;

export async function compressVideo(
  file: Blob,
  onProgress: (percent: number) => void,
): Promise<Blob> {
  if (file.size < SKIP_BELOW_BYTES || typeof window === 'undefined' || typeof VideoEncoder === 'undefined') return file;
  try {
    const { Input, Output, Conversion, ALL_FORMATS, BlobSource, BufferTarget, Mp4OutputFormat, canEncodeVideo } = await import('mediabunny');
    // H.264 plays everywhere; VP9 only where the phone can't encode H.264.
    const codec = (await canEncodeVideo('avc')) ? 'avc' : (await canEncodeVideo('vp9')) ? 'vp9' : null;
    if (!codec) return file;
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return file;
    const portrait = track.displayHeight >= track.displayWidth;
    const shortSide = Math.min(track.displayWidth, track.displayHeight);
    const size = shortSide > MAX_SHORT_SIDE
      ? portrait
        ? { width: MAX_SHORT_SIDE }
        : { height: MAX_SHORT_SIDE }
      : {};
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      video: { ...size, codec, bitrate: VIDEO_BITRATE },
      audio: { codec: 'aac', bitrate: AUDIO_BITRATE },
    });
    if (!conversion.isValid) return file;
    conversion.onProgress = (progress: number) => onProgress(Math.round(progress * 100));
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength >= file.size) return file;
    return new Blob([buffer], { type: 'video/mp4' });
  } catch (error) {
    console.warn('[compressVideo] using the original file:', error);
    return file;
  }
}
