# Rbcaproject

# Secure Task Management System with RBAC

A full-stack task management system built with NestJS backend and Angular frontend, featuring role-based access control (RBAC), JWT authentication, and comprehensive audit logging.

## 🏗️ Architecture Overview

This project is built as an NX monorepo with the following structure:

```
rbcaproject/
├── apps/
│   ├── api/           # NestJS backend API
│   └── dashboard/     # Angular frontend dashboard
├── libs/
│   ├── data/          # Shared TypeScript interfaces & DTOs
│   └── auth/          # Reusable RBAC logic and decorators
├── .env               # Environment configuration
└── README.md
```

### Technology Stack

**Backend:**
- NestJS (Node.js framework)
- TypeORM (Database ORM)
- SQLite (Database - easily configurable to PostgreSQL)
- JWT (Authentication)
- bcrypt (Password hashing)
- class-validator (Request validation)

**Frontend:**
- Angular 18 (Frontend framework)
- TailwindCSS (Styling)
- RxJS (Reactive programming)
- Angular Forms (Form handling)

**Shared Libraries:**
- TypeScript interfaces and DTOs
- RBAC decorators and guards
- Audit logging utilities

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd rbcaproject
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (JWT secret, database settings, etc.)

3. **Start the backend API:**
   ```bash
   npx nx serve api
   ```
   The API will be available at `http://localhost:3000`

4. **Start the frontend dashboard:**
   ```bash
   npx nx serve dashboard
   ```
   The dashboard will be available at `http://localhost:4200`

### Default Credentials

The system comes with a default admin user:
- **Email:** `admin@example.com`
- **Password:** `admin123`

## 📊 Data Model

### Core Entities

#### Users
- Personal information (name, email)
- Password hash (bcrypt)
- Organization membership
- Status (active, inactive, suspended)

#### Organizations
- 2-level hierarchy support
- Parent-child relationships
- Users belong to organizations

#### Roles & Permissions
- **Owner:** Full system access
- **Admin:** Administrative access with restrictions
- **Viewer:** Read-only access with basic task operations

#### Tasks
- Title, description, status, priority, category
- Due dates and completion tracking
- Organization-scoped visibility
- Assignment to users

#### Audit Logs
- Comprehensive activity tracking
- IP address and user agent logging
- Success/failure status
- Detailed action context

## 🔐 Security Features

### Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Token expiration and refresh
- Automatic logout on token expiry

### Authorization (RBAC)
- Role-based access control
- Permission-based resource access
- Organization-level data scoping
- Hierarchical role inheritance

### Audit Logging
- All CRUD operations logged
- Authentication attempts tracked
- Access denied events recorded
- Searchable audit trail for compliance

## 🎯 API Endpoints

### Authentication
```
POST /auth/login     # User login
POST /auth/register  # User registration
```

### Tasks
```
GET    /tasks        # List tasks (filtered by permissions)
POST   /tasks        # Create task
GET    /tasks/:id    # Get specific task
PATCH  /tasks/:id    # Update task
DELETE /tasks/:id    # Delete task
```

### Audit Logs
```
GET /audit-log       # View audit logs (Owner/Admin only)
```

### Sample API Requests

**Login:**
```json
POST /auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Create Task:**
```json
POST /tasks
Authorization: Bearer <jwt_token>
{
  "title": "Complete project documentation",
  "description": "Write comprehensive README and API docs",
  "priority": "high",
  "category": "work",
  "dueDate": "2024-01-15"
}
```

## 🎨 Frontend Features

### Dashboard
- Task overview with statistics
- Real-time task filtering and searching
- Responsive design (mobile to desktop)
- Drag-and-drop task reordering
- Status and priority visualization

### Authentication UI
- Secure login form
- Form validation
- Error handling
- Auto-redirect based on auth status

### Responsive Design
- Mobile-first approach
- TailwindCSS utility classes
- Accessible form controls
- Dark/light mode ready

## 🧪 Testing

### Backend Tests
```bash
# Run all backend tests
npx nx test api

# Run specific test suites
npx nx test api --testNamePattern="auth"
npx nx test api --testNamePattern="rbac"
```

### Frontend Tests
```bash
# Run Angular tests
npx nx test dashboard

