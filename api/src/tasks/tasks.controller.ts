import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { 
  CreateTaskDto, 
  UpdateTaskDto, 
  TaskResponseDto, 
  TaskQueryDto,
  JwtPayload,
  PermissionAction,
  PermissionResource
} from '@rbcaproject/data';
import { 
  JwtAuthGuard, 
  PermissionsGuard, 
  RequirePermissions, 
  CurrentUser 
} from '@rbcaproject/auth';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequirePermissions({ action: PermissionAction.CREATE, resource: PermissionResource.TASK })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
    @Request() req
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(createTaskDto, user, req);
  }

  @Get()
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.TASK })
  async findAll(
    @Query() query: TaskQueryDto,
    @CurrentUser() user: JwtPayload,
    @Request() req
  ): Promise<{ tasks: TaskResponseDto[]; total: number; page: number; limit: number }> {
    return this.tasksService.findAll(query, user, req);
  }

  @Get(':id')
  @RequirePermissions({ action: PermissionAction.READ, resource: PermissionResource.TASK })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Request() req
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(id, user, req);
  }

  @Patch(':id')
  @RequirePermissions({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
    @Request() req
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, updateTaskDto, user, req);
  }

  @Delete(':id')
  @RequirePermissions({ action: PermissionAction.DELETE, resource: PermissionResource.TASK })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Request() req
  ): Promise<void> {
    return this.tasksService.remove(id, user, req);
  }

  @Post('reorder')
  @RequirePermissions({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  async reorderTasks(
    @Body() reorderData: { taskIds: string[] },
    @CurrentUser() user: JwtPayload,
    @Request() req
  ): Promise<{ success: boolean; updated: number }> {
    return this.tasksService.reorderTasks(reorderData.taskIds, user, req);
  }
}
