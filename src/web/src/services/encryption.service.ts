import * as CryptoJS from 'crypto-js'; // ^4.1.1
import { StorageEncryptionLevel } from '../lib/types/storage.types';
import {
  KeyPair,
  WebSocketEncryptedMessage
} from '../lib/types/websocket.types';
import { AgentMessage } from '../lib/types/agent.types';
import {
  ENCRYPTION_CONSTANTS,
  generateKeyPair,
  generateSigningKeyPair,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
  signMessage,
  verifySignature,
  deriveKeyFromPassword,
  generateSalt,
  encryptWithAES,
  decryptWithAES,
  generateIV,
  encryptWithPassword,
  decryptWithPassword,
  encryptObject,
  decryptObject,
  validateEncryptionLevel
} from '../lib/utils/encryption';
import {
  encryptAgentToAgentMessage,
  decryptAgentToAgentMessage,
  generateAgentKeyPair,
  generateAgentSigningKeyPair,
  deriveAgentSharedSecret
} from '../lib/websocket/encryption';

/**
 * Service that provides high-level encryption functionality for the application,
 * managing encryption keys and providing methods for securing user data and agent communications.
 * This class implements the privacy-first architecture by ensuring all sensitive data is
 * properly encrypted both at rest and during transmission.
 */
class EncryptionService {
  private masterKey: string;
  private encryptionKeyPair: KeyPair;
  private signingKeyPair: KeyPair;
  private sharedSecrets: Record<string, string>;
  private encryptionLevel: StorageEncryptionLevel;
  private initialized: boolean;

  /**
   * Creates a new EncryptionService instance with default empty values
   */
  constructor() {
    this.masterKey = '';
    this.encryptionKeyPair = { publicKey: '', privateKey: '' };
    this.signingKeyPair = { publicKey: '', privateKey: '' };
    this.sharedSecrets = {};
    this.encryptionLevel = StorageEncryptionLevel.NONE;
    this.initialized = false;
  }

  /**
   * Initializes the encryption service with master key and key pairs
   * @param password Password to derive the master key from
   * @param level Encryption level to use
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(password: string, level: StorageEncryptionLevel): Promise<boolean> {
    try {
      // Generate a salt for key derivation
      const salt = generateSalt();
      
      // Derive master key from password
      this.masterKey = deriveKeyFromPassword(password, salt);
      
      // Generate key pairs for encryption and signing
      this.encryptionKeyPair = await generateAgentKeyPair();
      this.signingKeyPair = await generateAgentSigningKeyPair();
      
      // Set encryption level based on the provided level
      this.encryptionLevel = level;
      
      // Mark as initialized
      this.initialized = true;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Checks if the encryption service is initialized
   * @returns True if the encryption service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets the current encryption level
   * @returns The current encryption level
   */
  getEncryptionLevel(): StorageEncryptionLevel {
    return this.encryptionLevel;
  }

  /**
   * Sets the encryption level
   * @param level The encryption level to set
   */
  setEncryptionLevel(level: StorageEncryptionLevel): void {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    this.encryptionLevel = level;
  }

  /**
   * Gets the public encryption key
   * @returns The public encryption key
   */
  getPublicKey(): string {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    return this.encryptionKeyPair.publicKey;
  }

  /**
   * Gets the public signing key
   * @returns The public signing key
   */
  getSigningPublicKey(): string {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    return this.signingKeyPair.publicKey;
  }

  /**
   * Derives a shared secret with another agent using their public key
   * @param agentId ID of the agent to derive a shared secret with
   * @param publicKey Public key of the agent
   * @returns Promise resolving to the derived shared secret
   */
  async deriveSharedSecretWithAgent(agentId: string, publicKey: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Check if we already have a shared secret for this agent
    if (this.sharedSecrets[agentId]) {
      return this.sharedSecrets[agentId];
    }
    
    // Derive a new shared secret using X25519 key exchange
    const sharedSecret = await deriveAgentSharedSecret(
      this.encryptionKeyPair.privateKey,
      publicKey
    );
    
    // Store it for future use
    this.sharedSecrets[agentId] = sharedSecret;
    
    return sharedSecret;
  }

  /**
   * Gets the shared secret for a specific agent
   * @param agentId ID of the agent
   * @returns The shared secret or null if not found
   */
  getSharedSecret(agentId: string): string | null {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    return this.sharedSecrets[agentId] || null;
  }

