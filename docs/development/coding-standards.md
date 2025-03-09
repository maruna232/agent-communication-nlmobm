# Introduction

This document outlines the coding standards, style guidelines, and best practices for the AI Agent Network project. Following these standards ensures code quality, consistency, and maintainability across the codebase.

## Purpose

The purpose of this document is to establish a consistent set of coding standards and practices that all developers should follow when contributing to the AI Agent Network project. These standards help ensure code quality, readability, and maintainability while supporting the project's privacy-first architecture.

## Scope

This document covers coding standards for both frontend (Next.js/React) and backend (Node.js/Express) components of the AI Agent Network. It includes language-specific guidelines, formatting rules, naming conventions, documentation requirements, and best practices for security and privacy.

## Enforcement

These standards are enforced through a combination of automated tools (ESLint, Prettier, TypeScript), code reviews, and continuous integration checks. Pull requests that do not meet these standards will not be merged until issues are addressed.

## Development Environment

All developers should maintain a consistent development environment to ensure code quality. Required tools include:

- Node.js 18+ LTS
- npm or yarn
- Git
- VSCode or similar editor with ESLint and Prettier extensions
- Chrome DevTools for frontend debugging

To set up your development environment:

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure editor extensions for ESLint and Prettier
4. Set up pre-commit hooks with `npx husky install`
5. Verify setup with `npm run lint` and `npm run test`

This ensures consistent code formatting, linting, and testing across all development environments.

# General Principles

The following general principles guide our coding standards and practices:

## Privacy by Design

As a privacy-focused application, all code must adhere to privacy-by-design principles:

- Minimize data collection and transmission
- Implement proper encryption for sensitive data
- Keep user data on the client device whenever possible
- Provide transparency in data handling
- Implement secure defaults
- Respect user consent and control

## Code Readability

Code should be written for humans to read and understand:

- Use clear, descriptive names for variables, functions, and classes
- Write self-documenting code with appropriate comments
- Keep functions and methods focused on a single responsibility
- Maintain consistent formatting and structure
- Avoid overly complex or clever code that sacrifices readability

## Maintainability

Code should be easy to maintain and extend:

- Follow SOLID principles (Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion)
- Write modular, reusable components
- Avoid tight coupling between components
- Use dependency injection where appropriate
- Keep technical debt to a minimum

## Security

Security must be a primary consideration in all code:

- Follow security best practices for authentication and authorization
- Implement proper input validation and output encoding
- Use secure cryptographic practices
- Avoid common security vulnerabilities (XSS, CSRF, injection attacks, etc.)
- Keep dependencies up to date to address security vulnerabilities

## Performance

Code should be efficient and performant:

- Optimize critical paths for performance
- Minimize unnecessary re-renders in React components
- Use appropriate data structures and algorithms
- Implement caching where beneficial
- Consider resource constraints on client devices

# Code Style and Formatting

Consistent code style and formatting improve readability and reduce cognitive load when working with the codebase.

## Automated Formatting

We use Prettier // version: ^3.0.0 for automated code formatting. The configuration is defined in `.prettierrc` files in both the frontend and backend projects.

Key formatting rules include:

- Single quotes for strings
- Semicolons required
- 2-space indentation
- 120 character line length limit
- ES5 trailing commas
- LF line endings

All developers should:

1. Install the Prettier extension for their IDE
2. Configure their IDE to format on save
3. Run `npm run format` before committing changes

## Linting

We use ESLint // package_name: eslint, version: ^8.0.0 for static code analysis. The configuration is defined in `.eslintrc.js` files in both the frontend and backend projects.

Key linting rules include:

- TypeScript strict mode enforcement
- React best practices
- Security rules
- Import ordering
- Accessibility requirements (frontend)

All developers should:

1. Install the ESLint extension for their IDE
2. Configure their IDE to show ESLint warnings/errors
3. Run `npm run lint` before committing changes
4. Address all ESLint errors (warnings may be addressed at discretion)

## TypeScript Configuration

We use TypeScript // package_name: typescript, version: ^5.0.0 with strict mode enabled. The configuration is defined in `tsconfig.json` files in both the frontend and backend projects.

Key TypeScript rules include:

- `strict: true` for comprehensive type checking
- `noImplicitAny: true` to prevent implicit any types
- `strictNullChecks: true` to prevent null/undefined errors
- `strictFunctionTypes: true` for function parameter checking
- `noImplicitReturns: true` to ensure all code paths return values

