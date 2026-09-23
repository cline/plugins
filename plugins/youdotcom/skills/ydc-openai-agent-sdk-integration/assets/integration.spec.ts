import { describe, expect, test } from 'bun:test'

const withEnv = (names: string[]) =>
  names.every((name) => process.env[name]) ? test : test.skip

describe('Path A: OpenAI Agent SDK with Hosted MCP', () => {
  withEnv(['YDC_API_KEY', 'OPENAI_API_KEY'])(
    'runs agent and returns a response via You.com hosted MCP',
    async () => {
      const { runAgent } = await import('./path-a-hosted.ts')
      const result = await runAgent('Search the web for the three branches of the US government')
      const text = result.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
