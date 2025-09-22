import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.userRoles)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Role, role => role.userRoles)
  role: Role;

  @Column()
  roleId: string;

  @Column({ nullable: true })
  organizationId: string; // Optional: role can be scoped to specific organization

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}