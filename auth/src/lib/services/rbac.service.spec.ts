import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RbacService } from './rbac.service';
import { 
  User, 
  Role, 
  Permission, 
  UserRole, 
  Organization,
  RoleType,
  PermissionAction,
  PermissionResource
} from '@rbcaproject/data';

describe('RbacService', () => {
  let service: RbacService;
  let userRepository: Repository<User>;

  const mockUser = {
    id: 'user1',
    email: 'test@example.com',
    organizationId: 'org1',
    organization: { id: 'org1', name: 'Test Org', parentId: null },
    userRoles: [{
      id: 'ur1',
      isActive: true,
      organizationId: 'org1',
      role: {
        id: 'role1',
        name: RoleType.ADMIN,
        level: 2,
        permissions: [{
          id: 'perm1',
          action: PermissionAction.READ,
          resource: PermissionResource.TASK,
          identifier: 'read:task'
        }]
      }
    }]
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
  };

  const mockPermissionRepository = {
    find: jest.fn(),
  };

  const mockUserRoleRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: mockUserRoleRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true when user has required permission', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.hasPermission(
        'user1',
        PermissionAction.READ,
        PermissionResource.TASK,
        'org1'
      );

      expect(result).toBe(true);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user1' },
        relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions', 'organization']
      });
    });

    it('should return false when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.hasPermission(
        'nonexistent',
        PermissionAction.READ,
        PermissionResource.TASK
      );

      expect(result).toBe(false);
    });

    it('should return false when user has no active roles', async () => {
      const userWithoutRoles = {
        ...mockUser,
        userRoles: [{
          ...mockUser.userRoles[0],
          isActive: false
        }]
      };

      mockUserRepository.findOne.mockResolvedValue(userWithoutRoles);

      const result = await service.hasPermission(
        'user1',
        PermissionAction.READ,
        PermissionResource.TASK
      );

      expect(result).toBe(false);
    });

    it('should return true for Owner role with any permission', async () => {
      const ownerUser = {
        ...mockUser,
        userRoles: [{
          id: 'ur1',
          isActive: true,
          organizationId: 'org1',
          role: {
            id: 'owner-role',
            name: RoleType.OWNER,
            level: 3,
            permissions: []
          }
        }]
      };

      mockUserRepository.findOne.mockResolvedValue(ownerUser);
      jest.spyOn(service, 'checkRoleHierarchy').mockResolvedValue(true);

      const result = await service.hasPermission(
        'user1',
        PermissionAction.DELETE,
        PermissionResource.USER
      );

      expect(result).toBe(true);
    });
  });

  describe('checkRoleHierarchy', () => {
    it('should return true for Owner role', async () => {
      const ownerRole = { name: RoleType.OWNER } as Role;

      const result = await service.checkRoleHierarchy(
        ownerRole,
        PermissionAction.MANAGE,
        PermissionResource.ALL
      );

      expect(result).toBe(true);
    });

    it('should return true for Admin role with allowed permissions', async () => {
      const adminRole = { name: RoleType.ADMIN } as Role;

      const result = await service.checkRoleHierarchy(
        adminRole,
        PermissionAction.READ,
        PermissionResource.TASK
      );

      expect(result).toBe(true);
    });

    it('should return false for Admin role with user management in parent org', async () => {
      const adminRole = { name: RoleType.ADMIN } as Role;

      const result = await service.checkRoleHierarchy(
        adminRole,
        PermissionAction.MANAGE,
        PermissionResource.USER
      );

      expect(result).toBe(false);
    });

    it('should return false for Viewer role', async () => {
      const viewerRole = { name: RoleType.VIEWER } as Role;

      const result = await service.checkRoleHierarchy(
        viewerRole,
        PermissionAction.DELETE,
        PermissionResource.TASK
      );

      expect(result).toBe(false);
    });
  });

  describe('canAccessOrganization', () => {
    it('should return true for user accessing own organization', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.canAccessOrganization('user1', 'org1');

      expect(result).toBe(true);
    });

    it('should return true for parent org user accessing child org', async () => {
      const childOrg = { id: 'child-org', parentId: 'org1' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOrganizationRepository.findOne.mockResolvedValue(childOrg);

      const result = await service.canAccessOrganization('user1', 'child-org');

      expect(result).toBe(true);
    });

    it('should return false for user accessing unrelated organization', async () => {
      const unrelatedOrg = { id: 'other-org', parentId: 'different-parent' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOrganizationRepository.findOne.mockResolvedValue(unrelatedOrg);

      const result = await service.canAccessOrganization('user1', 'other-org');

      expect(result).toBe(false);
    });

    it('should return false when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.canAccessOrganization('nonexistent', 'org1');

      expect(result).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return active user roles', async () => {
      const mockUserRoles = [
        {
          id: 'ur1',
          userId: 'user1',
          isActive: true,
          role: { id: 'role1', name: RoleType.ADMIN }
        },
        {
          id: 'ur2',
          userId: 'user1',
          isActive: false,
          role: { id: 'role2', name: RoleType.VIEWER }
        }
      ];

      mockUserRoleRepository.find.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRoles('user1');

      expect(result).toHaveLength(2);
      expect(mockUserRoleRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          isActive: true
        },
        relations: ['role', 'role.permissions']
      });
    });

    it('should filter by organization when provided', async () => {
      mockUserRoleRepository.find.mockResolvedValue([]);

      await service.getUserRoles('user1', 'org1');

      expect(mockUserRoleRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          isActive: true,
          organizationId: 'org1'
        },
        relations: ['role', 'role.permissions']
      });
    });
  });

  describe('assignRole', () => {
    it('should create and save new user role', async () => {
      const mockUserRole = { userId: 'user1', roleId: 'role1', isActive: true };
      
      mockUserRoleRepository.create.mockReturnValue(mockUserRole);
      mockUserRoleRepository.save.mockResolvedValue(mockUserRole);

      const result = await service.assignRole('user1', 'role1', 'org1');

      expect(result).toEqual(mockUserRole);
      expect(mockUserRoleRepository.create).toHaveBeenCalledWith({
        userId: 'user1',
        roleId: 'role1',
        organizationId: 'org1',
        isActive: true
      });
      expect(mockUserRoleRepository.save).toHaveBeenCalledWith(mockUserRole);
    });
  });

  describe('removeRole', () => {
    it('should deactivate user role', async () => {
      await service.removeRole('user1', 'role1', 'org1');

      expect(mockUserRoleRepository.update).toHaveBeenCalledWith(
        {
          userId: 'user1',
          roleId: 'role1',
          organizationId: 'org1'
        },
        { isActive: false }
      );
    });

    it('should work without organization filter', async () => {
      await service.removeRole('user1', 'role1');

      expect(mockUserRoleRepository.update).toHaveBeenCalledWith(
        {
          userId: 'user1',
          roleId: 'role1'
        },
        { isActive: false }
      );
    });
  });
});
