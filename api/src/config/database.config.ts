import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { 
  User, 
  Organization, 
  Role, 
  Permission, 
  UserRole, 
  Task, 
  AuditLog 
} from '@rbcaproject/data';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: 'database.sqlite',
  entities: [User, Organization, Role, Permission, UserRole, Task, AuditLog],
  synchronize: true, // Don't use in production
  logging: process.env.NODE_ENV === 'development',
};
