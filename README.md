# AI Agent Network

A lightweight, privacy-focused platform that enables users to create personalized AI assistants capable of communicating with each other to automate scheduling and coordination tasks.

## Overview

The AI Agent Network addresses the growing need for AI assistants that can handle interpersonal coordination while maintaining strict privacy controls through local data storage. Unlike existing solutions that store user data centrally, this platform emphasizes local storage and transparent agent-to-agent communication.

### Key Features

- **Privacy-First Design**: All personal data remains on your device with end-to-end encrypted communications
- **Local-First Architecture**: No central storage of your data, everything stays on your device
- **Transparent Agent Communication**: See exactly how your agent communicates with others
- **Google Calendar Integration**: Seamless scheduling with your existing calendar
- **Natural Language Interface**: Communicate with your agent using everyday language
- **Secure Agent-to-Agent Communication**: Agents negotiate on your behalf with end-to-end encryption

### Use Cases

- Schedule meetings without back-and-forth emails or messages
- Coordinate events with friends and colleagues
- Manage your availability based on preferences and calendar
- Automate scheduling tasks while maintaining privacy
- Delegate coordination to your personal AI assistant

## Architecture

The AI Agent Network employs a privacy-centric architecture with these key components:

### Frontend Application

- Built with Next.js 14+ and React 18+
- Responsive design with TailwindCSS
- State management with Zustand // version: 4.4+
- Local storage using IndexedDB and SQLite (via sql.js)
- End-to-end encryption for all sensitive data

### WebSocket Server

- Lightweight Node.js server with Express and Socket.io // version: 4.7+
- Acts only as a message router without accessing message content
- Stateless design for horizontal scaling
- Redis adapter for multi-instance deployment
- No storage of user data or message content

### External Integrations

- Firebase Authentication // package_name: firebase, version: ^10.5.0 for secure user identity
- Google Calendar API for scheduling functionality
- OpenAI GPT-4o // package_name: openai, version: ^4.12.1 for natural language processing

For more details, see the [system architecture documentation](docs/architecture/system-overview.md).

## Getting Started

Follow these instructions to set up the project for development and testing.

### Prerequisites

- Node.js 18.x LTS or later
- npm 9.x or later
- Git
- Docker (for backend development)
- Firebase account (for authentication)
- OpenAI API key (for agent intelligence)
- Google Cloud Platform account (for Calendar API)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/ai-agent-network/ai-agent-network.git
   cd ai-agent-network
   ```

2. Set up the frontend
   ```bash
   cd src/web
   npm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. Set up the backend
   ```bash
   cd src/backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

For detailed setup instructions, see the [development setup guide](docs/development/setup.md).

### Running the Application

**Frontend Development Server:**
```bash
cd src/web
npm run dev
```
The frontend will be available at http://localhost:3000

**Backend Development Server:**
```bash
cd src/backend
npm run dev
```
The backend will be available at http://localhost:3001

**Using Docker for Backend:**
```bash
cd src/backend
docker-compose up
```
This will start both the WebSocket server and a Redis instance.

### Testing

**Frontend Tests:**
```bash
cd src/web
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:e2e        # Run end-to-end tests
```

**Backend Tests:**
```bash
cd src/backend
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

## Project Structure

The repository is organized into the following main directories:

### Frontend (`src/web`)

- `src/lib`: Core utilities, types, and services
  - `api`: API client implementations
  - `calendar`: Calendar integration logic
  - `storage`: Local storage implementations
  - `types`: TypeScript type definitions
  - `utils`: Utility functions
  - `websocket`: WebSocket client implementation
- `src/components`: React components
  - `agent`: Agent-related components
  - `auth`: Authentication components
  - `calendar`: Calendar components
  - `common`: Reusable UI components
  - `connect`: Agent connection components
  - `dashboard`: Dashboard components
  - `layout`: Layout components
- `src/hooks`: React hooks
- `src/store`: Zustand state stores
- `src/services`: Service implementations
- `src/app`: Next.js app router pages
- `src/__tests__`: Test files
- `src/__mocks__`: Mock implementations for testing
- `public`: Static assets

### Backend (`src/backend`)

- `src/config`: Configuration files
- `src/controllers`: Request handlers
- `src/interfaces`: TypeScript interfaces
- `src/middleware`: Express middleware
- `src/routes`: API route definitions
- `src/services`: Service implementations
- `src/utils`: Utility functions
- `src/validators`: Request validation
- `src/app.ts`: Express application setup
- `src/server.ts`: Server entry point

### Documentation (`docs`)

- `architecture`: System architecture documentation
- `development`: Development guides and standards
- `operations`: Deployment and operations documentation
- `user`: User documentation and policies

### Infrastructure (`infrastructure`)

- `terraform`: Infrastructure as Code definitions
- `cloud-run`: Cloud Run configuration
- `monitoring`: Monitoring dashboards and alerts

### CI/CD (`.github`)

- `workflows`: GitHub Actions workflow definitions
- `ISSUE_TEMPLATE`: Issue templates
- `PULL_REQUEST_TEMPLATE.md`: Pull request template

## Key Technologies

The AI Agent Network is built with the following key technologies:

### Frontend

- **Next.js**: React framework with server-side rendering
- **React**: UI component library
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: Utility-first CSS framework
- **Zustand**: State management
- **Socket.io-client**: WebSocket client
- **IndexedDB/SQLite**: Local storage
- **crypto-js**: Encryption library

### Backend

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **Socket.io**: WebSocket server
- **TypeScript**: Type-safe JavaScript
- **Redis**: Pub/Sub for WebSocket scaling
- **Firebase Admin**: Authentication verification
- **Winston**: Logging library

### External Services

- **Firebase Authentication**: User identity management
- **OpenAI GPT-4o**: Natural language processing
- **Google Calendar API**: Calendar integration

### DevOps

- **Docker**: Containerization
- **Terraform**: Infrastructure as Code
- **GitHub Actions**: CI/CD
- **Google Cloud Run**: Serverless container platform

## Contributing

We welcome contributions to the AI Agent Network! Please read our [contribution guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Security

The AI Agent Network takes security seriously. If you discover a security vulnerability, please send an email to security@aiagentnetwork.com instead of opening a public issue.

### Security Features

- End-to-end encryption for agent-to-agent communication
- Local storage of sensitive data with encryption
- Minimal server-side processing to reduce attack surface
- JWT-based authentication with secure token handling
- Regular security audits and dependency updates

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the GPT-4o API
- Google for Firebase and Google Calendar API
- The open-source community for the amazing tools and libraries that make this project possible