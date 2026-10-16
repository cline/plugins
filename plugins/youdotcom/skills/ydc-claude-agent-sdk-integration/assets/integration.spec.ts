import { describe, expect, test } from 'bun:test'

const withEnv = (names: string[]) =>
  names.every((name) => process.env[name]) ? test : test.skip

describe('Path A: Claude Agent SDK with You.com MCP', () => {
  withEnv(['YDC_API_KEY', 'ANTHROPIC_API_KEY'])(
    'queries Claude and returns a response via MCP',
    async () => {
      const { run } = await import('./path-a-basic.ts')
      const result = await run('Search the web for the three branches of the US government')
      const text = result.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
