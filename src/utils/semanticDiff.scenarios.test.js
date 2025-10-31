import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { semanticDiff } from './semanticDiff'

const scenariosRoot = path.resolve('test-data')

function getScenarioDirs(rootDir) {
  if (!fs.existsSync(rootDir)) return []
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

describe('semanticDiff scenarios', () => {
  const scenarios = getScenarioDirs(scenariosRoot)

  for (const name of scenarios) {
    const dir = path.join(scenariosRoot, name)
    const leftPath = path.join(dir, 'left.json')
    const rightPath = path.join(dir, 'right.json')
    const expectedPath = path.join(dir, 'expected.json')

    if (!fs.existsSync(leftPath) || !fs.existsSync(rightPath)) continue

    it(`scenario: ${name}`, () => {
      const left = JSON.parse(fs.readFileSync(leftPath, 'utf-8'))
      const right = JSON.parse(fs.readFileSync(rightPath, 'utf-8'))

      if (!fs.existsSync(expectedPath)) {
        throw new Error(`Missing expected.json for scenario "${name}" at ${expectedPath}`)
      }

      const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'))

      const result = semanticDiff(left, right)

      expect(result.delta ?? null).toEqual(expected)
    })
  }
})


