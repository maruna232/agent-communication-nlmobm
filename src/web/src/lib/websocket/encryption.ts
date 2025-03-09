/**
 * WebSocket Encryption Module
 * 
 * Implements end-to-end encryption for WebSocket communication between agents in the AI Agent Network.
 * This module provides functions for generating cryptographic keys, encrypting and decrypting
 * messages, signing messages for authenticity verification, and managing secure communication
 * channels while maintaining user privacy.
 */

import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import * as tweetnacl from 'tweetnacl'; // ^1.0.3
import * as tweetnaclUtil from 'tweetnacl-util'; // ^0.15.1

import {
  WebSocketEncryptedMessage,
  KeyPair,
  WebSocketErrorType
} from '../types/websocket.types';
import { AgentMessage } from '../types/agent.types';
import { createWebSocketError } from '../utils/errorHandling';
import {
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
  generateKeyPair,
  generateSigningKeyPair,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
  signMessage,
  verifySignature
} from '../utils/encryption';

/**
 * Constants for encryption configuration
 */
export const ENCRYPTION_CONSTANTS = {
  NONCE_LENGTH: 24,
  SIGNATURE_ALGORITHM: 'Ed25519',
  MESSAGE_ENCRYPTION_ALGORITHM: 'XChaCha20-Poly1305',
  KEY_EXCHANGE_ALGORITHM: 'X25519'
};

/**
 * Generates a unique message identifier
 * @returns Unique message ID
 */
export function generateMessageId(): string {
  return uuidv4();
}

/**
 * Creates an encrypted WebSocket message with signature for secure transmission
 * @param message The agent message to encrypt
 * @param sharedSecret Shared secret for encryption
 * @param signingPrivateKey Private key for signing
 * @returns Encrypted and signed message
 */
export function createEncryptedWebSocketMessage(
  message: AgentMessage, 
  sharedSecret: string, 
  signingPrivateKey: string
): WebSocketEncryptedMessage {
  if (!message || !sharedSecret || !signingPrivateKey) {
    throw handleEncryptionError(
      new Error('Missing required parameters'),
      'message encryption'
    );
  }

  try {
    // Convert message to string for encryption
    const messageStr = JSON.stringify(message);
    
    // Encrypt the message
    const { encryptedData, nonce } = encryptMessage(messageStr, sharedSecret);
    
    // Create a modified message with encrypted content
    const encryptedAgentMessage: AgentMessage = {
      ...message,
      content: { encryptedData, nonce }
    };
    
    // Sign the entire encrypted message
    const signature = signMessage(encryptedAgentMessage, signingPrivateKey);
    
    // Return the encrypted WebSocket message
    return {
      message: encryptedAgentMessage,
      encrypted: true,
      signature
    };
  } catch (error) {
    throw handleEncryptionError(
      error as Error,
      'message encryption'
    );
  }
}

/**
 * Processes an encrypted WebSocket message by decrypting and verifying its signature
 * @param encryptedMessage The encrypted message to process
 * @param sharedSecret Shared secret for decryption
 * @param signingPublicKey Public key for signature verification
 * @returns Decrypted and verified message
 */
export function processEncryptedWebSocketMessage(
  encryptedMessage: WebSocketEncryptedMessage,
  sharedSecret: string,
  signingPublicKey: string
): AgentMessage {
  if (!encryptedMessage || !sharedSecret || !signingPublicKey) {
    throw handleEncryptionError(
      new Error('Missing required parameters'),
      'message decryption'
    );
  }

  try {
    // Ensure the message is encrypted
    if (!encryptedMessage.encrypted) {
      throw new Error('Message is not encrypted');
    }
    
    // Verify the signature of the entire message
    const isValid = verifySignature(
      encryptedMessage.message,
      encryptedMessage.signature,
      signingPublicKey
    );
    
    if (!isValid) {
      throw new Error('Message signature verification failed');
    }
    
    // Extract encrypted content
    const { encryptedData, nonce } = encryptedMessage.message.content;
    
    // Decrypt the message
    const decryptedStr = decryptMessage(encryptedData, nonce, sharedSecret);
    
    // Parse the decrypted message
    return JSON.parse(decryptedStr) as AgentMessage;
  } catch (error) {
    throw handleEncryptionError(
      error as Error,
      'message decryption'
    );
  }
}

