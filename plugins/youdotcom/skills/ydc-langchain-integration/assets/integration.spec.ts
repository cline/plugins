import { describe, expect, test } from 'bun:test'

const withEnv = (names: string[]) =>
  names.every((name) => process.env[name]) ? test : test.skip

describe('LangChain agent with youSearch and youContents', () => {
  withEnv(['YDC_API_KEY', 'ANTHROPIC_API_KEY'])(
    'searches and returns structured response',
    async () => {
      const { ToolMessage } = await import('@langchain/core/messages')
      const { result } = await import('./reference.ts')

      expect(result.structuredResponse).toBeDefined()
      expect(result.structuredResponse.summary.length).toBeGreaterThan(50)
      expect(result.structuredResponse.key_points.length).toBeGreaterThan(0)
      expect(result.structuredResponse.urls.length).toBeGreaterThan(0)

      const toolMessages = result.messages.filter((m: unknown) => m instanceof ToolMessage)
      expect(toolMessages.length).toBeGreaterThan(0)
    },
    { timeout: 120_000 },
  )
})
