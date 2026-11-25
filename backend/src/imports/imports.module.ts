import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';
import { NpmAuditParser } from './npm-audit.parser.js';
import { ReportParser } from './report-parser.js';

@Module({
  controllers: [ImportsController],
  providers: [
    ImportsService,
    { provide: ReportParser, useClass: NpmAuditParser },
  ],
})
export class ImportsModule {}
