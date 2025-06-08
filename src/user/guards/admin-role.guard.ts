import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const role = request.cookies?.role;

    if (role !== 'ADMIN') {
      throw new HttpException(
        { statusCode: HttpStatus.FORBIDDEN, message: ['Operacja dostępna tylko w trybie Admin'] },
        HttpStatus.FORBIDDEN
      );
    }

    return true;
  }
}