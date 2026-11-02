import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import { join } from "path";
import * as fs from "fs";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({ origin: process.env.WEB_ORIGIN || "http://localhost:3000", credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads", { recursive: true });
  app.use("/uploads", express.static(join(process.cwd(), "uploads")));
  await app.listen(process.env.PORT || 4000);
  console.log(`API listening on ${process.env.PORT || 4000}`);
}
bootstrap();
