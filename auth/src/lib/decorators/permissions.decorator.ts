import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@rbcaproject/data';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  action: PermissionAction;
  resource: PermissionResource;
}

export const RequirePermissions = (...permissions: RequiredPermission[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);
