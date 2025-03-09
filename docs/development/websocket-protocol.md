# WebSocket Protocol Documentation

## Introduction

The WebSocket protocol is a fundamental component of the AI Agent Network, enabling secure, real-time communication between AI agents while maintaining the system's privacy-first principles. This protocol is designed to facilitate seamless coordination and scheduling tasks between agents without compromising user privacy or data security.

The protocol implementation prioritizes several key objectives:

1. **Privacy Protection**: End-to-end encryption ensures that only the communicating agents can read message content, preventing even the server from accessing the information.
2. **Secure Communication**: Strong cryptographic mechanisms protect against eavesdropping, tampering, and impersonation attempts.
3. **Minimal Server Role**: The server functions solely as a message router with no ability to access message content or store user data.
4. **Transparent Operation**: All agent-to-agent communications are visible to users, ensuring full transparency.

By enabling secure direct communication between agents, the protocol supports the local-first architecture of the AI Agent Network, keeping sensitive data on user devices while providing the necessary functionality for automated coordination tasks.

## Protocol Overview

The AI Agent Network WebSocket protocol builds upon standard WebSocket technology (RFC 6455) with additional layers for security, authentication, and structured messaging to support private, secure agent-to-agent communication.

### Key Features

1. **End-to-End Encryption**: All agent-to-agent messages are encrypted using XChaCha20-Poly1305, with keys exchanged using X25519. This ensures that only the intended recipient can decrypt message content.

2. **Message Authentication**: Ed25519 signatures verify sender identity and prevent message tampering, providing strong authenticity guarantees.

3. **Structured Message Format**: The protocol defines specific message types for different communication scenarios (e.g., handshake, query, proposal), ensuring consistent and predictable interactions.

4. **Authentication and Authorization**: Connections are authenticated using JWT tokens derived from Firebase Authentication, with authorization checks ensuring only approved agents can communicate.

5. **Connection Management**: Heartbeat mechanisms maintain connection health, with automatic reconnection strategies for resilience against network issues.

6. **Privacy by Design**: The protocol minimizes data exposure, with the server acting only as a message router without access to message content.

### Design Principles

The protocol adheres to the following core design principles:

1. **Privacy-First**: User data and agent communications remain private through end-to-end encryption and minimal server involvement.

2. **Security in Depth**: Multiple security layers protect communications, including TLS for transport security, JWT for authentication, and end-to-end encryption for message content.

3. **Efficiency**: Binary message format and optimized protocols minimize bandwidth usage and latency.

4. **Reliability**: Automatic reconnection, message acknowledgment, and delivery guarantees ensure reliable communication even in challenging network conditions.

5. **Transparency**: Clear message structures and logging enable users to understand and monitor agent communications.

### Server Role

The WebSocket server in this architecture serves as a minimal message router:

1. It authenticates connections using JWT tokens
2. It routes encrypted messages between agents
3. It maintains no persistent storage of message content
4. It implements rate limiting and abuse prevention
5. It provides connection status information

This limited server role supports the local-first architecture by ensuring that sensitive operations and data remain on client devices, with the server providing only the necessary infrastructure for real-time communication.

## Connection Lifecycle

The WebSocket connection lifecycle encompasses several distinct phases, from initialization to termination. This section details each phase and the associated protocols.

### Connection Establishment

1. **Client Initialization**:
   - The client prepares to establish a connection by generating or retrieving its agent's cryptographic key pairs (X25519 for encryption, Ed25519 for signatures)
   - A valid JWT authentication token is obtained from Firebase Authentication
   - Connection metadata is prepared

2. **WebSocket Connection**:
   - The client establishes a secure WebSocket connection to the server endpoint:
     ```
     wss://[server-domain]/agent-network/v1/connect
     ```

3. **Authentication**:
   - The client sends its JWT token in the connection headers:
     ```
     Authorization: Bearer [jwt-token]
     ```

4. **Connection Verification**:
   - The server verifies the JWT token with Firebase Authentication
   - The server validates the agent's authorization to connect
   - Upon successful authentication, the server confirms the connection and assigns a connection ID

### Secure Channel Establishment

After the WebSocket connection is established, agents establish a secure end-to-end encrypted channel:

1. **HANDSHAKE Message**: The initiating agent sends a HANDSHAKE message containing its public key:

```json
{
  "messageId": "msg_1234567890",
  "conversationId": "conv_abcdefg",
  "senderId": "agent_alice",
  "recipientId": "agent_bob",
  "messageType": "HANDSHAKE",
  "content": {
    "agentId": "agent_alice",
    "publicKey": "base64_encoded_public_key"
  },
  "timestamp": 1622548800000,
  "metadata": {
    "priority": "HIGH",
    "encrypted": false,
    "requiresResponse": true
  }
}
```

2. **Handshake Response**: The receiving agent responds with its own HANDSHAKE message containing its public key.

3. **Shared Secret Derivation**: Both agents independently derive a shared secret using X25519 key exchange, combining their private key with the other agent's public key.

4. **Encryption Key Derivation**: From the shared secret, both agents derive encryption keys for XChaCha20-Poly1305.

### Connection Maintenance

Once established, connections are maintained through:

