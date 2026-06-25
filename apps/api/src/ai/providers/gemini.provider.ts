import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, SpecResult } from './ai-provider.interface';
import { SPEC_ANALYSIS_PROMPT } from './prompt';

export class GeminiProvider implements AiProvider {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeSpec(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<SpecResult> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SPEC_ANALYSIS_PROMPT,
    });

    const supportedMimeType = this.resolveMimeType(mimeType, fileName);

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: supportedMimeType,
          data: fileBuffer.toString('base64'),
        },
      },
      { text: 'Разбери эту спецификацию согласно инструкции.' },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini не вернул валидный JSON');

    return JSON.parse(jsonMatch[0]) as SpecResult;
  }

  private resolveMimeType(mimeType: string, fileName: string): string {
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'text/plain';
  }
}
