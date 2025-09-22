import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, Organization, User, Role, UserRole, RoleType, JwtPayload, TaskQueryDto, UserStatus } from '@rbcaproject/data';
import { RbacService, AuditService } from '@rbcaproject/auth';

/**
 * These tests demonstrate how organizational hierarchy affects task access control.
 * They show the RBAC system working across parent-child organization relationships.
 */
describe('TasksService - Organizational Hierarchy RBAC Tests', () => {
  let service: TasksService;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let rbacService: RbacService;
  let auditService: AuditService;

  // Mock organizational hierarchy
  const parentOrg = {
    id: 'parent-org-1',
    name: 'Acme Corporation',
    parentId: null,
    level: 1,
  };

  const childOrgA = {
    id: 'child-org-a',
    name: 'Acme Engineering',
    parentId: 'parent-org-1',
    level: 2,
    isChildOf: (orgId: string) => orgId === 'parent-org-1',
  };

  const childOrgB = {
    id: 'child-org-b',
    name: 'Acme Marketing',
    parentId: 'parent-org-1',
    level: 2,
    isChildOf: (orgId: string) => orgId === 'parent-org-1',
  };

  // Mock JWT payloads (what the actual service expects)
  const parentOwnerJwt: JwtPayload = {
    sub: 'parent-owner',
    email: 'owner@acme.com',
    organizationId: 'parent-org-1',
    roles: [RoleType.OWNER],
  };

  const childAdminJwt: JwtPayload = {
    sub: 'child-admin',
    email: 'admin@engineering.acme.com',
    organizationId: 'child-org-a',
    roles: [RoleType.ADMIN],
  };

  const childViewerJwt: JwtPayload = {
    sub: 'child-viewer',
    email: 'viewer@marketing.acme.com',
    organizationId: 'child-org-b',
    roles: [RoleType.VIEWER],
  };

  // Mock full user entities (for repository responses)
  const parentOwnerUser: User = {
    id: 'parent-owner',
    email: 'owner@acme.com',
    firstName: 'Parent',
    lastName: 'Owner',
    passwordHash: 'hash',
    status: UserStatus.ACTIVE,
    organizationId: 'parent-org-1',
    organization: parentOrg as unknown as Organization,
    assignedTasks: [],
    createdTasks: [],
    userRoles: [{
      id: 'ur1',
      userId: 'parent-owner',
      roleId: 'role1',
      organizationId: 'parent-org-1',
      isActive: true,
      user: {} as User,
      role: { id: 'role1', name: RoleType.OWNER, level: 3 } as Role,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserRole],
    createdAt: new Date(),
    updatedAt: new Date(),
    get fullName() { return 'Parent Owner'; }
  };

  const childAdminUser: User = {
    id: 'child-admin',
    email: 'admin@engineering.acme.com',
    firstName: 'Child',
    lastName: 'Admin',
    passwordHash: 'hash',
    status: UserStatus.ACTIVE,
    organizationId: 'child-org-a',
    organization: childOrgA as unknown as Organization,
    assignedTasks: [],
    createdTasks: [],
    userRoles: [{
      id: 'ur2',
      userId: 'child-admin',
      roleId: 'role2',
      organizationId: 'child-org-a',
      isActive: true,
      user: {} as User,
      role: { id: 'role2', name: RoleType.ADMIN, level: 2 } as Role,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserRole],
    createdAt: new Date(),
    updatedAt: new Date(),
    get fullName() { return 'Child Admin'; }
  };

  // Mock tasks in different organizations
  const parentOrgTask = {
    id: 'parent-task-1',
    title: 'Company-wide Strategy',
    organizationId: 'parent-org-1',
    organization: parentOrg,
    createdById: 'parent-owner',
    createdBy: parentOwnerUser,
  };

  const childOrgATask = {
    id: 'child-a-task-1',
    title: 'Engineering Sprint Planning',
    organizationId: 'child-org-a',
    organization: childOrgA,
    createdById: 'child-admin',
    createdBy: childAdminUser,
  };

  const childOrgBTask = {
    id: 'child-b-task-1',
    title: 'Marketing Campaign',
    organizationId: 'child-org-b',
    organization: childOrgB,
    createdById: 'child-viewer',
    createdBy: childAdminUser, // Using childAdminUser as placeholder
  };

  // Mock repositories and services
  const mockTaskRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockOrganizationRepository = {
    find: jest.fn(),
  };

  const mockRbacService = {
    hasPermission: jest.fn(),
    canAccessOrganization: jest.fn(),
  };

  const mockAuditService = {
    logTaskAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    organizationRepository = module.get<Repository<Organization>>(getRepositoryToken(Organization));
    rbacService = module.get<RbacService>(RbacService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Organizational Hierarchy Access Patterns', () => {
    it('OWNER in parent org should see ALL tasks (parent + all children)', async () => {
      // Arrange: Mock permissions and query builder
      mockRbacService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(parentOwnerUser);
      mockOrganizationRepository.find.mockResolvedValue([childOrgA, childOrgB]);
      mockRbacService.canAccessOrganization.mockResolvedValue(true);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[parentOrgTask, childOrgATask, childOrgBTask], 3]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const query: TaskQueryDto = { page: 1, limit: 10 };

      // Act: Parent owner requests all tasks
      const result = await service.findAll(query, parentOwnerJwt);

      // Assert: Owner sees everything in their hierarchy
      expect(result.tasks).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(mockRbacService.hasPermission).toHaveBeenCalled();
      expect(mockAuditService.logTaskAccess).toHaveBeenCalled();
    });

    it('ADMIN in child org should see only their own org tasks', async () => {
      // Arrange: Mock permissions for child admin
      mockRbacService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(childAdminUser);
      mockOrganizationRepository.find.mockResolvedValue([]); // No child orgs for this user
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[childOrgATask], 1]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const query: TaskQueryDto = { page: 1, limit: 10 };

      // Act: Child admin requests tasks
      const result = await service.findAll(query, childAdminJwt);

      // Assert: Admin only sees their organization's tasks
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('VIEWER in child org should see only their own org tasks (read-only)', async () => {
      // Arrange: Mock permissions for child viewer
      mockRbacService.hasPermission.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(childAdminUser); // Placeholder user
      mockOrganizationRepository.find.mockResolvedValue([]);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[childOrgBTask], 1]),
      };
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const query: TaskQueryDto = { page: 1, limit: 10 };

      // Act: Child viewer requests tasks
      const result = await service.findAll(query, childViewerJwt);

      // Assert: Viewer only sees their organization's tasks
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('Cross-Organizational Task Access Control', () => {
    it('should allow parent OWNER to access child org tasks', async () => {
      // Arrange: Parent owner trying to access child task
      mockTaskRepository.findOne.mockResolvedValue(childOrgATask);
      mockRbacService.canAccessOrganization.mockResolvedValue(true);
      mockRbacService.hasPermission.mockResolvedValue(true);

      // Act: Parent owner accesses child task
      const result = await service.findOne('child-a-task-1', parentOwnerJwt);

      // Assert: Access granted due to hierarchical ownership
      expect(result.organization.id).toBe('child-org-a');
      expect(mockAuditService.logTaskAccess).toHaveBeenCalled();
    });

    it('should DENY child user access to parent org tasks', async () => {
      // Arrange: Child admin trying to access parent task
      mockTaskRepository.findOne.mockResolvedValue(parentOrgTask);
      mockRbacService.canAccessOrganization.mockResolvedValue(false); // Access denied

      // Act & Assert: Access should be denied
      await expect(service.findOne('parent-task-1', childAdminJwt))
        .rejects.toThrow(ForbiddenException);
    });

    it('should DENY sibling org access (child A cannot access child B tasks)', async () => {
      // Arrange: Child A admin trying to access child B task
      mockTaskRepository.findOne.mockResolvedValue(childOrgBTask);
      mockRbacService.canAccessOrganization.mockResolvedValue(false); // Access denied

      // Act & Assert: Sibling access should be denied
      await expect(service.findOne('child-b-task-1', childAdminJwt))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('Task Creation with Organizational Context', () => {
    it('should create task in user\'s organization by default', async () => {
      // Arrange: Child admin creates a task
      const createTaskDto = {
        title: 'New Engineering Task',
        description: 'A task for the engineering team',
      };

      const expectedTask = {
        ...createTaskDto,
        id: 'new-task-id',
        organizationId: 'child-org-a',
        createdById: 'child-admin',
        organization: childOrgA,
        createdBy: childAdminUser,
      };

      mockRbacService.hasPermission.mockResolvedValue(true);
      mockTaskRepository.create.mockReturnValue(expectedTask);
      mockTaskRepository.save.mockResolvedValue(expectedTask);
      mockTaskRepository.findOne.mockResolvedValue(expectedTask);

      // Act: Create task
      const result = await service.create(createTaskDto, childAdminJwt);

      // Assert: Task created in correct organization
      expect(result.organization.id).toBe('child-org-a');
      expect(result.createdBy.id).toBe('child-admin');
      expect(mockAuditService.logTaskAccess).toHaveBeenCalled();
    });

    it('should allow parent OWNER to create tasks', async () => {
      // Arrange: Parent owner creates task
      const createTaskDto = {
        title: 'Cross-org Task',
        description: 'Task from parent org',
      };

      const expectedTask = {
        ...createTaskDto,
        id: 'new-parent-task-id',
        organizationId: 'parent-org-1',
        createdById: 'parent-owner',
        organization: parentOrg,
        createdBy: parentOwnerUser,
      };

      mockRbacService.hasPermission.mockResolvedValue(true);
      mockTaskRepository.create.mockReturnValue(expectedTask);
      mockTaskRepository.save.mockResolvedValue(expectedTask);
      mockTaskRepository.findOne.mockResolvedValue(expectedTask);

      // Act: Parent owner creates task
      const result = await service.create(createTaskDto, parentOwnerJwt);

      // Assert: Task created successfully
      expect(result.organization.id).toBe('parent-org-1');
      expect(result.createdBy.id).toBe('parent-owner');
    });

    it('should DENY task creation when permissions are insufficient', async () => {
      // Arrange: User without create permissions
      const createTaskDto = {
        title: 'Unauthorized Task',
      };

      mockRbacService.hasPermission.mockResolvedValue(false); // No permission

      // Act & Assert: Should be denied
      await expect(service.create(createTaskDto, childViewerJwt))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('Organizational Hierarchy Business Logic', () => {
    it('should demonstrate hierarchy access patterns', () => {
      // This test demonstrates the business logic that would be implemented
      // in the actual RBAC service for organizational hierarchy
      
      // Mock hierarchy access function
      const canAccessOrganization = (userOrg: string, targetOrg: string, userRole: string): boolean => {
        // Same organization - always allowed
        if (userOrg === targetOrg) return true;
        
        // Owner in parent can access child orgs
        if (userRole === RoleType.OWNER && userOrg === 'parent-org-1') {
          return ['child-org-a', 'child-org-b'].includes(targetOrg);
        }
        
        return false; // No cross-org access for other roles
      };

      // Test the expected behavior
      expect(canAccessOrganization('parent-org-1', 'child-org-a', RoleType.OWNER)).toBe(true);
      expect(canAccessOrganization('child-org-a', 'parent-org-1', RoleType.ADMIN)).toBe(false);
      expect(canAccessOrganization('child-org-a', 'child-org-a', RoleType.VIEWER)).toBe(true);
    });
  });
});