1. **Heartbeat Mechanism**: Regular HEARTBEAT messages are exchanged to confirm connection health:

```json
{
  "messageId": "msg_7890123456",
  "conversationId": "system",
  "senderId": "agent_alice",
  "recipientId": "system",
  "messageType": "HEARTBEAT",
  "content": {
    "timestamp": 1622549300000
  },
  "timestamp": 1622549300000,
  "metadata": {
    "priority": "LOW",
    "encrypted": false,
    "requiresResponse": false
  }
}
```

2. **Heartbeat Frequency**: Heartbeats are sent every 30 seconds by default (configurable).

3. **Connection Monitoring**: Both client and server monitor connection health:
   - Missing heartbeats trigger reconnection attempts
   - Server may terminate inactive connections after configurable timeout

4. **Token Refresh**: Authentication tokens are refreshed automatically before expiration:
   - Client monitors token expiration
   - New token is obtained from Firebase Authentication
   - Connection is updated with the new token

### Disconnection Process

Connections can be terminated through:

1. **Graceful Disconnection**: Client initiates an intentional disconnection:
   - Client sends a DISCONNECT message
   - Server acknowledges the disconnection
   - WebSocket connection is closed with status code 1000 (Normal Closure)

2. **Abnormal Disconnection**: Connection is lost due to network issues or errors:
   - Disconnection is detected by missing heartbeats
   - Reconnection is attempted with exponential backoff
   - Messages are queued during disconnection period

3. **Server-Initiated Disconnection**: Server terminates the connection:
   - Due to authentication expiration
   - Due to rate limiting or abuse detection
   - Due to server maintenance or shutdown
   - Appropriate status code and reason are provided

4. **Reconnection Strategy**: When disconnection occurs:
   - Initial reconnection attempt is immediate
   - Subsequent attempts use exponential backoff (starting at 1 second and capping at 30 seconds)
   - Reconnection continues until successful or explicitly cancelled

The connection lifecycle incorporates security and reliability at each stage, ensuring that agent-to-agent communication remains secure, private, and resilient against network issues.

## Message Types

The WebSocket protocol supports several message types, each serving a specific purpose in agent-to-agent communication. These structured message formats ensure consistent and predictable interactions between agents.

### Common Message Structure

All messages share a common structure with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| messageId | string | Unique identifier for the message |
| conversationId | string | Identifier for the conversation thread |
| senderId | string | Identifier of the sending agent |
| recipientId | string | Identifier of the receiving agent |
| messageType | string | Type of message (e.g., HANDSHAKE, QUERY) |
| content | object | Message payload specific to the message type |
| timestamp | number | Message creation time (milliseconds since epoch) |
| metadata | object | Additional context and processing instructions |

The `metadata` object typically includes:

| Field | Type | Description |
|-------|------|-------------|
| priority | string | Message priority (HIGH, NORMAL, LOW) |
| encrypted | boolean | Whether the content is encrypted |
| requiresResponse | boolean | Whether a response is expected |

### HANDSHAKE

The HANDSHAKE message establishes a secure connection between agents by exchanging public keys.

**Purpose**: Initiates key exchange for end-to-end encryption.

**Required Fields**:
- agentId: Identifier of the sending agent
- publicKey: Base64-encoded X25519 public key

**Example**:
```json
{
  "messageId": "msg_1234567890",
  "conversationId": "conv_abcdefg",
  "senderId": "agent_alice",
  "recipientId": "agent_bob",
  "messageType": "HANDSHAKE",
  "content": {
    "agentId": "agent_alice",
    "publicKey": "base64_encoded_public_key"
  },
  "timestamp": 1622548800000,
  "metadata": {
    "priority": "HIGH",
    "encrypted": false,
    "requiresResponse": true
  }
}
```

**Response Expectations**: The recipient should respond with their own HANDSHAKE message containing their public key.

**Security Considerations**:
- The public key should be validated for correct format
- The agentId should be verified against the senderId
- The HANDSHAKE message is not encrypted, but is transmitted over TLS

### QUERY

The QUERY message requests information from another agent.

**Purpose**: Requests data or availability information from another agent.

**Required Fields**:
- requestId: Unique identifier for the request
- queryType: Type of query (e.g., AVAILABILITY, LOCATION_PREFERENCE)
- parameters: Query-specific parameters

**Example**:
```json
{
  "messageId": "msg_2345678901",
  "conversationId": "conv_abcdefg",
  "senderId": "agent_alice",
  "recipientId": "agent_bob",
  "messageType": "QUERY",
  "content": {
    "requestId": "req_123",
    "queryType": "AVAILABILITY",
    "parameters": {
      "startDate": "2023-06-01T00:00:00Z",
      "endDate": "2023-06-07T23:59:59Z",
      "timeZone": "America/New_York"
    }
  },
  "timestamp": 1622548800000,
  "metadata": {
    "priority": "NORMAL",
    "encrypted": true,
    "requiresResponse": true
  }
}
```

**Response Expectations**: The recipient should respond with a RESPONSE message containing the requested information or an error.

**Query Types**:
- AVAILABILITY: Request for calendar availability
- LOCATION_PREFERENCE: Request for location preferences
- MEETING_TYPE_PREFERENCE: Request for meeting type preferences
- CUSTOM: Custom query type with application-specific parameters