All developers should:

1. Write fully typed code with explicit return types
2. Avoid using `any` type (use appropriate types or generics)
3. Handle null and undefined values explicitly
4. Run `npm run type-check` before committing changes

## Editor Configuration

We use EditorConfig to maintain consistent editor settings across different IDEs. The configuration is defined in `.editorconfig` at the root of the repository.

Key editor settings include:

- UTF-8 encoding
- LF line endings
- 2-space indentation
- Trim trailing whitespace
- Insert final newline

All developers should install the EditorConfig extension for their IDE.

# Naming Conventions

Consistent naming conventions improve code readability and maintainability.

## General Naming Guidelines

- Use meaningful, descriptive names
- Prioritize clarity over brevity
- Be consistent with existing code
- Avoid abbreviations unless they are well-known
- Use standard terminology for common patterns
- Avoid Hungarian notation
- Avoid names that conflict with standard libraries or language keywords

## File and Directory Naming

**Frontend (Next.js/React):**

- React components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Contexts: `PascalCase.tsx` with `Context` suffix (e.g., `AuthContext.tsx`)
- Utilities: `camelCase.ts` (e.g., `dateUtils.ts`)
- Constants: `CONSTANT_CASE.ts` (e.g., `API_ENDPOINTS.ts`)
- Types/interfaces: `camelCase.types.ts` (e.g., `auth.types.ts`)
- Test files: Same as source file with `.test.tsx` or `.test.ts` suffix

**Backend (Node.js/Express):**

- Controllers: `camelCase.controller.ts` (e.g., `auth.controller.ts`)
- Services: `camelCase.service.ts` (e.g., `websocket.service.ts`)
- Middleware: `camelCase.middleware.ts` (e.g., `auth.middleware.ts`)
- Routes: `camelCase.routes.ts` (e.g., `auth.routes.ts`)
- Interfaces: `camelCase.interface.ts` (e.g., `user.interface.ts`)
- Utilities: `camelCase.utils.ts` (e.g., `encryption.utils.ts`)
- Test files: Same as source file with `.test.ts` suffix

**Common:**

- Directory names: `kebab-case` for multi-word directories (e.g., `user-profile`)
- Single-word directories: lowercase (e.g., `components`, `utils`)
- Configuration files: Use standard naming conventions (e.g., `.eslintrc.js`, `tsconfig.json`)

## TypeScript Naming

- Interfaces: `PascalCase` with descriptive names (e.g., `UserProfile`)
- Types: `PascalCase` with descriptive names (e.g., `ConnectionStatus`)
- Enums: `PascalCase` with singular noun (e.g., `MessageType`)
- Enum members: `CONSTANT_CASE` (e.g., `MessageType.QUERY_REQUEST`)
- Type aliases: `PascalCase` (e.g., `ApiResponse<T>`)
- Generics: Single uppercase letter for simple cases (e.g., `T`, `K`), descriptive `PascalCase` for complex cases (e.g., `TItem`, `TResponse`)

## JavaScript/TypeScript Naming

- Variables: `camelCase` (e.g., `userProfile`)
- Functions: `camelCase` with verb prefix (e.g., `getUserProfile`, `calculateTotal`)
- Classes: `PascalCase` (e.g., `UserService`)
- Constants: `CONSTANT_CASE` for true constants (e.g., `MAX_RETRY_ATTEMPTS`)
- Private properties/methods: `camelCase` with underscore prefix (e.g., `_privateMethod`)
- Boolean variables: `camelCase` with `is`, `has`, `should` prefix (e.g., `isAuthenticated`, `hasPermission`)
- Event handlers: `camelCase` with `handle` prefix (e.g., `handleSubmit`, `handleClick`)

## React Component Naming

- Components: `PascalCase` (e.g., `UserProfile`)
- Component files: Same as component name (e.g., `UserProfile.tsx`)
- Props interfaces: Component name with `Props` suffix (e.g., `UserProfileProps`)
- Context: `PascalCase` with `Context` suffix (e.g., `AuthContext`)
- Hooks: `camelCase` with `use` prefix (e.g., `useAuth`, `useLocalStorage`)
- Higher-order components: `camelCase` with `with` prefix (e.g., `withAuth`)

## CSS/Styling Naming

