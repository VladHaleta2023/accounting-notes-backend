import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Response } from 'express';
import { CategoryDto } from 'src/category/dto/category.dto';
import { AdminRoleGuard } from 'src/user/guards/admin-role.guard';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async findAll(@Res() res: Response) {
    try {
      const result = await this.categoryService.findAll();

      return res
        .status(HttpStatus.OK)
        .json({
          statusCode: 200,
          message: ["Uzyskanie kategorii udane"],
          data: result,
        });
    }
    catch (error) {
      console.error(`Error: ${error}`);

      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({
          statusCode: 500,
          message: [`Server Error: ${error.message}`],
        });
    }
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
      try {
        const result = await this.categoryService.findById(id);

        return {
          statusCode: 200,
          message: ['Uzyskanie kategorii udane'],
          data: { ...result }
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
          { statusCode: 500, message: [`Server Error: ${error}`] },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
  }

  @UseGuards(AdminRoleGuard)
  @Post()
  async create(@Body() dto: CategoryDto) {
    try {
        const result = await this.categoryService.create(dto);
  
        return {
          statusCode: 201,
          message: ['Dodawanie Kategorii udane'],
          data: result,
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
        { statusCode: 500, message: [`Server Error: ${error}`] },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: CategoryDto) {
    try {
        const result = await this.categoryService.update(id, dto);
  
        return {
          statusCode: 200,
          message: ['Aktualizowanie Kategorii udane'],
          data: result,
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
        { statusCode: 500, message: [`Server Error: ${error}`] },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Delete(":id")
  async deelte(@Param("id") id: string) {
    try {
        const result = await this.categoryService.delete(id);
  
        return {
          statusCode: 200,
          message: ['Usuwanie Kategorii udane'],
          data: result,
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
        { statusCode: 500, message: [`Server Error: ${error}`] },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