### RESPONSE

The RESPONSE message answers a query with the requested information.

**Purpose**: Provides information in response to a QUERY.

**Required Fields**:
- requestId: Identifier matching the original query
- data: The response data
- error: Error information if the query could not be fulfilled (null if successful)

**Example**:
```json
{
  "messageId": "msg_3456789012",
  "conversationId": "conv_abcdefg",
  "senderId": "agent_bob",
  "recipientId": "agent_alice",
  "messageType": "RESPONSE",
  "content": {
    "requestId": "req_123",
    "data": {
      "availableTimes": [
        "2023-06-01T14:00:00Z",
        "2023-06-02T15:00:00Z"
      ]
    },
    "error": null
  },
  "timestamp": 1622548900000,
  "metadata": {
    "priority": "NORMAL",
    "encrypted": true,
    "requiresResponse": false
  }
}
```

**Error Handling**:
If the query cannot be fulfilled, the error field should contain:
```json
"error": {
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {} // Optional additional details
}
```

Common error codes include:
- UNAVAILABLE_DATA: The requested data is not available
- PERMISSION_DENIED: The agent is not authorized to access the data
- INVALID_PARAMETERS: The query parameters are invalid
- INTERNAL_ERROR: An internal error occurred while processing the query

### PROPOSAL

The PROPOSAL message suggests a meeting or event with specific details.

**Purpose**: Proposes a meeting or event with time, location, and other details.

**Required Fields**:
- proposalId: Unique identifier for the proposal
- details: Meeting details including time, location, and type

**Example**:
```json
{
  "messageId": "msg_4567890123",
  "conversationId": "conv_abcdefg",
  "senderId": "agent_alice",
  "recipientId": "agent_bob",
  "messageType": "PROPOSAL",
  "content": {
    "proposalId": "prop_123",
    "details": {
      "title": "Coffee Meeting",
      "description": "Discuss project collaboration",
      "startTime": "2023-06-01T15:00:00Z",
      "endTime": "2023-06-01T16:00:00Z",
      "location": {
        "name": "Blue Bottle Coffee",
        "address": "123 Main St, Anytown",
        "locationType": "COFFEE_SHOP",
        "coordinates": {
          "latitude": 37.7749,
          "longitude": -122.4194
        }
      },
      "meetingType": "COFFEE",
      "participants": ["agent_alice", "agent_bob"],
      "status": "PENDING",
      "expiresAt": 1622635200000
    }
  },
  "timestamp": 1622549000000,
  "metadata": {
    "priority": "HIGH",
    "encrypted": true,
    "requiresResponse": true
  }
}
```

**Response Expectations**: The recipient should respond with a CONFIRMATION or REJECTION message.

**Proposal Status**:
- PENDING: Awaiting response
- ACCEPTED: Accepted by recipient
- REJECTED: Rejected by recipient
- EXPIRED: No response received before expiration
- MODIFIED: Modified by either party

### CONFIRMATION

The CONFIRMATION message accepts a proposal, optionally including calendar event details.

**Purpose**: Indicates acceptance of a proposal.

**Required Fields**:
- proposalId: Identifier matching the original proposal
- status: Status of the confirmation (ACCEPTED)
- calendarEventId: Optional identifier for the created calendar event

**Example**:
```json
{
  "messageId": "msg_5678901234",
  "conversationId": "conv_abcdefg",
  "senderId": "agent_bob",
  "recipientId": "agent_alice",
  "messageType": "CONFIRMATION",
  "content": {
    "proposalId": "prop_123",
    "status": "ACCEPTED",
    "calendarEventId": "evt_456"
  },
  "timestamp": 1622549100000,
  "metadata": {
    "priority": "HIGH",
    "encrypted": true,
    "requiresResponse": false
  }
}
```

**Next Steps**:
After confirmation, both agents typically:
1. Create calendar events in their respective user's calendars
2. Notify their users of the confirmed meeting
3. Close the negotiation conversation or begin a new topic

### REJECTION

The REJECTION message declines a proposal with a reason and optional details.

**Purpose**: Indicates rejection of a proposal.

**Required Fields**:
- proposalId: Identifier matching the original proposal
- reason: Reason for rejection
- details: Optional additional details or explanation

**Example**:
```json
{
  "messageId": "msg_6789012345",
  "conversationId": "conv_abcdefg",
  "senderId": "agent_bob",
  "recipientId": "agent_alice",
  "messageType": "REJECTION",
  "content": {
    "proposalId": "prop_123",
    "reason": "SCHEDULE_CONFLICT",
    "details": "User has another meeting at that time"
  },
  "timestamp": 1622549200000,
  "metadata": {
    "priority": "NORMAL",
    "encrypted": true,
    "requiresResponse": false
  }
}
```

**Rejection Reasons**:
- SCHEDULE_CONFLICT: Conflicts with existing schedule
- LOCATION_UNSUITABLE: Location is not suitable
- TIME_UNSUITABLE: Time is not suitable
- USER_DECLINED: User explicitly declined
- OTHER: Other reason (details should provide explanation)

