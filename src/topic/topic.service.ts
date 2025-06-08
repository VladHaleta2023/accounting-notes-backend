import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TopicDto } from './dto/topic.dto';
import { CategoryService } from 'src/category/category.service';
import { TopicSearchDto } from './dto/topic.search.dto';
import { ContentDto } from './dto/content.dto';

@Injectable()
export class TopicService {
    constructor (
        private readonly prismaService: PrismaService,
        private readonly categoryService: CategoryService,
    ) {}

    async verifyTopic(id: string) {
        const topic = await this.prismaService.topic.findFirst({
            where: { id },
        });

        if (!topic) {
            throw new HttpException(
                'Temat nie znaleziony',
                HttpStatus.NOT_FOUND,
            );
        }
    }

    async verifyUniqueTitle(categoryId: string, title: string) {
        const topic = await this.prismaService.topic.findFirst({
            where: {
                title,
                categoryId
            }
        });

        if (topic) {
            throw new HttpException(
                'Taki temat już istnieje',
                HttpStatus.CONFLICT,
            );
        }
    }

    async findAll(categoryId: string, dto: TopicSearchDto) {
        await this.categoryService.verifyCategory(categoryId);

        const result = await this.prismaService.topic.findMany({
            select: {
                id: true,
                title: true
            },
            where: {
                categoryId,
                ...(dto?.title && dto.title.trim() !== ''
                    ? {
                        title: {
                        contains: dto.title,
                        mode: 'insensitive',
                        },
                    }
                : {}),
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async findById(categoryId: string, id: string) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyTopic(id);

        const current = await this.prismaService.topic.findFirst({
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true
            },
            where: {
                categoryId,
                id,
            },
        });

        if (!current) {
            throw new HttpException(
                'Temat nie znaleziony',
                HttpStatus.NOT_FOUND,
            );
        }

        const behavior = await this.prismaService.topic.findFirst({
            select: {
                id: true,
                title: true,
                content: true
            },
            where: {
                categoryId,
                createdAt: { lt: current.createdAt },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const next = await this.prismaService.topic.findFirst({
            select: {
                id: true,
                title: true,
                content: true
            },
            where: {
                categoryId,
                createdAt: { gt: current.createdAt },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return {
            current,
            behavior,
            next,
        };
    }

    async create(categoryId: string, dto: TopicDto) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyUniqueTitle(categoryId, dto.title);

        const result = await this.prismaService.topic.create({
            data: {
                title: dto.title,
                categoryId
            }
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async update(categoryId: string, id: string, dto: TopicDto) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyTopic(id);
        await this.verifyUniqueTitle(categoryId, dto.title);

        const result = await this.prismaService.topic.update({
            where: { id },
            data: {
                title: dto.title,
            }
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async delete(categoryId: string, id: string) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyTopic(id);

        const result = await this.prismaService.topic.delete({
            where: { id },
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async getNotes(categoryId: string, id: string) {
        await this.categoryService.verifyCategory(categoryId);
        await this.verifyTopic(id);

        const result = await this.prismaService.topic.findFirst({
            select: {
                content: true,
            },
            where: {
                categoryId,
                id,
            },
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async updateNotes(categoryId: string, id: string, dto: ContentDto) {
    await this.categoryService.verifyCategory(categoryId);
    await this.verifyTopic(id);

    const result = await this.prismaService.topic.update({
        select: {
            content: true,
        },
        where: {
            categoryId,
            id,
        },
        data: {
            content: dto.content
        }
    });

    if (!result) {
        return null;
    }

    return result;
    }
}
