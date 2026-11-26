import QRCode from 'qrcode';

export const DEFAULT_BARCODE_LOGO_URL = '/assets/aistudio/logo_kotak_5ecb05e4.png';

export interface BrandedQrOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  logoUrl?: string | null;
}

const loadedImageCache = new Map<string, HTMLImageElement>();

async function loadImageForCanvas(srcUrl: string): Promise<HTMLImageElement | null> {
  const key = String(srcUrl || '').trim();
  if (!key || typeof window === 'undefined') return null;

  const cached = loadedImageCache.get(key);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }

  const loadViaImg = (url: string, withCors: boolean) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (withCors && !url.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        if ((img.naturalWidth || img.width) > 0) {
          resolve(img);
        } else {
          reject(new Error('Image has zero dimensions'));
        }
      };
      img.onerror = (err) => reject(err);
      img.src = url;
    });

  try {
    const img = await loadViaImg(key, true);
    loadedImageCache.set(key, img);
    return img;
  } catch {
    try {
      const res = await fetch(key);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (!dataUrl) return null;
      const img = await loadViaImg(dataUrl, false);
      loadedImageCache.set(key, img);
      return img;
    } catch {
      return null;
    }
  }
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Generates a high-error-correction (Level H — 30% redundancy) QR Code PNG data URL
 * with the ND logo cleanly centered inside a crisp white rounded frame so every QR code
 * remains 100% scannable across web, print, and PDF exports.
 */
export async function generateQrWithLogoDataUrl(
  content: string,
  options: BrandedQrOptions = {}
): Promise<string> {
  const width = options.width ?? 480;
  const margin = options.margin ?? 1;
  const darkColor = options.darkColor ?? '#092147';
  const lightColor = options.lightColor ?? '#FFFFFF';

  if (typeof document === 'undefined') {
    return QRCode.toDataURL(content, {
      width,
      margin,
      errorCorrectionLevel: 'H',
      color: { dark: darkColor, light: lightColor },
    });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;

  await QRCode.toCanvas(canvas, content, {
    width,
    margin,
    errorCorrectionLevel: 'H',
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });

  const requestedLogo = String(options.logoUrl || '').trim();
  const primarySrc = requestedLogo || DEFAULT_BARCODE_LOGO_URL;
  let logoImg = await loadImageForCanvas(primarySrc);
  if (!logoImg && primarySrc !== DEFAULT_BARCODE_LOGO_URL) {
    logoImg = await loadImageForCanvas(DEFAULT_BARCODE_LOGO_URL);
  }

  if (logoImg) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const qrSize = canvas.width;
      // 25% linear size = ~6.25% total QR area, comfortably within H-level 30% recovery limit
      const badgeSize = Math.round(qrSize * 0.25);
      const badgeX = Math.round((qrSize - badgeSize) / 2);
      const badgeY = Math.round((qrSize - badgeSize) / 2);
      const badgeRadius = Math.max(4, Math.round(badgeSize * 0.2));

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // White quiet-zone frame around centered logo
      drawRoundedRectPath(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeRadius);
      ctx.fillStyle = lightColor;
      ctx.fill();

      // Subtle hairline border to separate badge cleanly from adjacent QR modules
      ctx.lineWidth = Math.max(1.5, qrSize * 0.004);
      ctx.strokeStyle = 'rgba(9, 33, 71, 0.14)';
      ctx.stroke();

      // Proportionally fit logo inside badge with crisp inner margin
      const innerPad = Math.max(2, Math.round(badgeSize * 0.08));
      const maxLogoDim = badgeSize - innerPad * 2;
      const natW = logoImg.naturalWidth || logoImg.width || 1;
      const natH = logoImg.naturalHeight || logoImg.height || 1;
      const aspect = natW / Math.max(1, natH);

      let drawW = maxLogoDim;
      let drawH = maxLogoDim;
      if (aspect > 1) {
        drawH = maxLogoDim / aspect;
      } else if (aspect < 1) {
        drawW = maxLogoDim * aspect;
      }

      const drawX = badgeX + (badgeSize - drawW) / 2;
      const drawY = badgeY + (badgeSize - drawH) / 2;

      ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  }

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return QRCode.toDataURL(content, {
      width,
      margin,
      errorCorrectionLevel: 'H',
      color: { dark: darkColor, light: lightColor },
    });
  }
}
