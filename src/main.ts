import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Swagger setup
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const config = new DocumentBuilder()
    .setTitle('Pair Go API')
    .setDescription('The Pair Go API description')
    .setVersion('1.0')
    .addCookieAuth('accessToken')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
