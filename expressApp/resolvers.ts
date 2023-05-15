import { GraphQLScalarType, Kind } from 'graphql'
import { Db } from 'mongodb'
import fetch from 'node-fetch'
import { Photo, PhotoInput } from './types/photo'
import { User } from './types/user'
import { authorizeWithGithub } from './auth'

interface Context {
  db: Db
  currentUser: User
}

export const resolvers = {
  Query: {
    me: (parent: Record<string, never>, args: Record<string, never>, { currentUser }: Context) => currentUser,
    totalPhotos: (parent: Record<string, never>, args: Record<string, never>, { db }: Context) =>
      db.collection('photos').estimatedDocumentCount(),
    allPhotos: (parent: Record<string, never>, args: { after: Date }, { db }: Context) =>
      db.collection('photos').find().toArray(),
    totalUsers: (parent: Record<string, never>, args: Record<string, never>, { db }: Context) =>
      db.collection('users').estimatedDocumentCount(),
    allUsers: (parent: Record<string, never>, args: { after: Date }, { db }: Context) =>
      db.collection('users').find().toArray(),
  },
  Mutation: {
    async postPhoto(parent: Record<string, never>, args: { input: PhotoInput }, { db, currentUser }: Context) {
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

      return { ...newPhoto, id: insertedId }
    },
    async githubAuth(parent: Record<string, never>, { code }: { code: string }, { db }: Context) {
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
    addFakeUsers: async (root: Record<string, never>, { count }: { count: number }, { db }: Context) => {
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
    async fakeUserAuth(parent: Record<string, never>, { githubLogin }: { githubLogin: string }, { db }: Context) {
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
  Photo: {
    id: (parent: Photo) => parent.id || parent._id,
    url: (parent: Photo) => `http://yoursite.com/img/${parent.id}.jpg`,
    postedBy: (parent: Photo, args: Record<string, never>, { db }: Context) =>
      db.collection<User>('users').findOne({ githubLogin: parent.userID }),
    // taggedUsers: (parent: Photo) =>
    //   tags
    //     .filter((tag) => tag.photoID === parent.id)
    //     .map((tag) => users.find((user) => user.githubLogin === tag.userID)),
  },
  User: {
    // postedPhotos: (parent: User) => photos.filter((photo) => photo.githubUser === parent.githubLogin),
    // inPhotos: (parent: User) =>
    //   tags
    //     .filter((tag) => tag.userID === parent.githubLogin)
    //     .map((tag) => photos.find((photo) => photo.id === tag.photoID)),
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
