import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization, User, Role, Permission, UserRole, AuditLog, Task } from '@rbcaproject/data';
import { RbacService, AuditService } from '@rbcaproject/auth';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, User, Role, Permission, UserRole, AuditLog, Task]),
  ],
  providers: [
    OrganizationsService,
    RbacService,
    AuditService,
  ],
  controllers: [OrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
