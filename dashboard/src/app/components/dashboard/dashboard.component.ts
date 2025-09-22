import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { TaskService, Task, TaskStatus, TaskPriority, TaskCategory, CreateTaskRequest, TaskQuery } from '../../services/task.service';
import { UserService, User, CreateUserRequest } from '../../services/user.service';
import { OrganizationService, Organization, CreateOrganizationRequest } from '../../services/organization.service';
import { AuditService, AuditLog, AuditLogQuery } from '../../services/audit.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center">
              <h1 class="text-3xl font-bold text-gray-900">Task Management</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-gray-700">Welcome, {{ currentUser?.fullName }}</span>
              <button
                (click)="logout()"
                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Navigation Tabs for Owner/Admin -->
        <div class="mb-8" *ngIf="isOwnerOrAdmin()">
          <nav class="flex space-x-8">
            <button
              (click)="activeTab = 'tasks'"
              [class]="activeTab === 'tasks' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Tasks
            </button>
            <button
              *ngIf="isOwner()"
              (click)="activeTab = 'users'"
              [class]="activeTab === 'users' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              User Management
            </button>
            <button
              *ngIf="isOwner()"
              (click)="activeTab = 'organizations'"
              [class]="activeTab === 'organizations' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Organizations
            </button>
            <button
              *ngIf="isOwnerOrAdmin()"
              (click)="activeTab = 'audit'"
              [class]="activeTab === 'audit' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Audit Logs
            </button>
          </nav>
        </div>

        <!-- Tasks Tab Content -->
        <div *ngIf="activeTab === 'tasks'">
          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span class="text-white text-sm font-medium">📋</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ stats.total }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span class="text-white text-sm font-medium">⏳</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ stats.inProgress }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span class="text-white text-sm font-medium">✅</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ stats.completed }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span class="text-white text-sm font-medium">⚠️</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ stats.overdue }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Task Form -->
        <div class="bg-white shadow rounded-lg p-6 mb-8" *ngIf="showCreateForm">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
          <form (ngSubmit)="createTask()" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="form-label">Title *</label>
                <input
                  type="text"
                  [(ngModel)]="newTask.title"
                  name="title"
                  required
                  class="form-input"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label class="form-label">Category</label>
                <select [(ngModel)]="newTask.category" name="category" class="form-input">
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="project">Project</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div>
              <label class="form-label">Description</label>
              <textarea
                [(ngModel)]="newTask.description"
                name="description"
                rows="3"
                class="form-input"
                placeholder="Enter task description"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="form-label">Priority</label>
                <select [(ngModel)]="newTask.priority" name="priority" class="form-input">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label class="form-label">Status</label>
                <select [(ngModel)]="newTask.status" name="status" class="form-input">
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label class="form-label">Due Date</label>
                <input
                  type="date"
                  [(ngModel)]="newTask.dueDate"
                  name="dueDate"
                  class="form-input"
                />
              </div>
            </div>

            <div class="flex justify-end space-x-3">
              <button
                type="button"
                (click)="cancelCreate()"
                class="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="!newTask.title || creating"
                class="btn btn-primary"
              >
                {{ creating ? 'Creating...' : 'Create Task' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Tasks Section -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-medium text-gray-900">Tasks</h3>
              <button
                (click)="toggleCreateForm()"
                class="btn btn-primary"
                *ngIf="canCreateTasks()"
              >
                {{ showCreateForm ? 'Cancel' : 'New Task' }}
              </button>
            </div>
          </div>

          <!-- Filters -->
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select [(ngModel)]="filters.status" (ngModelChange)="loadTasks()" class="form-input">
                  <option value="">All Status</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select [(ngModel)]="filters.priority" (ngModelChange)="loadTasks()" class="form-input">
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select [(ngModel)]="filters.category" (ngModelChange)="loadTasks()" class="form-input">
                  <option value="">All Categories</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="project">Project</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  [(ngModel)]="filters.search"
                  (ngModelChange)="loadTasks()"
                  placeholder="Search tasks..."
                  class="form-input"
                />
              </div>
            </div>
          </div>

          <!-- Task List -->
          <div class="divide-y divide-gray-200">
            <div *ngIf="loading" class="px-6 py-8 text-center">
              <div class="inline-flex items-center">
                <svg class="animate-spin h-5 w-5 text-gray-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading tasks...
              </div>
            </div>

            <div *ngIf="!loading && tasks.length === 0" class="px-6 py-8 text-center text-gray-500">
              No tasks found. Create your first task to get started!
            </div>

            <div *ngFor="let task of tasks" class="px-6 py-4 hover:bg-gray-50">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-3">
                    <span class="text-lg">{{ getCategoryIcon(task.category) }}</span>
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-gray-900 truncate">
                        {{ task.title }}
                      </h4>
                      <p class="text-sm text-gray-500 truncate" *ngIf="task.description">
                        {{ task.description }}
                      </p>
                    </div>
                  </div>
                  
                  <div class="mt-2 flex items-center space-x-4 text-xs">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          [class]="getStatusColor(task.status)">
                      {{ getStatusLabel(task.status) }}
                    </span>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          [class]="getPriorityColor(task.priority)">
                      {{ getPriorityLabel(task.priority) }}
                    </span>
                    <span *ngIf="task.dueDate" class="text-gray-500">
                      Due: {{ formatDate(task.dueDate) }}
                    </span>
                    <span *ngIf="task.isOverdue" class="text-red-600 font-medium">
                      OVERDUE
                    </span>
                  </div>
                </div>

                <div class="flex items-center space-x-2">
                  <button
                    *ngIf="canUpdateTasks()"
                    (click)="toggleTaskStatus(task)"
                    class="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {{ task.status === 'done' ? 'Reopen' : 'Complete' }}
                  </button>
                  <button
                    *ngIf="canDeleteTasks()"
                    (click)="deleteTask(task.id)"
                    class="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div *ngIf="totalTasks > pageSize" class="px-6 py-4 border-t border-gray-200">
            <div class="flex items-center justify-between">
              <p class="text-sm text-gray-700">
                Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, totalTasks) }} of {{ totalTasks }} tasks
              </p>
              <div class="flex space-x-2">
                <button
                  (click)="previousPage()"
                  [disabled]="currentPage === 1"
                  class="btn btn-secondary text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  (click)="nextPage()"
                  [disabled]="currentPage * pageSize >= totalTasks"
                  class="btn btn-secondary text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- User Management Tab (Owner Only) -->
        <div *ngIf="activeTab === 'users' && isOwner()">
          <!-- Create User Form -->
          <div class="bg-white shadow rounded-lg p-6 mb-6" *ngIf="showCreateUserForm">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
            <form (ngSubmit)="createUser()" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">First Name *</label>
                  <input type="text" [(ngModel)]="newUser.firstName" name="firstName" required class="form-input" placeholder="Enter first name" />
                </div>
                <div>
                  <label class="form-label">Last Name *</label>
                  <input type="text" [(ngModel)]="newUser.lastName" name="lastName" required class="form-input" placeholder="Enter last name" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Email *</label>
                  <input type="email" [(ngModel)]="newUser.email" name="email" required class="form-input" placeholder="Enter email address" />
                </div>
                <div>
                  <label class="form-label">Password *</label>
                  <input type="password" [(ngModel)]="newUser.password" name="password" required class="form-input" placeholder="Enter password" />
                </div>
              </div>
              <div>
                <label class="form-label">Role</label>
                <select [(ngModel)]="newUser.role" name="role" class="form-input">
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div class="flex justify-end space-x-3">
                <button type="button" (click)="toggleCreateUserForm()" class="btn btn-secondary">Cancel</button>
                <button type="submit" [disabled]="!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName || creatingUser" class="btn btn-primary">
                  {{ creatingUser ? 'Creating...' : 'Create User' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Users List -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">Users</h3>
                <button (click)="toggleCreateUserForm()" class="btn btn-primary">
                  {{ showCreateUserForm ? 'Cancel' : 'Add New User' }}
                </button>
              </div>
            </div>
            <div class="divide-y divide-gray-200">
              <div *ngFor="let user of users" class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0">
                        <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span class="text-sm font-medium text-gray-700">{{ user.firstName.charAt(0) }}{{ user.lastName.charAt(0) }}</span>
                        </div>
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">{{ user.fullName }}</p>
                        <p class="text-sm text-gray-500">{{ user.email }}</p>
                        <div class="flex space-x-2 mt-1">
                          <span *ngFor="let role of user.roles" 
                                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                [class]="getRoleColor(role.name)">
                            {{ role.displayName }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button (click)="deleteUser(user.id)" class="text-sm text-red-600 hover:text-red-800">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div *ngIf="users.length === 0" class="px-6 py-8 text-center text-gray-500">
                No users found. Create your first user to get started!
              </div>
            </div>
          </div>
        </div>

        <!-- Organization Management Tab (Owner Only) -->
        <div *ngIf="activeTab === 'organizations' && isOwner()">
          <!-- Create Organization Form -->
          <div class="bg-white shadow rounded-lg p-6 mb-6" *ngIf="showCreateOrgForm">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Organization</h3>
            <form (ngSubmit)="createOrganization()" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Organization Name *</label>
                  <input type="text" [(ngModel)]="newOrganization.name" name="name" required class="form-input" placeholder="Enter organization name" />
                </div>
                <div>
                  <label class="form-label">Parent Organization</label>
                  <select [(ngModel)]="newOrganization.parentId" name="parentId" class="form-input">
                    <option value="">None (Root Organization)</option>
                    <option *ngFor="let org of organizations" [value]="org.id">{{ org.name }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="form-label">Description</label>
                <textarea [(ngModel)]="newOrganization.description" name="description" rows="3" class="form-input" placeholder="Enter organization description"></textarea>
              </div>
              <div class="flex justify-end space-x-3">
                <button type="button" (click)="toggleCreateOrgForm()" class="btn btn-secondary">Cancel</button>
                <button type="submit" [disabled]="!newOrganization.name || creatingOrg" class="btn btn-primary">
                  {{ creatingOrg ? 'Creating...' : 'Create Organization' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Organizations List -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">Organizations</h3>
                <button (click)="toggleCreateOrgForm()" class="btn btn-primary">
                  {{ showCreateOrgForm ? 'Cancel' : 'Create Organization' }}
                </button>
              </div>
            </div>
            <div class="divide-y divide-gray-200">
              <div *ngFor="let org of organizations" class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span class="text-white text-sm">🏢</span>
                        </div>
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">{{ org.name }}</p>
                        <p class="text-sm text-gray-500" *ngIf="org.description">{{ org.description }}</p>
                        <p class="text-xs text-gray-400" *ngIf="org.parent">Parent: {{ org.parent.name }}</p>
                        <p class="text-xs text-gray-400">{{ org.users.length }} users</p>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button (click)="deleteOrganization(org.id)" class="text-sm text-red-600 hover:text-red-800">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div *ngIf="organizations.length === 0" class="px-6 py-8 text-center text-gray-500">
                No organizations found. Create your first organization to get started!
              </div>
            </div>
          </div>
        </div>

        <!-- Audit Logs Tab (Owner & Admin) -->
        <div *ngIf="activeTab === 'audit' && isOwnerOrAdmin()">
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">Audit Logs</h3>
                <button (click)="exportAuditLogs()" class="btn btn-secondary">Export Logs</button>
              </div>
            </div>

            <!-- Filters -->
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label class="form-label">Action</label>
                  <select [(ngModel)]="auditQuery.action" (ngModelChange)="loadAuditLogs()" class="form-input">
                    <option value="">All Actions</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="create">Create</option>
                    <option value="read">Read</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Resource</label>
                  <select [(ngModel)]="auditQuery.resource" (ngModelChange)="loadAuditLogs()" class="form-input">
                    <option value="">All Resources</option>
                    <option value="task">Tasks</option>
                    <option value="user">Users</option>
                    <option value="organization">Organizations</option>
                    <option value="auth">Authentication</option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Status</label>
                  <select [(ngModel)]="auditQuery.success" (ngModelChange)="loadAuditLogs()" class="form-input">
                    <option value="">All</option>
                    <option [value]="true">Success</option>
                    <option [value]="false">Failed</option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Entries per page</label>
                  <select [(ngModel)]="auditQuery.limit" (ngModelChange)="loadAuditLogs()" class="form-input">
                    <option [value]="10">10</option>
                    <option [value]="20">20</option>
                    <option [value]="50">50</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Audit Logs List -->
            <div class="divide-y divide-gray-200">
              <div *ngFor="let log of auditLogs" class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0">
                        <div class="w-8 h-8 rounded-md flex items-center justify-center"
                             [class]="log.success ? 'bg-green-100' : 'bg-red-100'">
                          <span [class]="log.success ? 'text-green-600' : 'text-red-600'" class="text-sm">
                            {{ log.success ? '✅' : '❌' }}
                          </span>
                        </div>
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">
                          {{ log.action.toUpperCase() }} {{ log.resource.toUpperCase() }}
                        </p>
                        <p class="text-sm text-gray-500" *ngIf="log.user">
                          User: {{ log.user.firstName }} {{ log.user.lastName }} ({{ log.user.email }})
                        </p>
                        <p class="text-sm text-gray-500" *ngIf="log.errorMessage">
                          Error: {{ log.errorMessage }}
                        </p>
                        <div class="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                          <span>{{ formatDateTime(log.createdAt) }}</span>
                          <span *ngIf="log.ipAddress">IP: {{ log.ipAddress }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div *ngIf="auditLogs.length === 0" class="px-6 py-8 text-center text-gray-500">
                No audit logs found.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  currentUser: UserProfile | null = null;
  tasks: Task[] = [];
  loading = false;
  creating = false;
  showCreateForm = false;
  activeTab = 'tasks'; // Default to tasks tab

  // Stats
  stats = {
    total: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  };

  // User Management
  users: User[] = [];
  showCreateUserForm = false;
  creatingUser = false;
  newUser: CreateUserRequest = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organizationId: '',
    role: 'viewer'
  };

  // Organization Management
  organizations: Organization[] = [];
  showCreateOrgForm = false;
  creatingOrg = false;
  newOrganization: CreateOrganizationRequest = {
    name: '',
    description: ''
  };

  // Audit Logs
  auditLogs: AuditLog[] = [];
  auditQuery: AuditLogQuery = {
    page: 1,
    limit: 20
  };
  totalAuditLogs = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalTasks = 0;

  // Filters
  filters: TaskQuery = {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  };

  // New task form
  newTask: CreateTaskRequest = {
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
    category: TaskCategory.WORK,
    status: TaskStatus.TODO
  };

  // Make Math available in template
  Math = Math;

  constructor(
    private authService: AuthService,
    private taskService: TaskService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private auditService: AuditService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.newUser.organizationId = user.organizationId;
      }
    });
    
    this.loadTasks();
    
    // Load additional data based on role
    if (this.isOwner()) {
      this.loadUsers();
      this.loadOrganizations();
    }
    
    if (this.isOwnerOrAdmin()) {
      this.loadAuditLogs();
    }
  }

  loadTasks(): void {
    this.loading = true;
    
    this.filters.page = this.currentPage;
    this.filters.limit = this.pageSize;

    this.taskService.getTasks(this.filters).subscribe({
      next: (response) => {
        this.tasks = response.tasks;
        this.totalTasks = response.total;
        this.calculateStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats.total = this.totalTasks;
    this.stats.inProgress = this.tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    this.stats.completed = this.tasks.filter(t => t.status === TaskStatus.DONE).length;
    this.stats.overdue = this.tasks.filter(t => t.isOverdue).length;
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.resetNewTask();
    }
  }

  createTask(): void {
    if (!this.newTask.title) return;

    this.creating = true;
    this.taskService.createTask(this.newTask).subscribe({
      next: (task) => {
        this.creating = false;
        this.showCreateForm = false;
        this.resetNewTask();
        this.loadTasks();
      },
      error: (error) => {
        console.error('Error creating task:', error);
        this.creating = false;
      }
    });
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.resetNewTask();
  }

  resetNewTask(): void {
    this.newTask = {
      title: '',
      description: '',
      priority: TaskPriority.MEDIUM,
      category: TaskCategory.WORK,
      status: TaskStatus.TODO
    };
  }

  toggleTaskStatus(task: Task): void {
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    
    this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (error) => {
        console.error('Error updating task:', error);
      }
    });
  }

  deleteTask(taskId: string): void {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (error) => {
        console.error('Error deleting task:', error);
      }
    });
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTasks();
    }
  }

  nextPage(): void {
    if (this.currentPage * this.pageSize < this.totalTasks) {
      this.currentPage++;
      this.loadTasks();
    }
  }

  logout(): void {
    this.authService.logout();
  }

  // Permission checks
  canCreateTasks(): boolean {
    return this.authService.hasPermission('create', 'task');
  }

  canUpdateTasks(): boolean {
    return this.authService.hasPermission('update', 'task');
  }

  canDeleteTasks(): boolean {
    return this.authService.hasPermission('delete', 'task');
  }

  // UI helper methods
  getStatusColor(status: TaskStatus): string {
    return this.taskService.getStatusColor(status);
  }

  getPriorityColor(priority: TaskPriority): string {
    return this.taskService.getPriorityColor(priority);
  }

  getCategoryIcon(category: TaskCategory): string {
    return this.taskService.getCategoryIcon(category);
  }

  getStatusLabel(status: TaskStatus): string {
    return status.replace('_', ' ').toUpperCase();
  }

  getPriorityLabel(priority: TaskPriority): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: Date | string): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
  }

  // User Management Methods
  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  toggleCreateUserForm(): void {
    this.showCreateUserForm = !this.showCreateUserForm;
    if (!this.showCreateUserForm) {
      this.resetNewUser();
    }
  }

  createUser(): void {
    if (!this.newUser.email || !this.newUser.password || !this.newUser.firstName || !this.newUser.lastName) {
      return;
    }

    this.creatingUser = true;
    this.userService.createUser(this.newUser).subscribe({
      next: (user) => {
        this.creatingUser = false;
        this.showCreateUserForm = false;
        this.resetNewUser();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error creating user:', error);
        this.creatingUser = false;
      }
    });
  }

  deleteUser(userId: string): void {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
      }
    });
  }

  resetNewUser(): void {
    this.newUser = {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      organizationId: this.currentUser?.organizationId || '',
      role: 'viewer'
    };
  }

  // Organization Management Methods
  loadOrganizations(): void {
    this.organizationService.getOrganizations().subscribe({
      next: (organizations) => {
        this.organizations = organizations;
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
      }
    });
  }

  toggleCreateOrgForm(): void {
    this.showCreateOrgForm = !this.showCreateOrgForm;
    if (!this.showCreateOrgForm) {
      this.resetNewOrganization();
    }
  }

  createOrganization(): void {
    if (!this.newOrganization.name) {
      return;
    }

    this.creatingOrg = true;
    this.organizationService.createOrganization(this.newOrganization).subscribe({
      next: (organization) => {
        this.creatingOrg = false;
        this.showCreateOrgForm = false;
        this.resetNewOrganization();
        this.loadOrganizations();
      },
      error: (error) => {
        console.error('Error creating organization:', error);
        this.creatingOrg = false;
      }
    });
  }

  deleteOrganization(orgId: string): void {
    if (!confirm('Are you sure you want to delete this organization?')) {
      return;
    }

    this.organizationService.deleteOrganization(orgId).subscribe({
      next: () => {
        this.loadOrganizations();
      },
      error: (error) => {
        console.error('Error deleting organization:', error);
      }
    });
  }

  resetNewOrganization(): void {
    this.newOrganization = {
      name: '',
      description: ''
    };
  }

  // Audit Log Methods
  loadAuditLogs(): void {
    this.auditService.getAuditLogs(this.auditQuery).subscribe({
      next: (response) => {
        this.auditLogs = response.logs;
        this.totalAuditLogs = response.total;
      },
      error: (error) => {
        console.error('Error loading audit logs:', error);
      }
    });
  }

  exportAuditLogs(): void {
    this.auditService.exportAuditLogs(this.auditQuery).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting audit logs:', error);
      }
    });
  }

  // Role checking methods
  isOwner(): boolean {
    return this.authService.hasRole('owner');
  }

  isAdmin(): boolean {
    return this.authService.hasRole('admin');
  }

  isViewer(): boolean {
    return this.authService.hasRole('viewer');
  }

  isOwnerOrAdmin(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  // UI Helper Methods
  getRoleColor(roleName: string): string {
    switch (roleName.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
