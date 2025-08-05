import { GraphQLClient } from 'graphql-request'
import { getSdk } from '~/types/github'

const client = new GraphQLClient('https://api.github.com/graphql', {
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
  }
})

export const githubSdk = getSdk(client)
