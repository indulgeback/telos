import { execFileSync } from 'node:child_process'
import { config } from '../config/index.js'

function runGcloud(args: string[]) {
  return execFileSync('gcloud', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

export function getGcloudProjectId() {
  const projectId =
    config.gcloudProjectId || runGcloud(['config', 'get-value', 'project'])
  if (!projectId || projectId === '(unset)' || projectId === 'None') {
    throw new Error(
      'GCLOUD_PROJECT_ID is required for Google Gemini models. Set GCLOUD_PROJECT_ID or run: gcloud config set project <project-id>'
    )
  }
  return projectId
}

export function getGcloudAccessToken() {
  const token =
    config.gcloudAccessToken || runGcloud(['auth', 'print-access-token'])
  if (!token) {
    throw new Error(
      'Google Cloud access token is required for Gemini models. Run: gcloud auth login'
    )
  }
  return token
}

export function getGcloudOpenAIBaseUrl() {
  const projectId = getGcloudProjectId()
  const location = config.gcloudLocation || 'global'
  const host =
    location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`

  return `${host}/v1/projects/${projectId}/locations/${location}/endpoints/openapi`
}
