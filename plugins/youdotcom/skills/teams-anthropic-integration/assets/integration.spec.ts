import { describe, expect, test } from 'bun:test'

const withEnv = (names: string[]) =>
  names.every((name) => process.env[name]) ? test : test.skip

describe('Path A: Basic Setup', () => {
  withEnv(['ANTHROPIC_API_KEY'])(
    'calls Claude API and returns a response with expected content',
    async () => {
      const { model } = await import('./path-a-basic.ts')
      const response = await model.send({
        role: 'user',
        content: 'What are the three branches of the US government?',
      })
      const text = response.content.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 30_000 },
  )
})

describe('Path B: With You.com MCP', () => {
  withEnv(['ANTHROPIC_API_KEY', 'YDC_API_KEY'])(
    'MCP makes a live web search and returns expected content',
    async () => {
      const { prompt } = await import('./path-b-mcp.ts')
      const result = await prompt.send(
        'Search the web for the three branches of the US government',
      )
      const text = result.content.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