We use TailwindCSS for styling, but for custom CSS:

- CSS modules: Same as component name with `.module.css` suffix (e.g., `UserProfile.module.css`)
- CSS classes: `kebab-case` (e.g., `user-profile-container`)
- TailwindCSS custom classes: Follow TailwindCSS conventions

# Code Organization

Proper code organization improves maintainability and helps developers navigate the codebase.

## Project Structure

**Frontend (Next.js/React):**

```
src/
  app/             # Next.js App Router pages and layouts
  components/      # React components
    common/        # Shared UI components
    layout/        # Layout components
    [feature]/     # Feature-specific components
  hooks/           # Custom React hooks
  lib/             # Utilities and helpers
    api/           # API client functions
    types/         # TypeScript types and interfaces
    utils/         # Utility functions
    constants/     # Constants and configuration
    storage/       # Storage utilities
    websocket/     # WebSocket client
    calendar/      # Calendar integration
  services/        # Service layer for business logic
  store/           # State management (Zustand)
  styles/          # Global styles
  __tests__/       # Test files
  __mocks__/       # Mock files for testing
public/            # Static assets
```

**Backend (Node.js/Express):**

```
src/
  config/          # Configuration files
  controllers/     # Request handlers
  interfaces/      # TypeScript interfaces
  middleware/      # Express middleware
  routes/          # API routes
  services/        # Business logic
  utils/           # Utility functions
  validators/      # Request validation
  app.ts           # Express application setup
  server.ts        # Server entry point
  __tests__/       # Test files
```

## File Organization

**TypeScript/JavaScript Files:**

1. Imports (grouped and ordered)
   - External dependencies
   - Internal modules
   - Types and interfaces
   - Assets and styles
2. Constants and types
3. Helper functions
4. Main implementation
5. Exports

**React Component Files:**

1. Imports
2. Types and interfaces (e.g., props interface)
3. Constants specific to the component
4. Helper functions specific to the component
5. Component definition
6. Export statement

Example:

```typescript
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../lib/utils/dateTime';

import type { User } from '../../lib/types/auth.types';

interface UserProfileProps {
  userId: string;
  showDetails: boolean;
}

const MAX_RETRIES = 3;

const formatUserName = (user: User): string => {
  return user.displayName || user.email || 'Anonymous User';
};

export const UserProfile: React.FC<UserProfileProps> = ({ userId, showDetails }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { getUser } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    const fetchUser = async (): Promise<void> => {
      try {
        setLoading(true);
        const userData = await getUser(userId);
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [userId, getUser]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <div>User not found</div>;
  }
  
  return (
    <Card>
      <h2>{formatUserName(user)}</h2>
      {showDetails && (
        <div>
          <p>Email: {user.email}</p>
          <p>Member since: {formatDate(user.createdAt)}</p>
        </div>
      )}
      <Button onClick={() => router.back()}>Back</Button>
    </Card>
  );
};
```

## Import Organization

Imports should be organized in the following order, with a blank line between each group:

1. External dependencies (React, Next.js, libraries)
2. Internal modules (components, hooks, services)
3. Types and interfaces
4. Assets and styles

Within each group, imports should be alphabetically sorted.

Example:

```typescript
// External dependencies
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';

// Internal modules
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../lib/utils/dateTime';

// Types and interfaces
import type { User } from '../../lib/types/auth.types';
import type { Theme } from '../../lib/types/theme.types';

// Assets and styles
import styles from './UserProfile.module.css';
import userIcon from '../../assets/user-icon.svg';
```

This organization is enforced by the ESLint `import/order` rule.

## Component Organization

React components should be organized by feature and responsibility:

1. **Common components**: Reusable UI components (buttons, inputs, cards)
2. **Layout components**: Page layouts, navigation, headers, footers
3. **Feature components**: Components specific to a feature or domain
4. **Page components**: Next.js page components

Components should be kept small and focused on a single responsibility. Extract reusable parts into separate components.

# TypeScript Guidelines

TypeScript is used throughout the project to provide type safety and improve developer experience.

## Type Safety

- Enable strict mode in TypeScript configuration
- Avoid using `any` type; use appropriate types or `unknown` when necessary
- Use explicit return types for functions and methods
- Use type guards to narrow types when necessary
- Leverage TypeScript's type inference when appropriate
- Use `unknown` instead of `any` for values of uncertain type
- Use `never` to indicate impossible cases
- Use `readonly` for immutable properties and arrays
- Use discriminated unions for state management

