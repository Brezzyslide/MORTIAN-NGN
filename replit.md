# TrackIt Naija - Multi-Industry Project Analytics System

## Overview

TrackIt Naija is a comprehensive multi-tenant project management and budgeting platform specifically designed for Nigerian businesses, featuring hierarchical budget tracking in Nigerian Naira (₦). The system implements hierarchical role-based access control with three distinct user levels: Managers, Team Leaders, and Users. It provides real-time analytics, fund allocation management, transaction tracking, comprehensive construction BOQ (Bill of Quantities) data, business/operational categories, budget threshold approval workflow (80% warning, 95% critical), Excel/PDF export capabilities, and complete audit trails for project-based financial operations.

The platform is designed to handle multiple tenants with isolated data, allowing organizations to manage their projects, allocate budgets, track expenses, and monitor financial performance through an intuitive dashboard interface.

## Project Features

### Comprehensive Construction Data
- **284 Materials**: Includes construction materials (Cement, Sand, Blocks, Iron Rods, Roofing, Electrical, Plumbing, etc.) plus business materials (Marketing Brochures, Signage Boards, Access Gates, Site Fencing, Street Lighting)
- **241 Line Items**: Covering 20 categories including construction-specific and business/operational categories
- **20 Categories**:
  - **Construction Categories (16)**: Site Preparation, Foundation, Structural, Roofing, Doors/Windows, Electrical, Plumbing, HVAC, Flooring, Wall Finishes, Painting, Ceiling, External Works, Landscaping, Fencing/Gates, Drainage
  - **Business Categories (4)**: Utilities Setup, Property Development, Legal & Documentation, Property Management
  
### Budget Thresholds & Alerts
- **80% Warning**: Alert when project budget reaches 80% utilization
- **95% Critical**: Critical alert at 95% budget consumption
- Auto-approval workflow based on budget impact thresholds
- Real-time budget alerts with project-specific tracking

### Industry Templates
- Construction industry template with 284 materials and 241 line items
- Real Estate template with business/operational focus
- Manufacturing, Software Development, and Other industry templates
- Automatic template population when new tenants are created
- Admin API endpoint (`/api/admin/populate-templates`) for refreshing templates on existing tenants

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessibility and customization
- **Styling**: Tailwind CSS with CSS variables for consistent theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for REST API endpoints
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Authentication**: Replit Auth integration with OpenID Connect (OIDC) for secure user authentication
- **Session Management**: Express sessions with PostgreSQL session store for persistent login state
- **API Design**: RESTful endpoints with hierarchical data access based on user roles and tenant isolation

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless driver for scalable data storage
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema Structure**: Multi-tenant design with the following core entities:
  - Users (with role-based hierarchy: manager → team_leader → user)
  - Projects (tenant-isolated with budget tracking)
  - Fund Allocations (project-based budget distribution)
  - Transactions (expense tracking with categorization)
  - Fund Transfers (inter-project budget movements)
  - Audit Logs (complete activity tracking for compliance)
  - Sessions (authentication state persistence)

### Authentication & Authorization
- **Identity Provider**: Replit Auth with OIDC integration for seamless authentication
- **Authorization Model**: Hierarchical role-based access control (RBAC)
  - Managers: Full tenant access and user management capabilities
  - Team Leaders: Project-level access and team member oversight
  - Users: Limited access to assigned projects and personal transactions
- **Session Security**: HTTP-only cookies with secure transmission and configurable TTL
- **Tenant Isolation**: Data segregation at the database level using tenant IDs

### File Storage & Object Management
- **Storage Provider**: Google Cloud Storage with Replit sidecar integration
- **Access Control**: Custom ACL system with group-based permissions
- **File Upload**: Uppy integration for user-friendly file management with progress tracking
- **Security**: Presigned URLs for direct-to-cloud uploads with server-side validation

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL (serverless) for primary data storage
- **Authentication**: Replit Auth service for user identity management
- **File Storage**: Google Cloud Storage for document and asset management
- **Session Store**: PostgreSQL-backed session storage for authentication persistence

### Development & Build Tools
- **Package Manager**: npm with lockfile for dependency management
- **TypeScript**: Strict type checking for both client and server code
- **ESBuild**: Server-side bundling for production deployment
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer

### Third-Party Libraries
- **UI Components**: Extensive Radix UI component library for accessible interfaces
- **File Upload**: Uppy dashboard for advanced file management capabilities
- **Form Handling**: React Hook Form with Zod validation for type-safe form processing
- **Database**: Drizzle ORM with migration support for schema evolution
- **Utilities**: Various supporting libraries for date manipulation, validation, and utility functions

### Runtime Environment
- **Platform**: Replit with integrated development and deployment pipeline
- **Node.js**: ES modules with modern JavaScript features
- **Environment Configuration**: Environment variables for sensitive configuration management
- **Logging**: Express middleware for request/response logging and error tracking