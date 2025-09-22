import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  User, 
  Role, 
  Permission, 
  UserRole, 
  Organization,
  PermissionAction, 
  PermissionResource,
  RoleType 
} from '@rbcaproject/data';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async hasPermission(
    userId: string,
    action: PermissionAction,
    resource: PermissionResource,
    organizationId?: string
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions', 'organization']
    });

    if (!user) {
      return false;
    }

    // Get user's roles for the specific organization or global roles
    const userRoles = user.userRoles.filter(ur => 
      ur.isActive && 
      (!organizationId || ur.organizationId === organizationId || !ur.organizationId)
    );

    // Check if any role has the required permission
    for (const userRole of userRoles) {
      const role = userRole.role;
      
      // Check role permissions
      const hasPermission = role.permissions.some(permission => 
        (permission.action === action || permission.action === PermissionAction.MANAGE) &&
        (permission.resource === resource || permission.resource === PermissionResource.ALL)
      );

      if (hasPermission) {
        return true;
      }

      // Check role hierarchy - higher level roles inherit lower level permissions
      if (await this.checkRoleHierarchy(role, action, resource)) {
        return true;
      }
    }

    return false;
  }

  async checkRoleHierarchy(
    role: Role,
    action: PermissionAction,
    resource: PermissionResource
  ): Promise<boolean> {
    // Owner has all permissions
    if (role.name === RoleType.OWNER) {
      return true;
    }

    // Admin has all permissions except user management in parent organization
    if (role.name === RoleType.ADMIN) {
      if (resource === PermissionResource.USER && action === PermissionAction.MANAGE) {
        return false;
      }
      return true;
    }

    return false;
  }

  async canAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization', 'organization.parent']
    });

    if (!user) {
      return false;
    }

    // User can access their own organization
    if (user.organizationId === organizationId) {
      return true;
    }

    // Check if user's organization is parent of target organization
    const targetOrg = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['parent']
    });

    if (targetOrg && targetOrg.parentId === user.organizationId) {
      return true;
    }

    return false;
  }

  async canAccessResource(
    userId: string,
    resourceType: PermissionResource,
    resourceId: string,
    action: PermissionAction
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization']
    });

    if (!user) {
      return false;
    }

    // Check basic permission
    const hasPermission = await this.hasPermission(
      userId,
      action,
      resourceType,
      user.organizationId
    );

    if (!hasPermission) {
      return false;
    }

    // Additional resource-specific checks can be added here
    // For example, checking if a task belongs to user's organization
    
    return true;
  }

  async getUserRoles(userId: string, organizationId?: string): Promise<Role[]> {
    const userRoles = await this.userRoleRepository.find({
      where: {
        userId,
        isActive: true,
        ...(organizationId && { organizationId })
      },
      relations: ['role', 'role.permissions']
    });

    return userRoles.map(ur => ur.role);
  }

  async assignRole(userId: string, roleId: string, organizationId?: string): Promise<UserRole> {
    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      organizationId,
      isActive: true
    });

    return await this.userRoleRepository.save(userRole);
  }

  async removeRole(userId: string, roleId: string, organizationId?: string): Promise<void> {
    await this.userRoleRepository.update(
      {
        userId,
        roleId,
        ...(organizationId && { organizationId })
      },
      { isActive: false }
    );
  }
}