## Interfaces vs. Types

- Use `interface` for object shapes that may be extended or implemented
- Use `type` for unions, intersections, and complex types
- Prefer `interface` for public API definitions
- Prefer `type` for function types and mapped types
- Be consistent within related type definitions

Example:

```typescript
// Interface for object shapes that may be extended
interface User {
  id: string;
  email: string;
  displayName?: string;
}

interface AdminUser extends User {
  role: 'admin';
  permissions: string[];
}

// Type for unions and complex types
type UserRole = 'admin' | 'user' | 'guest';

type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};
```

## Generics

- Use generics to create reusable components and functions
- Provide sensible defaults for generic types when appropriate
- Use constraints to limit generic types when necessary
- Use descriptive names for complex generics

Example:

```typescript
// Simple generic function
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

// Generic with constraints
function merge<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

// Generic component with default
interface ListProps<T = string> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

export const List = <T extends unknown = string>(props: ListProps<T>): JSX.Element => {
  // Implementation
};
```

## Type Assertions

- Avoid type assertions (`as Type`) when possible
- Use type guards instead of type assertions when possible
- When necessary, prefer `as` syntax over angle brackets (`<Type>`)
- Use `!` (non-null assertion) sparingly and only when you're certain

Example:

```typescript
// Avoid this when possible
const user = data as User;

// Prefer this
if (isUser(data)) {
  const user = data; // Type is narrowed to User
}

// Type guard
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).email === 'string'
  );
}
```

## Enums

- Use string enums for better readability and debugging
- Use const enums for performance when values are used only at compile time
- Consider using union types of string literals for simple cases

Example:

```typescript
// String enum
enum MessageType {
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
  PROPOSAL = 'PROPOSAL',
  CONFIRMATION = 'CONFIRMATION',
  REJECTION = 'REJECTION'
}

// Union type alternative
type MessageTypeUnion = 'QUERY' | 'RESPONSE' | 'PROPOSAL' | 'CONFIRMATION' | 'REJECTION';

// Const enum for performance
const enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT'
}
```

## Utility Types

- Leverage TypeScript's built-in utility types
- Create custom utility types for project-specific needs

Commonly used utility types:

```typescript
// Pick specific properties
type UserBasic = Pick<User, 'id' | 'email'>;

// Omit specific properties
type UserWithoutId = Omit<User, 'id'>;

// Make properties optional
type PartialUser = Partial<User>;

// Make properties required
type RequiredUser = Required<User>;

// Make properties readonly
type ReadonlyUser = Readonly<User>;

// Extract return type of a function
type AuthResult = ReturnType<typeof authenticateUser>;

// Extract parameters of a function
type AuthParams = Parameters<typeof authenticateUser>;

// Custom utility type
type Nullable<T> = T | null;
```

# React Guidelines

Guidelines for React development in the frontend application.

## Component Structure

- Use functional components with hooks instead of class components
- Keep components small and focused on a single responsibility
- Extract reusable logic into custom hooks
- Use React.memo for performance optimization when appropriate
- Use React.lazy and Suspense for code splitting

Example:

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface UserProfileProps {
  userId: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const { getUser } = useAuth();
  
  useEffect(() => {
    const fetchUser = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUser(userId);
        setUserData(data);
      } catch (err) {
        setError('Failed to load user data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [userId, getUser]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  if (!userData) {
    return <div>User not found</div>;
  }
  
  return (
    <div>
      <h2>{userData.displayName || userData.email}</h2>
      <p>Email: {userData.email}</p>
    </div>
  );
};
```

## Hooks Usage

- Follow the Rules of Hooks
- Use the ESLint plugin for hooks to enforce rules
- Keep custom hooks focused and reusable
- Name custom hooks with the `use` prefix
- Use appropriate hooks for different needs:
  - `useState` for local component state
  - `useEffect` for side effects
  - `useCallback` for memoized callbacks
  - `useMemo` for expensive computations
  - `useRef` for mutable references
  - `useContext` for context consumption

Example custom hook:

```typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = (value: T): void => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  // Listen for changes to this local storage key in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
```

## State Management

- Use local component state for component-specific state
- Use Zustand for global state management
- Keep state minimal and normalized
- Derive computed values instead of storing them
- Use context for theme, authentication, and other app-wide concerns

Example Zustand store:

```typescript
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          const user = await authService.login(email, password);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Authentication failed', 
            isLoading: false 
          });
        }
      },
      
      logout: async () => {
        try {
          set({ isLoading: true });
          await authService.logout();
          set({ user: null, isAuthenticated: false, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Logout failed', 
            isLoading: false 
          });
        }
      },
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
    }
  )
);
```

## Performance Optimization

- Use React.memo for expensive components
- Use useCallback for event handlers passed to child components
- Use useMemo for expensive calculations
- Implement virtualization for long lists (react-window or react-virtualized)
- Use code splitting with React.lazy and Suspense
- Avoid unnecessary re-renders
- Use the React DevTools Profiler to identify performance issues

Example:

```typescript
import React, { useCallback, useMemo } from 'react';

