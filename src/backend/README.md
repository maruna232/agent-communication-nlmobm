# AI Agent Network - Backend Server

The backend component of the AI Agent Network, providing a lightweight WebSocket relay service for secure agent-to-agent communication with end-to-end encryption and privacy-focused design.

## Overview

This backend server implements a WebSocket relay service that enables AI agents to communicate with each other in real-time. The server is designed with privacy as a core principle, acting only as a message router without storing conversation content. All agent-to-agent messages are end-to-end encrypted, ensuring that the server cannot read message contents.

## Features

- WebSocket-based real-time communication
- End-to-end encryption for all agent messages
- Firebase Authentication integration
- Horizontal scaling with Redis adapter
- Rate limiting and abuse prevention
- Comprehensive logging and monitoring
- Containerized deployment with Docker
- Health checks and graceful shutdown

## Architecture

The backend server is built with Node.js, Express, and Socket.IO, following a modular architecture with clear separation of concerns:

- **Express Application**: Handles HTTP requests and serves as the foundation for the WebSocket server
- **WebSocket Service**: Manages real-time connections between agents
- **Authentication Service**: Verifies user identity using Firebase Authentication
- **Redis Service**: Enables horizontal scaling and cross-server message routing

The server is designed to be stateless, allowing for horizontal scaling across multiple instances with Redis handling message routing between instances.

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker and Docker Compose (for containerized development)
- Firebase project with Authentication enabled
- Redis (optional, for scaling)

## Getting Started

### Local Development

1. Clone the repository
2. Navigate to the backend directory: `cd src/backend`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and configure environment variables
5. Start the development server: `npm run dev`

### Using Docker Compose

1. Navigate to the backend directory: `cd src/backend`
2. Copy `.env.example` to `.env` and configure environment variables
3. Build and start the containers: `docker-compose up -d`
4. View logs: `docker-compose logs -f`

The server will be available at http://localhost:3001 with the WebSocket endpoint at ws://localhost:3001.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Port for the HTTP and WebSocket server | `3001` |
| `NODE_ENV` | Environment (development, production) | `development` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `CORS_ORIGIN` | Allowed origins for CORS | `http://localhost:3000` |
| `REDIS_ENABLED` | Enable Redis for scaling | `false` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | `''` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Required for authentication |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email | Required for authentication |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | Required for authentication |
| `JWT_SECRET` | Secret for JWT signing | Required for WebSocket authentication |

## API Endpoints

### HTTP Endpoints

- `GET /health`: Health check endpoint
- `GET /api/v1/status`: Server status information

### WebSocket Events

| Event | Description | Payload |
| --- | --- | --- |
| `connect` | Initial connection | N/A |
| `authenticate` | Authentication request | `{ token: string, agentId: string }` |
| `message` | Agent-to-agent message | `{ messageId: string, senderId: string, recipientId: string, content: string, timestamp: number }` |
| `presence` | Agent presence update | `{ agentId: string, status: string }` |
| `typing` | Typing indicator | `{ agentId: string, conversationId: string }` |
| `ack` | Message acknowledgment | `{ messageId: string, status: string }` |

## WebSocket Protocol

The WebSocket protocol follows a structured message format with end-to-end encryption:

1. **Connection**: Client connects to WebSocket server
2. **Authentication**: Client authenticates with JWT token
3. **Key Exchange**: Clients exchange public keys for end-to-end encryption
4. **Messaging**: Encrypted messages are routed through the server
5. **Acknowledgment**: Recipients acknowledge message delivery

All message content is encrypted on the client side before transmission, ensuring that the server cannot read the message contents.

## Docker Support

The backend includes Docker support for both development and production:

- **Development**: `docker-compose.yml` provides a complete development environment with hot reloading
- **Production**: `Dockerfile` creates an optimized production image with multi-stage builds

### Building the Docker Image

```bash
npm run docker:build
```

### Running the Docker Container

```bash
npm run docker:run
```

## Scaling

The WebSocket server is designed for horizontal scaling:

1. Enable Redis by setting `REDIS_ENABLED=true` and configuring Redis connection details
2. Deploy multiple instances of the WebSocket server
3. Use a load balancer to distribute connections across instances

With Redis enabled, messages will be properly routed between server instances, allowing for seamless scaling to handle increased load.

## Security

Security is a core focus of the backend implementation:

- **Authentication**: Firebase Authentication with JWT validation
- **Authorization**: Agent-level permissions for connections
- **Encryption**: End-to-end encryption for all agent messages
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Container Security**: Non-root user execution, minimal dependencies
- **Input Validation**: Comprehensive validation for all inputs

The server follows a privacy-first approach, acting only as a message router without storing or accessing message content.

## Testing

The backend includes comprehensive testing:

```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Deployment

The backend is designed for deployment to cloud platforms:

- **Google Cloud Run**: Recommended for serverless deployment
- **Kubernetes**: Suitable for more complex deployments
- **Docker Swarm**: Alternative for container orchestration

Refer to the infrastructure documentation for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

Please follow the coding standards and include tests for new features.

## License

MIT