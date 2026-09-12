import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
declare global {
  interface BigInt {
    toJSON(): string;
  }
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();