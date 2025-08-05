import { defineEventHandler } from 'h3'
import { githubSdk } from '~/server/utils/github'

export default defineEventHandler(async () => {
  const data = await githubSdk.TopParisDevs()
  return data.search.edges?.map((edge) => edge?.node) || []
})
