import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { isProd } from './common/utils/checkMode';
import { join } from 'path/win32';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000'
  })

  //remove console logs in production
  if (isProd()) {
    Logger.overrideLogger(false);
    console.log = () => { };
    console.warn = () => { };
    console.error = () => { };
    console.debug = () => { };
  }
  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,      // Strip unknown props
      forbidNonWhitelisted: true,
      transform: true,      // auto-transform to DTO types
    }),
  );

  // serve static files from uploads
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  // Global Interceptor

  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global Error Handler
  app.useGlobalFilters(new GlobalExceptionFilter());

  //remove swagger in production
  if (!isProd()) {
    const projectName = String(process.env.PROJECT_NAME) || 'NestJS';
    const config = new DocumentBuilder()
      .setTitle(`${projectName} API`)
      .setDescription(`API documentation for project named ${projectName}.`)
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, document);
  }
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