# Run e2e tests
npx nx e2e dashboard-e2e
```

## 🔧 Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Database Configuration (SQLite default)
NODE_ENV=development
PORT=3000

# CORS Configuration
CORS_ORIGIN=http://localhost:4200
```

### Database Configuration

The system uses SQLite by default for easy setup. To use PostgreSQL:

1. Install PostgreSQL driver: `npm install pg @types/pg`
2. Update `database.config.ts`:
```typescript
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [...],
  synchronize: process.env.NODE_ENV === 'development',
};
```

## 🏢 Organization Hierarchy

The system supports a 2-level organization hierarchy:

- **Parent Organizations:** Top-level entities
- **Child Organizations:** Subsidiary entities under parents

### Access Control Rules:
- Users can access tasks within their organization
- Parent organization users can access child organization tasks
- Child organization users cannot access parent tasks
- Cross-organization access is restricted

## 👥 Role Permissions

### Owner (Level 3)
- Full system access
- User management
- Organization management
- All task operations
- Audit log access

### Admin (Level 2)
- Task management within organization
- User viewing
- Organization viewing
- Audit log access
- Cannot manage users in parent organizations

### Viewer (Level 1)
- Task viewing and basic operations
- Can create and update own tasks
- Limited to organization scope
- No administrative access

## 🔍 Audit Logging

All system activities are logged with:

- **User identification:** Who performed the action
- **Action type:** CREATE, READ, UPDATE, DELETE, LOGIN, etc.
- **Resource:** What was accessed (task, user, etc.)
- **Timestamp:** When the action occurred
- **IP Address & User Agent:** Client information
- **Success/Failure:** Operation result
- **Details:** Additional context (JSON)

### Audit Log Access
- Available to Owner and Admin roles only
- Filterable by user, resource, action, date range
- Paginated results for performance
- Exportable for compliance needs

## 🚀 Production Deployment

### Security Checklist
- [ ] Change default JWT secret
- [ ] Use environment-specific database
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable request logging
- [ ] Configure CSP headers
- [ ] Set up monitoring and alerting

### Performance Optimizations
- [ ] Enable database indexing
- [ ] Implement Redis caching
- [ ] Configure CDN for static assets
- [ ] Enable gzip compression
- [ ] Set up database connection pooling

## 🎯 Future Enhancements

### Advanced RBAC Features
- Custom role creation
- Fine-grained permissions
- Time-based access controls
- Resource-level permissions

### Enhanced Security
- JWT refresh tokens
- Multi-factor authentication
- CSRF protection
- Rate limiting per user/IP

### Performance & Scalability
- Database query optimization
- Caching layer (Redis)
- Background job processing
- Horizontal scaling support

### User Experience
- Real-time notifications
- Advanced task filtering
- Bulk operations
- Task templates
- File attachments
- Team collaboration features

## 📝 Development Notes

### Code Quality
- ESLint and Prettier configured
- TypeScript strict mode enabled
- Comprehensive error handling
- Input validation on all endpoints

### Architecture Decisions
- **NX Monorepo:** Shared code and consistent tooling
- **SQLite Default:** Easy development setup
- **JWT Authentication:** Stateless and scalable
- **TypeORM:** Database abstraction and migrations
- **TailwindCSS:** Utility-first styling approach

### Known Limitations
- 2-level organization hierarchy (can be extended)
- SQLite for development (production should use PostgreSQL)
- Basic audit log UI (can be enhanced)
- No real-time updates (WebSocket can be added)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using NX, NestJS, and Angular**




<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is ready ✨.

Run `npx nx graph` to visually explore what got created. Now, let's get you up to speed!

## Run tasks

To run tasks with Nx use:

```sh
npx nx <target> <project-name>
```

For example:

```sh
npx nx build myproject
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

To install a new plugin you can use the `nx add` command. Here's an example of adding the React plugin:
```sh
npx nx add @nx/react
```

Use the plugin's generator to create new projects. For example, to create a new React app or library:

```sh
# Generate an app
npx nx g @nx/react:app demo

# Generate a library
npx nx g @nx/react:lib some-lib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
#   s e c u r e t a s k m a n a g e m e n t r b c a  
 