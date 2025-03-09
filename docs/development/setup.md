## Introduction

This document provides comprehensive instructions for setting up the development environment for the AI Agent Network project. It covers both frontend (Next.js/React) and backend (Node.js/WebSocket) components, as well as the necessary tools and configurations for local development, testing, and containerization.

### Purpose

The purpose of this document is to ensure that all developers can quickly set up a consistent development environment that matches the project's requirements and architectural principles. Following these instructions will help you get started with development, testing, and contributing to the AI Agent Network project.

### Prerequisites

Before setting up the development environment, ensure you have the following installed on your system:

- **Node.js**: Version 18.x LTS or later
- **npm**: Version 9.x or later (comes with Node.js)
- **Git**: Latest version
- **Docker**: Latest version (for backend development and testing)
- **Visual Studio Code**: Recommended IDE (optional but recommended)

Familiarity with TypeScript, React, Next.js, and Node.js is also recommended.

## Repository Setup

This section covers the initial setup of the project repository.

### Cloning the Repository

Clone the repository from GitHub using the following command:

```bash
git clone https://github.com/ai-agent-network/ai-agent-network.git
cd ai-agent-network
```

### Repository Structure

The repository is organized into the following main directories:

- `src/web`: Frontend application (Next.js/React)
- `src/backend`: Backend WebSocket server (Node.js/Express/Socket.io)
- `infrastructure`: Terraform and deployment configuration
- `docs`: Project documentation
- `.github`: GitHub Actions workflows and templates
- `security`: Security-related scripts and documentation

Each component has its own package.json file and can be developed independently.

## Frontend Setup

This section covers the setup of the frontend application built with Next.js and React.

### Installing Dependencies

Navigate to the frontend directory and install dependencies:

```bash
cd src/web
npm install
```

This will install all the required dependencies defined in `package.json`, including:

- Next.js and React for the UI framework
- TailwindCSS for styling
- Zustand // version: 4.4+ for state management
- Socket.io-client // package_name: socket.io-client, version: 4.7+ for WebSocket communication
- Crypto libraries for encryption
- Testing libraries (Jest, React Testing Library, Playwright)

### Environment Configuration

Create a `.env.local` file in the `src/web` directory by copying the provided example:

```bash
cp .env.example .env.local
```

Edit the `.env.local` file to configure the following:

- Firebase Authentication credentials
- OpenAI API key for agent intelligence
- Google Calendar API credentials (if using calendar integration)
- WebSocket server URL (use `ws://localhost:3001` for local development)
- Other application settings

For local development, you can use the following minimal configuration:

```
# Firebase Authentication Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# OpenAI API Configuration
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key

# WebSocket Server Configuration
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Development Settings
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_MOCK_SERVICES=true
```

Note: For development, you can set `NEXT_PUBLIC_MOCK_SERVICES=true` to use mock implementations instead of actual external services.

### Running the Frontend

Start the development server:

```bash
npm run dev
```

This will start the Next.js development server on http://localhost:3000 with hot-reloading enabled.

You can also build and run the production version locally:

```bash
npm run build
npm start
```

### Frontend Scripts

The frontend package.json includes the following useful scripts:

- `npm run dev`: Start the development server
- `npm run build`: Build the production version
- `npm start`: Run the production build
- `npm run lint`: Run ESLint to check for code issues
- `npm run lint:fix`: Fix linting issues automatically
- `npm run format`: Format code using Prettier
- `npm test`: Run Jest tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report
- `npm run test:e2e`: Run Playwright end-to-end tests
- `npm run type-check`: Run TypeScript type checking

## Backend Setup

This section covers the setup of the backend WebSocket server built with Node.js, Express, and Socket.io.

### Installing Dependencies

Navigate to the backend directory and install dependencies:

```bash
cd src/backend
npm install
```

This will install all the required dependencies defined in `package.json`, including:

- Express // version: 4.18+ for the HTTP server
- Socket.io // version: 4.7+ for WebSocket implementation
- Redis adapter for Socket.io scaling
- Firebase Admin SDK for authentication
- Winston for logging
- Testing libraries (Jest, Supertest)

### Environment Configuration

Create a `.env` file in the `src/backend` directory by copying the provided example:

```bash
cp .env.example .env
```

Edit the `.env` file to configure the following:

- Server settings (port, host, CORS)
- WebSocket configuration
- Redis connection (if using)
- Firebase project settings
- JWT settings for authentication
- Encryption settings
- Rate limiting configuration
- Logging settings

For local development, you can use the following minimal configuration:

```
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost
CORS_ORIGIN=http://localhost:3000

# WebSocket Configuration
WS_PATH=/socket.io
WS_MAX_CONNECTIONS=1000
WS_PING_INTERVAL=25000
WS_PING_TIMEOUT=10000

# Redis Configuration
REDIS_ENABLED=false

# Authentication Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=3600

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id

# Logging Configuration
LOG_LEVEL=debug
```

Note: For local development without Redis, set `REDIS_ENABLED=false`. The server will use in-memory storage instead.