**Next Steps**:
After rejection, the agents typically:
1. Notify their users of the rejection
2. May initiate a new proposal with adjusted parameters
3. May end the negotiation if no suitable alternatives exist

### HEARTBEAT

The HEARTBEAT message maintains WebSocket connection and verifies availability.

**Purpose**: Keeps the WebSocket connection alive and verifies agent availability.

**Required Fields**:
- timestamp: Current timestamp

**Example**:
```json
{
  "messageId": "msg_7890123456",
  "conversationId": "system",
  "senderId": "agent_alice",
  "recipientId": "system",
  "messageType": "HEARTBEAT",
  "content": {
    "timestamp": 1622549300000
  },
  "timestamp": 1622549300000,
  "metadata": {
    "priority": "LOW",
    "encrypted": false,
    "requiresResponse": false
  }
}
```

**Handling**:
- Heartbeats are typically handled automatically by the WebSocket client and server
- No explicit response is required, but the server may echo heartbeats back
- Missing heartbeats may trigger reconnection attempts

These message types form the foundation of agent-to-agent communication, enabling structured, secure interactions for scheduling and coordination tasks.

## End-to-End Encryption

The AI Agent Network implements robust end-to-end encryption to ensure that only the intended recipients can read agent-to-agent messages. This section details the cryptographic mechanisms used to secure these communications.

### Encryption Overview

The end-to-end encryption system provides the following security properties:

1. **Confidentiality**: Only the intended recipient can decrypt message content
2. **Integrity**: Any tampering with messages is detected
3. **Authentication**: The sender's identity is verified
4. **Perfect Forward Secrecy**: Compromise of keys does not expose past messages
5. **Non-repudiation**: Senders cannot deny sending messages they have sent

The system achieves these properties through a combination of asymmetric and symmetric cryptography:

- **X25519**: Used for key exchange to establish shared secrets
- **XChaCha20-Poly1305**: Used for authenticated encryption of message content
- **Ed25519**: Used for digital signatures to verify sender identity

### Key Management

#### Key Generation

Each agent generates the following key pairs:

1. **X25519 Key Pair**:
   - A private key for deriving shared secrets
   - A public key for sharing with other agents
   - Used for establishing encrypted communication channels

2. **Ed25519 Key Pair**:
   - A private key for signing messages
   - A public key for verifying signatures
   - Used for authenticating message origin

Keys are generated using cryptographically secure random number generators and stored securely on the client device.

#### Key Storage

Keys are stored securely in the client's local storage:

- Private keys are encrypted using AES-256-GCM before storage
- Encryption keys for private keys are derived from user credentials using PBKDF2
- Public keys are stored in plaintext as they are not sensitive

#### Key Exchange

Secure key exchange follows this process:

1. Agent A generates an X25519 key pair
2. Agent B generates an X25519 key pair
3. Agent A sends its public key to Agent B in a HANDSHAKE message
4. Agent B sends its public key to Agent A in a HANDSHAKE response
5. Both agents independently compute the same shared secret

The shared secret is derived using the X25519 function:
```
shared_secret = X25519(my_private_key, their_public_key)
```

#### Key Derivation

From the shared secret, additional keys are derived for specific purposes:

1. **Encryption Key**: For encrypting message content
2. **Authentication Key**: For message authentication codes
3. **IV Nonce Base**: For generating initialization vectors

Key derivation uses HKDF (HMAC-based Key Derivation Function):
```
encryption_key = HKDF(shared_secret, "encryption", 32)
auth_key = HKDF(shared_secret, "authentication", 32)
iv_base = HKDF(shared_secret, "iv", 16)
```

### Message Encryption Process

The encryption process for a message follows these steps:

1. **Serialize Message Content**:
   - Convert message content to JSON format
   - Ensure deterministic serialization

2. **Generate Nonce**:
   - Create a 24-byte nonce for XChaCha20-Poly1305
   - Ensure nonce uniqueness through counters or random generation

3. **Encrypt Content**:
   - Use XChaCha20-Poly1305 authenticated encryption
   - Input: plaintext content, encryption key, nonce
   - Output: encrypted content with authentication tag

4. **Sign Encrypted Content**:
   - Calculate Ed25519 signature of encrypted content using sender's private key
   - Signature covers: nonce, encrypted content, metadata

5. **Create Encrypted Message**:
   - Include: encrypted content, nonce, signature
   - Add metadata (including recipient, timestamp) in plaintext

The resulting encrypted message format:

```json
{
  "messageId": "msg_1234567890",
  "conversationId": "conv_abcdefg",
  "senderId": "agent_alice",
  "recipientId": "agent_bob",
  "messageType": "ENCRYPTED",
  "content": {
    "encryptedData": "base64_encoded_encrypted_content",
    "nonce": "base64_encoded_nonce",
    "signature": "base64_encoded_signature",
    "originalType": "QUERY" // Original message type
  },
  "timestamp": 1622548800000,
  "metadata": {
    "priority": "NORMAL",
    "encrypted": true,
    "requiresResponse": true
  }
}
```

### Message Decryption Process

The decryption process follows these steps:

1. **Verify Signature**:
   - Retrieve sender's public Ed25519 key
   - Verify signature against encrypted content and metadata
   - Reject message if signature verification fails

