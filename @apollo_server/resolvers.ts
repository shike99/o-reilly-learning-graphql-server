import { GraphQLScalarType, Kind } from 'graphql'
import { PubSub } from 'graphql-subscriptions'
import fetch from 'node-fetch'
import { PhotoShareContext } from '.'
import { authorizeWithGithub } from './auth'
import { Photo, PhotoInput } from './types/photo'
import { User } from './types/user'

const pubsub = new PubSub()

export const resolvers = {
  Query: {
    me: (parent: Record<string, never>, args: Record<string, never>, { currentUser }: PhotoShareContext) => currentUser,
    totalPhotos: (parent: Record<string, never>, args: Record<string, never>, { db }: PhotoShareContext) =>
      db.collection<Photo>('photos').estimatedDocumentCount(),
    allPhotos: (parent: Record<string, never>, args: { after: Date }, { db }: PhotoShareContext) =>
      db.collection<Photo>('photos').find().toArray(),
    totalUsers: (parent: Record<string, never>, args: Record<string, never>, { db }: PhotoShareContext) =>
      db.collection<User>('users').estimatedDocumentCount(),
    allUsers: (parent: Record<string, never>, args: { after: Date }, { db }: PhotoShareContext) =>
      db.collection<User>('users').find().toArray(),
  },
  Mutation: {
    async postPhoto(
      parent: Record<string, never>,
      args: { input: PhotoInput },
      { db, currentUser }: PhotoShareContext
    ) {
      // 1. コンテキストにユーザーがいなければエラーを投げる
      if (!currentUser) {
        throw new Error('only an authorized user can post a photo')
      }

      // 2. 現在のユーザーのIDとphotoを保存する
      const newPhoto = {
        ...args.input,
        userID: currentUser.githubLogin,
        created: new Date(),
      }

      // 3. 新しいphotoを追加して、データベースが生成したIDを取得する
      const { insertedId } = await db.collection<PhotoInput>('photos').insertOne(newPhoto)

      pubsub.publish('photo-added', { newPhoto })

      return { ...newPhoto, id: insertedId }
    },
    async githubAuth(parent: Record<string, never>, { code }: { code: string }, { db }: PhotoShareContext) {
      // 1. GitHubからデータを取得する
      const { message, access_token, avatar_url, login, name } = await authorizeWithGithub({
        client_id: process.env.GITHUB_CLIENT_ID || '',
        client_secret: process.env.GITHUB_CLIENT_SECRET || '',
        code,
      })

      // 2. メッセージがある場合は何らかのエラーが発生している
      if (message) {
        throw new Error(message)
      }

      // 3. データをひとつのオブジェクトにまとめる
      const latestUserInfo = {
        name,
        githubLogin: login,
        githubToken: access_token,
        avatar: avatar_url,
      }

      // 4. 新しい情報をもとにレコードを追加したり更新する
      const { value } = await db
        .collection<User>('users')
        .findOneAndReplace({ githubLogin: login }, latestUserInfo, { upsert: true })

      // 5. ユーザーデータとトークンを返す
      return { user: value, token: access_token }
    },
    addFakeUsers: async (root: Record<string, never>, { count }: { count: number }, { db }: PhotoShareContext) => {
      interface FakeUser {
        login: { username: string; sha1: string }
        name: { first: string; last: string }
        picture: { thumbnail: string }
      }
      const randomUserApi = `https://randomuser.me/api/?results=${count}`
      const { results } = await fetch(randomUserApi).then((res) => res.json() as Promise<{ results: Array<FakeUser> }>)

      const users = results.map(({ login, name, picture }) => ({
        githubLogin: login.username,
        name: `${name.first} ${name.last}`,
        avatar: picture.thumbnail,
        githubToken: login.sha1,
      }))

      await db.collection<User>('users').insertMany(users)

      return users
    },
    async fakeUserAuth(
      parent: Record<string, never>,
      { githubLogin }: { githubLogin: string },
      { db }: PhotoShareContext
    ) {
      const user = await db.collection<User>('users').findOne({ githubLogin })

      if (!user) {
        throw new Error(`Cannot find user with githubLogin '${githubLogin}'`)
      }

      return {
        token: user.githubToken,
        user,
      }
    },
  },
  Subscription: {
    newPhoto: {
      subscribe: () => pubsub.asyncIterator(['photo-added']),
    },
  },
  Photo: {
    id: (parent: Photo) => parent.id || parent._id,
    url: (parent: Photo) => `http://yoursite.com/img/${parent.id}.jpg`,
    postedBy: (parent: Photo, args: Record<string, never>, { db }: PhotoShareContext) =>
      db.collection<User>('users').findOne({ githubLogin: parent.userID }),
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
