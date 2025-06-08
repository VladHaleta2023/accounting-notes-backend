import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AdminRoleGuard } from './guards/admin-role.guard';

@Module({
  controllers: [UserController],
  providers: [UserService, AdminRoleGuard],
})
export class UserModule {}
