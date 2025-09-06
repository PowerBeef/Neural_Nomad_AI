import { jest, test, expect } from '@jest/globals';

jest.mock('cui-llama.rn', () => ({
  initLlama: jest.fn(async () => ({
    initMultimodal: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    isMultimodalEnabled: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
    getMultimodalSupport: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
    releaseMultimodal: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })),
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn<() => Promise<{ exists: boolean }>>().mockResolvedValue({ exists: true }),
}));

jest.mock('react-native/Libraries/Image/NativeImageEditor', () => ({}));

import { initVisionSession } from '../healthcheck';

test('calls llama APIs with ctx_shift safeguard and releases on failure', async () => {
  const result = await initVisionSession('model', 'proj.mmproj');
  const { initLlama } = require('cui-llama.rn');
  const ctx = await initLlama.mock.results[0].value;
  expect(initLlama).toHaveBeenCalledWith(expect.objectContaining({ ctx_shift: false }));
  expect(ctx.initMultimodal).toHaveBeenCalledWith(expect.objectContaining({ path: 'proj.mmproj' }));
  expect(ctx.releaseMultimodal).toHaveBeenCalled();
  expect(result.ok).toBe(false);
});