### Running the Backend

Start the development server:

```bash
npm run dev
```

This will start the Node.js server on http://localhost:3001 with hot-reloading enabled using nodemon.

You can also build and run the production version locally:

```bash
npm run build
npm start
```

### Backend Scripts

The backend package.json includes the following useful scripts:

- `npm run dev`: Start the development server with nodemon
- `npm run build`: Build the TypeScript code to JavaScript
- `npm start`: Run the production build
- `npm run lint`: Run ESLint to check for code issues
- `npm run format`: Format code using Prettier
- `npm test`: Run Jest tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report
- `npm run docker:build`: Build the Docker image
- `npm run docker:run`: Run the Docker container

## Docker Setup

This section covers the Docker setup for the backend WebSocket server.

### Building the Docker Image

The backend includes a Dockerfile for containerization. To build the Docker image:

```bash
cd src/backend
npm run docker:build
```

This will create a Docker image named `ai-agent-network-backend` using the multi-stage build process defined in the Dockerfile.

### Running with Docker Compose

For local development with Redis, you can use Docker Compose:

```bash
cd src/backend
docker-compose up
```

This will start both the WebSocket server and a Redis instance with the configuration defined in `docker-compose.yml`.

To run in detached mode:

```bash
docker-compose up -d
```

To stop the containers:

```bash
docker-compose down
```

### Docker Compose Configuration

The `docker-compose.yml` file defines two services:

1. **websocket-server**: The Node.js WebSocket server
   - Built from the local Dockerfile
   - Exposes port 3001
   - Mounts source code for hot-reloading
   - Configured for development mode

2. **redis**: Redis server for WebSocket scaling
   - Uses the official Redis Alpine image
   - Exposes port 6379
   - Configured with persistence
   - Uses a named volume for data storage

The configuration includes health checks for both services and defines a custom network for communication.

## Testing Setup

This section covers the setup for testing both frontend and backend components.

### Frontend Testing

The frontend uses Jest for unit and integration tests, and Playwright for end-to-end tests.

**Running Unit and Integration Tests:**

```bash
cd src/web
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

**Running End-to-End Tests:**

First, install Playwright browsers if you haven't already:

```bash
npx playwright install
```

Then run the E2E tests:

```bash
npm run test:e2e        # Run all E2E tests
npx playwright test --project=chromium  # Run in Chrome only
npx playwright test e2e/auth.spec.ts    # Run specific test file
```

Detailed testing guidelines and best practices can be found in the project documentation.

### Backend Testing

The backend uses Jest for unit and integration tests.

**Running Tests:**

```bash
cd src/backend
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

**Testing with Redis:**

For integration tests that require Redis, you can use the provided Docker Compose configuration:

```bash
docker-compose -f docker-compose.test.yml up -d
```

This will start a Redis instance for testing. The tests will automatically connect to it if `REDIS_ENABLED=true` in your test environment.

### Test Environment Configuration

**Frontend Test Environment:**

Create a `.env.test.local` file in the `src/web` directory with test-specific configuration:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_API_KEY=test-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-project
NEXT_PUBLIC_OPENAI_API_KEY=test-openai-key
NEXT_PUBLIC_MOCK_SERVICES=true
```

**Backend Test Environment:**

Create a `.env.test` file in the `src/backend` directory with test-specific configuration:

```
NODE_ENV=test
PORT=3001
REDIS_ENABLED=false
JWT_SECRET=test-jwt-secret
FIREBASE_PROJECT_ID=test-project
LOG_LEVEL=error
```

## IDE Setup

This section covers the recommended IDE setup for the project.

### Visual Studio Code

Visual Studio Code // package_name: vscode, version: latest is the recommended IDE for this project. The repository includes VS Code configuration files in the `.vscode` directory.

**Recommended Extensions:**

- ESLint: JavaScript/TypeScript linting
- Prettier: Code formatting
- EditorConfig: Consistent editor configuration
- Jest: Test runner integration
- Tailwind CSS IntelliSense: CSS class suggestions
- Docker: Docker integration
- GitLens: Git integration
- Error Lens: Inline error display

You can install these extensions manually or use the VS Code Extensions view to install recommended extensions from the workspace configuration.

### Editor Configuration

The project includes the following configuration files for consistent editor settings:

- `.editorconfig`: Basic editor settings (indentation, line endings, etc.)
- `.prettierrc`: Prettier formatting rules
- `.eslintrc.js`: ESLint configuration
- `tsconfig.json`: TypeScript configuration

VS Code should automatically use these configurations when you open the project.

## Firebase Setup

This section covers the setup of Firebase for authentication.

### Creating a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Authentication in the Firebase console
4. Add Email/Password and Google as authentication providers
5. Create a web app in your Firebase project
6. Copy the Firebase configuration (apiKey, authDomain, projectId, etc.)
7. Add these values to your `.env.local` file in the frontend

### Firebase Admin Setup

For the backend to verify Firebase authentication tokens:

1. Go to Project Settings > Service Accounts in the Firebase console
2. Click "Generate new private key" to download a JSON file
3. Extract the `project_id` and `client_email` from this file
4. Set these values in your backend `.env` file:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   ```

