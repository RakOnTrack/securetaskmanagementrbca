import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from './user-role.entity';
import { Permission } from './permission.entity';

export enum RoleType {
  OWNER = 'owner',
  ADMIN = 'admin',
  VIEWER = 'viewer'
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    unique: true
  })
  name: RoleType;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  level: number; // Higher level = more permissions (Owner: 3, Admin: 2, Viewer: 1)

  @OneToMany(() => UserRole, userRole => userRole.role)
  userRoles: UserRole[];

  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' }
  })
  permissions: Permission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to check if this role has higher or equal level than another
  hasHigherOrEqualLevel(otherRole: Role): boolean {
    return this.level >= otherRole.level;
  }
}