2. **Decrypt Content**:
   - Compute shared secret using recipient's private key and sender's public key
   - Derive encryption key using HKDF
   - Decrypt content using XChaCha20-Poly1305 with the nonce
   - Verify authentication tag during decryption

3. **Process Decrypted Message**:
   - Parse JSON content into appropriate message structure
   - Process based on the original message type

### Key Rotation

To maintain security over time, encryption keys are rotated periodically:

1. **Scheduled Rotation**:
   - X25519 key pairs are rotated every 30 days by default
   - New key pairs are generated and exchanged
   - Old keys are securely deleted after a transition period

2. **Event-Based Rotation**:
   - Keys are rotated after a security-sensitive event
   - Examples: password change, suspicious activity detection
   - Forces establishment of new secure channels

3. **Perfect Forward Secrecy**:
   - Session keys are derived for each conversation
   - Compromise of current keys does not expose past messages
   - Historical messages remain secure even if current keys are compromised

### Implementation Details

The encryption implementation uses the following libraries:

1. **TweetNaCl.js** or **libsodium.js**:
   - Provides X25519, XChaCha20-Poly1305, and Ed25519 implementations
   - Well-audited cryptographic libraries
   - Cross-platform support

2. **HKDF Implementation**:
   - Based on HMAC-SHA256
   - Follows RFC 5869 for key derivation

3. **Secure Random Number Generation**:
   - Uses platform-specific CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
   - Web Crypto API's getRandomValues() in browsers
   - Appropriate fallbacks for other environments

These cryptographic mechanisms ensure that agent-to-agent communications remain secure and private, with only the intended recipients able to access message content. The server, which only routes messages, cannot decrypt the message content, preserving the privacy-first principle of the AI Agent Network.

## Error Handling

Robust error handling is essential for maintaining reliable WebSocket connections and ensuring smooth agent-to-agent communication. This section outlines the error handling strategies for various failure scenarios.

### Error Categories

The WebSocket protocol handles several categories of errors:

#### Connection Errors

| Error Code | Description | Handling Strategy |
|------------|-------------|------------------|
| CONNECTION_ERROR | General connection failure | Automatic reconnection with backoff |
| AUTHENTICATION_ERROR | Failed to authenticate WebSocket connection | Refresh credentials and retry |
| TIMEOUT_ERROR | Connection or operation timed out | Retry with increased timeout |

#### Message Errors

| Error Code | Description | Handling Strategy |
|------------|-------------|------------------|
| MESSAGE_ERROR | Error processing or delivering message | Retry message delivery |
| ENCRYPTION_ERROR | Error encrypting or decrypting message | Key verification and potential rotation |
| INVALID_MESSAGE_FORMAT | Message format does not match expected structure | Log error and request message resend |

#### Server Errors

| Error Code | Description | Handling Strategy |
|------------|-------------|------------------|
| AUTHENTICATION_FAILED | Authentication credentials invalid | Refresh authentication and retry |
| CONNECTION_LIMIT_EXCEEDED | Maximum connection limit reached | Implement backoff and retry |
| RATE_LIMIT_EXCEEDED | Message rate limit exceeded | Throttle messages and retry with delay |
| RECIPIENT_NOT_FOUND | Message recipient not connected | Queue message for later delivery |
| SERVER_ERROR | Internal server error | Retry with exponential backoff |

### Error Response Format

When an error occurs, it is communicated in a structured format:

```json
{
  "messageId": "err_1234567890",
  "conversationId": "conv_abcdefg",
  "senderId": "system",
  "recipientId": "agent_alice",
  "messageType": "ERROR",
  "content": {
    "errorCode": "MESSAGE_ERROR",
    "message": "Failed to deliver message",
    "details": {
      "originalMessageId": "msg_1234567890",
      "reason": "Recipient disconnected"
    },
    "recoverable": true,
    "retryAfter": 5000
  },
  "timestamp": 1622548800000,
  "metadata": {
    "priority": "HIGH",
    "encrypted": false,
    "requiresResponse": false
  }
}
```

Key fields in error responses:
- **errorCode**: Standardized error code for programmatic handling
- **message**: Human-readable error description
- **details**: Additional context-specific information
- **recoverable**: Indicates if the error is potentially recoverable
- **retryAfter**: Suggested delay (in milliseconds) before retrying

### Connection Recovery Strategies

The system implements several strategies for recovering from connection failures:

#### 1. Exponential Backoff Reconnection

When a connection fails, the client attempts to reconnect using exponential backoff:
- Initial reconnection delay: 1 second
- Each subsequent attempt increases the delay by a multiplier (typically 1.5)
- Maximum delay is capped (typically 30 seconds)
- Reconnection continues until successful or explicitly cancelled

#### 2. Connection Health Monitoring

Connection health is monitored through heartbeats:
- Heartbeat messages sent every 30 seconds (configurable)
- Missing heartbeat responses trigger reconnection
- Counter tracks consecutive missed heartbeats
- Reconnection initiated after threshold is exceeded (typically 2-3 missed heartbeats)

### Message Delivery Guarantees

To ensure reliable message delivery, the system implements:

#### 1. Acknowledgment-Based Delivery

