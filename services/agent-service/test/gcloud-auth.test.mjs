import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Google Cloud authentication', () => {
  it('uses configured credentials without requiring the gcloud CLI', () => {
    const moduleUrl = pathToFileURL(
      path.resolve('dist/services/gcloud.js')
    ).href
    const script = `
      process.env.GCLOUD_PROJECT_ID = 'telos-test-project'
      process.env.GCLOUD_ACCESS_TOKEN = 'test-access-token'
      const auth = await import(${JSON.stringify(moduleUrl)})
      console.log('GCLOUD_AUTH_RESULT=' + JSON.stringify({
        projectId: await auth.getGcloudProjectId(),
        accessToken: await auth.getGcloudAccessToken(),
        baseUrl: await auth.getGcloudOpenAIBaseUrl(),
      }))
    `
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', script],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, PATH: '' },
      }
    )

    assert.equal(result.status, 0, result.stderr)
    const outputLine = result.stdout
      .split('\n')
      .find(line => line.startsWith('GCLOUD_AUTH_RESULT='))
    assert.ok(outputLine, result.stdout)
    assert.deepEqual(
      JSON.parse(outputLine.slice('GCLOUD_AUTH_RESULT='.length)),
      {
        projectId: 'telos-test-project',
        accessToken: 'test-access-token',
        baseUrl:
          'https://aiplatform.googleapis.com/v1/projects/telos-test-project/locations/global/endpoints/openapi',
      }
    )
  })
})
