import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, User, Organization, Role, Permission, UserRole } from '@rbcaproject/data';
import { RbacService, AuditService } from '@rbcaproject/auth';
import { AuditController } from './audit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User, Organization, Role, Permission, UserRole]),
  ],
  providers: [
    {
      provide: 'RBAC_SERVICE',
      useClass: RbacService,
    },
    RbacService,
    AuditService,
  ],
  controllers: [AuditController],
})
export class AuditModule {}
