// Import necessary testing utilities from NestJS
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

// Mock bcrypt library at the module level to control password comparison behavior in tests
// This allows us to simulate both successful and failed password comparisons without actual hashing
jest.mock('bcrypt', () => ({
  compare: jest.fn(), // Mock function to simulate password comparison
  hash: jest.fn(),    // Mock function to simulate password hashing
}));

const bcrypt = require('bcrypt');
import { User, Organization, Role, UserRole, RoleType } from '@rbcaproject/data';
import { AuditService } from '@rbcaproject/auth';

describe('AuthService', () => {
  // Declare variables to hold service instances for testing
  let service: AuthService;

  // Mock user object that represents a typical user in the system
  // This is used across multiple tests to simulate database responses
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$2b$10$hashedpassword', // Simulated bcrypt hash
    organizationId: 'org1',
    organization: { id: 'org1', name: 'Test Org' },
    userRoles: [{
      id: 'ur1',
      isActive: true,
      role: { id: 'r1', name: RoleType.VIEWER, permissions: [] }
    }]
  };

  // Mock repository objects that simulate database operations without actual database calls
  // Each mock provides the methods that the AuthService depends on
  const mockUserRepository = {
    findOne: jest.fn(), // Mock finding a user by criteria (email, ID, etc.)
    create: jest.fn(),  // Mock creating a new user entity
    save: jest.fn(),    // Mock saving a user to the database
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(), // Mock finding an organization by ID
  };

  const mockRoleRepository = {
    findOne: jest.fn(), // Mock finding a role by name or ID
  };

  const mockUserRoleRepository = {
    save: jest.fn(), // Mock saving user-role relationships
  };

  // Mock JWT service to simulate token generation without actual JWT operations
  const mockJwtService = {
    sign: jest.fn(), // Mock JWT token signing
  };

  // Mock audit service to simulate logging without actual audit operations
  const mockAuditService = {
    logAuthentication: jest.fn(), // Mock authentication event logging
  };

  // This runs before each test to set up a fresh testing module
  // It creates an isolated testing environment with mocked dependencies
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService, // The actual service we're testing
        // Replace real dependencies with mock implementations
        {
          provide: getRepositoryToken(User), // NestJS way to inject TypeORM repositories
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: mockUserRoleRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile(); // Compile the testing module

    // Extract the service instance from the testing module for use in tests
    service = module.get<AuthService>(AuthService);
  });

  // Clean up after each test to ensure no mock state carries over between tests
  afterEach(() => {
    jest.clearAllMocks(); // Reset all mock function call counts and return values
  });

  // Test suite for the validateUser method
  // This method is used to verify user credentials during login
  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      // Arrange: Set up mock responses for successful validation
      mockUserRepository.findOne.mockResolvedValue(mockUser); // Simulate finding the user
      bcrypt.compare.mockResolvedValue(true); // Simulate password match

      // Act: Call the method we're testing
      const result = await service.validateUser('test@example.com', 'password');

      // Assert: Verify the expected behavior
      expect(result).toEqual(mockUser); // Should return the user object
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        // Verify it loads all necessary related data for authorization
        relations: ['organization', 'userRoles', 'userRoles.role', 'userRoles.role.permissions']
      });
    });

    it('should return null when user does not exist', async () => {
      // Arrange: Simulate user not found in database
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act: Try to validate non-existent user
      const result = await service.validateUser('nonexistent@example.com', 'password');

      // Assert: Should return null for security (don't reveal if email exists)
      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      // Arrange: User exists but password comparison fails
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); // Simulate password mismatch

      // Act: Try to validate with wrong password
      const result = await service.validateUser('test@example.com', 'wrongpassword');

      // Assert: Should return null for invalid credentials
      expect(result).toBeNull();
    });
  });

  // Test suite for the login method
  // This method handles the complete login flow: validation, token generation, and audit logging
  describe('login', () => {
    it('should return access token and user profile on successful login', async () => {
      // Arrange: Prepare login data and expected responses
      const loginDto = { email: 'test@example.com', password: 'password' };
      const mockToken = 'mock.jwt.token';

      // Mock the validateUser method to return a valid user
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as User);
      // Mock JWT service to return a token
      mockJwtService.sign.mockReturnValue(mockToken);

      // Act: Perform the login
      const result = await service.login(loginDto);

      // Assert: Verify successful login response structure
      expect(result).toHaveProperty('access_token', mockToken);
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      // Verify that successful login is logged for audit purposes
      expect(mockAuditService.logAuthentication).toHaveBeenCalledWith(
        'login',                    // Action type
        mockUser.id,               // User ID
        mockUser.organizationId,   // Organization ID
        true,                      // Success flag
        undefined,                 // No error message
        undefined                  // No additional details
      );
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      // Arrange: Prepare invalid login attempt
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };

      // Mock validateUser to return null (invalid credentials)
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      // Act & Assert: Verify that invalid login throws the correct exception
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      // Verify that failed login attempt is logged for security monitoring
      expect(mockAuditService.logAuthentication).toHaveBeenCalledWith(
        'login',                    // Action type
        undefined,                  // No user ID (login failed)
        undefined,                  // No organization ID
        false,                      // Success flag = false
        'Invalid credentials',      // Error message
        undefined                   // No additional details
      );
    });
  });

  // Test suite for the register method
  // This method handles user registration: validation, user creation, role assignment, and token generation
  describe('register', () => {
    it('should create new user and return access token', async () => {
      // Arrange: Prepare registration data and mock responses for successful registration
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        organizationId: 'org1',
        role: RoleType.VIEWER
      };

      const mockOrganization = { id: 'org1', name: 'Test Org' };
      const mockRole = { id: 'r1', name: RoleType.VIEWER };
      const mockToken = 'mock.jwt.token';

      // Set up the sequence of mock calls that represent successful registration flow
      mockUserRepository.findOne.mockResolvedValueOnce(null); // 1. Check user doesn't exist
      mockOrganizationRepository.findOne.mockResolvedValue(mockOrganization); // 2. Verify organization exists
      mockUserRepository.create.mockReturnValue(mockUser); // 3. Create user entity
      mockUserRepository.save.mockResolvedValue(mockUser); // 4. Save user to database
      mockRoleRepository.findOne.mockResolvedValue(mockRole); // 5. Find the requested role
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser); // 6. Reload user with relations
      mockJwtService.sign.mockReturnValue(mockToken); // 7. Generate JWT token

      // Act: Perform the registration
      const result = await service.register(registerDto);

      // Assert: Verify successful registration response
      expect(result).toHaveProperty('access_token', mockToken);
      expect(result).toHaveProperty('user');
      // Verify that the user was saved to the database
      expect(mockUserRepository.save).toHaveBeenCalled();
      // Verify that the user-role relationship was created
      expect(mockUserRoleRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange: Prepare registration attempt for existing user
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
        organizationId: 'org1'
      };

      // Mock finding an existing user with the same email
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert: Verify that duplicate email registration is rejected
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if organization does not exist', async () => {
      // Arrange: Prepare registration for non-existent organization
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        organizationId: 'nonexistent'
      };

      // Mock user doesn't exist (good) but organization doesn't exist (bad)
      mockUserRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      // Act & Assert: Verify that registration with invalid organization is rejected
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });
});
