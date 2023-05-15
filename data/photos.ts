import { Photo, PhotoCategory } from '@/src/types/photo'

export const photos: Photo[] = [
  {
    id: '1',
    name: 'Dropping the Heart Chute',
    description: 'The heart chute is one of my favorite chutes',
    category: PhotoCategory.ACTION,
    githubUser: 'gPlake',
    created: '3-28-1977',
  },
  {
    id: '2',
    name: 'Enjoying the sunshine',
    category: PhotoCategory.SELFIE,
    githubUser: 'sSchmidt',
    created: '1-2-1985',
  },
  {
    id: '3',
    name: 'Gunbarrel 25',
    description: '25 laps on gunbarrel today',
    category: PhotoCategory.LANDSCAPE,
    githubUser: 'sSchmidt',
    created: '2018-04-15T19:09:57.308Z',
  },
]
