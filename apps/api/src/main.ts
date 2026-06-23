import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './env';

import * as dotenv from 'dotenv';
dotenv.config();

import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const env = validateEnv();
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(env.PORT);
  console.log(`🚀 API running on http://localhost:${String(env.PORT)}`);
}

void bootstrap();
