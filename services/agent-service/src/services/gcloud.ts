import { GoogleAuth } from 'google-auth-library'
import { config } from '../config/index.js'

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
const googleAuth = new GoogleAuth({ scopes: [CLOUD_PLATFORM_SCOPE] })
let authClientPromise: ReturnType<GoogleAuth['getClient']> | undefined

function getGoogleAuthClient() {
  authClientPromise ??= googleAuth.getClient()
  return authClientPromise
}

export async function getGcloudProjectId(): Promise<string> {
  if (config.gcloudProjectId) return config.gcloudProjectId

  try {
    const projectId = await googleAuth.getProjectId()
    if (projectId) return projectId
  } catch {
    // Fall through to the configuration-focused error below.
  }

  throw new Error(
    'GCLOUD_PROJECT_ID is required for Google Gemini models. Set GCLOUD_PROJECT_ID or provide an ADC credential with a project ID.'
  )
}

export async function getGcloudAccessToken(): Promise<string> {
  if (config.gcloudAccessToken) return config.gcloudAccessToken

  try {
    const client = await getGoogleAuthClient()
    const accessToken = await client.getAccessToken()
    const token =
      typeof accessToken === 'string' ? accessToken : accessToken?.token
    if (token) return token
  } catch (error) {
    throw new Error(
      `Failed to obtain a Google Cloud access token from Application Default Credentials: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  throw new Error(
    'Google Cloud Application Default Credentials did not return an access token.'
  )
}

export async function getGcloudOpenAIBaseUrl(): Promise<string> {
  const projectId = await getGcloudProjectId()
  const location = config.gcloudChatLocation
  const host =
    location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`

  return `${host}/v1/projects/${projectId}/locations/${location}/endpoints/openapi`
}
