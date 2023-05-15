import express from 'express'
import expressPlayground from 'graphql-playground-middleware-express'
import { ApolloServer } from 'apollo-server-express'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolvers } from './resolvers'

config()

async function start() {
  const app = express()
  const DB_HOST = process.env.DB_HOST || ''
  const client = await MongoClient.connect(DB_HOST)
  const db = client.db()

  const typeDefs = readFileSync('./expressApp/schema.graphql', 'utf-8')
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const githubToken = req.headers.authorization
      const currentUser = await db.collection('users').findOne({ githubToken })
      return { db, currentUser }
    },
  })

  await server.start()
  server.applyMiddleware({ app })

  app.get('/', (req, res) => res.end('Welcome to the PhotoShare API'))
  app.get('/playground', expressPlayground({ endpoint: '/graphql' }))

  app.listen({ port: 4000 }, () =>
    console.log(`🚀 GraphQL server running @ http://localhost:4000${server.graphqlPath}`)
  )
}

start()
