# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm start` - Start development server (runs on http://localhost:3000)
- `npm test` - Run tests in interactive watch mode
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App (one-way operation)

### Testing
- Test files use Jest and React Testing Library
- Tests are located alongside components with `.test.js` extension
- Run single test: `npm test -- --testNamePattern="specific test name"`

## Architecture Overview

### Authentication & Authorization
- **OIDC Authentication**: Uses `react-oidc-context` with AWS Cognito
- **Auth Flow**: Cognito Hosted UI → OIDC redirect → App authentication
- **Auth Context**: `AppContext.js` manages auth state, user info, and navigation guards
- **Protected Routes**: All routes except `/login` require authentication
- **Navigation Guards**: Prevent authenticated users from accessing login, redirect unauthenticated users

### Application Structure
This is a **school management system** organized around class-based navigation:

#### Route Hierarchy
```
/class-selector → Class selection
/class-selector/:classNumber → Class dashboard
/class-selector/:classNumber/student-management → Student CRUD operations
/class-selector/:classNumber/academics → Subject selection
/class-selector/:classNumber/academics/:subject → Subject modules
/class-selector/:classNumber/academics/:subject/evaluation → Assessment workflow
/class-selector/:classNumber/timetable → Class scheduling
```

#### Core Modules
1. **Student Management** (`src/components/modules/`): Full CRUD operations with bulk upload/operations
2. **Academics** (`src/components/academics/`): Subject-based learning modules
3. **Evaluation** (`src/components/evaluation/`): Assessment and grading workflow
4. **Timetable** (`src/components/timetable/`): Class scheduling management
5. **File Management** (`src/components/files/`): Document upload/management with AWS S3

### Data Flow & State Management
- **Global State**: `AppContext.js` manages authentication, selected class, breadcrumbs
- **Local State**: Components manage their own form and UI state
- **API Integration**: Services in `src/services/` handle external API calls
- **Navigation State**: Breadcrumb system tracks user location in class hierarchy

### Key Services
- **StudentApiService** (`src/services/studentApiService.js`): Complete student CRUD with bulk operations
- **S3Service** (`src/services/s3Service.js`): AWS S3 file upload/management
- **EvaluationService** (`src/services/evaluationService.js`): Assessment data handling

### Authentication Details
- **Cognito Integration**: Hardcoded client ID and domain in `AppContext.js:49-51`
- **Token Management**: ID tokens extracted from OIDC user object for API calls
- **School Code**: Extracted from Cognito username for multi-tenant support
- **Logout Flow**: Custom logout to Cognito with proper cleanup

### API Architecture
- **Base URL**: `https://ab2pkk5ybl.execute-api.ap-south-1.amazonaws.com/dev`
- **Authentication**: Bearer tokens (ID tokens) in Authorization header
- **Multi-tenancy**: School code identifies tenant (extracted from admin username)
- **Class Format**: Classes formatted as "CLASS9", "CLASS10" etc. (uppercase)
- **Bulk Operations**: Support for batch create/update/delete (max 100 items)

### UI/UX Patterns
- **Glassmorphism Design**: Frosted glass effects with backdrop blur
- **Responsive Layout**: Mobile-first with breakpoints at 480px, 768px, 1024px, 1200px
- **Breadcrumb Navigation**: Context-aware navigation in class hierarchy
- **Loading States**: Consistent loading indicators across operations
- **Error Handling**: User-friendly error messages with fallback states

### File Upload System
- **AWS S3 Integration**: Direct upload to S3 with presigned URLs
- **File Types**: Support for CSV bulk upload and general document management
- **Validation**: Client-side file type and size validation
- **Progress Tracking**: Upload progress indicators

### Data Validation
- **Student Data**: Strict validation for names (letters only), dates (DD-MM-YYYY), sections, roll numbers
- **Phone Numbers**: Exactly 10 digits (numeric only)
- **CSV Import**: Header validation and row-by-row data validation
- **Bulk Operations**: Batch validation with detailed error reporting

### Important Notes
- Always use uppercase formatting for class names and sections in API calls
- School codes are extracted from Cognito usernames and must be uppercase
- Bulk operations have a 100-item limit enforced by `StudentApiService`
- Date format is strictly DD-MM-YYYY throughout the system
- All API calls require valid ID tokens from authenticated users