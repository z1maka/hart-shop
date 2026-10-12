// Vercel caps a serverless request body at 4.5 MB, so a photo straight off a
// phone can be too large to reach the Server Action at all. Anything over the
// threshold is re-encoded in the browser first; the server still produces the
// final crops, this only makes the payload fit.
const MAX_UPLOAD_BYTES = 3_500_000
const MAX_EDGE_PIXELS = 2400
const WEBP_QUALITY = 0.9

export async function prepareUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file

  try {
    // imageOrientation applies the EXIF rotation before the canvas sees it —
    // canvas itself would drop the tag and leave phone photos sideways.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_EDGE_PIXELS / Math.max(bitmap.width, bitmap.height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    })

    if (!blob || blob.size >= file.size) return file

    return new File([blob], `${stripExtension(file.name)}.webp`, { type: 'image/webp' })
  } catch {
    // A format the browser cannot decode still deserves its trip to the server,
    // which will either handle it or say why it cannot.
    return file
  }
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}
