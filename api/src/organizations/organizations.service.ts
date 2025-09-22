import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, CreateOrganizationDto, UpdateOrganizationDto, Task } from '@rbcaproject/data';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async findAll(userOrgId: string): Promise<Organization[]> {
    // Owner can see all organizations in their hierarchy
    return this.organizationRepository.find({
      relations: ['parent', 'children', 'users'],
      order: { name: 'ASC' }
    });
  }

  async findOne(id: string, userOrgId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'users']
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async create(createOrgDto: CreateOrganizationDto, userOrgId: string): Promise<Organization> {
    // Check if organization name already exists
    const existingOrg = await this.organizationRepository.findOne({
      where: { name: createOrgDto.name }
    });

    if (existingOrg) {
      throw new ConflictException('Organization with this name already exists');
    }

    // Handle empty parentId - convert to null for database
    const orgData = {
      ...createOrgDto,
      parentId: createOrgDto.parentId && createOrgDto.parentId.trim() !== '' ? createOrgDto.parentId : null
    };

    const organization = this.organizationRepository.create(orgData);
    const savedOrg = await this.organizationRepository.save(organization);
    
    return this.findOne(savedOrg.id, userOrgId);
  }

  async update(id: string, updateOrgDto: UpdateOrganizationDto, userOrgId: string): Promise<Organization> {
    const organization = await this.findOne(id, userOrgId);
    
    Object.assign(organization, updateOrgDto);
    await this.organizationRepository.save(organization);
    
    return this.findOne(id, userOrgId);
  }

  async remove(id: string, userOrgId: string): Promise<void> {
    const organization = await this.findOne(id, userOrgId);
    
    // Debug logging
    console.log(`Attempting to delete organization ${id}:`);
    console.log(`Organization users:`, organization.users);
    console.log(`Users count:`, organization.users?.length || 0);
    
    // Don't allow deleting if it has users
    if (organization.users && organization.users.length > 0) {
      console.log(`Found ${organization.users.length} users, preventing deletion`);
      throw new ConflictException('Cannot delete organization with existing users');
    }
    
    // Don't allow deleting if it has child organizations
    if (organization.children && organization.children.length > 0) {
      throw new ConflictException('Cannot delete organization with child organizations');
    }
    
    // Check if organization has tasks
    const tasksCount = await this.taskRepository.count({
      where: { organizationId: id }
    });
    
    if (tasksCount > 0) {
      throw new ConflictException('Cannot delete organization with existing tasks');
    }
    
    await this.organizationRepository.remove(organization);
  }
}
