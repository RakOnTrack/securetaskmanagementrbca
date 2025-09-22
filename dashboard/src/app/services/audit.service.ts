import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  userId?: string;
  organizationId: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export interface AuditLogQuery {
  action?: string;
  resource?: string;
  userId?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getAuditLogs(query?: AuditLogQuery): Observable<AuditLogsResponse> {
    let params = new HttpParams();
    
    if (query) {
      Object.keys(query).forEach(key => {
        const value = (query as any)[key];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<AuditLogsResponse>(`${this.API_URL}/audit-log`, { params });
  }

  exportAuditLogs(query?: AuditLogQuery): Observable<Blob> {
    let params = new HttpParams();
    
    if (query) {
      Object.keys(query).forEach(key => {
        const value = (query as any)[key];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.API_URL}/audit-log/export`, { 
      params, 
      responseType: 'blob' 
    });
  }
}
