import { Body, Controller, Get, HttpException, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Response } from "express";
import { LoginAdminAuthDto } from './dto/admin.dto';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { ConfigService } from '@nestjs/config';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService) {}

  @Get('admin')
  async findAll(@Res() res: Response) {
    try {
      const admin = await this.userService.findAdmin();

      return res
          .status(HttpStatus.OK)
          .json({
            statusCode: HttpStatus.OK,
            message: ["Uzyskanie admina udane"],
            data: admin,
          });
    }
    catch (error) {
      console.error(`Error: ${error}`);

      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: [`Server Error: ${error.message}`],
        });
    }
  }

  @Post('admin/register')
  async registerAdmin(@Res() res: Response) {
    try {
      const admin = await this.userService.registerAdmin();
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: ["Rejestracja admina udana"],
        data: admin,
      });
    }
    catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const message = error.message || 'Error';

        throw new HttpException({ statusCode: status, message: [message] }, status);
      }

      console.error(`Error:`, error);

      throw new HttpException(
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: [`Server Error: ${error.message}`] },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('admin/login')
  async loginAdmin(@Body() dto: LoginAdminAuthDto, @Res({ passthrough: true }) res: Response) {
    try {
      const admin = await this.userService.loginAdmin(dto);

      const isProd = this.configService.get<string>('NODE_ENV') === 'production';

      res.cookie('role', 'ADMIN', {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        domain: isProd ? 'accounting-notes-backend.onrender.com' : "",
        path: '/',
      });

      return {
        statusCode: 200,
        message: ['Witaj w trybie edycji, Adminie'],
        data: admin,
      };
    } 
    catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const message = error.message || 'Error';

        throw new HttpException({ statusCode: status, message: [message] }, status);
      }

      console.error(`Error:`, error);

      throw new HttpException(
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: [`Server Error: ${error.message}`] },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/logout')
  async logoutAdmin(@Res({ passthrough: true }) res: Response) {
    try {
      const isProd = this.configService.get<string>('NODE_ENV') === 'production';

      res.clearCookie('role', {
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        domain: isProd ? 'accounting-notes-backend.onrender.com' : "",
        path: '/',
      });

      return {
        statusCode: 200,
        message: ['Wylogowanie z trybu edycji udane'],
      };
    } 
    catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const message = error.message || 'Error';

        throw new HttpException({ statusCode: status, message: [message] }, status);
      }

      console.error(`Error:`, error);

      throw new HttpException(
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: [`Server Error: ${HttpStatus.INTERNAL_SERVER_ERROR}`] },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
