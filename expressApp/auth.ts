import fetch from 'node-fetch'

interface Credentials {
  client_id: string
  client_secret: string
  code: string
}

interface GitHubUser {
  name: string
  login: string
  avatar_url: string
  message: string
}

const requestGithubToken = (credentials: Credentials) =>
  fetch(`https://github.com/login/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(credentials),
  })
    .then((res) => res.json() as Promise<{ access_token: string }>)
    .catch((error) => {
      throw new Error(JSON.stringify(error))
    })

const requestGithubUserAccount = (token: string) =>
  fetch(`https://api.github.com/user`, { headers: { Authorization: `token ${token}` } })
    .then((res) => res.json() as Promise<GitHubUser>)
    .catch((error) => {
      throw new Error(JSON.stringify(error))
    })

export async function authorizeWithGithub(credentials: Credentials) {
  const { access_token } = await requestGithubToken(credentials)
  const githubUser = await requestGithubUserAccount(access_token)
  return { ...githubUser, access_token }
}
