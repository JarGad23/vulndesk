import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Project } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto, UpdateProjectDto } from './project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Project[]> {
    return this.prisma.project.findMany({ orderBy: { name: 'asc' } });
  }

  async get(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Nie znaleziono projektu.');
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    try {
      return await this.prisma.project.create({ data: dto });
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(
    id: string,
    { archived, ...data }: UpdateProjectDto,
  ): Promise<Project> {
    const archivedAt =
      archived === undefined ? undefined : archived ? new Date() : null;
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (archived) {
          // Archiving an archived project keeps the original date.
          await tx.project.updateMany({
            where: { id, archivedAt: null },
            data: { archivedAt },
          });
          return tx.project.update({ where: { id }, data });
        }
        return tx.project.update({
          where: { id },
          data: { ...data, archivedAt },
        });
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  private translate(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        return new ConflictException('Projekt o tej nazwie już istnieje.');
      if (error.code === 'P2025')
        return new NotFoundException('Nie znaleziono projektu.');
    }
    return error;
  }
}
