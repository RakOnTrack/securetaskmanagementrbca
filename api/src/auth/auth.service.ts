import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { 
  User, 
  Organization, 
  Role, 
  UserRole,
  LoginDto, 
  RegisterDto, 
  AuthResponseDto, 
  UserProfileDto,
  JwtPayload,
  RoleType,
  AuditAction
} from '@rbcaproject/data';
import { AuditService } from '@rbcaproject/auth';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['organization', 'userRoles', 'userRoles.role', 'userRoles.role.permissions']
    });

    if (user && await bcrypt.compare(password, user.passwordHash)) {
      return user;
    }
    return null;
  }

  async login(loginDto: LoginDto, request?: any): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      await this.auditService.logAuthentication(
        AuditAction.LOGIN,
        undefined,
        undefined,
        false,
        'Invalid credentials',
        request
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.userRoles.filter(ur => ur.isActive).map(ur => ur.role.name),
    };

    const access_token = this.jwtService.sign(payload);

    // Log successful login
    await this.auditService.logAuthentication(
      AuditAction.LOGIN,
      user.id,
      user.organizationId,
      true,
      undefined,
      request
    );

    return {
      access_token,
      user: this.mapToUserProfile(user),
    };
  }

  async register(registerDto: RegisterDto, request?: any): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: registerDto.organizationId }
    });

    if (!organization) {
      throw new ConflictException('Organization not found');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      passwordHash,
      organizationId: registerDto.organizationId,
    });

    const savedUser = await this.userRepository.save(user);

    // Assign default role
    const defaultRole = await this.roleRepository.findOne({
      where: { name: registerDto.role || RoleType.VIEWER }
    });

    if (defaultRole) {
      await this.userRoleRepository.save({
        userId: savedUser.id,
        roleId: defaultRole.id,
        organizationId: savedUser.organizationId,
        isActive: true,
      });
    }

    // Reload user with relations
    const userWithRelations = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['organization', 'userRoles', 'userRoles.role', 'userRoles.role.permissions']
    });

    const payload: JwtPayload = {
      sub: userWithRelations.id,
      email: userWithRelations.email,
      organizationId: userWithRelations.organizationId,
      roles: userWithRelations.userRoles.filter(ur => ur.isActive).map(ur => ur.role.name),
    };

    const access_token = this.jwtService.sign(payload);

    // Log successful registration
    await this.auditService.logAuthentication(
      AuditAction.LOGIN, // Using LOGIN as registration automatically logs in
      userWithRelations.id,
      userWithRelations.organizationId,
      true,
      'User registered and logged in',
      request
    );

    return {
      access_token,
      user: this.mapToUserProfile(userWithRelations),
    };
  }

  private mapToUserProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      organizationId: user.organizationId,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        parentId: user.organization.parentId,
      },
      roles: user.userRoles
        .filter(ur => ur.isActive)
        .map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          displayName: ur.role.displayName,
          level: ur.role.level,
          permissions: ur.role.permissions.map(p => ({
            action: p.action,
            resource: p.resource,
            identifier: p.identifier,
          })),
        })),
    };
  }
}
