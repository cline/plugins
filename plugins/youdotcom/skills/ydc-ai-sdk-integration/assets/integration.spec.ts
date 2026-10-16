import { describe, expect, test } from 'bun:test'

const withEnv = (names: string[]) =>
  names.every((name) => process.env[name]) ? test : test.skip

describe('Path A: generateText with youSearch', () => {
  withEnv(['YDC_API_KEY', 'ANTHROPIC_API_KEY'])(
    'generates text using You.com web search',
    async () => {
      const { result } = await import('./path-a-generate.ts')
      const text = result.text.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
      expect(result.steps.some((s: { toolCalls: unknown[] }) => s.toolCalls.length > 0)).toBe(true)
    },
    { timeout: 60_000 },
  )
})

describe('Path B: streamText with youSearch', () => {
  withEnv(['YDC_API_KEY', 'ANTHROPIC_API_KEY'])(
    'streams text using You.com web search',
    async () => {
      const { stream } = await import('./path-b-stream.ts')
      const text = (await stream.text).toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