All important messages are tracked until acknowledged:
- Messages are stored locally until acknowledged
- Timeout triggers automatic retries
- Maximum retry count prevents infinite retries
- Delivery failures are reported to the application

#### 2. Message Queuing for Offline Recipients

When recipients are offline, messages are queued:
- Messages for offline recipients are stored locally
- Delivery is attempted when the recipient comes online
- Messages are ordered by timestamp
- Queued messages have an expiration time (configurable)

### Encryption Error Handling

Encryption-related errors require special handling:

#### 1. Key Verification and Rotation

When encryption errors occur:
- The system attempts to verify the encryption keys
- If verification fails, key rotation is initiated
- New handshake messages are exchanged
- A new secure channel is established

#### 2. Security Event Reporting

Potential security issues are logged and reported:
- Invalid signatures trigger security events
- Repeated decryption failures are tracked
- Unusual patterns may require user verification
- Critical security events may require manual intervention

### Graceful Degradation

In case of persistent connection or encryption issues, the system implements graceful degradation:
- Heartbeat intervals may be extended to reduce connection attempts
- Message formats may be simplified to ensure delivery
- Users are notified of connectivity issues
- Critical messages are prioritized over non-essential communications

These error handling strategies ensure that the WebSocket-based agent communication system remains reliable and recovers gracefully from various failure scenarios, maintaining the user experience even under suboptimal conditions.

## Implementation Guidelines

This section provides best practices and guidelines for implementing clients and servers that support the WebSocket protocol, including code examples and common pitfalls to avoid.

### Client Implementation

#### Setting Up a Secure WebSocket Connection

```javascript
class SecureAgentSocket {
  constructor(serverUrl, authToken, agentId) {
    this.serverUrl = serverUrl;
    this.authToken = authToken;
    this.agentId = agentId;
    this.socket = null;
    this.keyPair = null;
    this.knownAgents = new Map(); // agentId -> publicKey
    this.messageHandlers = new Map();
    this.pendingMessages = new Map();
    
    // Initialize event handlers
    this.onOpen = () => {};
    this.onClose = () => {};
    this.onError = () => {};
    this.onMessage = () => {};
    
    // Set up reconnection
    this.reconnectAttempts = 0;
    this.reconnecting = false;
    
    // Register message type handlers
    this.registerDefaultHandlers();
  }
  
  async connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }
    
    // Generate or load key pair
    if (!this.keyPair) {
      this.keyPair = await this.generateKeyPair();
    }
    
    try {
      // Create WebSocket with auth token in header
      this.socket = new WebSocket(this.serverUrl);
      
      // Add auth token to connection
      this.socket.onopen = () => {
        this.socket.send(JSON.stringify({
          type: 'AUTH',
          token: this.authToken,
          agentId: this.agentId
        }));
        
        this.startHeartbeat();
        this.reconnectAttempts = 0;
        this.onOpen();
      };
      
      this.socket.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };
      
      this.socket.onclose = (event) => {
        this.handleDisconnection(event);
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnection();
      throw error;
    }
  }
  
  // Additional methods for sending messages, handling encryption, etc.
}
```

Key implementation considerations:
- Secure authentication using JWT tokens
- Key pair generation and management
- Automatic reconnection with backoff
- Heartbeat mechanism for connection monitoring
- Message handler registration for different message types

#### Message Handling Implementation

```javascript
registerDefaultHandlers() {
  // Register handlers for different message types
  this.messageHandlers.set('HANDSHAKE', this.handleHandshake.bind(this));
  this.messageHandlers.set('ENCRYPTED', this.handleEncryptedMessage.bind(this));
  this.messageHandlers.set('ERROR', this.handleErrorMessage.bind(this));
  this.messageHandlers.set('HEARTBEAT', this.handleHeartbeat.bind(this));
  // Add handlers for other message types
}

async handleIncomingMessage(data) {
  try {
    const message = JSON.parse(data);
    
    // Validate message structure
    if (!this.validateMessageStructure(message)) {
      console.error('Invalid message structure', message);
      return;
    }
    
    // Get handler for message type
    const handler = this.messageHandlers.get(message.messageType);
    if (handler) {
      await handler(message);
    } else {
      console.warn(`No handler registered for message type: ${message.messageType}`);
    }
    
    // Notify general message callback
    this.onMessage(message);
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

async handleEncryptedMessage(message) {
  try {
    // Decrypt message
    const decryptedMessage = await this.decryptMessage(message);
    
    // Process decrypted message based on original type
    const originalType = decryptedMessage.content.originalType;
    const handler = this.messageHandlers.get(originalType);
    
    if (handler) {
      await handler({
        ...decryptedMessage,
        messageType: originalType,
        content: decryptedMessage.content.data
      });
    }
  } catch (error) {
    console.error('Error handling encrypted message:', error);
    // Handle decryption error
    this.handleEncryptionError(error, message.senderId);
  }
}

// Handlers for specific message types
async handleHandshake(message) {
  const { agentId, publicKey } = message.content;
  
  // Store sender's public key
  this.knownAgents.set(agentId, await importPublicKey(publicKey));
  
  // If this is an initial handshake, respond with our public key
  if (message.metadata.requiresResponse) {
    await this.sendHandshake(agentId, false);
  }
  
  console.log(`Handshake completed with agent: ${agentId}`);
}
```