/**
 * Validates that an encrypted message has the required structure and fields
 * @param message The message to validate
 * @returns True if message is valid, false otherwise
 */
export function validateEncryptedMessage(message: WebSocketEncryptedMessage): boolean {
  if (!message) return false;
  
  // Check if message has required fields
  if (!message.message || typeof message.encrypted !== 'boolean' || !message.signature) {
    return false;
  }
  
  // If message has message field, check if it has required properties
  if (message.message) {
    const requiredProps = ['messageId', 'senderId', 'recipientId', 'messageType', 'content'];
    
    for (const prop of requiredProps) {
      if (!(prop in message.message)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Encrypts a message from one agent to another using their shared secret
 * @param message The agent message to encrypt
 * @param sharedSecret Shared secret for encryption
 * @param signingPrivateKey Private key for signing
 * @returns Promise resolving to encrypted message
 */
export async function encryptAgentToAgentMessage(
  message: AgentMessage,
  sharedSecret: string,
  signingPrivateKey: string
): Promise<WebSocketEncryptedMessage> {
  // Ensure message has required fields
  if (!message.messageId) {
    message.messageId = generateMessageId();
  }
  
  if (!message.timestamp) {
    message.timestamp = Date.now();
  }
  
  // Ensure metadata exists and set encryption flag
  if (!message.metadata) {
    message.metadata = {
      priority: 'normal',
      expiresAt: Date.now() + 86400000, // 24 hours
      encrypted: true,
      requiresResponse: false
    };
  } else {
    // Ensure encryption flag is set
    message.metadata.encrypted = true;
  }
  
  return createEncryptedWebSocketMessage(message, sharedSecret, signingPrivateKey);
}

/**
 * Decrypts a message received from another agent
 * @param encryptedMessage The encrypted message to decrypt
 * @param sharedSecret Shared secret for decryption
 * @param signingPublicKey Public key for signature verification
 * @returns Promise resolving to decrypted message
 */
export async function decryptAgentToAgentMessage(
  encryptedMessage: WebSocketEncryptedMessage,
  sharedSecret: string,
  signingPublicKey: string
): Promise<AgentMessage> {
  // Validate the encrypted message structure
  if (!validateEncryptedMessage(encryptedMessage)) {
    throw handleEncryptionError(
      new Error('Invalid encrypted message structure'),
      'message validation'
    );
  }
  
  return processEncryptedWebSocketMessage(encryptedMessage, sharedSecret, signingPublicKey);
}

/**
 * Generates a new key pair for agent encryption
 * @returns Promise resolving to generated key pair
 */
export async function generateAgentKeyPair(): Promise<KeyPair> {
  return generateKeyPair();
}

/**
 * Generates a new signing key pair for message authentication
 * @returns Promise resolving to generated signing key pair
 */
export async function generateAgentSigningKeyPair(): Promise<KeyPair> {
  return generateSigningKeyPair();
}

/**
 * Derives a shared secret between two agents for secure communication
 * @param privateKey Private key of one agent
 * @param publicKey Public key of the other agent
 * @returns Promise resolving to derived shared secret
 */
export async function deriveAgentSharedSecret(
  privateKey: string,
  publicKey: string
): Promise<string> {
  return deriveSharedSecret(privateKey, publicKey);
}

/**
 * Handles encryption-related errors with appropriate error creation
 * @param error The original error
 * @param operation The operation that failed
 * @returns Formatted WebSocket error
 */
export function handleEncryptionError(error: Error, operation: string): Error {
  const message = `Encryption error during ${operation}: ${error.message}`;
  return createWebSocketError(message, WebSocketErrorType.ENCRYPTION_ERROR, {
    originalError: error,
    operation
  });
}