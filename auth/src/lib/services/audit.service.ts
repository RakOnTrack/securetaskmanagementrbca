import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '@rbcaproject/data';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    action: AuditAction,
    resource: string,
    userId?: string,
    organizationId?: string,
    details?: any,
    resourceId?: string,
    success: boolean = true,
    errorMessage?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      action,
      resource,
      resourceId,
      userId,
      organizationId,
      details: details ? JSON.stringify(details) : null,
      success,
      errorMessage,
      ipAddress,
      userAgent
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async logTaskAccess(
    action: AuditAction,
    taskId: string,
    userId: string,
    organizationId: string,
    details?: any,
    success: boolean = true,
    errorMessage?: string,
    request?: any
  ): Promise<AuditLog> {
    return this.log(
      action,
      'task',
      userId,
      organizationId,
      details,
      taskId,
      success,
      errorMessage,
      request?.ip,
      request?.get('User-Agent')
    );
  }

  async logUserAccess(
    action: AuditAction,
    targetUserId: string,
    currentUserId: string,
    organizationId: string,
    details?: any,
    success: boolean = true,
    errorMessage?: string,
    request?: any
  ): Promise<AuditLog> {
    return this.log(
      action,
      'user',
      currentUserId,
      organizationId,
      details,
      targetUserId,
      success,
      errorMessage,
      request?.ip,
      request?.get('User-Agent')
    );
  }

  async logAuthentication(
    action: AuditAction,
    userId?: string,
    organizationId?: string,
    success: boolean = true,
    errorMessage?: string,
    request?: any
  ): Promise<AuditLog> {
    return this.log(
      action,
      'auth',
      userId,
      organizationId,
      null,
      null,
      success,
      errorMessage,
      request?.ip,
      request?.get('User-Agent')
    );
  }

  async getAuditLogs(
    organizationId: string,
    options?: {
      userId?: string;
      resource?: string;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const query = this.auditLogRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.organizationId = :organizationId', { organizationId });

    if (options?.userId) {
      query.andWhere('audit.userId = :userId', { userId: options.userId });
    }

    if (options?.resource) {
      query.andWhere('audit.resource = :resource', { resource: options.resource });
    }

    if (options?.action) {
      query.andWhere('audit.action = :action', { action: options.action });
    }

    if (options?.startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
    }

    query.orderBy('audit.createdAt', 'DESC');

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    const [logs, total] = await query
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }
}
