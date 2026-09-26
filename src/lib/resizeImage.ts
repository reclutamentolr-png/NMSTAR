// Ridimensiona una foto nel browser prima del caricamento (lato lungo max
// `maxSide` px, JPEG): foto leggere per il menù e sotto il limite di 2 MB.
export async function resizeImageFile(file: File, maxSide = 1200, quality = 0.82): Promise<File | null> {
  if (!file.type.startsWith('image/')) return null
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return null
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : null
}
