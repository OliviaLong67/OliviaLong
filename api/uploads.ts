import { randomUUID } from 'node:crypto'
import path from 'node:path'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const MAX_FILES = 20

const allowedExtensions = new Set([
  '.avi', '.doc', '.docx', '.eml', '.heic', '.jpeg', '.jpg', '.m4a', '.mov',
  '.mp3', '.mp4', '.msg', '.pdf', '.png', '.tif', '.tiff', '.txt', '.wav',
  '.webp',
])

const isSupportedType = (file: File) => {
  const extension = path.extname(file.name).toLowerCase()
  const hasSupportedMimeType =
    file.type.startsWith('image/') ||
    file.type.startsWith('audio/') ||
    file.type.startsWith('video/') ||
    file.type === 'application/pdf' ||
    file.type.includes('word') ||
    file.type.includes('officedocument') ||
    file.type === 'message/rfc822' ||
    file.type === 'text/plain' ||
    file.type === 'application/octet-stream'

  return allowedExtensions.has(extension) && hasSupportedMimeType
}

const hasValidImageSignature = async (file: File) => {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') return true

  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (file.type === 'image/jpeg') {
    return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
  }

  return signature.length === 8 &&
    signature[0] === 0x89 &&
    signature[1] === 0x50 &&
    signature[2] === 0x4e &&
    signature[3] === 0x47 &&
    signature[4] === 0x0d &&
    signature[5] === 0x0a &&
    signature[6] === 0x1a &&
    signature[7] === 0x0a
}

const json = (body: unknown, status: number) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
})

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405)
    }

    try {
      const formData = await request.formData()
      const files = formData.getAll('files').filter((value): value is File => value instanceof File)

      if (!files.length) {
        return json({ error: 'No supported files were provided.' }, 400)
      }

      if (files.length > MAX_FILES) {
        return json({ error: `A maximum of ${MAX_FILES} files can be uploaded at once.` }, 400)
      }

      for (const file of files) {
        if (!isSupportedType(file)) {
          return json({ error: `${file.name} is not a supported file type.` }, 400)
        }

        if (file.size > MAX_FILE_SIZE) {
          return json({ error: 'Each file must be 4 MB or smaller.' }, 400)
        }

        if (!await hasValidImageSignature(file)) {
          return json({ error: `${file.name} is not a valid image.` }, 400)
        }
      }

      return json({
        files: files.map((file) => ({
          originalName: file.name,
          uploadId: randomUUID(),
          mimeType: file.type,
          size: file.size,
        })),
      }, 201)
    } catch {
      return json({ error: 'The upload could not be completed.' }, 400)
    }
  },
}
