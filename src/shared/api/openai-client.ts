import 'server-only'

import OpenAI from 'openai'

class OpenAIClient {
    private client: OpenAI

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }

    async analyze(systemPrompt: string, userPrompt: string): Promise<string> {
        const model = process.env.OPENAI_API_MODEL_COMPLEX_REASONING ?? 'gpt-4o'

        const response = await this.client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_completion_tokens: 2000,
        })

        return response.choices[0]?.message?.content ?? 'No analysis available.'
    }
}

export const openaiClient = new OpenAIClient()
