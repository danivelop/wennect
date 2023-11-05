import 'module-alias/register'

import express, { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import https from 'https'
import path from 'path'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import hpp from 'hpp'
import cors from 'cors'

import logger from '@/logger'
import HttpError from '@/models/HttpError'

async function runServer() {
  const options = {
    key: fs.readFileSync(
      path.join(__dirname, '..', 'private/192.168.45.6-key.pem')
    ),
    cert: fs.readFileSync(
      path.join(__dirname, '..', 'private/192.168.45.6.pem')
    ),
  }

  const app = express()
  const server = https.createServer(options, app)
  const { PORT: port = 4000 } = process.env

  if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'))
    app.use(helmet())
    app.use(hpp())
    app.use(cors({ origin: 'https://danivelop.com' }))
  } else {
    app.use(morgan('dev'))
    app.use(cors({ origin: '*' }))
  }

  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser(process.env.COOKIE_SECRET))

  app.use('/', (req, res) => {
    res.send('hello world')
  })

  app.use((req: Request, res: Response, next: NextFunction) => {
    const error = new HttpError('Not Found', 404)
    next(error)
  })

  app.use(
    (error: HttpError, req: Request, res: Response, next: NextFunction) => {
      logger.error(error.message)
      return res.status(error.status || 500).send({
        message: error.message ?? 'An unknown error occurred.',
      })
    }
  )

  server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
  })
}

runServer()
  .then(() => {
    logger.info('run successfully')
  })
  .catch((ex: Error) => {
    logger.error('Unable run:', ex)
  })
