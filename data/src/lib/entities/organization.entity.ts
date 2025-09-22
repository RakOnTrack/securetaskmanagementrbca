import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => Organization, organization => organization.children)
  parent: Organization;

  @OneToMany(() => Organization, organization => organization.parent)
  children: Organization[];

  @OneToMany(() => User, user => user.organization)
  users: User[];

  @OneToMany(() => Task, task => task.organization)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to check if this org is a child of another org
  isChildOf(organizationId: string): boolean {
    return this.parentId === organizationId;
  }

  // Helper method to get organization hierarchy level
  get level(): number {
    return this.parentId ? 2 : 1; // Simple 2-level hierarchy
  }
}