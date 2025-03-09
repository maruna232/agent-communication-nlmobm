/**
 * Encryption Utilities
 * 
 * This module provides core encryption utilities for the AI Agent Network,
 * implementing secure encryption for local data storage and agent-to-agent communication.
 * It includes functions for AES-256-GCM encryption for local data, X25519 key exchange,
 * XChaCha20-Poly1305 for WebSocket messages, and various cryptographic operations
 * to support the privacy-first architecture.
 */

import * as CryptoJS from 'crypto-js'; // ^4.1.1
import * as nacl from 'tweetnacl'; // ^1.0.3
import * as naclUtil from 'tweetnacl-util'; // ^0.15.1

import { StorageEncryptionLevel } from '../types/storage.types';
import { WebSocketEncryptedMessage, AgentMessage, KeyPair } from '../types/websocket.types';

/**
 * Constants for encryption operations
 */
export const ENCRYPTION_CONSTANTS = {
  KEY_ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  SALT_ROUNDS: 10000,
  HASH_ALGORITHM: 'SHA-256',
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,
  NONCE_LENGTH: 24,
  SIGNATURE_ALGORITHM: 'Ed25519',
  MESSAGE_ENCRYPTION_ALGORITHM: 'XChaCha20-Poly1305'
};

/**
 * Generates cryptographically secure random bytes of specified length
 * @param length Number of bytes to generate
 * @returns Random bytes as Uint8Array
 */
export function generateRandomBytes(length: number): Uint8Array {
  return nacl.randomBytes(length);
}

/**
 * Encodes binary data to Base64 string
 * @param data Binary data as Uint8Array
 * @returns Base64 encoded string
 */
export function encodeBase64(data: Uint8Array): string {
  return naclUtil.encodeBase64(data);
}

/**
 * Decodes Base64 string to binary data
 * @param data Base64 encoded string
 * @returns Decoded binary data as Uint8Array
 */
export function decodeBase64(data: string): Uint8Array {
  return naclUtil.decodeBase64(data);
}

/**
 * Encodes string to UTF-8 binary data
 * @param text String to encode
 * @returns UTF-8 encoded binary data as Uint8Array
 */
export function encodeUTF8(text: string): Uint8Array {
  return naclUtil.decodeUTF8(text);
}

/**
 * Decodes UTF-8 binary data to string
 * @param data UTF-8 encoded binary data
 * @returns Decoded UTF-8 string
 */
export function decodeUTF8(data: Uint8Array): string {
  return naclUtil.encodeUTF8(data);
}

/**
 * Creates a cryptographic hash of the provided data
 * @param data Data to hash (string or binary)
 * @param algorithm Hash algorithm to use (default: SHA-256)
 * @returns Hex-encoded hash string
 */
export function hashData(data: string | Uint8Array, algorithm: string = ENCRYPTION_CONSTANTS.HASH_ALGORITHM): string {
  const stringData = typeof data === 'string' ? data : decodeUTF8(data);
  
  if (algorithm === 'SHA-256') {
    return CryptoJS.SHA256(stringData).toString(CryptoJS.enc.Hex);
  } else if (algorithm === 'SHA-512') {
    return CryptoJS.SHA512(stringData).toString(CryptoJS.enc.Hex);
  } else if (algorithm === 'MD5') {
    return CryptoJS.MD5(stringData).toString(CryptoJS.enc.Hex);
  }
  
  // Default to SHA-256
  return CryptoJS.SHA256(stringData).toString(CryptoJS.enc.Hex);
}

/**
 * Generates a new X25519 key pair for encryption
 * @returns Object containing base64-encoded public and private keys
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.secretKey)
  };
}

/**
 * Generates a new Ed25519 key pair for message signing
 * @returns Object containing base64-encoded public and private signing keys
 */
export function generateSigningKeyPair(): KeyPair {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.secretKey)
  };
}

/**
 * Derives a shared secret using X25519 key exchange
 * @param privateKey Base64-encoded private key
 * @param publicKey Base64-encoded public key
 * @returns Base64-encoded shared secret
 */
export function deriveSharedSecret(privateKey: string, publicKey: string): string {
  const secretKey = decodeBase64(privateKey);
  const pubKey = decodeBase64(publicKey);
  const sharedSecret = nacl.box.before(pubKey, secretKey);
  return encodeBase64(sharedSecret);
}

/**
 * Encrypts a message using XChaCha20-Poly1305 with a shared secret
 * @param message Message to encrypt (string or object)
 * @param sharedSecret Base64-encoded shared secret
 * @returns Object containing Base64-encoded encrypted data and nonce
 */
export function encryptMessage(message: string | object, sharedSecret: string): { encryptedData: string, nonce: string } {
  const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
  const messageData = encodeUTF8(messageString);
  const nonce = nacl.randomBytes(ENCRYPTION_CONSTANTS.NONCE_LENGTH);
  const secretKey = decodeBase64(sharedSecret);
  
  const encryptedData = nacl.secretbox(messageData, nonce, secretKey);
  
  return {
    encryptedData: encodeBase64(encryptedData),
    nonce: encodeBase64(nonce)
  };
}

/**
 * Decrypts a message encrypted with XChaCha20-Poly1305
 * @param encryptedData Base64-encoded encrypted data
 * @param nonce Base64-encoded nonce
 * @param sharedSecret Base64-encoded shared secret
 * @returns Decrypted message (string or parsed object)
 */
export function decryptMessage(encryptedData: string, nonce: string, sharedSecret: string): any {
  const encData = decodeBase64(encryptedData);
  const nonceData = decodeBase64(nonce);
  const secretKey = decodeBase64(sharedSecret);
  
  const decrypted = nacl.secretbox.open(encData, nonceData, secretKey);
  
  if (!decrypted) {
    throw new Error('Failed to decrypt message: authentication failed');
  }
  
  const decryptedString = decodeUTF8(decrypted);
  
  // Try to parse as JSON, return as string if not valid JSON
  try {
    return JSON.parse(decryptedString);
  } catch (e) {
    return decryptedString;
  }
}

/**
 * Signs a message using Ed25519 with a private key
 * @param message Message to sign (string or object)
 * @param privateKey Base64-encoded private key
 * @returns Base64-encoded signature
 */
export function signMessage(message: string | object, privateKey: string): string {
  const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
  const messageData = encodeUTF8(messageString);
  const secretKey = decodeBase64(privateKey);
  
  const signature = nacl.sign.detached(messageData, secretKey);
  return encodeBase64(signature);
}

/**
 * Verifies a message signature using Ed25519
 * @param message Message that was signed (string or object)
 * @param signature Base64-encoded signature
 * @param publicKey Base64-encoded public key
 * @returns True if signature is valid, false otherwise
 */
export function verifySignature(message: string | object, signature: string, publicKey: string): boolean {
  const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
  const messageData = encodeUTF8(messageString);
  const signatureData = decodeBase64(signature);
  const pubKey = decodeBase64(publicKey);
  
  return nacl.sign.detached.verify(messageData, signatureData, pubKey);
}

/**
 * Derives an encryption key from a password using PBKDF2
 * @param password Password to derive key from
 * @param salt Salt for key derivation (hex string)
 * @param iterations Number of iterations for PBKDF2 (default: SALT_ROUNDS)
 * @param keySize Size of the derived key in bytes (default: KEY_LENGTH/8)
 * @returns Derived key as hex string
 */
export function deriveKeyFromPassword(
  password: string,
  salt: string,
  iterations: number = ENCRYPTION_CONSTANTS.SALT_ROUNDS,
  keySize: number = ENCRYPTION_CONSTANTS.KEY_LENGTH / 8
): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: keySize / 4, // keySize in 32-bit words (bytes / 4)
    iterations: iterations,
    hasher: CryptoJS.algo.SHA256
  }).toString(CryptoJS.enc.Hex);
}