interface ItemListProps {
  items: Item[];
  onItemClick: (item: Item) => void;
  filter: string;
}

export const ItemList: React.FC<ItemListProps> = React.memo(({ items, onItemClick, filter }) => {
  // Memoize filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);
  
  // Memoize click handler
  const handleItemClick = useCallback((item: Item) => {
    onItemClick(item);
  }, [onItemClick]);
  
  return (
    <ul>
      {filteredItems.map(item => (
        <li key={item.id} onClick={() => handleItemClick(item)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});
```

## Accessibility

- Use semantic HTML elements
- Provide alt text for images
- Ensure proper keyboard navigation
- Use ARIA attributes when necessary
- Maintain sufficient color contrast
- Test with screen readers
- Follow the WCAG 2.1 AA guidelines
- Use the jsx-a11y ESLint plugin

Example:

```typescript
import React from 'react';

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  disabled = false, 
  children,
  ariaLabel
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${disabled ? 'btn-disabled' : 'btn-primary'}`}
      aria-label={ariaLabel}
      type="button"
    >
      {children}
    </button>
  );
};
```

# Node.js/Express Guidelines

Guidelines for Node.js and Express development in the backend application.

## API Design

- Follow RESTful principles for API endpoints
- Use consistent URL patterns
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Return appropriate HTTP status codes
- Implement proper error handling
- Use versioning for APIs
- Document APIs with comments or OpenAPI/Swagger

Example:

```typescript
// src/routes/auth.routes.ts
import { Router } from 'express';
import { validateToken, login, register } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', validateRequest(loginSchema), login);

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validateRequest(registerSchema), register);

/**
 * @route POST /api/auth/validate
 * @desc Validate a JWT token
 * @access Public
 */
router.post('/validate', validateToken);

export default router;
```

## Middleware Structure

- Keep middleware functions focused on a single responsibility
- Use middleware for cross-cutting concerns
- Chain middleware in a logical order
- Handle errors in middleware
- Use typed middleware with Express

Example:

```typescript
// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logging.utils';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  data?: unknown;
}

export const errorMiddleware = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = error.message || 'An unexpected error occurred';
  const errorCode = error.code || 'INTERNAL_ERROR';
  
  // Log the error
  logger.error(`[${errorCode}] ${message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    error: error.stack
  });
  
  // Send error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      ...(error.data && { data: error.data })
    }
  });
};
```

## Controller Structure

- Keep controllers focused on request handling
- Delegate business logic to services
- Use async/await with proper error handling
- Return consistent response structures
- Validate input data

Example:

```typescript
// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { authService } from '../services/auth.service';
import { AppError } from '../middleware/error.middleware';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    const { user, token } = await authService.login(email, password);
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;
    
    const { user, token } = await authService.register(email, password, displayName);
    
    res.status(StatusCodes.CREATED).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const validateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        valid: false,
        error: 'Missing authorization header'
      });
      return;
    }
    
    const [bearer, token] = authHeader.split(' ');
    
    if (bearer !== 'Bearer' || !token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        valid: false,
        error: 'Invalid authorization format'
      });
      return;
    }
    
    try {
      const user = await authService.verifyToken(token);
      
      res.status(StatusCodes.OK).json({
        valid: true,
        user
      });
    } catch (error) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  } catch (error) {
    next(error);
  }
};
```

## Service Structure

- Implement business logic in services
- Keep services focused on a specific domain
- Use dependency injection for external dependencies
- Handle errors appropriately
- Return typed responses

Example: