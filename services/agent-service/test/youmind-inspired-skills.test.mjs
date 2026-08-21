import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const skillsDir = join(__dirname, '..', 'scripts', 'seed-skills')

const expectedSkills = [
  'active-reading-coach',
  'argument-mapper',
  'case-study-writer',
  'courseware-storyboard',
  'editorial-cover-director',
  'feature-interview-writer',
  'interview-synthesis',
  'longform-to-social',
  'meeting-to-decisions',
  'professional-deck-planner',
  'situation-puzzle-host',
  'talent-evidence-coach',
  'topic-miner',
]

const forbiddenDependencies = [
  /YOUMIND_API_KEY/i,
  /@youmind-ai\/cli/i,
  /youmind\s+call/i,
  /npm\s+install/i,
  /pnpm\s+add/i,
  /\bnpx\b/i,
  /\bcurl\b/i,
]

test('YouMind-inspired preset skills are original and dependency-free', () => {
  for (const name of expectedSkills) {
    const content = readFileSync(join(skillsDir, `${name}.md`), 'utf8')

    assert.match(content, new RegExp(`^---\\nname: ${name}\\n`))
    assert.match(content, /description: "[^"\n]+"/)
    assert.match(content, /license: Original Telos implementation/)
    assert.match(content, /homepage: https:\/\/youmind\.com\/zh-CN\/skills/)
    assert.ok(content.split('\n').length >= 25, `${name} is unexpectedly thin`)

    for (const pattern of forbiddenDependencies) {
      assert.doesNotMatch(content, pattern, `${name} contains ${pattern}`)
    }
  }
})
