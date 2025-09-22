import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '@rbcaproject/data';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { RbacService } from '../services/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('RBAC_SERVICE') private rbacService: RbacService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user }: { user: JwtPayload } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }

    // Check if user has all required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.rbacService.hasPermission(
        user.sub,
        permission.action,
        permission.resource,
        user.organizationId
      );
      
      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }
}
