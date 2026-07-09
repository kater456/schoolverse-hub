import imageCompression from "browser-image-compression";

/**
 * Compresses a vendor image file with specific constraints.
 * Falls back to original if compression fails, provided it's under 2MB.
 */
export async function compressVendorImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp',
    onProgress: (progress: number) => {
      if (onProgress) onProgress(progress);
    }
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error("Image compression failed:", error);

    // Fallback: check if original is under 2MB
    const MAX_FALLBACK_SIZE = 2 * 1024 * 1024;
    if (file.size <= MAX_FALLBACK_SIZE) {
      return file;
    }

    throw new Error("Compression failed and original file exceeds 2MB limit. Please upload a smaller image.");
  }
}
