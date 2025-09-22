# Task Management System - Data Model

## Entity Relationships

```
Organization (Self-Referencing)
├── has many Users
├── has many Tasks  
└── has many Child Organizations

User
├── belongs to Organization
├── has many Assigned Tasks
├── has many Created Tasks
├── has many UserRoles
└── has many AuditLogs

Task
├── belongs to Organization
├── assigned to User (optional)
└── created by User

Role
├── has many UserRoles
└── has many Permissions (Many-to-Many)

Permission
└── belongs to many Roles (Many-to-Many)

UserRole (Junction Table)
├── belongs to User
├── belongs to Role
└── scoped to Organization (optional)

AuditLog
├── belongs to User (optional)
└── scoped to Organization
```

## Key Design Decisions

1. **Hierarchical Organizations**: Self-referencing table supports parent-child relationships
2. **Flexible RBAC**: Many-to-many relationship between Roles and Permissions
3. **Organization-Scoped Roles**: UserRole can be scoped to specific organizations
4. **Comprehensive Audit**: AuditLog tracks all user actions with context
5. **Task Ownership**: Tasks track both assignee and creator
6. **Soft Constraints**: Tasks can be unassigned (assigneeId nullable)

## RBAC Hierarchy

- **Owner (Level 3)**: Full system access
- **Admin (Level 2)**: Organization management within scope
- **Viewer (Level 1)**: Read-only access

## Permission Model

Actions: CREATE, READ, UPDATE, DELETE, MANAGE
Resources: TASK, USER, ORGANIZATION, AUDIT_LOG, ALL



