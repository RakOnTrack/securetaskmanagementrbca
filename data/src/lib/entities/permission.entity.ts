import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity';

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage' // Full control
}

export enum PermissionResource {
  TASK = 'task',
  USER = 'user',
  ORGANIZATION = 'organization',
  AUDIT_LOG = 'audit_log',
  ALL = 'all'
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar'
  })
  action: PermissionAction;

  @Column({
    type: 'varchar'
  })
  resource: PermissionResource;

  @Column({ nullable: true })
  conditions: string; // JSON string for complex conditions

  @Column()
  displayName: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to create permission identifier
  get identifier(): string {
    return `${this.action}:${this.resource}`;
  }
}