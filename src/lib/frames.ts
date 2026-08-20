/** Imagen lista para enviar a la API, en base64 sin la cabecera `data:`. */
export interface Frame {
  media_type: 'image/jpeg'
  data: string
}

/** Lado largo máximo: por encima de esto el texto ya se lee bien y solo encarece. */
const MAX_SIDE = 1400
const JPEG_QUALITY = 0.8
/** Tope de fotogramas por vídeo, para acotar el coste de una grabación larga. */
const MAX_FRAMES = 16
/** Segundos mínimos entre fotogramas. */
const MIN_STEP = 0.6
/** Diferencia media por píxel (0-255) por debajo de la cual dos fotogramas son el mismo. */
const SAME_FRAME = 5

const toJpeg = (canvas: HTMLCanvasElement): Frame => ({
  media_type: 'image/jpeg',
  data: canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1],
})

const drawScaled = (source: CanvasImageSource, width: number, height: number) => {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Huella en escala de grises de 16×16 para detectar fotogramas repetidos. */
const signature = (canvas: HTMLCanvasElement) => {
  const small = document.createElement('canvas')
  small.width = 16
  small.height = 16
  const context = small.getContext('2d')!
  context.drawImage(canvas, 0, 0, 16, 16)
  const { data } = context.getImageData(0, 0, 16, 16)
  const grey = new Uint8Array(256)
  for (let i = 0; i < 256; i += 1) {
    grey[i] = (data[i * 4] * 3 + data[i * 4 + 1] * 6 + data[i * 4 + 2]) / 10
  }
  return grey
}

const isRepeat = (a: Uint8Array, b: Uint8Array) => {
  let total = 0
  for (let i = 0; i < a.length; i += 1) total += Math.abs(a[i] - b[i])
  return total / a.length < SAME_FRAME
}

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se ha podido abrir la imagen'))
    image.src = URL.createObjectURL(file)
  })

const loadVideo = (file: File) =>
  new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadeddata = () => resolve(video)
    video.onerror = () => reject(new Error('No se ha podido abrir el vídeo'))
    video.src = URL.createObjectURL(file)
  })

const seek = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve) => {
    video.onseeked = () => resolve()
    video.currentTime = time
  })

/**
 * Convierte una foto o una grabación de pantalla en fotogramas listos para leer.
 * En un vídeo se muestrea a intervalos regulares y se descartan los fotogramas
 * casi idénticos, que es lo que pasa mientras no se hace scroll.
 */
export const framesFromFile = async (
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<Frame[]> => {
  if (file.type.startsWith('image/')) {
    const image = await loadImage(file)
    const frame = toJpeg(drawScaled(image, image.naturalWidth, image.naturalHeight))
    URL.revokeObjectURL(image.src)
    return [frame]
  }

  if (!file.type.startsWith('video/')) throw new Error('El archivo no es una foto ni un vídeo')

  const video = await loadVideo(file)
  const { duration, videoWidth, videoHeight } = video
  if (!duration || !Number.isFinite(duration)) throw new Error('El vídeo no tiene duración conocida')

  const step = Math.max(MIN_STEP, duration / MAX_FRAMES)
  const times: number[] = []
  for (let time = 0; time < duration && times.length < MAX_FRAMES; time += step) times.push(time)

  const frames: Frame[] = []
  let previous: Uint8Array | null = null
  for (const [index, time] of times.entries()) {
    await seek(video, time)
    const canvas = drawScaled(video, videoWidth, videoHeight)
    const current = signature(canvas)
    if (!previous || !isRepeat(previous, current)) {
      frames.push(toJpeg(canvas))
      previous = current
    }
    onProgress?.(index + 1, times.length)
  }

  URL.revokeObjectURL(video.src)
  if (frames.length === 0) throw new Error('No se ha podido leer ningún fotograma del vídeo')
  return frames
}
