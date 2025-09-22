import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { RoleType } from '../entities/role.entity';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  organizationId: string;

  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;
}

export class AuthResponseDto {
  access_token: string;
  user: UserProfileDto;
}

export class UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    parentId?: string;
  };
  roles: Array<{
    id: string;
    name: RoleType;
    displayName: string;
    level: number;
    permissions: Array<{
      action: string;
      resource: string;
      identifier: string;
    }>;
  }>;
}

export class JwtPayload {
  sub: string; // user id
  email: string;
  organizationId: string;
  roles: RoleType[];
  iat?: number;
  exp?: number;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  organizationId: string;

  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: string;
}

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}