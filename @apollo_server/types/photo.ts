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

export type PhotoInput = Omit<Photo, 'id'>
