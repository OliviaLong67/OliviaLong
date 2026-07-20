import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import express, { type ErrorRequestHandler } from 'express'
import multer from 'multer'

const app = express()
const port = Number(process.env.PORT) || 4173
const isProduction = process.env.NODE_ENV === 'production'
const rootDirectory = process.cwd()
const uploadDirectory = path.join(rootDirectory, 'uploads')

await mkdir(uploadDirectory, { recursive: true })

const allowedExtensions = new Set([
  '.avi', '.doc', '.docx', '.eml', '.heic', '.jpeg', '.jpg', '.m4a', '.mov',
  '.mp3', '.mp4', '.msg', '.pdf', '.png', '.tif', '.tiff', '.txt', '.wav',
  '.webp',
])

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${randomUUID()}${extension}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const hasSupportedMimeType =
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('word') ||
      file.mimetype.includes('officedocument') ||
      file.mimetype === 'message/rfc822' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/octet-stream'

    callback(null, allowedExtensions.has(extension) && hasSupportedMimeType)
  },
})

app.disable('x-powered-by')
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  next()
})

app.post('/api/uploads', upload.array('files', 20), (request, response) => {
  const files = request.files as Express.Multer.File[]

  if (!files?.length) {
    response.status(400).json({ error: 'No supported files were provided.' })
    return
  }

  response.status(201).json({
    files: files.map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${encodeURIComponent(file.filename)}`,
    })),
  })
})

app.use('/uploads', express.static(uploadDirectory, {
  immutable: true,
  maxAge: '1y',
}))

if (isProduction) {
  const distributionDirectory = path.join(rootDirectory, 'dist')
  app.use(express.static(distributionDirectory))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || !request.accepts('html')) {
      next()
      return
    }

    response.sendFile(path.join(distributionDirectory, 'index.html'))
  })
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each file must be 25 MB or smaller.'
      : error.message
    response.status(400).json({ error: message })
    return
  }

  console.error(error)
  response.status(500).json({ error: 'The upload could not be completed.' })
}

app.use(errorHandler)

app.listen(port, () => {
  console.log(`RFI Assistant listening on http://localhost:${port}`)
})
