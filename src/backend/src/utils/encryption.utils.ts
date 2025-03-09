import crypto from 'crypto';
import * as sodium from 'libsodium-wrappers';
import { ENCRYPTION } from '../config/constants';
import { IMessage } from '../interfaces/message.interface';
import { createServerError } from '../utils/error.utils';
import { SERVER_ERRORS } from '../config/error-messages';

/**
 * Generates an X25519 key pair for asymmetric encryption
 * @returns Promise resolving to an object containing the public and private keys as base64 strings
 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    // Ensure sodium is ready
    await sodium.ready;
    
    // Generate key pair
    const keyPair = sodium.crypto_box_keypair();
    
    // Return key pair with keys encoded as base64
    return {
      publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
      privateKey: Buffer.from(keyPair.privateKey).toString('base64')
    };
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to generate key pair',
      error: (error as Error).message 
    });
  }
}

/**
 * Derives a shared secret using X25519 key exchange
 * @param privateKey The private key as a base64 string
 * @param publicKey The public key as a base64 string
 * @returns Promise resolving to the derived shared secret as a binary buffer
 */
export async function deriveSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array> {
  try {
    await sodium.ready;
    
    // Decode base64 keys to binary
    const privateKeyBinary = Buffer.from(privateKey, 'base64');
    const publicKeyBinary = Buffer.from(publicKey, 'base64');
    
    // Compute shared secret
    const sharedSecret = sodium.crypto_scalarmult(privateKeyBinary, publicKeyBinary);
    
    return sharedSecret;
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to derive shared secret',
      error: (error as Error).message 
    });
  }
}

/**
 * Encrypts a message using XChaCha20-Poly1305 with the recipient's public key
 * @param message The message to encrypt
 * @param senderPrivateKey The sender's private key as a base64 string
 * @param recipientPublicKey The recipient's public key as a base64 string
 * @returns Promise resolving to the encrypted message
 */
export async function encryptMessage(
  message: IMessage,
  senderPrivateKey: string,
  recipientPublicKey: string
): Promise<IMessage> {
  try {
    await sodium.ready;
    
    // Derive shared secret
    const sharedSecret = await deriveSharedSecret(senderPrivateKey, recipientPublicKey);
    
    // Generate a random nonce
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    
    // Serialize message content
    const messageContent = JSON.stringify(message.content);
    
    // Encrypt the message
    const encryptedContent = sodium.crypto_secretbox_easy(
      messageContent, 
      nonce, 
      sharedSecret
    );
    
    // Combine nonce and ciphertext
    const encryptedPayload = new Uint8Array(nonce.length + encryptedContent.length);
    encryptedPayload.set(nonce);
    encryptedPayload.set(encryptedContent, nonce.length);
    
    // Encode as base64
    const encryptedBase64 = Buffer.from(encryptedPayload).toString('base64');
    
    // Return encrypted message
    return {
      ...message,
      content: encryptedBase64,
      metadata: {
        ...message.metadata,
        encrypted: true
      }
    };
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to encrypt message',
      error: (error as Error).message 
    });
  }
}

/**
 * Decrypts a message using XChaCha20-Poly1305 with the recipient's private key
 * @param message The encrypted message
 * @param recipientPrivateKey The recipient's private key as a base64 string
 * @param senderPublicKey The sender's public key as a base64 string
 * @returns Promise resolving to the decrypted message
 */
export async function decryptMessage(
  message: IMessage,
  recipientPrivateKey: string,
  senderPublicKey: string
): Promise<IMessage> {
  try {
    await sodium.ready;
    
    // If the message is not encrypted, return it as is
    if (!message.metadata?.encrypted) {
      return message;
    }
    
    // Derive shared secret
    const sharedSecret = await deriveSharedSecret(recipientPrivateKey, senderPublicKey);
    
    // Decode the encrypted content
    const encryptedPayload = Buffer.from(message.content as string, 'base64');
    
    // Extract nonce and ciphertext
    const nonce = encryptedPayload.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = encryptedPayload.slice(sodium.crypto_secretbox_NONCEBYTES);
    
    // Decrypt the message
    const decryptedContent = sodium.crypto_secretbox_open_easy(
      ciphertext, 
      nonce, 
      sharedSecret
    );
    
    // Parse the decrypted content
    const contentObj = JSON.parse(Buffer.from(decryptedContent).toString());
    
    // Return decrypted message
    return {
      ...message,
      content: contentObj,
      metadata: {
        ...message.metadata,
        encrypted: false
      }
    };
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to decrypt message',
      error: (error as Error).message 
    });
  }
}

/**
 * Generates a symmetric encryption key for AES-GCM
 * @returns Promise resolving to the symmetric key as a base64 string
 */
export async function generateSymmetricKey(): Promise<string> {
  try {
    // Generate a random key
    const key = crypto.randomBytes(ENCRYPTION.KEY_LENGTH / 8); // Convert bits to bytes
    return key.toString('base64');
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to generate symmetric key',
      error: (error as Error).message 
    });
  }
}

/**
 * Encrypts data using AES-GCM with a symmetric key
 * @param data The data to encrypt
 * @param key The symmetric key as a base64 string
 * @returns Promise resolving to the encrypted data as a base64 string
 */
