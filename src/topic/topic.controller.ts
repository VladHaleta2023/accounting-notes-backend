import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { TopicService } from './topic.service';
import { TopicDto } from './dto/topic.dto';
import { TopicSearchDto } from './dto/topic.search.dto';
import { ContentDto } from './dto/content.dto';
import { AdminRoleGuard } from 'src/user/guards/admin-role.guard';

@Controller('categories/:categoryId/topics')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Get()
  async findAll(
    @Param("categoryId") categoryId: string,
    @Body() dto: TopicSearchDto
  ) {
    try {
      const result = await this.topicService.findAll(categoryId, dto);

      return {
        statusCode: 200,
        message: ['Uzyskanie tematów udane'],
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
  @Post()
  async create(@Param("categoryId") categoryId: string, @Body() dto: TopicDto) {
    try {
      const result = await this.topicService.create(categoryId, dto);

      return {
        statusCode: 201,
        message: ['Dodawanie tematu udane'],
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

  @Get(":id")
  async findById(
    @Param("categoryId") categoryId: string,
    @Param("id") id: string) {
      try {
        const result = await this.topicService.findById(categoryId, id);

        return {
          statusCode: 200,
          message: ['Uzyskanie tematu udane'],
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
  @Put(":id")
  async update(
    @Param("categoryId") categoryId: string,
    @Param("id") id: string,
    @Body() dto: TopicDto) {
    try {
      const result = await this.topicService.update(categoryId, id, dto);

      return {
        statusCode: 200,
        message: ['Aktualizacja tematu udane'],
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
  async delete(
    @Param("categoryId") categoryId: string,
    @Param("id") id: string,
  ) {
    try {
      const result = await this.topicService.delete(categoryId, id);

      return {
        statusCode: 200,
        message: ['Usuwanie tematu udane'],
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

  @Get(":id/notes")
  async getNotes(
    @Param("categoryId") categoryId: string,
    @Param("id") id: string
  ) {
    try {
      const result = await this.topicService.getNotes(categoryId, id);

      return {
        statusCode: 200,
        message: ['Uzyskanie notatek udane'],
        data: result?.content
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
  @Put(":id/notes")
  async updateNotes(
    @Param("categoryId") categoryId: string,
    @Param("id") id: string,
    @Body() dto: ContentDto
  ) {
    try {
        const result = await this.topicService.updateNotes(categoryId, id, dto);

        return {
          statusCode: 200,
          message: ['Aktualizacja notatek udane'],
          data: result?.content
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