For local development, you can use the project ID alone with the `FIREBASE_PROJECT_ID` environment variable. For production, you'll need to securely store the private key.

## OpenAI API Setup

This section covers the setup of the OpenAI API for agent intelligence.

### Getting an API Key

1. Create an account on [OpenAI](https://platform.openai.com/)
2. Navigate to the API section
3. Create an API key
4. Add the API key to your frontend `.env.local` file:
   ```
   NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
   ```

Note: For development, you can set `NEXT_PUBLIC_MOCK_SERVICES=true` to use mock implementations instead of making actual API calls to OpenAI.

### API Usage Considerations

The OpenAI API is a paid service with usage-based billing. To manage costs during development:

- Use the mock service option when possible
- Implement caching for similar requests
- Set up usage limits in the OpenAI dashboard
- Monitor your usage regularly

The application is designed to minimize token usage through efficient prompt engineering and context management.

## Google Calendar API Setup

This section covers the setup of the Google Calendar API for calendar integration.

### Creating API Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized JavaScript origins (http://localhost:3000 for development)
6. Add authorized redirect URIs (http://localhost:3000/api/auth/callback/google for development)
7. Copy the Client ID and Client Secret
8. Add these values to your frontend `.env.local` file:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
   NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your-client-secret
   ```

Note: For development, you can set `NEXT_PUBLIC_MOCK_SERVICES=true` to use mock implementations instead of making actual API calls to Google Calendar.

### OAuth Scopes

The application requires the following OAuth scopes for Google Calendar:

- `https://www.googleapis.com/auth/calendar.readonly`: Read calendar events
- `https://www.googleapis.com/auth/calendar.events`: Create and manage calendar events

These scopes are requested during the OAuth flow when a user connects their Google Calendar.

## Development Workflow

This section covers the recommended development workflow for the project.

### Branch Strategy

The project uses a trunk-based development approach with short-lived feature branches:

- `main`: The main branch, always deployable
- `feature/*`: Feature branches for new features
- `fix/*`: Bug fix branches
- `release/*`: Release branches

For more details, refer to the [Coding Standards](./coding-standards.md).

### Development Process

1. Create a new branch from `main`
2. Implement your changes with tests
3. Ensure all tests pass locally
4. Format your code with Prettier
5. Create a pull request to `main`
6. Address review feedback
7. Merge your changes once approved

The CI/CD pipeline will automatically run tests, linting, and other checks on your pull request.

### Code Quality Checks

Before submitting a pull request, ensure your code passes the following checks:

- Linting: `npm run lint`
- Formatting: `npm run format`
- Type checking: `npm run type-check`
- Tests: `npm test`

The project uses pre-commit hooks to automatically check code quality before commits.

## Troubleshooting

This section covers common issues and their solutions.

### Frontend Issues

**Next.js Build Errors:**

- Ensure all dependencies are installed: `npm install`
- Clear the Next.js cache: `rm -rf .next`
- Check for TypeScript errors: `npm run type-check`

**WebSocket Connection Issues:**

- Verify the WebSocket server is running
- Check the WebSocket URL in `.env.local`
- Ensure CORS is properly configured

**Authentication Issues:**

- Verify Firebase configuration in `.env.local`
- Check browser console for authentication errors
- Ensure Firebase project has the correct authentication providers enabled

### Backend Issues

**Server Start Errors:**

- Check for port conflicts (default is 3001)
- Ensure all dependencies are installed: `npm install`
- Verify environment variables in `.env`

**WebSocket Server Issues:**

- Check Socket.io configuration
- Verify Redis connection if enabled
- Check server logs for connection errors

**Docker Issues:**

- Ensure Docker is running
- Check Docker logs: `docker logs <container_id>`
- Verify Docker Compose configuration

### Testing Issues

**Jest Test Failures:**

- Update test snapshots if needed: `npm test -- -u`
- Check for environment configuration issues
- Ensure mocks are properly configured

**Playwright Test Failures:**

- Ensure browsers are installed: `npx playwright install`
- Check for timing issues in tests (increase timeouts if needed)
- Run with `--debug` flag to see browser actions: `npx playwright test --debug`

## Additional Resources

This section provides links to additional resources for development.

### Project Documentation

- [System Overview](../architecture/system-overview.md): High-level architecture overview
- [Coding Standards](./coding-standards.md): Code style and best practices
- [WebSocket Protocol](./websocket-protocol.md): WebSocket communication protocol
- Testing Documentation: Detailed testing guidelines (available in project docs)

### External Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Socket.io Documentation](https://socket.io/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Calendar API Documentation](https://developers.google.com/calendar)

### Community and Support

- GitHub Issues: Report bugs and request features
- Project Wiki: Additional documentation and guides
- Team Communication: Join the project's Slack/Discord channel

For any questions or issues not covered in this documentation, please reach out to the project maintainers.