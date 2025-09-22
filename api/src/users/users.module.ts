import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Role, UserRole, Organization, Permission, AuditLog } from '@rbcaproject/data';
import { RbacService, AuditService } from '@rbcaproject/auth';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRole, Organization, Permission, AuditLog]),
  ],
  providers: [
    UsersService,
    RbacService,
    AuditService,
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
