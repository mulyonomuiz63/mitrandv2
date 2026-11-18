export interface CompressedUploadResult {
  dataUrl: string;
  hostedUrl: string;
  fileName: string;
  originalBytes: number;
  compressedBytes: number;
  originalFormattedSize: string;
  compressedFormattedSize: string;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const base64Len = dataUrl.length - commaIdx - 1;
  return Math.max(1, Math.round((base64Len * 3) / 4));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

function compressImageDataUrlClient(
  rawDataUrl: string,
  mimeType: string,
  rawBytes: number,
  maxDimension = 1400,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    if (mimeType.includes('svg')) {
      resolve(rawDataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width || 800;
      let height = img.height || 800;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.max(1, Math.round((height * maxDimension) / width));
          width = maxDimension;
        } else {
          width = Math.max(1, Math.round((width * maxDimension) / height));
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      const isPng = mimeType.includes('png');

      if (!isPng) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const jpegOut = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegOut.length < rawDataUrl.length ? jpegOut : rawDataUrl);
      } else {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngOut = canvas.toDataURL('image/png');
        resolve(pngOut.length < rawDataUrl.length ? pngOut : rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

/**
 * Universal file compressor for PDF, JPG, JPEG, PNG, WEBP, SVG, and MP4/Video.
 * Automatically compresses images via HTML5 Canvas and sends PDFs/Images/Videos
 * to `/api/marketing-tools/upload` for server-side optimization and static hosting storage.
 */
export async function compressAndUploadFile(
  file: File,
  options?: {
    maxDimension?: number;
    quality?: number;
    uploadToServer?: boolean;
  }
): Promise<CompressedUploadResult> {
  const maxDimension = options?.maxDimension ?? 1400;
  const quality = options?.quality ?? 0.78;
  const uploadToServer = options?.uploadToServer ?? true;

  const originalBytes = file.size;
  const originalFormattedSize = formatFileSize(originalBytes);
  const rawDataUrl = await readFileAsDataUrl(file);
  const lowerMime = (file.type || '').toLowerCase();
  const lowerName = (file.name || '').toLowerCase();

  let compressedDataUrl = rawDataUrl;
  let detectedType: 'pdf' | 'png' | 'jpg' | 'svg' | 'mp4' = 'pdf';

  if (lowerMime.includes('svg') || lowerName.endsWith('.svg')) {
    detectedType = 'svg';
  } else if (
    lowerMime.startsWith('image/') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp')
  ) {
    const isPngFile =
      lowerMime.includes('png') ||
      lowerName.endsWith('.png') ||
      rawDataUrl.startsWith('data:image/png');
    detectedType = isPngFile ? 'png' : 'jpg';
    compressedDataUrl = await compressImageDataUrlClient(
      rawDataUrl,
      isPngFile ? 'image/png' : lowerMime || 'image/jpeg',
      originalBytes,
      maxDimension,
      quality
    );
  } else if (lowerMime.startsWith('video/') || lowerName.endsWith('.mp4')) {
    detectedType = 'mp4';
  } else {
    detectedType = 'pdf';
  }

  const clientCompressedBytes = Math.min(
    originalBytes,
    estimateDataUrlBytes(compressedDataUrl)
  );

  if (uploadToServer) {
    try {
      const res = await fetch('/api/marketing-tools/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-skip-crud-alert': 'true',
        },
        body: JSON.stringify({
          dataUrl: compressedDataUrl,
          fileName: file.name,
          fileType: detectedType,
          originalByteSize: originalBytes,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success && json?.data?.hostedUrl) {
        const savedBytes = Math.min(
          originalBytes,
          Number(json.data.savedBytes) || clientCompressedBytes
        );
        return {
          dataUrl: compressedDataUrl,
          hostedUrl: json.data.hostedUrl,
          fileName: file.name,
          originalBytes,
          compressedBytes: savedBytes,
          originalFormattedSize,
          compressedFormattedSize: json.data.formattedSize || formatFileSize(savedBytes),
        };
      }
    } catch {
      // Fallback to client-compressed dataUrl if offline or server unreachable
    }
  }

  return {
    dataUrl: compressedDataUrl,
    hostedUrl: compressedDataUrl,
    fileName: file.name,
    originalBytes,
    compressedBytes: clientCompressedBytes,
    originalFormattedSize,
    compressedFormattedSize: formatFileSize(clientCompressedBytes),
  };
}