### Server Implementation

The WebSocket server in the AI Agent Network acts primarily as a message router without accessing message content. Here are guidelines for implementing the server component:

#### Basic Server Setup (Node.js with Socket.io)

```javascript
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create HTTP server
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(','),
    methods: ['GET', 'POST']
  }
});

// Agent connection map: agentId -> socket
const connectedAgents = new Map();

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Store user and agent info in socket
    socket.userId = decodedToken.uid;
    socket.agentId = socket.handshake.auth.agentId;
    
    // Check if agent ID is valid for this user
    const isValidAgent = await validateAgentForUser(socket.agentId, socket.userId);
    if (!isValidAgent) {
      return next(new Error('Invalid agent ID for user'));
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  const agentId = socket.agentId;
  
  console.log(`Agent connected: ${agentId}`);
  
  // Store agent connection
  connectedAgents.set(agentId, socket);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Agent disconnected: ${agentId}`);
    connectedAgents.delete(agentId);
  });
  
  // Handle messages
  socket.on('message', (message) => {
    handleMessage(socket, message);
  });
  
  // Handle heartbeat
  socket.on('heartbeat', () => {
    socket.emit('heartbeat', { timestamp: Date.now() });
  });
});

// Message handler
async function handleMessage(socket, messageData) {
  try {
    const message = JSON.parse(messageData);
    
    // Validate message structure
    if (!validateMessageStructure(message)) {
      return socket.emit('error', {
        errorCode: 'INVALID_MESSAGE_FORMAT',
        message: 'Invalid message format'
      });
    }
    
    // Verify sender matches socket agent
    if (message.senderId !== socket.agentId) {
      return socket.emit('error', {
        errorCode: 'SENDER_MISMATCH',
        message: 'Message sender does not match connected agent'
      });
    }
    
    // Rate limiting (simplified)
    if (isRateLimited(socket.agentId)) {
      return socket.emit('error', {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Message rate limit exceeded',
        retryAfter: getRetryAfterTime(socket.agentId)
      });
    }
    
    // Find recipient socket
    const recipientSocket = connectedAgents.get(message.recipientId);
    if (!recipientSocket) {
      return socket.emit('error', {
        errorCode: 'RECIPIENT_NOT_FOUND',
        message: 'Recipient is not connected',
        originalMessage: message
      });
    }
    
    // Forward message to recipient
    recipientSocket.emit('message', messageData);
    
    // Send acknowledgment to sender
    socket.emit('ack', { messageId: message.messageId });
    
  } catch (error) {
    console.error('Error handling message:', error);
    socket.emit('error', {
      errorCode: 'MESSAGE_ERROR',
      message: 'Error processing message'
    });
  }
}

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
```

### Best Practices

#### 1. Connection Management

- Implement exponential backoff for reconnection attempts
- Use heartbeats to detect connection issues
- Handle connection errors gracefully
- Monitor connection quality and adapt accordingly

#### 2. Message Handling

- Validate all incoming messages before processing
- Implement appropriate error handling for each message type
- Use asynchronous processing for time-consuming operations
- Implement message acknowledgment for delivery confirmation

#### 3. Encryption

- Use established cryptographic libraries, don't implement custom crypto
- Implement proper key management and rotation
- Ensure secure random number generation
- Include message authentication with encryption
- Test encryption extensively

#### 4. Performance Optimization

- Use binary message format when appropriate
- Minimize message size through efficient encoding
- Batch messages when possible
- Implement connection pooling on the server
- Use WebSocket compression for larger messages

#### 5. Security

- Always validate sender identity
- Implement rate limiting to prevent abuse
- Use HTTPS/WSS for all connections
- Keep libraries and dependencies updated
- Implement proper access controls

### Common Pitfalls to Avoid

1. **Inadequate Error Handling**: Failing to handle WebSocket errors properly can lead to silent failures and connection issues.

2. **Ignoring Reconnection Logic**: Without proper reconnection logic, temporary network issues can cause permanent disconnections.

3. **Message Race Conditions**: Not handling out-of-order message delivery can cause logical errors in communication.

4. **Security Vulnerabilities**:
   - Not validating message senders
   - Not implementing rate limiting
   - Using weak cryptography
   - Not protecting against replay attacks

5. **Performance Issues**:
   - Sending large messages that block the WebSocket
   - Not implementing batching for multiple small messages
   - Inefficient message serialization/deserialization

6. **Memory Leaks**:
   - Not cleaning up event listeners
   - Storing message history indefinitely
   - Not removing disconnected clients from tracking structures

## Testing and Debugging

Effective testing and debugging are essential for creating a reliable WebSocket-based communication system. This section outlines tools, techniques, and best practices for testing and troubleshooting WebSocket connections.

### Testing Tools

#### 1. WebSocket Client Tools

| Tool | Purpose | Features |
|------|---------|----------|
| [Postman](https://www.postman.com/) | Manual WebSocket testing | Connect to WebSocket servers, send/receive messages, inspect traffic |
| [Websocat](https://github.com/vi/websocat) | Command-line WebSocket testing | Scriptable WebSocket client, useful for automation |
| [wscat](https://github.com/websockets/wscat) | Simple command-line client | Quick testing of WebSocket endpoints |
| [Socket.IO Client Tool](https://amritb.github.io/socketio-client-tool/) | Testing Socket.io connections | Specifically for Socket.io implementations |

#### 2. Network Analysis Tools

| Tool | Purpose | Features |
|------|---------|----------|
| [Wireshark](https://www.wireshark.org/) | Network packet analysis | Capture and inspect WebSocket traffic, analyze connection issues |
| [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/) | Browser-based inspection | Network panel for WebSocket monitoring, console for debugging |
| [Firefox DevTools](https://developer.mozilla.org/en-US/docs/Tools) | Browser-based inspection | Network monitor with WebSocket filters |
| [Charles Proxy](https://www.charlesproxy.com/) | HTTP/WebSocket proxy | Intercept and modify WebSocket traffic |

### Testing Strategies

#### 1. Unit Testing WebSocket Components

Unit tests should focus on individual components of the WebSocket implementation:
- Test message serialization/deserialization
- Test encryption/decryption functions
- Test message handlers
- Test reconnection logic
- Test error handling

#### 2. Integration Testing

Integration tests should verify the interaction between components:
- Test end-to-end message delivery
- Test handshake and secure channel establishment
- Test reconnection behavior with simulated network issues
- Test message queuing and delivery guarantees

#### 3. Load and Performance Testing

Performance tests should measure system behavior under load:
- Test with multiple concurrent connections
- Measure message throughput
- Test with varying network conditions
- Identify performance bottlenecks

### Debugging Techniques

#### 1. Browser DevTools for WebSocket Debugging

Chrome and Firefox DevTools provide built-in support for inspecting WebSocket connections:

1. **Open the Network Panel**: In Chrome or Firefox DevTools, navigate to the Network tab.

2. **Filter for WebSocket Traffic**:
   - In Chrome, select "WS" from the filter options
   - In Firefox, select "WebSockets" from the filter options

3. **Inspect WebSocket Connections**:
   - View connection establishment details
   - Monitor frames sent and received
   - Examine headers and connection parameters

#### 2. Enhanced Logging

Implement detailed logging to aid in debugging:
```javascript
// Enhanced WebSocket client with debugging
class DebugWebSocket {
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.socket = null;
    this.messageLog = [];
    this.connectionAttempts = 0;
    this.debug = true; // Enable/disable debug logging
    
