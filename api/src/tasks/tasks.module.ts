import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, User, Organization, Role, Permission, UserRole, AuditLog } from '@rbcaproject/data';
import { RbacService, AuditService } from '@rbcaproject/auth';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, User, Organization, Role, Permission, UserRole, AuditLog]),
  ],
  providers: [
    TasksService,
    {
      provide: 'RBAC_SERVICE',
      useClass: RbacService,
    },
    RbacService,
    AuditService,
  ],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
