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

/**
 * `cut`: a video longer than the limit keeps its first `cut.seconds` (owner, 2026-10-13: the rest is cut off, and
 * the customer is told before the upload). Cutting is required: when it cannot be done here, this throws
 * TRIM_FAILED rather than send a video the server will refuse.
 */
export async function compressVideo(
  file: Blob,
  onProgress: (percent: number) => void,
  cut?: { seconds: number; duration: number },
): Promise<Blob> {
  const mustCut = !!cut && cut.duration > cut.seconds + 0.5;
  if (!mustCut && (file.size < SKIP_BELOW_BYTES || typeof window === 'undefined' || typeof VideoEncoder === 'undefined')) return file;
  try {
    const { Input, Output, Conversion, ALL_FORMATS, BlobSource, BufferTarget, Mp4OutputFormat, canEncodeVideo } = await import('mediabunny');
    const canEncode = typeof VideoEncoder !== 'undefined';
    // H.264 plays everywhere; VP9 only where the phone can't encode H.264.
    const codec = canEncode ? ((await canEncodeVideo('avc')) ? 'avc' : (await canEncodeVideo('vp9')) ? 'vp9' : null) : null;
    if (!codec && !mustCut) return file;
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    const track = await input.getPrimaryVideoTrack();
    if (!track) {
      if (mustCut) throw new Error('TRIM_FAILED');
      return file;
    }
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
      // Without an encoder on the phone the video is only cut, kept as it is.
      ...(codec ? { video: { ...size, codec, bitrate: VIDEO_BITRATE }, audio: { codec: 'aac' as const, bitrate: AUDIO_BITRATE } } : {}),
      ...(mustCut && cut ? { trim: { start: 0, end: cut.seconds } } : {}),
    });
    if (!conversion.isValid) {
      if (mustCut) throw new Error('TRIM_FAILED');
      return file;
    }
    conversion.onProgress = (progress: number) => onProgress(Math.round(progress * 100));
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer) {
      if (mustCut) throw new Error('TRIM_FAILED');
      return file;
    }
    if (!mustCut && buffer.byteLength >= file.size) return file;
    return new Blob([buffer], { type: 'video/mp4' });
  } catch (error) {
    if (mustCut) throw new Error('TRIM_FAILED');
    console.warn('[compressVideo] using the original file:', error);
    return file;
  }
}
