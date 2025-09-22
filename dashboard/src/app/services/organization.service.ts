import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: {
    id: string;
    name: string;
  };
  children: Array<{
    id: string;
    name: string;
  }>;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  parentId?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  parentId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.API_URL}/organizations`);
  }

  getOrganization(id: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.API_URL}/organizations/${id}`);
  }

  createOrganization(org: CreateOrganizationRequest): Observable<Organization> {
    return this.http.post<Organization>(`${this.API_URL}/organizations`, org);
  }

  updateOrganization(id: string, org: UpdateOrganizationRequest): Observable<Organization> {
    return this.http.patch<Organization>(`${this.API_URL}/organizations/${id}`, org);
  }

  deleteOrganization(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/organizations/${id}`);
  }
}
