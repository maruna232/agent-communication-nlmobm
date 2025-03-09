# Encryption Protocol Documentation

## Introduction

This document provides detailed specifications of the encryption protocols implemented in the AI Agent Network. The system employs multiple encryption mechanisms to protect user data both at rest and in transit, supporting the privacy-first architecture that keeps sensitive information under user control.

### Purpose and Scope

This document serves as the authoritative reference for all encryption mechanisms used in the AI Agent Network. It covers the cryptographic algorithms, key management procedures, and implementation details for both local data protection and agent-to-agent communication.

### Security Principles

The encryption protocols are designed according to the following principles:

1. **Strong Encryption**: Industry-standard algorithms with appropriate key lengths
2. **End-to-End Encryption**: Only communicating parties can access message content
3. **Perfect Forward Secrecy**: Compromise of current keys doesn't expose past communications
4. **Defense in Depth**: Multiple layers of encryption for critical data
5. **Transparency**: Open documentation of all cryptographic mechanisms

## Cryptographic Algorithms

The AI Agent Network uses the following cryptographic algorithms for various security functions:

### Symmetric Encryption

**AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)**

- **Purpose**: Encryption of local data stored on user devices
- **Key Length**: 256 bits
- **Mode**: GCM (Galois/Counter Mode) providing authenticated encryption
- **IV Length**: 16 bytes (128 bits), randomly generated for each encryption operation
- **Authentication Tag**: 16 bytes (128 bits)
- **Implementation**: crypto-js library with Web Crypto API acceleration when available

**XChaCha20-Poly1305**

- **Purpose**: Encryption of agent-to-agent messages
- **Key Length**: 256 bits
- **Nonce Length**: 24 bytes (192 bits), randomly generated for each message
- **Authentication Tag**: 16 bytes (128 bits)
- **Implementation**: TweetNaCl.js library

### Asymmetric Encryption

**X25519 (Curve25519)**

- **Purpose**: Key exchange for establishing shared secrets between agents
- **Key Length**: 256 bits
- **Properties**: Efficient elliptic curve Diffie-Hellman key exchange
- **Implementation**: TweetNaCl.js library

**Ed25519**

- **Purpose**: Digital signatures for message authentication
- **Key Length**: 256 bits
- **Signature Size**: 64 bytes
- **Properties**: Edwards-curve Digital Signature Algorithm (EdDSA)
- **Implementation**: TweetNaCl.js library

### Key Derivation

**PBKDF2 (Password-Based Key Derivation Function 2)**

- **Purpose**: Deriving encryption keys from user passwords
- **Hash Function**: SHA-256
- **Iterations**: 10,000 (configurable based on device performance)
- **Salt Length**: 16 bytes (128 bits), randomly generated
- **Output Key Length**: 32 bytes (256 bits)
- **Implementation**: crypto-js library

### Cryptographic Hash Functions

**SHA-256 (Secure Hash Algorithm 256-bit)**

- **Purpose**: General-purpose hashing, integrity verification
- **Output Size**: 32 bytes (256 bits)
- **Implementation**: crypto-js library

**HMAC-SHA256 (Hash-based Message Authentication Code with SHA-256)**

- **Purpose**: Message authentication and integrity verification
- **Output Size**: 32 bytes (256 bits)
- **Implementation**: crypto-js library

## Local Data Encryption

The AI Agent Network stores all user data locally on the device, protected by strong encryption.

### Encryption Architecture

Local data is protected using a hierarchical encryption scheme:

1. **Master Key**: Derived from user credentials using PBKDF2
2. **Data Encryption Keys (DEKs)**: Purpose-specific keys derived from the master key
3. **Encrypted Data**: Individual data items encrypted with appropriate DEKs

This approach provides compartmentalization and allows for selective access to different data categories.

### Key Derivation Process

The key derivation process follows these steps:

