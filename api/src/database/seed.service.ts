import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { 
  Role, 
  Permission, 
  User, 
  Organization,
  UserRole,
  RoleType, 
  PermissionAction, 
  PermissionResource 
} from '@rbcaproject/data';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedPermissions();
    await this.seedDefaultOrganization();
    await this.seedDefaultUser();
  }

  private async seedRoles() {
    const roles = [
      {
        name: RoleType.OWNER,
        displayName: 'Owner',
        description: 'Full system access and control',
        level: 3,
      },
      {
        name: RoleType.ADMIN,
        displayName: 'Administrator',
        description: 'Administrative access with some restrictions',
        level: 2,
      },
      {
        name: RoleType.VIEWER,
        displayName: 'Viewer',
        description: 'Read-only access to tasks and basic features',
        level: 1,
      },
    ];

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name }
      });

      if (!existingRole) {
        await this.roleRepository.save(roleData);
        console.log(`Created role: ${roleData.name}`);
      }
    }
  }

  private async seedPermissions() {
    const permissions = [
      // Task permissions
      { action: PermissionAction.CREATE, resource: PermissionResource.TASK, displayName: 'Create Tasks', description: 'Can create new tasks' },
      { action: PermissionAction.READ, resource: PermissionResource.TASK, displayName: 'Read Tasks', description: 'Can view tasks' },
      { action: PermissionAction.UPDATE, resource: PermissionResource.TASK, displayName: 'Update Tasks', description: 'Can modify tasks' },
      { action: PermissionAction.DELETE, resource: PermissionResource.TASK, displayName: 'Delete Tasks', description: 'Can delete tasks' },
      { action: PermissionAction.MANAGE, resource: PermissionResource.TASK, displayName: 'Manage Tasks', description: 'Full task management access' },

      // User permissions
      { action: PermissionAction.CREATE, resource: PermissionResource.USER, displayName: 'Create Users', description: 'Can create new users' },
      { action: PermissionAction.READ, resource: PermissionResource.USER, displayName: 'Read Users', description: 'Can view users' },
      { action: PermissionAction.UPDATE, resource: PermissionResource.USER, displayName: 'Update Users', description: 'Can modify users' },
      { action: PermissionAction.DELETE, resource: PermissionResource.USER, displayName: 'Delete Users', description: 'Can delete users' },
      { action: PermissionAction.MANAGE, resource: PermissionResource.USER, displayName: 'Manage Users', description: 'Full user management access' },

      // Organization permissions
      { action: PermissionAction.READ, resource: PermissionResource.ORGANIZATION, displayName: 'Read Organization', description: 'Can view organization info' },
      { action: PermissionAction.UPDATE, resource: PermissionResource.ORGANIZATION, displayName: 'Update Organization', description: 'Can modify organization' },
      { action: PermissionAction.MANAGE, resource: PermissionResource.ORGANIZATION, displayName: 'Manage Organization', description: 'Full organization management' },

      // Audit log permissions
      { action: PermissionAction.READ, resource: PermissionResource.AUDIT_LOG, displayName: 'Read Audit Logs', description: 'Can view audit logs' },

      // Global permissions
      { action: PermissionAction.MANAGE, resource: PermissionResource.ALL, displayName: 'Manage All', description: 'Full system access' },
    ];

    for (const permissionData of permissions) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { 
          action: permissionData.action,
          resource: permissionData.resource
        }
      });

      if (!existingPermission) {
        await this.permissionRepository.save(permissionData);
        console.log(`Created permission: ${permissionData.action}:${permissionData.resource}`);
      }
    }

    // Assign permissions to roles
    await this.assignPermissionsToRoles();
  }

  private async assignPermissionsToRoles() {
    const ownerRole = await this.roleRepository.findOne({
      where: { name: RoleType.OWNER },
      relations: ['permissions']
    });

    const adminRole = await this.roleRepository.findOne({
      where: { name: RoleType.ADMIN },
      relations: ['permissions']
    });

    const viewerRole = await this.roleRepository.findOne({
      where: { name: RoleType.VIEWER },
      relations: ['permissions']
    });

    // Owner gets all permissions
    if (ownerRole && ownerRole.permissions.length === 0) {
      const allPermissions = await this.permissionRepository.find();
      ownerRole.permissions = allPermissions;
      await this.roleRepository.save(ownerRole);
      console.log('Assigned all permissions to Owner role');
    }

    // Admin gets most permissions except user management
    if (adminRole && adminRole.permissions.length === 0) {
      const adminPermissions = await this.permissionRepository.find({
        where: [
          { resource: PermissionResource.TASK },
          { resource: PermissionResource.ORGANIZATION, action: PermissionAction.READ },
          { resource: PermissionResource.AUDIT_LOG, action: PermissionAction.READ },
          { resource: PermissionResource.USER, action: PermissionAction.READ },
        ]
      });
      adminRole.permissions = adminPermissions;
      await this.roleRepository.save(adminRole);
      console.log('Assigned permissions to Admin role');
    }

    // Viewer gets read permissions
    if (viewerRole && viewerRole.permissions.length === 0) {
      const viewerPermissions = await this.permissionRepository.find({
        where: [
          { resource: PermissionResource.TASK, action: PermissionAction.READ },
          { resource: PermissionResource.TASK, action: PermissionAction.CREATE },
          { resource: PermissionResource.TASK, action: PermissionAction.UPDATE },
          { resource: PermissionResource.ORGANIZATION, action: PermissionAction.READ },
          { resource: PermissionResource.USER, action: PermissionAction.READ },
        ]
      });
      viewerRole.permissions = viewerPermissions;
      await this.roleRepository.save(viewerRole);
      console.log('Assigned permissions to Viewer role');
    }
  }

  private async seedDefaultOrganization() {
    const existingOrg = await this.organizationRepository.findOne({
      where: { name: 'Default Organization' }
    });

    if (!existingOrg) {
      const organization = await this.organizationRepository.save({
        name: 'Default Organization',
        description: 'Default organization for initial setup',
      });
      console.log(`Created default organization: ${organization.id}`);
    }
  }

  private async seedDefaultUser() {
    const organization = await this.organizationRepository.findOne({
      where: { name: 'Default Organization' }
    });

    if (!organization) {
      console.log('No organization found for seeding users');
      return;
    }

    // Create Owner user
    await this.createUserIfNotExists(
      'owner@example.com',
      'owner123',
      'Owner',
      'User',
      RoleType.OWNER,
      organization.id
    );

    // Create Admin user  
    await this.createUserIfNotExists(
      'admin@example.com',
      'admin123',
      'Admin',
      'User',
      RoleType.ADMIN,
      organization.id
    );

    // Create Viewer user
    await this.createUserIfNotExists(
      'viewer@example.com',
      'viewer123',
      'Viewer',
      'User',
      RoleType.VIEWER,
      organization.id
    );
  }

  private async createUserIfNotExists(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    roleType: RoleType,
    organizationId: string
  ) {
    const existingUser = await this.userRepository.findOne({
      where: { email }
    });

    if (!existingUser) {
      const role = await this.roleRepository.findOne({
        where: { name: roleType }
      });

      if (role) {
        const passwordHash = await bcrypt.hash(password, 10);
        
        const user = await this.userRepository.save({
          email,
          firstName,
          lastName,
          passwordHash,
          organizationId,
        });

        await this.userRoleRepository.save({
          userId: user.id,
          roleId: role.id,
          organizationId,
          isActive: true,
        });

        console.log(`Created ${roleType} user: ${email} / ${password}`);
      }
    }
  }
}
