import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@rbcaproject/auth';
import { RoleType, CreateUserDto, UpdateUserDto, User, JwtPayload } from '@rbcaproject/data';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleType.OWNER, RoleType.ADMIN)
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.organizationId);
  }

  @Get(':id')
  @Roles(RoleType.OWNER, RoleType.ADMIN)
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(RoleType.OWNER)
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(createUserDto, user.organizationId);
  }

  @Patch(':id')
  @Roles(RoleType.OWNER)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.update(id, updateUserDto, user.organizationId);
  }

  @Delete(':id')
  @Roles(RoleType.OWNER)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.remove(id, user.organizationId);
  }

  @Post(':id/roles')
  @Roles(RoleType.OWNER)
  async assignRole(
    @Param('id') userId: string,
    @Body() body: { roleId: string },
    @CurrentUser() user: JwtPayload
  ) {
    return this.usersService.assignRole(userId, body.roleId, user.organizationId);
  }

  @Delete(':id/roles/:roleId')
  @Roles(RoleType.OWNER)
  async removeRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.usersService.removeRole(userId, roleId, user.organizationId);
  }
}