/**
 * Generates a random salt for key derivation
 * @param length Length of salt in bytes (default: 16)
 * @returns Random salt as hex string
 */
export function generateSalt(length: number = 16): string {
  return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
}

/**
 * Encrypts data using AES-GCM with the provided key
 * @param data Data to encrypt
 * @param key Encryption key (hex string)
 * @param iv Initialization vector (hex string)
 * @returns Encrypted data as Base64 string
 */
export function encryptWithAES(data: string, key: string, iv: string): string {
  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const ivWordArray = CryptoJS.enc.Hex.parse(iv);
  
  const encrypted = CryptoJS.AES.encrypt(data, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.GCM,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return encrypted.toString();
}

/**
 * Decrypts AES-GCM encrypted data with the provided key
 * @param encryptedData Encrypted data as Base64 string
 * @param key Encryption key (hex string)
 * @param iv Initialization vector (hex string)
 * @returns Decrypted data as string
 */
export function decryptWithAES(encryptedData: string, key: string, iv: string): string {
  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const ivWordArray = CryptoJS.enc.Hex.parse(iv);
  
  const decrypted = CryptoJS.AES.decrypt(encryptedData, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.GCM,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Generates a random initialization vector (IV) for AES encryption
 * @returns Random IV as hex string
 */
export function generateIV(): string {
  return CryptoJS.lib.WordArray.random(ENCRYPTION_CONSTANTS.IV_LENGTH).toString(CryptoJS.enc.Hex);
}

/**
 * Encrypts data using a password with PBKDF2 key derivation and AES-GCM
 * @param data Data to encrypt
 * @param password Password for encryption
 * @returns Encrypted data with salt and IV as JSON string
 */
export function encryptWithPassword(data: string, password: string): string {
  const salt = generateSalt();
  const key = deriveKeyFromPassword(password, salt);
  const iv = generateIV();
  
  const encryptedData = encryptWithAES(data, key, iv);
  
  const result = {
    encryptedData,
    salt,
    iv
  };
  
  return JSON.stringify(result);
}

/**
 * Decrypts data that was encrypted with a password
 * @param encryptedData Encrypted data JSON string
 * @param password Password for decryption
 * @returns Decrypted data as string
 */
export function decryptWithPassword(encryptedData: string, password: string): string {
  const parsedData = JSON.parse(encryptedData);
  const { encryptedData: encrypted, salt, iv } = parsedData;
  
  const key = deriveKeyFromPassword(password, salt);
  
  return decryptWithAES(encrypted, key, iv);
}

/**
 * Encrypts a JavaScript object using AES-GCM
 * @param obj Object to encrypt
 * @param key Encryption key (hex string)
 * @param iv Initialization vector (hex string)
 * @returns Encrypted object as string
 */
export function encryptObject(obj: object, key: string, iv: string): string {
  const jsonString = JSON.stringify(obj);
  return encryptWithAES(jsonString, key, iv);
}

/**
 * Decrypts an encrypted object and parses it back to an object
 * @param encryptedData Encrypted data string
 * @param key Encryption key (hex string)
 * @param iv Initialization vector (hex string)
 * @returns Decrypted and parsed object
 */
export function decryptObject(encryptedData: string, key: string, iv: string): any {
  const decryptedString = decryptWithAES(encryptedData, key, iv);
  return JSON.parse(decryptedString);
}

/**
 * Validates if the provided encryption level meets the minimum required level
 * @param currentLevel Current encryption level
 * @param requiredLevel Minimum required encryption level
 * @returns True if current level meets or exceeds required level
 */
export function validateEncryptionLevel(
  currentLevel: StorageEncryptionLevel,
  requiredLevel: StorageEncryptionLevel
): boolean {
  const levels = {
    [StorageEncryptionLevel.NONE]: 0,
    [StorageEncryptionLevel.STANDARD]: 1,
    [StorageEncryptionLevel.HIGH]: 2
  };
  
  const currentValue = levels[currentLevel];
  const requiredValue = levels[requiredLevel];
  
  return currentValue >= requiredValue;
}