import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CategoryDto } from 'src/category/dto/category.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
    constructor (private readonly prismaService: PrismaService) {}

    async verifyCategory(id: string) {
        const category = await this.prismaService.category.findFirst({
            where: { id },
        });

        if (!category) {
            throw new HttpException(
                'Kategoria nie znaleziona',
                HttpStatus.NOT_FOUND,
            );
        }
    }

    async verifyUniqueName(name: string) {
        const category = await this.prismaService.category.findFirst({
            where: {
                name
            }
        });

        if (category) {
            throw new HttpException(
                'Taka kategoria już istnieje',
                HttpStatus.CONFLICT,
            );
        }
    }

    async findAll() {
        const result = await this.prismaService.category.findMany({
            select: {
                id: true,
                name: true,
                topics: {
                    select: {
                        id: true,
                        title: true
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                }
            },
            orderBy: {
                createdAt: "asc"
            }
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async findById(id: string) {
        await this.verifyCategory(id);

        const current = await this.prismaService.category.findFirst({
            select: {
                id: true,
                name: true,
            },
            where: {
                id,
            },
        });

        if (!current) {
            throw new HttpException(
                'Kategoria nie znaleziona',
                HttpStatus.NOT_FOUND,
            );
        }

        return current;
    }

    async create(dto: CategoryDto) {
        await this.verifyUniqueName(dto.name);

        const result = await this.prismaService.category.create({
            data: {
                name: dto.name
            }
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async update(id: string, dto: CategoryDto) {
        await this.verifyCategory(id);
        await this.verifyUniqueName(dto.name);

        const result = await this.prismaService.category.update({
            where: { id },
            data: {
                name: dto.name
            }
        });

        if (!result) {
            return null;
        }

        return result;
    }

    async delete(id: string) {
        await this.verifyCategory(id);

        const result = await this.prismaService.category.delete({
            where: { id },
        });

        if (!result) {
            return null;
        }

        return result;
    }
}