    // Performance metrics
    this.metrics = {
      connectionTime: 0,
      messageLatency: new Map(),
      reconnections: 0
    };
  }
  
  // Methods for connection, sending, and logging...
  
  logMessage(direction, data) {
    try {
      const message = JSON.parse(data);
      
      // Store in message log
      this.messageLog.push({
        direction,
        timestamp: new Date(),
        message
      });
      
      // Log message details
      if (this.debug) {
        console.log(`${direction} [${message.messageType}]: ${message.messageId}`, 
          direction === 'SENT' ? message : this.summarizeMessage(message));
      }
    } catch (e) {
      this.error('Error logging message', e);
      console.log(`${direction} [RAW]:`, data);
    }
  }
}
```

#### 3. Troubleshooting Common Issues

| Issue | Symptoms | Debugging Steps | Solution |
|-------|----------|----------------|----------|
| Connection Failures | WebSocket fails to connect | Check network status, examine server logs, verify URL and protocol | Ensure firewall allows WebSocket, verify server is running, check SSL configuration |
| Authentication Errors | Connection rejected with auth error | Examine token, check server logs, verify Firebase configuration | Refresh authentication token, ensure correct permissions, check Firebase rules |
| Message Delivery Issues | Messages not received by recipient | Trace message through system, check encryption, verify recipient ID | Confirm recipient is connected, check message format, verify encryption keys |
| Encryption Failures | Decryption errors, invalid signatures | Check key exchange process, verify signature generation, examine encrypted content | Re-establish secure channel, verify key pairs, ensure correct algorithm usage |

### Debugging Checklist

When troubleshooting WebSocket issues in the AI Agent Network, follow this checklist:

1. **Verify Connectivity**:
   - Check that the client can reach the WebSocket server
   - Verify that WebSocket protocol (ws:// or wss://) is correct
   - Ensure firewalls allow WebSocket connections

2. **Validate Authentication**:
   - Confirm that authentication tokens are valid and not expired
   - Verify that the user has permission to connect
   - Check that the agent ID is valid for the user

3. **Inspect Connection Lifecycle**:
   - Examine connection establishment process
   - Verify handshake completion
   - Check heartbeat mechanism
   - Investigate disconnection reasons

4. **Debug Message Flow**:
   - Trace message path from sender to recipient
   - Verify message format and structure
   - Check encryption and decryption process
   - Confirm message delivery and acknowledgment

5. **Analyze Performance**:
   - Measure connection establishment time
   - Track message latency
   - Monitor server resource usage
   - Identify bottlenecks in processing

By using these testing and debugging techniques, developers can create robust, reliable WebSocket implementations for the AI Agent Network, ensuring secure and efficient agent-to-agent communication.