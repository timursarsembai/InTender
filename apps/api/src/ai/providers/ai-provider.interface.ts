export interface SpecCharacteristic {
  characteristic: string;
  requirement: string;
}

export interface SpecResult {
  productName: string;
  quantity: number;
  unit: string;
  characteristics: SpecCharacteristic[];
  additionalRequirements?: string;
  deliveryCity?: string;
}

export interface AiProvider {
  analyzeSpec(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<SpecResult>;
}