export async function encryptWithSymmetricKey(data: any, key: string): Promise<string> {
  try {
    // Decode the key from base64
    const keyBuffer = Buffer.from(key, 'base64');
    
    // Generate a random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION.ALGORITHM, keyBuffer, iv);
    
    // Serialize data if it's not a string
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Encrypt the data
    let encrypted = cipher.update(dataStr, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, ciphertext and auth tag
    const result = {
      iv: iv.toString('base64'),
      encrypted,
      authTag: authTag.toString('base64')
    };
    
    // Return as base64-encoded JSON
    return Buffer.from(JSON.stringify(result)).toString('base64');
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to encrypt with symmetric key',
      error: (error as Error).message 
    });
  }
}

/**
 * Decrypts data using AES-GCM with a symmetric key
 * @param encryptedData The encrypted data as a base64 string
 * @param key The symmetric key as a base64 string
 * @returns Promise resolving to the decrypted data
 */
export async function decryptWithSymmetricKey(encryptedData: string, key: string): Promise<any> {
  try {
    // Decode the key from base64
    const keyBuffer = Buffer.from(key, 'base64');
    
    // Parse the encrypted data
    const encryptedObj = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
    
    // Extract IV, ciphertext and auth tag
    const iv = Buffer.from(encryptedObj.iv, 'base64');
    const authTag = Buffer.from(encryptedObj.authTag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION.ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedObj.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse the result as JSON
    try {
      return JSON.parse(decrypted);
    } catch {
      // Return as string if it's not valid JSON
      return decrypted;
    }
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to decrypt with symmetric key',
      error: (error as Error).message 
    });
  }
}

/**
 * Hashes a password using PBKDF2 with a random salt
 * @param password The password to hash
 * @returns Promise resolving to an object containing the password hash and salt as base64 strings
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  return new Promise((resolve, reject) => {
    try {
      // Generate a random salt
      const salt = crypto.randomBytes(16);
      
      // Hash the password
      crypto.pbkdf2(
        password, 
        salt, 
        ENCRYPTION.ITERATIONS, 
        ENCRYPTION.KEY_LENGTH / 8, 
        'sha512', 
        (err, derivedKey) => {
          if (err) {
            reject(createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
              message: 'Failed to hash password',
              error: err.message 
            }));
            return;
          }
          
          // Resolve with hash and salt as base64
          resolve({
            hash: derivedKey.toString('base64'),
            salt: salt.toString('base64')
          });
        }
      );
    } catch (error) {
      reject(createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
        message: 'Failed to hash password',
        error: (error as Error).message 
      }));
    }
  });
}

/**
 * Verifies a password against a stored hash and salt
 * @param password The password to verify
 * @param storedHash The stored hash as a base64 string
 * @param storedSalt The stored salt as a base64 string
 * @returns Promise resolving to true if the password matches, false otherwise
 */
export async function verifyPassword(
  password: string, 
  storedHash: string, 
  storedSalt: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      // Decode the salt
      const salt = Buffer.from(storedSalt, 'base64');
      
      // Hash the provided password with the stored salt
      crypto.pbkdf2(
        password, 
        salt, 
        ENCRYPTION.ITERATIONS, 
        ENCRYPTION.KEY_LENGTH / 8, 
        'sha512', 
        (err, derivedKey) => {
          if (err) {
            reject(createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
              message: 'Failed to verify password',
              error: err.message 
            }));
            return;
          }
          
          // Compare the hashes
          const newHash = derivedKey.toString('base64');
          resolve(constantTimeCompare(newHash, storedHash));
        }
      );
    } catch (error) {
      reject(createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
        message: 'Failed to verify password',
        error: (error as Error).message 
      }));
    }
  });
}

/**
 * Generates a digital signature for data using HMAC-SHA256
 * @param data The data to sign
 * @param key The key to use for signing
 * @returns The signature as a base64 string
 */
export function generateSignature(data: any, key: string): string {
  try {
    // Serialize data if it's not a string
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Create HMAC
    const hmac = crypto.createHmac('sha256', key);
    
    // Update HMAC with the data
    hmac.update(dataStr);
    
    // Return the signature as base64
    return hmac.digest('base64');
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to generate signature',
      error: (error as Error).message 
    });
  }
}

/**
 * Verifies a digital signature for data using HMAC-SHA256
 * @param data The data that was signed
 * @param signature The signature to verify as a base64 string
 * @param key The key used for signing
 * @returns True if the signature is valid, false otherwise
 */
export function verifySignature(data: any, signature: string, key: string): boolean {
  try {
    // Generate a new signature for the data
    const newSignature = generateSignature(data, key);
    
    // Compare the signatures
    return constantTimeCompare(newSignature, signature);
  } catch (error) {
    throw createServerError(SERVER_ERRORS.ENCRYPTION_ERROR, { 
      message: 'Failed to verify signature',
      error: (error as Error).message 
    });
  }
}

/**
 * Compares two strings in constant time to prevent timing attacks
 * @param a First string
 * @param b Second string
 * @returns True if the strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}