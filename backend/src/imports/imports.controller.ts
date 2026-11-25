import {
  BadRequestException,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { PublicUser } from '../users/public-user.js';
import { ImportsService } from './imports.service.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface UploadedReport {
  originalname: string;
  buffer: Buffer;
}

@Controller('projects/:projectId/imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0 },
    }),
  )
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: PublicUser,
    @UploadedFile() file: UploadedReport | undefined,
  ) {
    if (!file) throw new BadRequestException('Wybierz plik raportu.');
    return this.imports.import({
      projectId,
      authorId: user.id,
      // Multipart headers are decoded as latin1 by default.
      fileName: Buffer.from(file.originalname, 'latin1')
        .toString('utf8')
        .replaceAll('\0', '')
        .slice(0, 255),
      content: file.buffer.toString('utf8'),
    });
  }
}
