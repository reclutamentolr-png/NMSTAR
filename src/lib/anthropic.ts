import Anthropic from '@anthropic-ai/sdk'

export class MissingApiKeyError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not configured')
    this.name = 'MissingApiKeyError'
  }
}

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new MissingApiKeyError()
  }
  return new Anthropic({ apiKey })
}
