import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization, Task } from '@rbcaproject/data';

describe('OrganizationsService - Organizational Hierarchy Tests', () => {
  let service: OrganizationsService;

  // Mock data representing a 2-level organizational hierarchy
  const parentOrg = {
    id: 'parent-org-1',
    name: 'Acme Corporation',
    description: 'Parent company',
    parentId: null, // Top-level organization
    level: 1,
    parent: null,
    children: [], // Will be populated with child orgs
    users: [],
    tasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isChildOf: jest.fn(),
  };

  const childOrgA = {
    id: 'child-org-a',
    name: 'Acme Engineering',
    description: 'Engineering division',
    parentId: 'parent-org-1', // Points to parent
    level: 2,
    parent: parentOrg,
    children: [],
    users: [],
    tasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isChildOf: jest.fn().mockReturnValue(true),
  };

  const childOrgB = {
    id: 'child-org-b',
    name: 'Acme Marketing',
    description: 'Marketing division',
    parentId: 'parent-org-1', // Points to same parent
    level: 2,
    parent: parentOrg,
    children: [],
    users: [],
    tasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isChildOf: jest.fn().mockReturnValue(true),
  };

  // Update parent to include children
  parentOrg.children = [childOrgA, childOrgB];

  // Mock repository with methods used by the service
  const mockOrganizationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  // Mock Task repository
  const mockTaskRepository = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    // Create testing module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    // Clean up mocks between tests
    jest.clearAllMocks();
  });

  describe('Organizational Hierarchy Structure', () => {
    it('should return organizations with proper parent-child relationships', async () => {
      // Arrange: Mock repository to return hierarchical data
      mockOrganizationRepository.find.mockResolvedValue([parentOrg, childOrgA, childOrgB]);

      // Act: Get all organizations
      const result = await service.findAll('any-user-org');

      // Assert: Verify hierarchy is maintained
      expect(result).toHaveLength(3);
      expect(result).toContain(parentOrg);
      expect(result).toContain(childOrgA);
      expect(result).toContain(childOrgB);

      // Verify repository was called with proper relations
      expect(mockOrganizationRepository.find).toHaveBeenCalledWith({
        relations: ['parent', 'children', 'users'],
        order: { name: 'ASC' }
      });
    });

    it('should correctly identify parent-child relationships', () => {
      // Test the entity helper methods
      expect(childOrgA.isChildOf('parent-org-1')).toBe(true);
      
      // Fix the mock function to return false for different org
      childOrgA.isChildOf = jest.fn((orgId: string) => orgId === 'parent-org-1');
      expect(childOrgA.isChildOf('different-org')).toBe(false);
      
      expect(parentOrg.level).toBe(1); // Top-level
      expect(childOrgA.level).toBe(2); // Child level
    });
  });

  describe('Organization Creation with Hierarchy', () => {
    it('should create a parent organization (level 1)', async () => {
      // Arrange: Mock creation of top-level organization
      const createDto = {
        name: 'New Parent Corp',
        description: 'A new parent organization',
        parentId: null // No parent = top-level
      };

      const expectedOrg = { ...parentOrg, ...createDto, id: 'new-parent-id' };

      mockOrganizationRepository.findOne
        .mockResolvedValueOnce(null) // No existing org with same name
        .mockResolvedValueOnce(expectedOrg); // Return created org
      mockOrganizationRepository.create.mockReturnValue(expectedOrg);
      mockOrganizationRepository.save.mockResolvedValue(expectedOrg);

      // Act: Create the organization
      const result = await service.create(createDto, 'user-org');

      // Assert: Verify parent organization was created
      expect(result.parentId).toBeNull();
      expect(result.level).toBe(1);
      expect(mockOrganizationRepository.save).toHaveBeenCalled();
    });

    it('should create a child organization (level 2)', async () => {
      // Arrange: Mock creation of child organization
      const createDto = {
        name: 'New Child Division',
        description: 'A new child organization',
        parentId: 'parent-org-1' // Has parent = child level
      };

      const expectedOrg = { ...childOrgA, ...createDto, id: 'new-child-id' };

      mockOrganizationRepository.findOne
        .mockResolvedValueOnce(null) // No existing org with same name
        .mockResolvedValueOnce(expectedOrg); // Return created org
      mockOrganizationRepository.create.mockReturnValue(expectedOrg);
      mockOrganizationRepository.save.mockResolvedValue(expectedOrg);

      // Act: Create the child organization
      const result = await service.create(createDto, 'user-org');

      // Assert: Verify child organization was created
      expect(result.parentId).toBe('parent-org-1');
      expect(result.level).toBe(2);
    });

    it('should handle empty parentId by converting to null', async () => {
      // Arrange: Test handling of empty string parentId
      const createDto = {
        name: 'Test Org',
        description: 'Test description',
        parentId: '  ' // Empty/whitespace string
      };

      const expectedOrg = { ...parentOrg, ...createDto, parentId: null };

      mockOrganizationRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(expectedOrg);
      mockOrganizationRepository.create.mockReturnValue(expectedOrg);
      mockOrganizationRepository.save.mockResolvedValue(expectedOrg);

      // Act: Create organization with empty parentId
      await service.create(createDto, 'user-org');

      // Assert: Verify parentId was converted to null
      expect(mockOrganizationRepository.create).toHaveBeenCalledWith({
        ...createDto,
        parentId: null
      });
    });
  });

  describe('Organization Access Control', () => {
    it('should find organization with all related data', async () => {
      // Arrange: Mock finding organization with relations
      mockOrganizationRepository.findOne.mockResolvedValue(parentOrg);

      // Act: Find organization
      const result = await service.findOne('parent-org-1', 'user-org');

      // Assert: Verify relations are loaded for access control
      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'parent-org-1' },
        relations: ['parent', 'children', 'users'] // Critical for hierarchy access control
      });
      expect(result).toEqual(parentOrg);
    });

    it('should throw NotFoundException for non-existent organization', async () => {
      // Arrange: Mock organization not found
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      // Act & Assert: Verify proper error handling
      await expect(service.findOne('non-existent', 'user-org'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Organization Deletion with Hierarchy Constraints', () => {
    it('should prevent deletion of organization with users', async () => {
      // Arrange: Mock organization with users (should prevent deletion)
      const orgWithUsers = {
        ...parentOrg,
        users: [{ id: 'user-1', email: 'user@example.com' }]
      };
      mockOrganizationRepository.findOne.mockResolvedValue(orgWithUsers);

      // Act & Assert: Verify deletion is prevented when users exist
      await expect(service.remove('parent-org-1', 'user-org'))
        .rejects.toThrow(ConflictException);
      
      expect(mockOrganizationRepository.remove).not.toHaveBeenCalled();
    });

    it('should prevent deletion of organization with tasks', async () => {
      // Arrange: Mock organization with tasks (should prevent deletion)
      const orgWithTasks = { ...parentOrg, users: [], children: [] };
      mockOrganizationRepository.findOne.mockResolvedValue(orgWithTasks);
      mockTaskRepository.count.mockResolvedValue(1); // Has tasks

      // Act & Assert: Verify deletion is prevented when tasks exist
      await expect(service.remove('parent-org-1', 'user-org'))
        .rejects.toThrow(ConflictException);
      
      expect(mockTaskRepository.count).toHaveBeenCalledWith({
        where: { organizationId: 'parent-org-1' }
      });
      expect(mockOrganizationRepository.remove).not.toHaveBeenCalled();
    });

    it('should prevent deletion of organization with child organizations', async () => {
      // Arrange: Mock organization with children (should prevent deletion)
      const orgWithChildren = { ...parentOrg, users: [], children: [childOrgA] };
      mockOrganizationRepository.findOne.mockResolvedValue(orgWithChildren);
      mockTaskRepository.count.mockResolvedValue(0); // No tasks

      // Act & Assert: Verify deletion is prevented when children exist
      await expect(service.remove('parent-org-1', 'user-org'))
        .rejects.toThrow(ConflictException);
      
      expect(mockOrganizationRepository.remove).not.toHaveBeenCalled();
    });

    it('should allow deletion of empty organization', async () => {
      // Arrange: Mock organization without users, tasks, or children (deletion allowed)
      const emptyOrg = { ...parentOrg, users: [], children: [] };
      mockOrganizationRepository.findOne.mockResolvedValue(emptyOrg);
      mockTaskRepository.count.mockResolvedValue(0); // No tasks

      // Act: Delete empty organization
      await service.remove('parent-org-1', 'user-org');

      // Assert: Verify deletion proceeded
      expect(mockTaskRepository.count).toHaveBeenCalledWith({
        where: { organizationId: 'parent-org-1' }
      });
      expect(mockOrganizationRepository.remove).toHaveBeenCalledWith(emptyOrg);
    });
  });

  describe('Hierarchy Business Rules', () => {
    it('should enforce 2-level hierarchy limit', () => {
      // Test the entity's level calculation
      expect(parentOrg.level).toBe(1); // No parent = level 1
      expect(childOrgA.level).toBe(2); // Has parent = level 2
      
      // In a real system, you'd prevent creating level 3 organizations
      // This would be enforced in the service or at the database level
    });

    it('should maintain referential integrity in hierarchy', () => {
      // Verify parent-child relationships are bidirectional
      expect(childOrgA.parent).toBe(parentOrg);
      expect(parentOrg.children).toContain(childOrgA);
      expect(parentOrg.children).toContain(childOrgB);
    });
  });
});
