import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginAdminAuthDto } from './dto/admin.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserService {
    constructor(private readonly prismaService: PrismaService) {}

    async findAdmin() {
        const result = await this.prismaService.user.findFirst({
            where: {
                role: UserRole.ADMIN
            }
        });

        if (!result) {
            return null;
        }

        const { hash, ...admin } = result;

        return admin;
    }

    async registerAdmin() {
        const user = await this.prismaService.user.findUnique({
            where: { username: "admin" },
        });

        if (user) {
            throw new HttpException(
                'Użytkownik już istnieje',
                HttpStatus.CONFLICT,
            );
        }

        const hashedPassword = await bcrypt.hash("123", 10);
        const result = await this.prismaService.user.create({
            data: {
                username: "admin",
                hash: hashedPassword,
                role: UserRole.ADMIN,
            },
        });

        if (!result)
            return null;

        const { hash, ...admin } = result;

        return admin;
    }

    async loginAdmin(dto: LoginAdminAuthDto) {
        const user = await this.prismaService.user.findUnique({
            where: { username: dto.username },
        });

        if (!user) {
            throw new HttpException(
                'Użytkownik nie został znaleziony',
                HttpStatus.NOT_FOUND,
            );
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.hash);

        if (!isPasswordValid) {
            throw new HttpException(
                'Nieprawidłowe hasło',
                HttpStatus.UNAUTHORIZED,
            );
        }

        if (!user)
            return null;

        const { hash, ...admin } = user;

        return admin;
    }
}