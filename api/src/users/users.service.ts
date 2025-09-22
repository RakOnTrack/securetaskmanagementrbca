import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, UserRole, CreateUserDto, UpdateUserDto, RoleType } from '@rbcaproject/data';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async findAll(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId },
      relations: ['organization', 'userRoles', 'userRoles.role'],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        // Exclude passwordHash
      }
    });
  }

  async findOne(id: string, organizationId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, organizationId },
      relations: ['organization', 'userRoles', 'userRoles.role'],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(createUserDto: CreateUserDto, organizationId: string): Promise<User> {
    console.log(`Checking for existing user with email: ${createUserDto.email} in organization: ${organizationId}`);
    
    // Check if user already exists within the same organization
    const existingUser = await this.userRepository.findOne({
      where: { 
        email: createUserDto.email,
        organizationId: organizationId
      }
    });

    if (existingUser) {
      console.log(`Found existing user:`, { 
        id: existingUser.id, 
        email: existingUser.email, 
        organizationId: existingUser.organizationId 
      });
      throw new ConflictException('User with this email already exists in this organization');
    }
    
    console.log('No existing user found, proceeding with creation');

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      passwordHash,
      organizationId,
    });

    const savedUser = await this.userRepository.save(user);

    // Assign role if specified
    if (createUserDto.role) {
      const role = await this.roleRepository.findOne({
        where: { name: createUserDto.role as RoleType }
      });

      if (role) {
        await this.userRoleRepository.save({
          userId: savedUser.id,
          roleId: role.id,
          organizationId,
          isActive: true,
        });
      }
    }

    return this.findOne(savedUser.id, organizationId);
  }

  async update(id: string, updateUserDto: UpdateUserDto, organizationId: string): Promise<User> {
    const user = await this.findOne(id, organizationId);
    
    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);
    
    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const user = await this.findOne(id, organizationId);
    
    // First remove all user roles
    await this.userRoleRepository.delete({ userId: id });
    
    // Then remove the user
    await this.userRepository.remove(user);
  }

  async assignRole(userId: string, roleId: string, organizationId: string): Promise<UserRole> {
    const user = await this.findOne(userId, organizationId);
    
    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      organizationId,
      isActive: true
    });

    return this.userRoleRepository.save(userRole);
  }

  async removeRole(userId: string, roleId: string, organizationId: string): Promise<void> {
    await this.userRoleRepository.update(
      { userId, roleId, organizationId },
      { isActive: false }
    );
  }
}
