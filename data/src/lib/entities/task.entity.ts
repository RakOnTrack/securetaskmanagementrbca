import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal',
  PROJECT = 'project',
  MEETING = 'meeting',
  OTHER = 'other'
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    default: TaskStatus.TODO
  })
  status: TaskStatus;

  @Column({
    type: 'varchar',
    default: TaskPriority.MEDIUM
  })
  priority: TaskPriority;

  @Column({
    type: 'varchar',
    default: TaskCategory.WORK
  })
  category: TaskCategory;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  order: number; // For drag-and-drop ordering

  @ManyToOne(() => User, user => user.assignedTasks, { nullable: true })
  assignee: User;

  @Column({ nullable: true })
  assigneeId: string;

  @ManyToOne(() => User, user => user.createdTasks)
  createdBy: User;

  @Column()
  createdById: string;

  @ManyToOne(() => Organization, organization => organization.tasks)
  organization: Organization;

  @Column()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to check if task is overdue
  get isOverdue(): boolean {
    if (!this.dueDate || this.status === TaskStatus.DONE) {
      return false;
    }
    return new Date() > this.dueDate;
  }

  // Helper method to check if task is completed
  get isCompleted(): boolean {
    return this.status === TaskStatus.DONE;
  }
}