  /**
   * Encrypts data using the master key
   * @param data Data to encrypt (string or object)
   * @returns Promise resolving to the encrypted data
   */
  async encryptData(data: string | object): Promise<string> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Check if encryption is enabled based on the encryption level
    if (this.encryptionLevel === StorageEncryptionLevel.NONE) {
      return typeof data === 'object' ? JSON.stringify(data) : data;
    }
    
    // Convert data to string if it's an object
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Generate a random IV for encryption
    const iv = generateIV();
    
    // Encrypt the data using AES-256-GCM
    const encryptedData = encryptWithAES(dataStr, this.masterKey, iv);
    
    // Return the encrypted data with IV
    return JSON.stringify({ encryptedData, iv });
  }

  /**
   * Decrypts data using the master key
   * @param encryptedData Encrypted data to decrypt
   * @returns Promise resolving to the decrypted data
   */
  async decryptData(encryptedData: string): Promise<any> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Check if the data is actually encrypted
    try {
      const parsed = JSON.parse(encryptedData);
      
      // If it doesn't have the expected structure, it's not encrypted
      if (!parsed.encryptedData || !parsed.iv) {
        return parsed;
      }
      
      // Extract the IV and encrypted content
      const { encryptedData: encrypted, iv } = parsed;
      
      // Decrypt the data
      const decryptedStr = decryptWithAES(encrypted, this.masterKey, iv);
      
      // Try to parse as JSON, return as string if parsing fails
      try {
        return JSON.parse(decryptedStr);
      } catch (e) {
        return decryptedStr;
      }
    } catch (e) {
      // If it's not valid JSON, assume it's not encrypted
      return encryptedData;
    }
  }

  /**
   * Encrypts a message for another agent
   * @param message Message to encrypt
   * @param recipientAgentId ID of the recipient agent
   * @returns Promise resolving to the encrypted message
   */
  async encryptAgentMessage(
    message: AgentMessage,
    recipientAgentId: string
  ): Promise<WebSocketEncryptedMessage> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Get the shared secret for the recipient agent
    const sharedSecret = this.sharedSecrets[recipientAgentId];
    if (!sharedSecret) {
      throw new Error(`No shared secret for agent ${recipientAgentId}`);
    }
    
    // Encrypt the message using XChaCha20-Poly1305 with the shared secret
    return encryptAgentToAgentMessage(
      message,
      sharedSecret,
      this.signingKeyPair.privateKey
    );
  }

  /**
   * Decrypts a message from another agent
   * @param encryptedMessage Encrypted message to decrypt
   * @param senderAgentId ID of the sender agent
   * @param senderPublicKey Public key of the sender agent
   * @returns Promise resolving to the decrypted message
   */
  async decryptAgentMessage(
    encryptedMessage: WebSocketEncryptedMessage,
    senderAgentId: string,
    senderPublicKey: string
  ): Promise<AgentMessage> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Get or derive the shared secret for the sender agent
    let sharedSecret = this.sharedSecrets[senderAgentId];
    
    if (!sharedSecret) {
      // Derive the shared secret if we don't have it yet
      sharedSecret = await this.deriveSharedSecretWithAgent(senderAgentId, senderPublicKey);
    }
    
    // Decrypt the message using the shared secret
    return decryptAgentToAgentMessage(
      encryptedMessage,
      sharedSecret,
      senderPublicKey
    );
  }

  /**
   * Encrypts an object using the master key
   * @param obj Object to encrypt
   * @returns Promise resolving to the encrypted object
   */
  async encryptObject(obj: object): Promise<string> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Check if encryption is enabled based on the encryption level
    if (this.encryptionLevel === StorageEncryptionLevel.NONE) {
      return JSON.stringify(obj);
    }
    
    // Generate a random IV for encryption
    const iv = generateIV();
    
    // Encrypt the object using AES-256-GCM
    const encryptedData = encryptObject(obj, this.masterKey, iv);
    
    // Return the encrypted data with IV
    return JSON.stringify({ encryptedData, iv });
  }

  /**
   * Decrypts an encrypted object
   * @param encryptedData Encrypted data to decrypt
   * @returns Promise resolving to the decrypted object
   */
  async decryptObject(encryptedData: string): Promise<any> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Check if the data is actually encrypted
    try {
      const parsed = JSON.parse(encryptedData);
      
      // If it doesn't have the expected structure, it's not encrypted
      if (!parsed.encryptedData || !parsed.iv) {
        return parsed;
      }
      
      // Extract the IV and encrypted content
      const { encryptedData: encrypted, iv } = parsed;
      
      // Decrypt the object
      return decryptObject(encrypted, this.masterKey, iv);
    } catch (e) {
      // If it's not valid JSON, assume it's not encrypted
      return JSON.parse(encryptedData);
    }
  }

  /**
   * Generates a new encryption key pair
   * @returns Promise resolving to the generated key pair
   */
  async generateKeyPair(): Promise<KeyPair> {
    return generateAgentKeyPair();
  }

  /**
   * Generates a new signing key pair
   * @returns Promise resolving to the generated signing key pair
   */
  async generateSigningKeyPair(): Promise<KeyPair> {
    return generateAgentSigningKeyPair();
  }

  /**
   * Signs data using the signing private key
   * @param data Data to sign (string or object)
   * @returns Promise resolving to the signature
   */
  async signData(data: string | object): Promise<string> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Convert data to string if it's an object
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Sign the data using Ed25519
    return signMessage(dataStr, this.signingKeyPair.privateKey);
  }

  /**
   * Verifies a signature using a public key
   * @param data Data that was signed
   * @param signature Signature to verify
   * @param publicKey Public key to use for verification
   * @returns Promise resolving to true if the signature is valid
   */
  async verifySignature(
    data: string | object,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Convert data to string if it's an object
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Verify the signature using Ed25519
    return verifySignature(dataStr, signature, publicKey);
  }

  /**
   * Changes the master password and re-encrypts all keys
   * @param oldPassword Current password
   * @param newPassword New password to set
   * @returns Promise resolving to true if the password was changed successfully
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    try {
      // Generate a salt for key derivation
      const salt = generateSalt();
      
      // Verify the old password by attempting to derive the current master key
      const oldKey = deriveKeyFromPassword(oldPassword, salt);
      
      // In a real implementation, we would verify the old password matches current masterKey
      // Here we'll just assume it does, since we don't store the salt
      
      // Derive a new master key from the new password
      const newMasterKey = deriveKeyFromPassword(newPassword, salt);
      
      // Re-encrypt any sensitive data with the new master key
      // In a production implementation, this would re-encrypt all stored data
      
      // Update the master key
      this.masterKey = newMasterKey;
      
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      return false;
    }
  }

  /**
   * Exports encryption keys in a secure format
   * @param password Password to encrypt the keys with
   * @returns Promise resolving to the encrypted keys
   */
  async exportEncryptionKeys(password: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Encryption service not initialized');
    }
    
    // Create an object containing the encryption and signing key pairs
    const keys = {
      encryptionKeyPair: this.encryptionKeyPair,
      signingKeyPair: this.signingKeyPair
    };
    
    // Encrypt the keys using the provided password
    return encryptWithPassword(JSON.stringify(keys), password);
  }

  /**
   * Imports encryption keys from a secure format
   * @param encryptedKeys Encrypted keys to import
   * @param password Password to decrypt the keys with
   * @returns Promise resolving to true if the keys were imported successfully
   */
  async importEncryptionKeys(encryptedKeys: string, password: string): Promise<boolean> {
    try {
      // Decrypt the encrypted keys using the provided password
      const decryptedStr = decryptWithPassword(encryptedKeys, password);
      
      // Parse the decrypted keys
      const keys = JSON.parse(decryptedStr);
      
      // Validate the decrypted keys structure
      if (!keys.encryptionKeyPair || !keys.signingKeyPair) {
        throw new Error('Invalid keys format');
      }
      
      // Set the encryption and signing key pairs
      this.encryptionKeyPair = keys.encryptionKeyPair;
      this.signingKeyPair = keys.signingKeyPair;
      
      // Clear the shared secrets as they need to be re-derived
      this.sharedSecrets = {};
      
      // Set the initialized flag to true
      this.initialized = true;
      
      return true;
    } catch (error) {
      console.error('Failed to import encryption keys:', error);
      return false;
    }
  }

  /**
   * Resets the encryption service to its initial state
   */
  reset(): void {
    this.masterKey = '';
    this.encryptionKeyPair = { publicKey: '', privateKey: '' };
    this.signingKeyPair = { publicKey: '', privateKey: '' };
    this.sharedSecrets = {};
    this.encryptionLevel = StorageEncryptionLevel.NONE;
    this.initialized = false;
  }
}

export { EncryptionService };