1. Generate a random salt (16 bytes)
2. Derive master key from user password using PBKDF2-SHA256 with 10,000 iterations
3. Derive purpose-specific DEKs using HKDF with different context values
4. Store the salt alongside encrypted data, but never store the master key or DEKs
5. Re-derive keys as needed using the stored salt and user credentials

This approach ensures that encryption keys are never persistently stored, protecting against extraction attacks.

### Data Encryption Process

The data encryption process follows these steps:

1. Serialize data object to JSON string
2. Generate a random IV (16 bytes)
3. Encrypt the data using AES-256-GCM with the appropriate DEK and IV
4. Store the encrypted data, IV, and authentication tag
5. For decryption, verify the authentication tag before returning decrypted data

The AES-GCM mode provides both confidentiality and integrity protection through authenticated encryption.

### Protected Data Categories

The following data categories are encrypted in local storage:

1. **User Preferences**: Encrypted with user preferences DEK
2. **Agent Configuration**: Encrypted with agent configuration DEK
3. **Conversation History**: Encrypted with conversation DEK
4. **Calendar Data**: Encrypted with calendar DEK
5. **Authentication Tokens**: Encrypted with token DEK

Each category uses a different derived encryption key to maintain separation of concerns.

## End-to-End Encryption Protocol

The AI Agent Network implements end-to-end encryption for all agent-to-agent communications, ensuring that only the intended recipients can read message content.

### Protocol Overview

The end-to-end encryption protocol is based on established cryptographic principles:

1. **Key Exchange**: X25519 (Curve25519) for efficient and secure key exchange
2. **Message Encryption**: XChaCha20-Poly1305 for authenticated encryption
3. **Message Signing**: Ed25519 for digital signatures and non-repudiation
4. **Perfect Forward Secrecy**: Session keys derived for each conversation

This combination provides strong security properties while maintaining performance.

### Key Management

Each agent maintains multiple key pairs:

1. **Identity Key Pair**: Long-term X25519 key pair identifying the agent
2. **Signing Key Pair**: Long-term Ed25519 key pair for message signatures
3. **Ephemeral Key Pairs**: Short-term X25519 key pairs for perfect forward secrecy

Key pairs are generated client-side using secure random number generation. Private keys never leave the user's device and are stored encrypted in local storage.

### Connection Establishment

The secure connection establishment process follows these steps:

1. Agent A generates an ephemeral X25519 key pair
2. Agent A sends a connection request with its identity public key and ephemeral public key
3. Agent B verifies Agent A's identity (if previously known) or prompts for user approval
4. Agent B generates its own ephemeral X25519 key pair
5. Agent B computes shared secrets using both identity and ephemeral keys
6. Agent B responds with its identity public key and ephemeral public key
7. Agent A computes the same shared secrets
8. Both agents derive encryption keys from the shared secrets

This process establishes authenticated and encrypted communication with perfect forward secrecy.

### Message Encryption Process

The message encryption process follows these steps:

1. Serialize message object to JSON string
2. Generate a random 24-byte nonce
3. Encrypt the message using XChaCha20-Poly1305 with the shared secret and nonce
4. Sign the encrypted message using the sender's Ed25519 signing key
5. Create a message package containing:
   - Encrypted message content
   - Nonce
   - Sender's identity (public key identifier)
   - Message signature
   - Unencrypted metadata (timestamp, message ID)
6. Transmit the message package via WebSocket

This process ensures confidentiality, integrity, and authenticity of messages.

### Message Decryption Process

The message decryption process follows these steps:

1. Verify the message signature using the sender's public signing key
2. If verification fails, reject the message
3. Decrypt the message using XChaCha20-Poly1305 with the shared secret and nonce
4. If decryption fails (authentication tag mismatch), reject the message
5. Parse the decrypted JSON string to reconstruct the message object
6. Process the message according to its type

This process ensures that only authentic and unmodified messages are processed.

### Key Rotation

To maintain security over time, keys are rotated according to these policies:

1. **Ephemeral Keys**: Rotated for each new conversation or after 100 messages
2. **Identity Keys**: Can be rotated manually by users or automatically after 6 months
3. **Signing Keys**: Rotated together with identity keys

Key rotation maintains security even if older keys are compromised and limits the impact of potential key exposure.

## WebSocket Protocol Security

The WebSocket protocol includes additional security measures to protect the communication channel.

### Transport Security

All WebSocket connections use secure WebSocket (WSS) protocol with the following security features:

1. **TLS 1.3**: For transport layer security
2. **Certificate Validation**: Strict validation of server certificates
3. **Secure Cipher Suites**: Modern cipher suites with forward secrecy
4. **HTTP Strict Transport Security (HSTS)**: Enforced for all connections

These measures protect against network-level attacks and ensure the confidentiality and integrity of the WebSocket connection.

### Connection Authentication

WebSocket connections are authenticated using the following mechanism:

1. Client obtains a JWT from Firebase Authentication
2. Client includes the JWT in the WebSocket connection request
3. Server validates the JWT signature and claims
4. Server authorizes the connection based on user identity
5. Connection is established if authentication and authorization succeed

This process ensures that only authenticated users can establish WebSocket connections.

### Message Format

WebSocket messages follow a structured format with these components:

1. **Message ID**: Unique identifier for the message
2. **Conversation ID**: Identifier for the conversation thread
3. **Sender ID**: Identifier of the sending agent
4. **Recipient ID**: Identifier of the receiving agent
5. **Message Type**: Type of message (HANDSHAKE, QUERY, RESPONSE, etc.)
6. **Content**: Encrypted message content
7. **Timestamp**: Message creation time
8. **Metadata**: Additional information about the message

This structured format enables proper message routing and processing while maintaining security.

### Server Security

The WebSocket server implements these security measures:

1. **No Message Storage**: Messages are routed without persistent storage
2. **No Content Access**: Server cannot access encrypted message content
3. **Rate Limiting**: Prevents abuse through connection and message rate limits
4. **Connection Monitoring**: Detects and mitigates abnormal connection patterns
5. **Secure Configuration**: Hardened server configuration with minimal attack surface

These measures ensure that the server cannot compromise the end-to-end encryption of messages.

## Implementation Details

This section provides technical details about the encryption implementation in the AI Agent Network.

### Cryptographic Libraries

The encryption implementation uses the following libraries:

1. **TweetNaCl.js**: For X25519 key exchange, XChaCha20-Poly1305 encryption, and Ed25519 signatures
2. **crypto-js**: For AES-256-GCM encryption and PBKDF2 key derivation
3. **Web Crypto API**: For hardware-accelerated cryptographic operations when available

These libraries were selected for their security, performance, and compatibility with browser environments.

### Key Implementation Files

The encryption functionality is implemented in the following key files:

1. **Core Encryption Utilities**:
   - `src/web/src/lib/utils/encryption.ts`: Core encryption functions
   - `src/web/src/lib/websocket/encryption.ts`: WebSocket-specific encryption
   - `src/web/src/services/encryption.service.ts`: High-level encryption service

2. **Local Storage Encryption**:
   - `src/web/src/lib/storage/indexedDB.ts`: Encrypted IndexedDB wrapper
   - `src/web/src/lib/storage/sqliteStorage.ts`: Encrypted SQLite implementation
   - `src/web/src/lib/storage/localStorage.ts`: Encrypted localStorage wrapper

3. **WebSocket Encryption**:
   - `src/web/src/lib/websocket/socketClient.ts`: Secure WebSocket client
   - `src/web/src/lib/websocket/messageHandlers.ts`: Encrypted message processing

### Encryption Constants

The encryption implementation uses the following constants:

