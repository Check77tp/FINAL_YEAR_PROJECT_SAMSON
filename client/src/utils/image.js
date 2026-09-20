// Phone cameras produce 4-10 MB photos. Uploading those over hostel Wi-Fi or
// mobile data is slow and the server caps images at 5 MB, so photos are
// downscaled and re-encoded as JPEG in the browser first. The result is
// typically 150-400 KB and still plenty sharp for "proof of work".
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

// -> Promise<string> data URL (image/jpeg)
export async function compressImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
