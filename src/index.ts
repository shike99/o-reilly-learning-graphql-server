import { ApolloServer } from 'apollo-server'
import { readFileSync } from 'fs'
// import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const typeDefs = readFileSync('./src/schema.graphql', 'utf-8')
const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => console.log(`🚀 GraphQL server running on ${url}`))