```typescript
const ENCRYPTION_CONSTANTS = {
  // AES encryption constants
  KEY_ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,
  
  // Key derivation constants
  SALT_ROUNDS: 10000,
  HASH_ALGORITHM: 'SHA-256',
  
  // NaCl encryption constants
  NONCE_LENGTH: 24,
  SIGNATURE_ALGORITHM: 'Ed25519',
  MESSAGE_ENCRYPTION_ALGORITHM: 'XChaCha20-Poly1305',
  KEY_EXCHANGE_ALGORITHM: 'X25519'
};
```

These constants define the cryptographic parameters used throughout the system.

### Error Handling

Cryptographic operations include robust error handling:

1. **Validation Checks**: Input validation before cryptographic operations
2. **Error Types**: Specific error types for different cryptographic failures
3. **Graceful Degradation**: Fallback mechanisms for non-critical failures
4. **Secure Error Messages**: Error messages that don't leak sensitive information

This approach ensures that cryptographic errors are handled securely and don't compromise the system.

## Security Considerations

This section discusses security considerations related to the encryption implementation.

### Threat Model

The encryption protocols address the following threats:

1. **Passive Eavesdropping**: Protected by end-to-end encryption
2. **Active Man-in-the-Middle**: Mitigated by authentication and signatures
3. **Server Compromise**: Limited impact due to end-to-end encryption
4. **Client Compromise**: Limited to the compromised device only
5. **Cryptanalysis**: Addressed by using strong, modern algorithms

The threat model assumes that the WebSocket server could be compromised but should not be able to access message content.

### Known Limitations

The encryption implementation has the following known limitations:

1. **Browser Storage Security**: Dependent on browser security for local storage
2. **Key Extraction Risk**: Keys in memory could potentially be extracted on compromised devices
3. **Quantum Computing**: Current cryptographic algorithms are vulnerable to quantum attacks
4. **Implementation Verification**: Formal verification of the implementation is not complete

These limitations are acknowledged and addressed through defense in depth and ongoing security improvements.

### Security Testing

The encryption implementation undergoes the following security testing:

1. **Unit Testing**: Comprehensive tests of all cryptographic functions
2. **Integration Testing**: End-to-end tests of the encryption workflow
3. **Cryptographic Validation**: Verification of cryptographic properties
4. **Penetration Testing**: Regular security assessments by external experts
5. **Code Review**: Security-focused code reviews for all cryptographic code

This testing ensures that the implementation correctly implements the cryptographic protocols and is resistant to known attacks.

### Future Improvements

Planned security improvements include:

1. **Post-Quantum Cryptography**: Transition to quantum-resistant algorithms
2. **Formal Verification**: Formal verification of critical cryptographic components
3. **Hardware Security Integration**: Support for hardware security modules and secure enclaves
4. **Enhanced Key Management**: More sophisticated key rotation and recovery mechanisms
5. **Additional Cryptographic Protocols**: Support for additional secure messaging protocols

These improvements will further enhance the security of the encryption implementation.

## Compliance and Standards

This section discusses compliance with relevant standards and best practices.

### Cryptographic Standards

The encryption implementation complies with the following standards:

1. **NIST FIPS 140-3**: Federal Information Processing Standards for cryptography
2. **NIST SP 800-38D**: Recommendation for block cipher modes of operation (GCM)
3. **NIST SP 800-132**: Recommendation for password-based key derivation
4. **RFC 7748**: Elliptic Curves for Security (Curve25519)
5. **RFC 8032**: Edwards-Curve Digital Signature Algorithm (Ed25519)

These standards ensure that the cryptographic algorithms and their implementation meet established security requirements.

### Industry Best Practices

The encryption implementation follows these industry best practices:

1. **Signal Protocol**: Inspired by the Signal Protocol for secure messaging
2. **OWASP Cryptographic Storage Cheat Sheet**: Guidelines for secure data storage
3. **IETF RFC 8446**: TLS 1.3 for transport security
4. **W3C Web Cryptography API**: Standard for browser-based cryptography

