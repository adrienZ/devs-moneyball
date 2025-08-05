import { GraphQLClient } from 'graphql-request'

const USER_AGENT = process.env.GITHUB_USER_AGENT ?? 'devs-moneyball'

export const githubClient = new GraphQLClient('https://api.github.com/graphql', {
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': USER_AGENT,
  },
})
