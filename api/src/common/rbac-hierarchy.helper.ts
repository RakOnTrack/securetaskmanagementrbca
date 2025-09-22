import { User, Organization, RoleType } from '@rbcaproject/data';

/**
 * Helper class for implementing Role-Based Access Control (RBAC) with organizational hierarchy.
 * This demonstrates how to check permissions across parent-child organization relationships.
 */
export class RBACHierarchyHelper {
  
  /**
   * Determines if a user can access a resource in a target organization.
   * Implements the 2-level hierarchy access rules from the challenge requirements.
   */
  static canAccessOrganization(
    user: User,
    targetOrganizationId: string,
    requiredAction: 'read' | 'write' | 'delete' = 'read'
  ): boolean {
    const userRole = this.getUserHighestRole(user);
    const userOrgId = user.organizationId;

    // Same organization - always allowed (subject to role permissions)
    if (userOrgId === targetOrganizationId) {
      return this.hasRolePermission(userRole, requiredAction);
    }

    // Different organization - check hierarchy rules
    return this.canAccessCrossOrganization(user, targetOrganizationId, requiredAction);
  }

  /**
   * Checks cross-organizational access based on hierarchy and role.
   * Owner in parent org can access child orgs, but not vice versa.
   */
  private static canAccessCrossOrganization(
    user: User,
    targetOrganizationId: string,
    requiredAction: 'read' | 'write' | 'delete'
  ): boolean {
    const userRole = this.getUserHighestRole(user);
    
    // Only OWNERs can access across organizational boundaries
    if (userRole !== RoleType.OWNER) {
      return false;
    }

    // Check if user's org is parent of target org
    const isParentAccess = this.isParentChildRelationship(
      user.organizationId,
      targetOrganizationId
    );

    if (isParentAccess) {
      // Parent OWNER can perform most actions on child orgs
      return requiredAction !== 'delete'; // Maybe restrict deletion
    }

    // No other cross-org access allowed
    return false;
  }

  /**
   * Checks if orgA is the parent of orgB in the hierarchy.
   * In a real implementation, this would query the database.
   */
  private static isParentChildRelationship(
    parentOrgId: string,
    childOrgId: string
  ): boolean {
    // This is a simplified check - in reality, you'd query the Organization table
    // to check if childOrg.parentId === parentOrgId
    
    // For testing purposes, we'll simulate this logic
    // In your actual service, inject the OrganizationRepository and query it
    return this.simulateHierarchyCheck(parentOrgId, childOrgId);
  }

  /**
   * Simulates checking organizational hierarchy.
   * Replace this with actual database queries in your service.
   */
  private static simulateHierarchyCheck(parentOrgId: string, childOrgId: string): boolean {
    // Mock hierarchy for demonstration
    const hierarchyMap: Record<string, string[]> = {
      'parent-org-1': ['child-org-a', 'child-org-b'],
      'parent-org-2': ['child-org-c', 'child-org-d'],
    };

    return hierarchyMap[parentOrgId]?.includes(childOrgId) || false;
  }

  /**
   * Gets the user's highest role level for permission checking.
   */
  private static getUserHighestRole(user: User): RoleType {
    if (!user.userRoles || user.userRoles.length === 0) {
      return RoleType.VIEWER; // Default to lowest permission
    }

    const roleHierarchy = {
      [RoleType.OWNER]: 3,
      [RoleType.ADMIN]: 2,
      [RoleType.VIEWER]: 1,
    };

    // Find the role with highest level
    const highestRole = user.userRoles
      .filter(ur => ur.isActive)
      .map(ur => ur.role.name)
      .reduce((highest, current) => {
        return roleHierarchy[current] > roleHierarchy[highest] ? current : highest;
      }, RoleType.VIEWER);

    return highestRole;
  }

  /**
   * Checks if a role has permission to perform a specific action.
   */
  private static hasRolePermission(
    role: RoleType,
    action: 'read' | 'write' | 'delete'
  ): boolean {
    const permissions = {
      [RoleType.OWNER]: ['read', 'write', 'delete'],
      [RoleType.ADMIN]: ['read', 'write'],
      [RoleType.VIEWER]: ['read'],
    };

    return permissions[role].includes(action);
  }

  /**
   * Generates a WHERE clause for TypeORM queries that respects organizational hierarchy.
   * Use this in your repository queries to automatically filter by accessible organizations.
   */
  static getOrganizationWhereClause(user: User): any {
    const userRole = this.getUserHighestRole(user);
    const userOrgId = user.organizationId;

    if (userRole === RoleType.OWNER) {
      // Owner can see their org + all child orgs
      return {
        organizationId: this.getAccessibleOrganizations(userOrgId),
      };
    } else {
      // Admin and Viewer can only see their own org
      return {
        organizationId: userOrgId,
      };
    }
  }

  /**
   * Returns list of organization IDs that a user can access.
   * For OWNERs, includes their org + all child orgs.
   */
  private static getAccessibleOrganizations(userOrgId: string): any {
    // In a real implementation, you'd query the database to find:
    // 1. The user's organization
    // 2. All organizations where parentId = user's org ID
    
    // For TypeORM, this would return an In() clause or Or() conditions
    // Example: In([userOrgId, ...childOrgIds])
    
    // Simplified for demonstration
    const mockChildOrgs = this.simulateGetChildOrgs(userOrgId);
    return [userOrgId, ...mockChildOrgs];
  }

  /**
   * Mock function to get child organizations.
   * Replace with actual database query.
   */
  private static simulateGetChildOrgs(parentOrgId: string): string[] {
    const hierarchyMap: Record<string, string[]> = {
      'parent-org-1': ['child-org-a', 'child-org-b'],
      'parent-org-2': ['child-org-c', 'child-org-d'],
    };

    return hierarchyMap[parentOrgId] || [];
  }

  /**
   * Validates if a user can create a resource in a specific organization.
   * Used for POST endpoints where organizationId might be specified.
   */
  static canCreateInOrganization(user: User, targetOrgId?: string): boolean {
    const targetOrg = targetOrgId || user.organizationId;
    return this.canAccessOrganization(user, targetOrg, 'write');
  }

  /**
   * Validates if a user can modify a resource in a specific organization.
   * Used for PUT/PATCH endpoints.
   */
  static canModifyInOrganization(user: User, resourceOrgId: string): boolean {
    return this.canAccessOrganization(user, resourceOrgId, 'write');
  }

  /**
   * Validates if a user can delete a resource in a specific organization.
   * Used for DELETE endpoints.
   */
  static canDeleteInOrganization(user: User, resourceOrgId: string): boolean {
    return this.canAccessOrganization(user, resourceOrgId, 'delete');
  }
}

/**
 * Example usage in a service method:
 * 
 * async findAllTasks(user: User): Promise<Task[]> {
 *   const whereClause = RBACHierarchyHelper.getOrganizationWhereClause(user);
 *   
 *   return this.taskRepository.find({
 *     where: whereClause,
 *     relations: ['organization', 'createdBy', 'assignee']
 *   });
 * }
 * 
 * async updateTask(id: string, updateDto: UpdateTaskDto, user: User): Promise<Task> {
 *   const task = await this.findTaskById(id);
 *   
 *   if (!RBACHierarchyHelper.canModifyInOrganization(user, task.organizationId)) {
 *     throw new ForbiddenException('Cannot modify task in this organization');
 *   }
 *   
 *   // Proceed with update...
 * }
 */