These best practices ensure that the implementation follows established patterns for secure communication and data protection.

### Regulatory Compliance

The encryption implementation supports compliance with the following regulations:

1. **GDPR**: Data protection through encryption and privacy by design
2. **CCPA**: User control over personal data and security measures
3. **HIPAA**: Encryption requirements for protected health information
4. **GLBA**: Protection of financial information through encryption

While regulatory compliance depends on the overall system implementation, the encryption protocols provide the necessary technical controls to support compliance requirements.

## Appendix A: Cryptographic Primitives

This appendix provides detailed information about the cryptographic primitives used in the AI Agent Network.

### AES-256-GCM

**Advanced Encryption Standard with Galois/Counter Mode**

- **Algorithm Type**: Symmetric block cipher with authenticated encryption
- **Key Size**: 256 bits
- **Block Size**: 128 bits
- **IV Size**: 96 bits (recommended), 128 bits (used in implementation)
- **Authentication Tag**: 128 bits
- **Security Properties**: Confidentiality, integrity, and authenticity
- **Performance**: Efficient in software and hardware, with AES-NI acceleration
- **Standardization**: NIST FIPS 197 (AES), NIST SP 800-38D (GCM)

AES-GCM provides both encryption and authentication in a single operation, eliminating the need for separate HMAC calculations.

### XChaCha20-Poly1305

**Extended ChaCha20 with Poly1305 MAC**

- **Algorithm Type**: Symmetric stream cipher with authenticated encryption
- **Key Size**: 256 bits
- **Nonce Size**: 192 bits (24 bytes)
- **Authentication Tag**: 128 bits
- **Security Properties**: Confidentiality, integrity, and authenticity
- **Performance**: Highly efficient in software implementations
- **Standardization**: RFC 8439 (ChaCha20 and Poly1305), RFC 8103 (XChaCha20)

XChaCha20-Poly1305 extends ChaCha20-Poly1305 with a longer nonce, reducing the risk of nonce reuse while maintaining the security and performance benefits.

### X25519 (Curve25519)

**Elliptic Curve Diffie-Hellman Key Exchange**

- **Algorithm Type**: Elliptic curve key exchange
- **Key Size**: 256 bits
- **Security Level**: Approximately 128 bits
- **Security Properties**: Forward secrecy, efficient key exchange
- **Performance**: Highly efficient compared to traditional Diffie-Hellman
- **Standardization**: RFC 7748

X25519 provides a secure and efficient method for key exchange, allowing two parties to establish a shared secret over an insecure channel.

### Ed25519

**Edwards-curve Digital Signature Algorithm**

- **Algorithm Type**: Digital signature algorithm
- **Key Size**: 256 bits
- **Signature Size**: 64 bytes
- **Security Level**: Approximately 128 bits
- **Security Properties**: Integrity, authenticity, and non-repudiation
- **Performance**: Fast signature generation and verification
- **Standardization**: RFC 8032

Ed25519 provides secure digital signatures with excellent performance characteristics, making it suitable for authenticating messages in the agent communication protocol.

### PBKDF2

**Password-Based Key Derivation Function 2**

- **Algorithm Type**: Key derivation function
- **Hash Function**: SHA-256
- **Iterations**: 10,000 (configurable)
- **Salt Size**: 128 bits (16 bytes)
- **Output Size**: Configurable, typically 256 bits
- **Security Properties**: Resistance to brute force and dictionary attacks
- **Performance**: Deliberately computationally intensive
- **Standardization**: NIST SP 800-132, RFC 8018

PBKDF2 derives cryptographic keys from user passwords, applying the hash function repeatedly to increase the computational cost of brute force attacks.

## Appendix B: Message Encryption Example

This appendix provides a step-by-step example of the message encryption and decryption process.

### Key Generation

