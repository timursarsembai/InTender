import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './env';

import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap(): Promise<void> {
  const env = validateEnv();
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(env.PORT);
  console.log(`🚀 API running on http://localhost:${String(env.PORT)}`);
}

void bootstrap();
