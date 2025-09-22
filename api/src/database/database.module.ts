import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
  User, 
  Organization, 
  Role, 
  Permission, 
  UserRole, 
  Task, 
  AuditLog 
} from '@rbcaproject/data';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      Role,
      Permission,
      UserRole,
      Task,
      AuditLog,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}
