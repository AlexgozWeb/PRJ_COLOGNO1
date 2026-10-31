// Compressione e rotazione delle immagini nel browser, prima dell'upload

const MAX_SIDE = 2000
const JPEG_QUALITY = 0.8

export function isImage(file: File): boolean {
  return file.type === "image/jpeg" || file.type === "image/png"
}

async function loadSource(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" })
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      // si ripiega sull'elemento <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Conversione immagine non riuscita"))), type, quality)
  )
}

function renameExt(name: string, ext: string): string {
  return name.replace(/\.[^.]+$/, "") + ext
}

// Ridimensiona (lato lungo max 2000 px) e ricodifica in JPEG. Se il risultato non è più leggero
// dell'originale, restituisce l'originale.
export async function compressImage(file: File): Promise<File> {
  if (!isImage(file)) return file
  const src = await loadSource(file)
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(src.width, src.height))
    const w = Math.max(1, Math.round(src.width * scale))
    const h = Math.max(1, Math.round(src.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.fillStyle = "#ffffff" // il JPEG non supporta la trasparenza
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(src.source, 0, 0, w, h)
    const blob = await toBlob(canvas, "image/jpeg", JPEG_QUALITY)
    if (blob.size >= file.size) return file
    return new File([blob], renameExt(file.name, ".jpg"), { type: "image/jpeg", lastModified: Date.now() })
  } finally {
    src.close()
  }
}

// Ruota di 90° (orario: 90, antiorario: -90) mantenendo il formato
export async function rotateImage(file: File, degrees: 90 | -90): Promise<File> {
  if (!isImage(file)) return file
  const src = await loadSource(file)
  try {
    const canvas = document.createElement("canvas")
    canvas.width = src.height
    canvas.height = src.width
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((degrees * Math.PI) / 180)
    ctx.drawImage(src.source, -src.width / 2, -src.height / 2)
    const isPng = file.type === "image/png"
    const blob = isPng ? await toBlob(canvas, "image/png") : await toBlob(canvas, "image/jpeg", JPEG_QUALITY)
    return new File([blob], file.name, { type: blob.type, lastModified: Date.now() })
  } finally {
    src.close()
  }
}