```typescript
// Generate identity key pairs for both agents
const aliceIdentityKeyPair = generateKeyPair();
const bobIdentityKeyPair = generateKeyPair();

// Generate signing key pairs for both agents
const aliceSigningKeyPair = generateSigningKeyPair();
const bobSigningKeyPair = generateSigningKeyPair();

// Generate ephemeral key pairs for this conversation
const aliceEphemeralKeyPair = generateKeyPair();
const bobEphemeralKeyPair = generateKeyPair();
```

### Shared Secret Derivation

```typescript
// Alice derives shared secrets
const aliceSharedSecret1 = deriveSharedSecret(
  aliceIdentityKeyPair.privateKey,
  bobIdentityKeyPair.publicKey
);

const aliceSharedSecret2 = deriveSharedSecret(
  aliceEphemeralKeyPair.privateKey,
  bobIdentityKeyPair.publicKey
);

const aliceSharedSecret3 = deriveSharedSecret(
  aliceIdentityKeyPair.privateKey,
  bobEphemeralKeyPair.publicKey
);

const aliceSharedSecret4 = deriveSharedSecret(
  aliceEphemeralKeyPair.privateKey,
  bobEphemeralKeyPair.publicKey
);

// Combine shared secrets using HKDF
const aliceFinalSharedSecret = combineSharedSecrets([
  aliceSharedSecret1,
  aliceSharedSecret2,
  aliceSharedSecret3,
  aliceSharedSecret4
]);

// Bob derives the same shared secrets
const bobSharedSecret1 = deriveSharedSecret(
  bobIdentityKeyPair.privateKey,
  aliceIdentityKeyPair.publicKey
);

const bobSharedSecret2 = deriveSharedSecret(
  bobIdentityKeyPair.privateKey,
  aliceEphemeralKeyPair.publicKey
);

const bobSharedSecret3 = deriveSharedSecret(
  bobEphemeralKeyPair.privateKey,
  aliceIdentityKeyPair.publicKey
);

const bobSharedSecret4 = deriveSharedSecret(
  bobEphemeralKeyPair.privateKey,
  aliceEphemeralKeyPair.publicKey
);

// Combine shared secrets using HKDF
const bobFinalSharedSecret = combineSharedSecrets([
  bobSharedSecret1,
  bobSharedSecret2,
  bobSharedSecret3,
  bobSharedSecret4
]);

// aliceFinalSharedSecret and bobFinalSharedSecret are identical
```

### Message Encryption

```typescript
// Alice creates a message
const message = {
  messageId: generateMessageId(),
  conversationId: 'conv_abcdefg',
  senderId: 'agent_alice',
  recipientId: 'agent_bob',
  messageType: 'PROPOSAL',
  content: {
    proposalId: 'prop_123',
    details: {
      title: 'Coffee Meeting',
      startTime: '2023-06-01T15:00:00Z',
      endTime: '2023-06-01T16:00:00Z',
      location: 'Blue Bottle Coffee'
    }
  },
  timestamp: Date.now(),
  metadata: {
    priority: 'HIGH',
    encrypted: true
  }
};

// Serialize the message to JSON
const messageJson = JSON.stringify(message);

// Generate a random nonce
const nonce = generateRandomBytes(ENCRYPTION_CONSTANTS.NONCE_LENGTH);

// Encrypt the message
const encryptedData = encryptMessage(messageJson, aliceFinalSharedSecret, nonce);

// Sign the encrypted data
const signature = signMessage(encryptedData, aliceSigningKeyPair.privateKey);

// Create the encrypted message package
const encryptedMessage = {
  message: {
    messageId: message.messageId,
    conversationId: message.conversationId,
    senderId: message.senderId,
    recipientId: message.recipientId,
    content: encryptedData,
    nonce: encodeBase64(nonce),
    timestamp: message.timestamp,
    metadata: {
      encrypted: true
    }
  },
  encrypted: true,
  signature: signature
};
```

### Message Decryption

