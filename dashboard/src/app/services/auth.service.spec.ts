import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService, LoginRequest, RegisterRequest, AuthResponse } from './auth.service';

// Mock Router
const mockRouter = {
  navigate: jest.fn()
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: any;

  const mockAuthResponse: AuthResponse = {
    access_token: 'mock.jwt.token',
    user: {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      organizationId: 'org1',
      organization: {
        id: 'org1',
        name: 'Test Organization'
      },
      roles: [{
        id: 'role1',
        name: 'viewer',
        displayName: 'Viewer',
        level: 1,
        permissions: [{
          action: 'read',
          resource: 'task',
          identifier: 'read:task'
        }]
      }]
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login user and store session', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      service.login(loginRequest).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(localStorage.getItem('access_token')).toBe(mockAuthResponse.access_token);
        expect(localStorage.getItem('current_user')).toBe(JSON.stringify(mockAuthResponse.user));
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginRequest);
      req.flush(mockAuthResponse);
    });

    it('should handle login error', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      service.login(loginRequest).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(localStorage.getItem('access_token')).toBeNull();
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('register', () => {
    it('should register user and store session', () => {
      const registerRequest: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        organizationId: 'org1'
      };

      service.register(registerRequest).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(localStorage.getItem('access_token')).toBe(mockAuthResponse.access_token);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerRequest);
      req.flush(mockAuthResponse);
    });
  });

  describe('logout', () => {
    it('should clear session and navigate to login', () => {
      // Set up initial session
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('current_user', JSON.stringify(mockAuthResponse.user));

      service.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('current_user')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('access_token', 'token');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when token does not exist', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      const token = 'test.jwt.token';
      localStorage.setItem('access_token', token);
      
      expect(service.getToken()).toBe(token);
    });

    it('should return null when no token exists', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('hasPermission', () => {
    beforeEach(() => {
      localStorage.setItem('current_user', JSON.stringify(mockAuthResponse.user));
      // Trigger the subject update
      service['currentUserSubject'].next(mockAuthResponse.user);
    });

    it('should return true when user has required permission', () => {
      const result = service.hasPermission('read', 'task');
      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', () => {
      const result = service.hasPermission('delete', 'task');
      expect(result).toBe(false);
    });

    it('should return true when user has manage permission', () => {
      const userWithManagePermission = {
        ...mockAuthResponse.user,
        roles: [{
          ...mockAuthResponse.user.roles[0],
          permissions: [{
            action: 'manage',
            resource: 'task',
            identifier: 'manage:task'
          }]
        }]
      };

      service['currentUserSubject'].next(userWithManagePermission);

      const result = service.hasPermission('delete', 'task');
      expect(result).toBe(true);
    });

    it('should return true when user has all resource permission', () => {
      const userWithAllPermission = {
        ...mockAuthResponse.user,
        roles: [{
          ...mockAuthResponse.user.roles[0],
          permissions: [{
            action: 'read',
            resource: 'all',
            identifier: 'read:all'
          }]
        }]
      };

      service['currentUserSubject'].next(userWithAllPermission);

      const result = service.hasPermission('read', 'user');
      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      service['currentUserSubject'].next(null);

      const result = service.hasPermission('read', 'task');
      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    beforeEach(() => {
      localStorage.setItem('current_user', JSON.stringify(mockAuthResponse.user));
      service['currentUserSubject'].next(mockAuthResponse.user);
    });

    it('should return true when user has the role', () => {
      const result = service.hasRole('viewer');
      expect(result).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      const result = service.hasRole('admin');
      expect(result).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      service['currentUserSubject'].next(null);

      const result = service.hasRole('viewer');
      expect(result).toBe(false);
    });
  });

  describe('initialization', () => {
    it('should load user from localStorage on init', () => {
      localStorage.setItem('access_token', mockAuthResponse.access_token);
      localStorage.setItem('current_user', JSON.stringify(mockAuthResponse.user));

      // Create new service instance to test initialization
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule), routerSpy);

      expect(newService.getToken()).toBe(mockAuthResponse.access_token);
      expect(newService.getCurrentUser()).toEqual(mockAuthResponse.user);
    });
  });
});
