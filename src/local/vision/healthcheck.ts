import { initLlama } from 'cui-llama.rn';
import { Image, Platform } from 'react-native';
import NativeImageEditor from 'react-native/Libraries/Image/NativeImageEditor';
import * as FileSystem from 'expo-file-system';

export type VisionSessionOpts = { nCtx?: number };

export async function importImageAsBase64(uri: string): Promise<string> {
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  );
  const max = Math.max(size.width, size.height);
  const scale = max > 336 ? 336 / max : 1;
  const displaySize = {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
  const resizedUri = await new Promise<string>((resolve, reject) =>
    (NativeImageEditor as any).cropImage(
      uri,
      { offset: { x: 0, y: 0 }, size, displaySize, resizeMode: 'contain' },
      resolve,
      reject
    )
  );
  return FileSystem.readAsStringAsync(resizedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function initVisionSession(
  modelPath: string,
  mmprojPath: string,
  opts?: VisionSessionOpts
): Promise<{
  ok: boolean;
  notes: string[];
  support: any;
  timings: Record<string, number>;
}> {
  const notes: string[] = [];
  const timings: Record<string, number> = {};
  const t0 = Date.now();
  const ctx = await initLlama({
    model: modelPath,
    n_ctx: opts?.nCtx ?? 4096,
    ctx_shift: false,
    n_gpu_layers: 0,
  });
  let ok = false;
  let support: any = null;
  const timeoutMs = 10000;
  let timedOut = false;
  try {
    if (!mmprojPath) {
      notes.push('No mmproj path provided');
      return { ok, notes, support, timings };
    }
    if (!mmprojPath.endsWith('.mmproj')) {
      notes.push('Suspicious projector extension');
    }
    try {
      const info = await FileSystem.getInfoAsync(mmprojPath);
      if (!info.exists) notes.push('Projector file missing');
    } catch {
      notes.push('Projector file missing');
    }
    const inited = await Promise.race([
      ctx.initMultimodal({ path: mmprojPath, use_gpu: true }),
      new Promise<boolean>((resolve) =>
        setTimeout(() => {
          timedOut = true;
          resolve(false);
        }, timeoutMs)
      ),
    ]);
    if (!inited) {
      notes.push(timedOut ? 'first-token watchdog tripped' : 'initMultimodal returned false');
      return { ok, notes, support, timings };
    }
    const enabled = await ctx.isMultimodalEnabled();
    if (!enabled) {
      notes.push('Multimodal not enabled after init');
      return { ok, notes, support, timings };
    }
    support = await ctx.getMultimodalSupport();
    timings.initMs = Date.now() - t0;
    if (Platform.OS === 'android') {
      notes.push('GPU acceleration not yet available on Android; using CPU');
    }
    ok = true;
    return { ok, notes, support, timings };
  } catch (err: any) {
    notes.push(String(err));
    return { ok, notes, support, timings };
  } finally {
    if (!ok) {
      try {
        await ctx.releaseMultimodal();
      } catch {}
    }
  }
}

