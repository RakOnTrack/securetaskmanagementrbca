import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@rbcaproject/auth';
import { RoleType, CreateOrganizationDto, UpdateOrganizationDto, JwtPayload } from '@rbcaproject/data';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Roles(RoleType.OWNER, RoleType.ADMIN)
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.findAll(user.organizationId);
  }

  @Get(':id')
  @Roles(RoleType.OWNER, RoleType.ADMIN)
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(RoleType.OWNER)
  async create(@Body() createOrgDto: CreateOrganizationDto, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.create(createOrgDto, user.organizationId);
  }

  @Patch(':id')
  @Roles(RoleType.OWNER)
  async update(@Param('id') id: string, @Body() updateOrgDto: UpdateOrganizationDto, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.update(id, updateOrgDto, user.organizationId);
  }

  @Delete(':id')
  @Roles(RoleType.OWNER)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.remove(id, user.organizationId);
  }
}
