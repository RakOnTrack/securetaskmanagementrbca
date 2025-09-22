import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { 
  Task, 
  User,
  Organization,
  CreateTaskDto, 
  UpdateTaskDto, 
  TaskResponseDto, 
  TaskQueryDto,
  JwtPayload,
  TaskStatus,
  AuditAction,
  PermissionAction,
  PermissionResource
} from '@rbcaproject/data';
import { RbacService, AuditService } from '@rbcaproject/auth';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private rbacService: RbacService,
    private auditService: AuditService,
  ) {}

  async create(
    createTaskDto: CreateTaskDto, 
    user: JwtPayload,
    request?: any
  ): Promise<TaskResponseDto> {
    // Check permission
    const canCreate = await this.rbacService.hasPermission(
      user.sub,
      PermissionAction.CREATE,
      PermissionResource.TASK,
      user.organizationId
    );

    if (!canCreate) {
      await this.auditService.logTaskAccess(
        AuditAction.ACCESS_DENIED,
        null,
        user.sub,
        user.organizationId,
        { action: 'create', reason: 'insufficient_permissions' },
        false,
        'Insufficient permissions to create task',
        request
      );
      throw new ForbiddenException('Insufficient permissions to create task');
    }

    // Validate assignee if provided
    if (createTaskDto.assigneeId) {
      const assignee = await this.userRepository.findOne({
        where: { id: createTaskDto.assigneeId },
        relations: ['organization']
      });

      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }

      // Check if user can assign tasks to this user (same org or child org)
      const canAssign = await this.rbacService.canAccessOrganization(
        user.sub,
        assignee.organizationId
      );

      if (!canAssign) {
        throw new ForbiddenException('Cannot assign task to user from different organization');
      }
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
      createdById: user.sub,
      organizationId: user.organizationId,
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
    });

    const savedTask = await this.taskRepository.save(task);

    // Log task creation
    await this.auditService.logTaskAccess(
      AuditAction.CREATE,
      savedTask.id,
      user.sub,
      user.organizationId,
      { title: savedTask.title, assigneeId: savedTask.assigneeId },
      true,
      undefined,
      request
    );

    return this.mapToResponseDto(await this.findOneWithRelations(savedTask.id));
  }

  async findAll(
    query: TaskQueryDto,
    user: JwtPayload,
    request?: any
  ): Promise<{ tasks: TaskResponseDto[]; total: number; page: number; limit: number }> {
    // Check permission
    const canRead = await this.rbacService.hasPermission(
      user.sub,
      PermissionAction.READ,
      PermissionResource.TASK,
      user.organizationId
    );

    if (!canRead) {
      await this.auditService.logTaskAccess(
        AuditAction.ACCESS_DENIED,
        null,
        user.sub,
        user.organizationId,
        { action: 'read_all', reason: 'insufficient_permissions' },
        false,
        'Insufficient permissions to read tasks',
        request
      );
      throw new ForbiddenException('Insufficient permissions to read tasks');
    }

    const queryBuilder = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.organization', 'organization');

    // Scope tasks based on user's organization access
    await this.applyScopeFilter(queryBuilder, user);

    // Apply filters
    this.applyFilters(queryBuilder, query);

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`task.${sortBy}`, sortOrder);

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const [tasks, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    // Log task access
    await this.auditService.logTaskAccess(
      AuditAction.READ,
      null,
      user.sub,
      user.organizationId,
      { query, count: tasks.length },
      true,
      undefined,
      request
    );

    return {
      tasks: tasks.map(task => this.mapToResponseDto(task)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, user: JwtPayload, request?: any): Promise<TaskResponseDto> {
    const task = await this.findOneWithRelations(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check access to this specific task
    const canAccess = await this.canAccessTask(task, user);
    
    if (!canAccess) {
      await this.auditService.logTaskAccess(
        AuditAction.ACCESS_DENIED,
        id,
        user.sub,
        user.organizationId,
        { reason: 'insufficient_permissions' },
        false,
        'Insufficient permissions to access task',
        request
      );
      throw new ForbiddenException('Insufficient permissions to access this task');
    }

    // Log task access
    await this.auditService.logTaskAccess(
      AuditAction.READ,
      id,
      user.sub,
      user.organizationId,
      undefined,
      true,
      undefined,
      request
    );

    return this.mapToResponseDto(task);
  }

  async update(
    id: string, 
    updateTaskDto: UpdateTaskDto, 
    user: JwtPayload,
    request?: any
  ): Promise<TaskResponseDto> {
    const task = await this.findOneWithRelations(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check permission
    const canUpdate = await this.canModifyTask(task, user);
    
    if (!canUpdate) {
      await this.auditService.logTaskAccess(
        AuditAction.ACCESS_DENIED,
        id,
        user.sub,
        user.organizationId,
        { action: 'update', reason: 'insufficient_permissions' },
        false,
        'Insufficient permissions to update task',
        request
      );
      throw new ForbiddenException('Insufficient permissions to update this task');
    }

    // Validate assignee if being changed
    if (updateTaskDto.assigneeId && updateTaskDto.assigneeId !== task.assigneeId) {
      const assignee = await this.userRepository.findOne({
        where: { id: updateTaskDto.assigneeId },
        relations: ['organization']
      });

      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }

      const canAssign = await this.rbacService.canAccessOrganization(
        user.sub,
        assignee.organizationId
      );

      if (!canAssign) {
        throw new ForbiddenException('Cannot assign task to user from different organization');
      }
    }

    // Handle task completion
    const wasCompleted = task.status === TaskStatus.DONE;
    const isBeingCompleted = updateTaskDto.status === TaskStatus.DONE && !wasCompleted;
    const isBeingUncompleted = updateTaskDto.status !== TaskStatus.DONE && wasCompleted;

    Object.assign(task, {
      ...updateTaskDto,
      dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : task.dueDate,
      completedAt: isBeingCompleted ? new Date() : (isBeingUncompleted ? null : task.completedAt),
    });

    const updatedTask = await this.taskRepository.save(task);

    // Log task update
    await this.auditService.logTaskAccess(
      AuditAction.UPDATE,
      id,
      user.sub,
      user.organizationId,
      { 
        changes: updateTaskDto,
        wasCompleted,
        isBeingCompleted,
        isBeingUncompleted
      },
      true,
      undefined,
      request
    );

    return this.mapToResponseDto(await this.findOneWithRelations(updatedTask.id));
  }

  async remove(id: string, user: JwtPayload, request?: any): Promise<void> {
    const task = await this.findOneWithRelations(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check permission
    const canDelete = await this.canModifyTask(task, user);
    
    if (!canDelete) {
      await this.auditService.logTaskAccess(
        AuditAction.ACCESS_DENIED,
        id,
        user.sub,
        user.organizationId,
        { action: 'delete', reason: 'insufficient_permissions' },
        false,
        'Insufficient permissions to delete task',
        request
      );
      throw new ForbiddenException('Insufficient permissions to delete this task');
    }

    await this.taskRepository.remove(task);

    // Log task deletion
    await this.auditService.logTaskAccess(
      AuditAction.DELETE,
      id,
      user.sub,
      user.organizationId,
      { title: task.title },
      true,
      undefined,
      request
    );
  }

  private async findOneWithRelations(id: string): Promise<Task | null> {
    return this.taskRepository.findOne({
      where: { id },
      relations: ['assignee', 'createdBy', 'organization'],
    });
  }

  private async canAccessTask(task: Task, user: JwtPayload): Promise<boolean> {
    // Check if user can access the task's organization
    const canAccessOrg = await this.rbacService.canAccessOrganization(
      user.sub,
      task.organizationId
    );

    if (!canAccessOrg) {
      return false;
    }

    // Check basic read permission
    return this.rbacService.hasPermission(
      user.sub,
      PermissionAction.READ,
      PermissionResource.TASK,
      user.organizationId
    );
  }

  private async canModifyTask(task: Task, user: JwtPayload): Promise<boolean> {
    // Check if user can access the task's organization
    const canAccessOrg = await this.rbacService.canAccessOrganization(
      user.sub,
      task.organizationId
    );

    if (!canAccessOrg) {
      return false;
    }

    // Task creator can always modify their tasks
    if (task.createdById === user.sub) {
      return true;
    }

    // Check if user has update permission
    return this.rbacService.hasPermission(
      user.sub,
      PermissionAction.UPDATE,
      PermissionResource.TASK,
      user.organizationId
    );
  }

  private async applyScopeFilter(
    queryBuilder: SelectQueryBuilder<Task>,
    user: JwtPayload
  ): Promise<void> {
    // Get user's organization and check if they can access parent/child orgs
    const userEntity = await this.userRepository.findOne({
      where: { id: user.sub },
      relations: ['organization', 'userRoles', 'userRoles.role']
    });

    if (!userEntity) {
      queryBuilder.andWhere('1 = 0'); // No access
      return;
    }

    const accessibleOrgIds = [user.organizationId];

    // Check if user can access child organizations
    const childOrgs = await this.organizationRepository.find({
      where: { parentId: user.organizationId }
    });

    for (const childOrg of childOrgs) {
      const canAccess = await this.rbacService.canAccessOrganization(user.sub, childOrg.id);
      if (canAccess) {
        accessibleOrgIds.push(childOrg.id);
      }
    }

    queryBuilder.andWhere('task.organizationId IN (:...orgIds)', { orgIds: accessibleOrgIds });
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<Task>, query: TaskQueryDto): void {
    if (query.status) {
      queryBuilder.andWhere('task.status = :status', { status: query.status });
    }

    if (query.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: query.priority });
    }

    if (query.category) {
      queryBuilder.andWhere('task.category = :category', { category: query.category });
    }

    if (query.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId: query.assigneeId });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${query.search}%` }
      );
    }
  }

  private mapToResponseDto(task: Task): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      order: task.order,
      assignee: task.assignee ? {
        id: task.assignee.id,
        firstName: task.assignee.firstName,
        lastName: task.assignee.lastName,
        email: task.assignee.email,
      } : undefined,
      createdBy: {
        id: task.createdBy.id,
        firstName: task.createdBy.firstName,
        lastName: task.createdBy.lastName,
        email: task.createdBy.email,
      },
      organization: {
        id: task.organization.id,
        name: task.organization.name,
      },
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      isOverdue: task.isOverdue,
      isCompleted: task.isCompleted,
    };
  }

  async reorderTasks(
    taskIds: string[],
    user: JwtPayload,
    request?: any
  ): Promise<{ success: boolean; updated: number }> {
    let updatedCount = 0;

    // Update each task with its new order
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const task = await this.findOneWithRelations(taskId);

      if (!task) {
        continue; // Skip invalid task IDs
      }

      // Check if user can modify this task
      const canModify = await this.canModifyTask(task, user);
      if (!canModify) {
        continue; // Skip tasks user can't modify
      }

      // Update the order
      task.order = i;
      await this.taskRepository.save(task);
      updatedCount++;
    }

    // Log the reorder operation
    await this.auditService.logTaskAccess(
      AuditAction.UPDATE,
      null,
      user.sub,
      user.organizationId,
      { action: 'reorder', taskCount: updatedCount },
      true,
      undefined,
      request
    );

    return { success: true, updated: updatedCount };
  }
}
