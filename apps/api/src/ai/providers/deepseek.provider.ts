import OpenAI from 'openai';
import { AiProvider, SpecResult } from './ai-provider.interface';
import { extractText } from './text-extractor';
import { SPEC_ANALYSIS_PROMPT } from './prompt';

export class DeepSeekProvider implements AiProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });
  }

  async analyzeSpec(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<SpecResult> {
    const text = await extractText(fileBuffer, mimeType, fileName);

    const response = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SPEC_ANALYSIS_PROMPT },
        { role: 'user', content: `Спецификация:\n\n${text}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('DeepSeek вернул пустой ответ');

    return JSON.parse(content) as SpecResult;
  }
}
