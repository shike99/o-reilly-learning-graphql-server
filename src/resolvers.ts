import { photos } from '@/data/photos'
import { tags } from '@/data/tags'
import { users } from '@/data/users'
import { GraphQLScalarType, Kind } from 'graphql'
import { Photo, PhotoInput } from './types/photo'
import { User } from './types/user'

let id = photos.length + 1

export const resolvers = {
  Query: {
    totalPhotos: () => photos.length,
    allPhotos: (parent: Record<string, never>, args: { after: Date }) => {
      console.log(args.after)
      return photos
    },
  },
  Mutation: {
    postPhoto(parent: Record<string, never>, args: { input: PhotoInput }) {
      const newPhoto: Photo = {
        ...args.input,
        id: `${id++}`,
        created: new Date().toString(),
      }
      photos.push(newPhoto)
      return newPhoto
    },
  },
  Photo: {
    url: (parent: Photo) => `http://yoursite.com/img/${parent.id}.jpg`,
    postedBy: (parent: Photo) => users.find((user) => user.githubLogin === parent.githubUser),
    taggedUsers: (parent: Photo) =>
      tags
        .filter((tag) => tag.photoID === parent.id)
        .map((tag) => users.find((user) => user.githubLogin === tag.userID)),
  },
  User: {
    postedPhotos: (parent: User) => photos.filter((photo) => photo.githubUser === parent.githubLogin),
    inPhotos: (parent: User) =>
      tags
        .filter((tag) => tag.userID === parent.githubLogin)
        .map((tag) => photos.find((photo) => photo.id === tag.photoID)),
  },
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'A valid date time value.',
    parseValue: (value) => new Date(value as string),
    serialize: (value) => new Date(value as string).toISOString(),
    parseLiteral: (ast) => {
      switch (ast.kind) {
        case Kind.STRING:
          return new Date(ast.value)
        default:
          return null
      }
    },
  }),
}
