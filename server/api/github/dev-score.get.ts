import { githubSdk } from '~/server/utils/github'
import { cached } from '~/server/utils/cache'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const username = query.username as string
  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'Missing username' })
  }

  const since =
    (query.since as string) ||
    new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()
  const until = (query.until as string) || new Date().toISOString()

  return cached(`devscore:${username}:${since}:${until}`, async () => {
    const prData = await githubSdk.BigRepoPullRequests({ username, since, until })
    const commitData = await githubSdk.BigRepoCommits({ username, since, until })
    const issueData = await githubSdk.BigRepoIssues({ username, since, until })

    const isBigRepo = (repo: { stargazerCount: number; forkCount: number }) =>
      repo.stargazerCount >= 1000 || repo.forkCount >= 100

    const prContributions =
      prData.user?.pullRequests?.nodes?.filter((pr: any) =>
        isBigRepo(pr.repository)
      ) || []
    const commitContributions =
      commitData.user?.contributionsCollection?.commitContributionsByRepository?.filter(
        (c: any) => isBigRepo(c.repository)
      ) || []
    const issueContributions =
      issueData.user?.issues?.nodes?.filter((i: any) =>
        isBigRepo(i.repository)
      ) || []

    const contributionCount =
      prContributions.length +
      commitContributions.reduce(
        (a: number, c: any) => a + (c.contributions.totalCount || 0),
        0
      ) +
      issueContributions.length

    const repoStarsWeighted =
      prContributions.reduce(
        (a: number, pr: any) => a + pr.repository.stargazerCount,
        0
      ) +
      commitContributions.reduce(
        (a: number, c: any) =>
          a + c.repository.stargazerCount * c.contributions.totalCount,
        0
      ) +
      issueContributions.reduce(
        (a: number, i: any) => a + i.repository.stargazerCount,
        0
      )

    const score =
      1 * 40 +
      Math.log1p(contributionCount) * 30 +
      Math.log1p(repoStarsWeighted) * 30

    return {
      username,
      score: Number(score.toFixed(2)),
      contributions: [
        ...prContributions.map((pr: any) => ({
          repo: pr.repository.nameWithOwner,
          stars: pr.repository.stargazerCount,
          forks: pr.repository.forkCount,
          prCount: 1,
          directCommits: 0,
          issueCount: 0
        })),
        ...commitContributions.map((c: any) => ({
          repo: c.repository.nameWithOwner,
          stars: c.repository.stargazerCount,
          forks: c.repository.forkCount,
          prCount: 0,
          directCommits: c.contributions.totalCount,
          issueCount: 0
        })),
        ...issueContributions.map((i: any) => ({
          repo: i.repository.nameWithOwner,
          stars: i.repository.stargazerCount,
          forks: i.repository.forkCount,
          prCount: 0,
          directCommits: 0,
          issueCount: 1
        }))
      ]
    }
  }, 86400)
})
