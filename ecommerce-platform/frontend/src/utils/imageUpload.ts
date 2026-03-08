const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_OUTPUT_QUALITY = 0.82;
const DEFAULT_OUTPUT_TYPE = "image/jpeg";

export const MAX_PRODUCT_UPLOAD_BYTES = 20 * 1024 * 1024;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("IMAGE_READ_FAILED"));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = src;
  });

const scaleDimensions = (width: number, height: number, maxDimension: number) => {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const scale = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const estimateDataUrlBytes = (dataUrl: string) => {
  const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

export async function optimizeImageForUpload(file: File): Promise<string> {
  const originalDataUrl = await readFileAsDataUrl(file);

  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const { width, height } = scaleDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    DEFAULT_MAX_DIMENSION
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return originalDataUrl;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const optimizedDataUrl = canvas.toDataURL(DEFAULT_OUTPUT_TYPE, DEFAULT_OUTPUT_QUALITY);
  return optimizedDataUrl.length < originalDataUrl.length ? optimizedDataUrl : originalDataUrl;
}
