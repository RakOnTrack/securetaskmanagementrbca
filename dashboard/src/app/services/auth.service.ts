import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  user: UserProfile;
}

export interface UserProfile {
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
    name: string;
    displayName: string;
    level: number;
    permissions: Array<{
      action: string;
      resource: string;
      identifier: string;
    }>;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Load user from localStorage on init
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('current_user');
    
    if (token && user) {
      this.tokenSubject.next(token);
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, userData)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  hasPermission(action: string, resource: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    return user.roles.some(role =>
      role.permissions.some(permission =>
        (permission.action === action || permission.action === 'manage') &&
        (permission.resource === resource || permission.resource === 'all')
      )
    );
  }

  hasRole(roleName: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    return user.roles.some(role => role.name === roleName);
  }

  private setSession(authResponse: AuthResponse): void {
    localStorage.setItem('access_token', authResponse.access_token);
    localStorage.setItem('current_user', JSON.stringify(authResponse.user));
    this.tokenSubject.next(authResponse.access_token);
    this.currentUserSubject.next(authResponse.user);
  }
}
