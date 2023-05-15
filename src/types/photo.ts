export enum PhotoCategory {
  SELFIE = 'SELFIE',
  PORTRAIT = 'PORTRAIT',
  ACTION = 'ACTION',
  LANDSCAPE = 'LANDSCAPE',
  GRAPHIC = 'GRAPHIC',
}

export interface Photo {
  id: string
  name: string
  description?: string
  category: PhotoCategory
  githubUser: string
  created: string
}

export type PhotoInput = Omit<Photo, 'id'>
