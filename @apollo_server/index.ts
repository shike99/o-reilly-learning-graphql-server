import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { json } from 'body-parser'
import cors from 'cors'
import { config } from 'dotenv'
import express from 'express'
import { readFileSync } from 'fs'
import depthLimit from 'graphql-depth-limit'
import { createComplexityLimitRule } from 'graphql-validation-complexity'
import { useServer } from 'graphql-ws/lib/use/ws'
import { createServer } from 'http'
import { Db, MongoClient, WithId } from 'mongodb'
import { WebSocketServer } from 'ws'
import { resolvers } from './resolvers'
import { User } from './types/user'

config()

export interface PhotoShareContext {
  db: Db
  currentUser: WithId<User> | null
}

const path = '/graphql'

async function start() {
  const app = express()
  const DB_HOST = process.env.DB_HOST || ''
  const client = await MongoClient.connect(DB_HOST)
  const db = client.db()
  const httpServer = createServer(app)
  httpServer.timeout = 5000
  const wsServer = new WebSocketServer({
    server: httpServer,
    path,
  })

  const getContext: (githubToken?: string) => Promise<PhotoShareContext> = async (githubToken) => {
    const currentUser = await db.collection<User>('users').findOne({ githubToken })
    return { db, currentUser }
  }

  const typeDefs = readFileSync('./@apollo_server/schema.graphql', 'utf-8')
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const serverCleanup = useServer(
    {
      schema,
      context: async (context, message, args) => {
        if (context.connectionParams && context.connectionParams.Authorization) {
          const githubToken = context.connectionParams.Authorization as string
          return getContext(githubToken)
        }
        return { db, currentUser: null }
      },
    },
    wsServer
  )
  const server = new ApolloServer<PhotoShareContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose()
            },
          }
        },
      },
    ],
    validationRules: [
      depthLimit(5),
      createComplexityLimitRule(1000, {
        onCost: (cost) => console.log('query cost: ', cost),
      }),
    ],
  })

  await server.start()

  app.use(
    path,
    cors<cors.CorsRequest>(),
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const githubToken = req.headers.authorization
        return getContext(githubToken)
      },
    })
  )
  app.use('/img/photos', express.static('./assets/photos'))

  const port = 4000
  httpServer.listen({ port }, () => console.log(`🚀 GraphQL server running @ http://localhost:${port}${path}`))
}

start()