```typescript
// Bob receives the encrypted message
const receivedMessage = encryptedMessage;

// Verify the signature
const isSignatureValid = verifySignature(
  receivedMessage.message.content,
  receivedMessage.signature,
  aliceSigningKeyPair.publicKey
);

if (!isSignatureValid) {
  throw new Error('Invalid signature');
}

// Decrypt the message
const decryptedJson = decryptMessage(
  receivedMessage.message.content,
  decodeBase64(receivedMessage.message.nonce),
  bobFinalSharedSecret
);

// Parse the JSON back to an object
const decryptedMessage = JSON.parse(decryptedJson);

// Now Bob has the original message
console.log(decryptedMessage);
```

## Appendix C: Local Data Encryption Example

This appendix provides a step-by-step example of the local data encryption and decryption process.

### Key Derivation

```typescript
// User password
const userPassword = 'secure-user-password';

// Generate a random salt
const salt = generateSalt(16); // 16 bytes

// Derive the master key using PBKDF2
const masterKey = deriveKeyFromPassword(
  userPassword,
  salt,
  ENCRYPTION_CONSTANTS.SALT_ROUNDS,
  ENCRYPTION_CONSTANTS.KEY_LENGTH / 8
);

// Derive purpose-specific data encryption keys
const preferencesKey = deriveKeyFromMaster(masterKey, 'preferences');
const agentConfigKey = deriveKeyFromMaster(masterKey, 'agent-config');
const conversationKey = deriveKeyFromMaster(masterKey, 'conversations');
const tokenKey = deriveKeyFromMaster(masterKey, 'tokens');
```

### Data Encryption

```typescript
// User preferences object to encrypt
const userPreferences = {
  theme: 'dark',
  language: 'en',
  notifications: true,
  workingHours: {
    start: '09:00',
    end: '17:00'
  },
  location: 'San Francisco'
};

// Generate a random IV
const iv = generateIV(); // 16 bytes

// Encrypt the preferences object
const encryptedPreferences = encryptObject(userPreferences, preferencesKey, iv);

// Create the storage object
const storageObject = {
  data: encryptedPreferences,
  iv: iv,
  salt: salt, // Store with the first encrypted object only
  version: '1.0',
  timestamp: Date.now()
};

// Store in IndexedDB
await indexedDB.put('userPreferences', storageObject);
```

### Data Decryption

```typescript
// Retrieve from IndexedDB
const storedObject = await indexedDB.get('userPreferences');

// Re-derive the master key using the stored salt
const retrievedMasterKey = deriveKeyFromPassword(
  userPassword,
  storedObject.salt,
  ENCRYPTION_CONSTANTS.SALT_ROUNDS,
  ENCRYPTION_CONSTANTS.KEY_LENGTH / 8
);

// Re-derive the preferences key
const retrievedPreferencesKey = deriveKeyFromMaster(retrievedMasterKey, 'preferences');

// Decrypt the preferences object
const decryptedPreferences = decryptObject(
  storedObject.data,
  retrievedPreferencesKey,
  storedObject.iv
);

// Now we have the original preferences object
console.log(decryptedPreferences);
```

## References

1. [NIST FIPS 197: Advanced Encryption Standard (AES)](https://csrc.nist.gov/publications/detail/fips/197/final)
2. [NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
3. [NIST SP 800-132: Recommendation for Password-Based Key Derivation](https://csrc.nist.gov/publications/detail/sp/800-132/final)
4. [RFC 7748: Elliptic Curves for Security](https://tools.ietf.org/html/rfc7748)
5. [RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://tools.ietf.org/html/rfc8032)
6. [RFC 8439: ChaCha20 and Poly1305 for IETF Protocols](https://tools.ietf.org/html/rfc8439)
7. [Signal Protocol Documentation](https://signal.org/docs/)
8. [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
9. [WebSocket Protocol Documentation](../../docs/development/websocket-protocol.md)
10. [Security Architecture Documentation](../../docs/architecture/security.md)