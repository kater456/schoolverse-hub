import { describe, it, expect, vi } from 'vitest';
import { compressVendorImage } from '../vendorImageCompression';

// Mock browser-image-compression
vi.mock('browser-image-compression', () => ({
  default: vi.fn().mockImplementation(async (file, options) => {
    // Simulate successful compression
    return new File([new ArrayBuffer(100)], 'compressed.webp', { type: 'image/webp' });
  })
}));

describe('compressVendorImage', () => {
  it('should compress image with correct options', async () => {
    const file = new File([new ArrayBuffer(1000)], 'test.jpg', { type: 'image/jpeg' });
    const compressed = await compressVendorImage(file);
    expect(compressed.type).toBe('image/webp');
    expect(compressed.name).toBe('compressed.webp');
  });

  it('should fallback to original file if compression fails and size is under 2MB', async () => {
    const { default: imageCompression } = await import('browser-image-compression');
    vi.mocked(imageCompression).mockRejectedValueOnce(new Error('Compression failed'));

    const smallFile = new File([new ArrayBuffer(1024)], 'small.jpg', { type: 'image/jpeg' });
    const result = await compressVendorImage(smallFile);
    expect(result).toBe(smallFile);
  });

  it('should throw error if compression fails and size is over 2MB', async () => {
    const { default: imageCompression } = await import('browser-image-compression');
    vi.mocked(imageCompression).mockRejectedValueOnce(new Error('Compression failed'));

    const largeFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    await expect(compressVendorImage(largeFile)).rejects.toThrow(/exceeds 2MB limit/);
  });
});
