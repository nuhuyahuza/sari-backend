# SARI Document Management System Backend

A production-ready backend for the SARI Document Management System built with Node.js, TypeScript, Express.js, Prisma ORM, PostgreSQL, and Docker.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (RBAC)
- **User Management**: Complete CRUD operations for users with role assignment
- **Role & Permission Management**: Flexible role-based permissions system
- **Research Management**: Document management with file attachments
- **File Management**: Secure file upload, download, and preview
- **Audit Logging**: Comprehensive audit trail for all system actions
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Docker Support**: Containerized deployment with Docker Compose

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **File Uploads**: Multer
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Docker & Docker Compose (for containerized deployment)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sari-backend
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/health

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

Create a `.env` file based on `env.example`:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/sari_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=3000
NODE_ENV="development"

# File Upload Configuration
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN="http://localhost:3000"
```

## 📚 API Documentation

The API documentation is automatically generated and available at:
- **Swagger UI**: http://localhost:3000/api-docs

### Available Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/me` - Get current user profile

#### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `PATCH /api/users/:id/deactivate` - Deactivate/reactivate user

#### Roles
- `GET /api/roles` - List all roles
- `GET /api/roles/:id` - Get role by ID
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role

#### Research
- `GET /api/researches` - List all researches
- `GET /api/researches/:id` - Get research by ID
- `POST /api/researches` - Create new research
- `PUT /api/researches/:id` - Update research
- `DELETE /api/researches/:id` - Delete research

#### Files
- `GET /api/files/:id/view` - Preview file
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

#### Logs
- `GET /api/logs` - Get audit logs (Admin only)

## 🔐 Authentication & Authorization

### JWT Token
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Role-Based Access Control (RBAC)
The system uses a flexible RBAC system with:
- **Roles**: Define user roles (Admin, Researcher, etc.)
- **Permissions**: Define specific actions (create, read, update, delete)
- **Modules**: Group permissions by functionality (users, researches, files, etc.)

### Default Permissions
- `users`: create, read, update, delete
- `roles`: create, read, update, delete
- `researches`: create, read, update, delete
- `files`: read, delete
- `logs`: read

## 📁 File Management

### Supported File Types
- PDF documents
- Word documents (.doc, .docx)
- Text files
- Images (JPEG, PNG, GIF)

### File Size Limits
- Default: 10MB per file
- Configurable via `MAX_FILE_SIZE` environment variable

### File Storage
- Files are stored in the `uploads/` directory
- File metadata is stored in the database
- Secure file serving with permission checks

## 🗄️ Database Schema

The application uses PostgreSQL with the following main entities:

- **Users**: User accounts with role assignments
- **Roles**: User roles with permission assignments
- **Permissions**: System permissions for RBAC
- **Research**: Research documents with metadata
- **ResearchFile**: File attachments for research
- **AuditLog**: System audit trail

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push     # Push schema to database
npm run db:migrate  # Run database migrations
npm run db:studio   # Open Prisma Studio

# Docker
npm run docker:build # Build Docker image
npm run docker:run   # Start with Docker Compose

# Testing
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f app
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Fine-grained permission system
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Cross-origin request handling
- **Helmet**: Security headers
- **Audit Logging**: Complete system audit trail

## 📝 Error Handling

The application includes comprehensive error handling:
- **Validation Errors**: Input validation with detailed messages
- **Authentication Errors**: JWT token validation
- **Authorization Errors**: Permission-based access control
- **Database Errors**: Prisma error handling
- **File System Errors**: File operation error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api-docs` 