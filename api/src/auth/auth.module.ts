import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User, Organization, Role, Permission, UserRole, AuditLog } from '@rbcaproject/data';
import { RbacService, AuditService } from '@rbcaproject/auth';
import { jwtConfig } from '../config/jwt.config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register(jwtConfig),
    TypeOrmModule.forFeature([User, Organization, Role, Permission, UserRole, AuditLog]),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    {
      provide: 'RBAC_SERVICE',
      useClass: RbacService,
    },
    RbacService,
    AuditService,
  ],
  controllers: [AuthController],
  exports: [AuthService, RbacService, AuditService],
})
export class AuthModule {}
