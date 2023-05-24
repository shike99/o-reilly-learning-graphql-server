import { Stream } from 'stream'

export type PhotoCategory = 'SELFIE' | 'PORTRAIT' | 'ACTION' | 'LANDSCAPE' | 'GRAPHIC'

export interface Photo {
  id: string
  _id: string
  name: string
  description?: string
  category: PhotoCategory
  userID: string
  created: Date
}

interface FileUpload {
  filename: string
  mimetype: string
  encoding: string
  createReadStream(): Stream
}

export type PhotoInput = Omit<Photo, 'id'> & { file: Promise<FileUpload> }
