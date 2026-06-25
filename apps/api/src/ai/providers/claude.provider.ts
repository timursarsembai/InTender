import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, SpecResult } from './ai-provider.interface';
import { SPEC_ANALYSIS_PROMPT } from './prompt';

export class ClaudeProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeSpec(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<SpecResult> {
    const isPdf =
      mimeType === 'application/pdf' || fileName.endsWith('.pdf');

    const userContent: Anthropic.MessageParam['content'] = isPdf
      ? [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: fileBuffer.toString('base64'),
            },
          },
          { type: 'text', text: 'Разбери эту спецификацию согласно инструкции.' },
        ]
      : [{ type: 'text', text: `Спецификация:\n\n${fileBuffer.toString('utf-8')}` }];

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SPEC_ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('Claude вернул пустой ответ');

    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude не вернул валидный JSON');

    return JSON.parse(jsonMatch[0]) as SpecResult;
  }
}
