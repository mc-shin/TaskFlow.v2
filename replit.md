# Task Management Dashboard

## Overview

This is a full-stack task management application built with React, Express, and Drizzle ORM. The application provides a Korean-language dashboard for managing tasks with features like status tracking, user assignment, activity logging, calendar integration, and comprehensive meeting management. The system uses a modern tech stack with TypeScript throughout and includes comprehensive UI components powered by shadcn/ui.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming, dark mode support
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with structured error handling and request logging

### Data Storage
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Tables**: Users, tasks, and activities with proper foreign key relationships
- **Fallback**: In-memory storage implementation for development/testing

### Authentication & Authorization
- **Session-based**: Uses express-session with PostgreSQL store
- **User Management**: Basic user CRUD operations with username/password
- **Default Users**: Pre-populated with Korean test users (hyejin, hyejung, chamin)

### API Structure
- **Task Management**: Full CRUD operations for tasks with status filtering
- **User Management**: User creation and retrieval endpoints
- **Activity Logging**: Activity creation and retrieval for audit trails
- **Statistics**: Aggregated data endpoints for dashboard metrics

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm & drizzle-kit**: Type-safe ORM and schema management
- **express**: Web application framework
- **react & react-dom**: Frontend UI library
- **vite**: Build tool and development server

### UI & Styling
- **@radix-ui/***: Unstyled, accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library

### Data Management
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation library
- **drizzle-zod**: Integration between Drizzle and Zod

### Development Tools
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **wouter**: Lightweight router for React
- **date-fns**: Date utility library

### Session & Storage
- **connect-pg-simple**: PostgreSQL session store for Express
- **express-session**: Session middleware

The application is designed as a monorepo with shared schemas between client and server, ensuring type safety across the entire stack. The development setup uses Vite for hot module replacement and includes Replit-specific tooling for cloud development.

## Recent Changes

### List Tree UI/UX Improvements (September 18, 2025)
- **Assignee Field Row Consistency**: Fixed layout shifts when editing assignee fields in the list view. The row now maintains consistent height and layout between edit and display modes, preventing visual jumps during inline editing.
- **Hierarchical Checkbox Selection**: Implemented intelligent checkbox selection behavior where:
  - Selecting a project automatically selects all its goals and tasks
  - Selecting a goal automatically selects all its tasks
  - Deselecting a parent item deselects all its children
  - When all children are individually selected, the parent automatically becomes selected
  - Provides intuitive bulk selection capabilities for project management workflows

### Kanban Layout Complete Restructuring (September 24, 2025)
- **Image-Based Design Implementation**: Completely redesigned the Kanban page structure based on user-provided mockup image, creating a flat selection-based interface instead of hierarchical expansion system.
- **Four-Layer Layout Structure**: Implemented exact structure from specification: Status headers → Project selection row → Goal selection row → Four-column task board, matching the provided visual reference perfectly.
- **Selection-Based Navigation**: Replaced expand/collapse tree structure with dropdown selectors for projects and goals, enabling direct navigation to specific project/goal combinations with "프로젝트 직접 작업" option for project-level tasks.
- **True Kanban Columns**: Restructured task display into authentic 4-column kanban board (진행전, 진행중, 완료, 이슈) where tasks flow based on selected project/goal context, providing genuine kanban workflow experience.
- **Context-Aware Filtering**: Implemented sophisticated task filtering system that displays only relevant tasks based on project/goal selection, with automatic initialization of first project and goal on page load.
- **Sidebar Color Integration**: Applied consistent sidebar theme colors throughout the interface with distinct styling for project rows, goal rows, and status columns.
- **React Best Practices**: Utilized proper useEffect for initialization logic and useMemo for data processing, ensuring optimal performance and adherence to React patterns.

### Meeting Management Enhancements (September 12, 2025)
- **Optional End Time**: Meeting edit forms now treat end time as optional, with proper validation and null handling throughout the system. UI clearly indicates end time as "(선택사항)" (optional).
- **File Attachments & Downloads**: Implemented complete attachment system for meetings with file upload, display, and download capabilities. Download functionality uses direct fetch calls to object storage streaming endpoints with proper error handling and user feedback.
- **Form Validation**: Enhanced meeting creation and edit forms with better validation, proper drag-and-drop file uploads, and improved user experience.

### Issue Status Implementation and Bug Fixes (September 25, 2025)
- **Issue Status Addition**: Added "이슈" (Issue) status to the system schema with comprehensive support across all entity types (projects, goals, tasks). The issue status takes precedence over progress-based status calculations and displays with distinctive orange badge styling.
- **Critical List View Bug Fix**: Resolved a major display inconsistency where "이슈" status was not properly shown in list views. The root cause was in list-tree.tsx where renderEditableStatus calls were passing empty strings instead of actual status values for projects and goals.
- **Status Editing Restrictions**: Implemented controlled editing behavior where "이슈" status can only be modified in detail pages. List page interactions for tasks redirect to detail pages when attempting to change status to "이슈".
- **Consistent Badge Styling**: Added orange "issue" variant to Badge component ensuring visual consistency across all views when displaying "이슈" status.
- **Data Synchronization**: Ensured proper status synchronization between detail pages and list views through TanStack Query cache invalidation, maintaining data consistency across navigation contexts.

### Member Invitation System Improvements (September 30, 2025)
- **Database Schema Compliance**: Fixed invitation payload validation by removing the `inviterName` field from invitation data sent from list-tree.tsx and admin.tsx. Invitations now only include `inviterEmail`, `inviteeEmail`, `role`, and `status` fields, matching the actual database schema exactly.
- **Database-Based Role Display**: Corrected member list role display in the list page invitation modal. Previously, roles were determined by array index position (first user = admin, rest = team members), causing incorrect role badges regardless of database values. Now displays `user.role` directly from the database, ensuring accurate representation of admin ("관리자") and team member ("팀원") roles.
- **Admin Protection**: Updated delete button logic to use database role field (`user.role !== '관리자'`) instead of array index, preventing accidental deletion of users with admin privileges.
- **Team Member Deletion Restrictions**: Implemented role-based access control for member deletion in list page. Only administrators can see and use the delete member button. Team members ("팀원") cannot delete other members from the workspace.
- **Role Assignment Fix**: Fixed critical bug where users not in hardcoded mapping (admin, hyejin, hyejung, chamin) weren't getting their roles updated when accepting invitations. Now all users receive the correct role ("관리자" or "팀원") from the invitation when they accept it, regardless of whether they're in the hardcoded mapping or not.
- **Role Update Implementation**: Enhanced workspace.tsx invitation acceptance flow to call PATCH `/api/users/:id/role` endpoint for both mapped and unmapped existing users, ensuring role changes are properly saved to the database.

### Archive Progress Calculation Consistency (September 30, 2025)
- **Status-Based Progress Fallback**: Added `getTaskProgress()` helper function in server/storage.ts that returns explicit task.progress when available, otherwise falls back to status-based progress mapping (진행전→0, 완료→100, 진행중/이슈→50), ensuring legacy tasks without stored progress values display correctly.
- **Goal Progress with Fallback**: Updated both MemStorage and DrizzleStorage archive methods to calculate goal progress as the average of task progress values using `getTaskProgress()`, ensuring proper handling of legacy tasks and matching list page calculation logic.
- **Project Progress with Direct Task Fallback**: Enhanced project progress calculation to first average goal progress when goals exist, but fall back to averaging direct project task progress when no goals are present, preventing 0% progress display for goal-less projects with active tasks.
- **Complete List/Archive Parity**: Archive page now displays identical progress percentages as list page across all scenarios: projects with goals, projects with only direct tasks, and legacy tasks without explicit progress values.
- **Consistent Implementation**: Both MemStorage and DrizzleStorage implementations use identical calculation logic with proper status fallback and direct task fallback, ensuring data consistency regardless of storage backend.