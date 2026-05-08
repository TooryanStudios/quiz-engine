import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toPng } from 'html-to-image';
import type { PlayerRef } from '@remotion/player';
import type React from 'react';
import type {
  VideoRenderer,
  RenderParams,
  RenderResponse,
  ProgressParams,
  ProgressResponse,
  RenderTypeInfo,
} from '../types/renderer';

interface RenderJob {
  progress: number;
  done: boolean;
  url?: string;
  error?: string;
}

/**
 * In-browser video renderer.
 *
 * Seeks the Remotion Player frame-by-frame, captures each frame to PNG
 * using html-to-image, then encodes all frames to MP4 via FFmpeg.wasm.
 * No server required — runs entirely in the user's browser at zero cost.
 *
 * Limitations:
 * - Rendering is sequential (one frame at a time), so a 30fps 10s video
 *   takes roughly 1–3 minutes depending on the machine.
 * - Cross-origin video overlays will render as black frames (browser security).
 * - Images from Firebase Storage work when CORS allows the current origin.
 */
export class BrowserRenderer implements VideoRenderer {
  private readonly playerRef: React.RefObject<PlayerRef | null>;
  private readonly jobs = new Map<string, RenderJob>();
  private ffmpegInstance: FFmpeg | null = null;
  private ffmpegLoadPromise: Promise<void> | null = null;

  readonly renderType: RenderTypeInfo = { type: 'browser', entryPoint: '' };

  constructor(playerRef: React.RefObject<PlayerRef | null>) {
    this.playerRef = playerRef;
  }

  async renderVideo(params: RenderParams): Promise<RenderResponse> {
    const renderId = crypto.randomUUID();
    this.jobs.set(renderId, { progress: 0, done: false });
    this._doRender(renderId, params).catch((err) => {
      const job = this.jobs.get(renderId);
      if (job) {
        job.error = (err as Error)?.message ?? 'Browser render failed';
        job.done = true;
      }
    });
    return { renderId };
  }

  async getProgress(params: ProgressParams): Promise<ProgressResponse> {
    const job = this.jobs.get(params.id);
    if (!job) return { type: 'error', message: 'Render job not found' };
    if (job.error) return { type: 'error', message: job.error };
    if (job.done && job.url != null) return { type: 'done', url: job.url, size: 0 };
    return { type: 'progress', progress: job.progress };
  }

  private async loadFFmpeg(): Promise<FFmpeg> {
    if (this.ffmpegInstance) return this.ffmpegInstance;
    if (!this.ffmpegLoadPromise) {
      const ffmpeg = new FFmpeg();
      
      // Use variables/concatenation to bypass Vite's static asset plugin 
      // preventing it from catching the /public folder references at build time.
      const coreFile = 'ffmpeg-core.js';
      const wasmFile = 'ffmpeg-core.wasm';

      this.ffmpegLoadPromise = ffmpeg.load({
        coreURL: `/${coreFile}`,
        wasmURL: `/${wasmFile}`,
      }).then(() => {
        this.ffmpegInstance = ffmpeg;
      });
    }
    await this.ffmpegLoadPromise;
    return this.ffmpegInstance!;
  }

  private seekAndWait(player: PlayerRef, frame: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        // Two rAFs ensure React has flushed its re-render for this frame
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      };
      const onSeeked = () => {
        (player as unknown as EventTarget).removeEventListener('seeked', onSeeked);
        settle();
      };
      (player as unknown as EventTarget).addEventListener('seeked', onSeeked);
      player.seekTo(frame);
      // Fallback: if the seeked event never fires (e.g. already at this frame)
      setTimeout(settle, 400);
    });
  }

  private async _doRender(renderId: string, params: RenderParams): Promise<void> {
    const { inputProps } = params;
    const { durationInFrames, fps, width, height } = inputProps;
    const job = this.jobs.get(renderId)!;

    const player = this.playerRef.current;
    if (!player) {
      throw new Error(
        'Video player is not mounted. Please open the Video Editor before rendering.'
      );
    }

    const container = player.getContainerNode();
    if (!container) {
      throw new Error('Player container element not found.');
    }

    // The Remotion player container holds the canvas/composition area.
    // We want to capture just the inner composition element so the screenshot
    // is exactly width×height with no extra chrome.
    const compositionEl: HTMLElement = (container.querySelector('[data-remotion-canvas]') as HTMLElement)
      ?? (container.querySelector('.remotion-player-canvas') as HTMLElement)
      ?? container;

    player.pause();

    // toPng options that improve cross-origin compatibility
    const toPngOptions = {
      width,
      height,
      pixelRatio: 1,
      cacheBust: true,
      skipFonts: false,
      // Set crossOrigin on cloned image/video nodes to avoid EncodingError
      onCloneNode: (node: Node) => {
        if (node instanceof HTMLImageElement && !node.crossOrigin) {
          node.crossOrigin = 'anonymous';
        }
        if (node instanceof HTMLVideoElement && !node.crossOrigin) {
          node.crossOrigin = 'anonymous';
        }
      },
    } as Parameters<typeof toPng>[1];

    // Load FFmpeg WASM (cached after first render)
    const ffmpeg = await this.loadFFmpeg();

    // Capture each frame
    for (let frame = 0; frame < durationInFrames; frame++) {
      await this.seekAndWait(player, frame);

      // Retry once on EncodingError (transient CORS decode failures)
      let dataUrl: string;
      try {
        dataUrl = await toPng(compositionEl, toPngOptions);
      } catch (captureErr) {
        // One retry — sometimes the first attempt fails due to CORS caching
        try {
          dataUrl = await toPng(compositionEl, toPngOptions);
        } catch {
          // Skip frame: write a transparent 1×1 placeholder so FFmpeg
          // still gets a frame at this index and the video stays in sync.
          // For most practical cases this means a brief black flash.
          dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          console.warn(`[BrowserRenderer] Frame ${frame} capture failed, using placeholder:`, captureErr);
        }
      }
      const res = await fetch(dataUrl!);
      const buf = await res.arrayBuffer();
      const name = `f${String(frame).padStart(5, '0')}.png`;
      await ffmpeg.writeFile(name, new Uint8Array(buf));

      // Progress: 0–88% during frame capture phase
      job.progress = ((frame + 1) / durationInFrames) * 0.88;
    }

    job.progress = 0.90;

    // Encode frames → MP4 with libx264
    await ffmpeg.exec([
      '-framerate', String(fps),
      '-i', 'f%05d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'ultrafast',
      '-crf', '23',
      'output.mp4',
    ]);

    job.progress = 0.97;

    const encoded = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = new Blob([encoded.buffer as ArrayBuffer], { type: 'video/mp4' });
    job.url = URL.createObjectURL(blob);

    // Free WASM virtual filesystem memory
    for (let i = 0; i < durationInFrames; i++) {
      ffmpeg.deleteFile(`f${String(i).padStart(5, '0')}.png`).catch(() => { /* ignore */ });
    }
    ffmpeg.deleteFile('output.mp4').catch(() => { /* ignore */ });

    job.progress = 1;
    job.done = true;
  }
}
