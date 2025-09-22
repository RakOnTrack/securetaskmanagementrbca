import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { 
  AuditLog,
  AuditAction,
  JwtPayload,
  RoleType,
  PermissionAction,
  PermissionResource
} from '@rbcaproject/data';
import { 
  JwtAuthGuard, 
  PermissionsGuard, 
  RequirePermissions, 
  CurrentUser,
  AuditService,
  RbacService
} from '@rbcaproject/auth';

interface AuditQueryDto {
  userId?: string;
  resource?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Controller('audit-log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly rbacService: RbacService,
  ) {}

  @Get()
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.AUDIT_LOG })
  async getAuditLogs(
    @Query() query: AuditQueryDto,
    @CurrentUser() user: JwtPayload,
    @Request() req
  ): Promise<{ logs: AuditLog[]; total: number }> {
    // Only Owner and Admin can access audit logs
    const hasOwnerOrAdminRole = user.roles.includes(RoleType.OWNER) || user.roles.includes(RoleType.ADMIN);
    
    if (!hasOwnerOrAdminRole) {
      throw new ForbiddenException('Only Owners and Admins can access audit logs');
    }

    const options = {
      userId: query.userId,
      resource: query.resource,
      action: query.action,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? parseInt(query.page.toString()) : 1,
      limit: query.limit ? parseInt(query.limit.toString()) : 50,
    };

    const result = await this.auditService.getAuditLogs(user.organizationId, options);

    // Log audit log access
    await this.auditService.log(
      AuditAction.READ,
      'audit_log',
      user.sub,
      user.organizationId,
      { query: options, count: result.logs.length },
      undefined,
      true,
      undefined,
      req.ip,
      req.get('User-Agent')
    );

    return result;
  }

  @Get('export')
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.AUDIT_LOG })
  async exportAuditLogs(
    @Query() query: AuditQueryDto,
    @CurrentUser() user: JwtPayload,
    @Request() req,
    @Res() res: Response
  ): Promise<void> {
    // Only Owner and Admin can export audit logs
    const hasOwnerOrAdminRole = user.roles.includes(RoleType.OWNER) || user.roles.includes(RoleType.ADMIN);
    
    if (!hasOwnerOrAdminRole) {
      throw new ForbiddenException('Only Owners and Admins can export audit logs');
    }

    const options = {
      userId: query.userId,
      resource: query.resource,
      action: query.action,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: 1,
      limit: 10000, // Export all for CSV
    };

    const result = await this.auditService.getAuditLogs(user.organizationId, options);

    // Generate CSV content
    const csvHeader = 'Date,Action,Resource,User,Email,IP Address,Status,Error\n';
    const csvRows = result.logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.action,
      log.resource,
      log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
      log.user ? log.user.email : 'Unknown',
      log.ipAddress || 'Unknown',
      log.success ? 'Success' : 'Failed',
      log.errorMessage || ''
    ].join(',')).join('\n');

    const csvContent = csvHeader + csvRows;

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Log the export action
    await this.auditService.log(
      AuditAction.READ,
      'audit_log',
      user.sub,
      user.organizationId,
      { action: 'export', count: result.logs.length },
      undefined,
      true,
      undefined,
      req.ip,
      req.get('User-Agent')
    );

    res.send(csvContent);
  }
}
