import * as encryptionUtils from '../../../lib/utils/encryption';
import { StorageEncryptionLevel } from '../../../lib/types/storage.types';
import { KeyPair } from '../../../lib/types/websocket.types';
import * as CryptoJS from 'crypto-js'; // ^4.1.1
import * as nacl from 'tweetnacl'; // ^1.0.3
import * as naclUtil from 'tweetnacl-util'; // ^0.15.1

// Test data for reuse across tests
const testData = {
  text: 'This is a test message for encryption',
  object: {
    id: 'test-123',
    name: 'Test Object',
    properties: {
      secure: true,
      priority: 'high'
    }
  },
  password: 'StrongTestPassword123!',
  salt: 'abcdef1234567890',
  iv: '0123456789abcdef'
};

describe('Basic Encoding and Decoding', () => {
  test('should correctly encode and decode Base64', () => {
    const originalData = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = encryptionUtils.encodeBase64(originalData);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe('string');
    
    const decoded = encryptionUtils.decodeBase64(encoded);
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect(decoded.length).toBe(originalData.length);
    expect(Array.from(decoded)).toEqual(Array.from(originalData));
  });

  test('should correctly encode and decode UTF-8', () => {
    const originalText = testData.text;
    const encoded = encryptionUtils.encodeUTF8(originalText);
    expect(encoded).toBeInstanceOf(Uint8Array);
    
    const decoded = encryptionUtils.decodeUTF8(encoded);
    expect(decoded).toBe(originalText);
  });

  test('should generate random bytes of specified length', () => {
    const length = 16;
    const randomBytes1 = encryptionUtils.generateRandomBytes(length);
    expect(randomBytes1).toBeInstanceOf(Uint8Array);
    expect(randomBytes1.length).toBe(length);
    
    const randomBytes2 = encryptionUtils.generateRandomBytes(length);
    // Check that two calls produce different random bytes (extremely unlikely to be the same)
    expect(Buffer.from(randomBytes1).toString('hex')).not.toBe(Buffer.from(randomBytes2).toString('hex'));
  });
});

describe('Cryptographic Hashing', () => {
  test('should correctly hash data with SHA-256', () => {
    const hash = encryptionUtils.hashData(testData.text);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
    
    // Verify that the hash is deterministic
    const hash2 = encryptionUtils.hashData(testData.text);
    expect(hash).toBe(hash2);
    
    // Verify that different data produces different hashes
    const differentHash = encryptionUtils.hashData('Different message');
    expect(hash).not.toBe(differentHash);
  });
});

describe('Key Pair Generation and Management', () => {
  test('should generate valid X25519 key pairs', () => {
    const keyPair = encryptionUtils.generateKeyPair();
    expect(keyPair).toHaveProperty('publicKey');
    expect(keyPair).toHaveProperty('privateKey');
    expect(typeof keyPair.publicKey).toBe('string');
    expect(typeof keyPair.privateKey).toBe('string');
    
    // Generate another key pair and verify it's different (extremely unlikely to be the same)
    const keyPair2 = encryptionUtils.generateKeyPair();
    expect(keyPair.publicKey).not.toBe(keyPair2.publicKey);
    expect(keyPair.privateKey).not.toBe(keyPair2.privateKey);
  });

  test('should generate valid Ed25519 signing key pairs', () => {
    const keyPair = encryptionUtils.generateSigningKeyPair();
    expect(keyPair).toHaveProperty('publicKey');
    expect(keyPair).toHaveProperty('privateKey');
    expect(typeof keyPair.publicKey).toBe('string');
    expect(typeof keyPair.privateKey).toBe('string');
    
    // Generate another key pair and verify it's different
    const keyPair2 = encryptionUtils.generateSigningKeyPair();
    expect(keyPair.publicKey).not.toBe(keyPair2.publicKey);
    expect(keyPair.privateKey).not.toBe(keyPair2.privateKey);
  });

  test('should derive the same shared secret from two key pairs', () => {
    const keyPair1 = encryptionUtils.generateKeyPair();
    const keyPair2 = encryptionUtils.generateKeyPair();
    
    const sharedSecret1 = encryptionUtils.deriveSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
    const sharedSecret2 = encryptionUtils.deriveSharedSecret(keyPair2.privateKey, keyPair1.publicKey);
    
    // Verify that the shared secrets are the same (key agreement property)
    expect(sharedSecret1).toBe(sharedSecret2);
    expect(typeof sharedSecret1).toBe('string');
    expect(sharedSecret1.length).toBeGreaterThan(0);
  });
});

describe('Message Encryption and Decryption', () => {
  test('should encrypt and decrypt string messages correctly', () => {
    const keyPair1 = encryptionUtils.generateKeyPair();
    const keyPair2 = encryptionUtils.generateKeyPair();
    const sharedSecret = encryptionUtils.deriveSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
    
    const encrypted = encryptionUtils.encryptMessage(testData.text, sharedSecret);
    expect(encrypted).toHaveProperty('encryptedData');
    expect(encrypted).toHaveProperty('nonce');
    
    const decrypted = encryptionUtils.decryptMessage(encrypted.encryptedData, encrypted.nonce, sharedSecret);
    expect(decrypted).toBe(testData.text);
  });

  test('should encrypt and decrypt object messages correctly', () => {
    const keyPair1 = encryptionUtils.generateKeyPair();
    const keyPair2 = encryptionUtils.generateKeyPair();
    const sharedSecret = encryptionUtils.deriveSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
    
    const encrypted = encryptionUtils.encryptMessage(testData.object, sharedSecret);
    expect(encrypted).toHaveProperty('encryptedData');
    expect(encrypted).toHaveProperty('nonce');
    
    const decrypted = encryptionUtils.decryptMessage(encrypted.encryptedData, encrypted.nonce, sharedSecret);
    expect(decrypted).toEqual(testData.object);
  });

  test('should sign messages and verify signatures correctly', () => {
    const keyPair = encryptionUtils.generateSigningKeyPair();
    const signature = encryptionUtils.signMessage(testData.text, keyPair.privateKey);
    
    // Verify with correct public key and message
    const isValid = encryptionUtils.verifySignature(testData.text, signature, keyPair.publicKey);
    expect(isValid).toBe(true);
    
    // Verify with modified message should fail
    const isInvalidMessage = encryptionUtils.verifySignature('Modified message', signature, keyPair.publicKey);
    expect(isInvalidMessage).toBe(false);
    
    // Verify with different public key should fail
    const differentKeyPair = encryptionUtils.generateSigningKeyPair();
    const isInvalidKey = encryptionUtils.verifySignature(testData.text, signature, differentKeyPair.publicKey);
    expect(isInvalidKey).toBe(false);
  });
});

describe('Password-based Encryption', () => {
  test('should derive consistent keys from passwords', () => {
    const key1 = encryptionUtils.deriveKeyFromPassword(testData.password, testData.salt);
    const key2 = encryptionUtils.deriveKeyFromPassword(testData.password, testData.salt);
    
    expect(key1).toBe(key2); // Same password and salt should yield the same key
    
    const differentKey1 = encryptionUtils.deriveKeyFromPassword('DifferentPassword', testData.salt);
    expect(key1).not.toBe(differentKey1); // Different password should yield different key
    
    const differentKey2 = encryptionUtils.deriveKeyFromPassword(testData.password, 'differentsalt');
    expect(key1).not.toBe(differentKey2); // Different salt should yield different key
  });

  test('should generate random salt of specified length', () => {
    const salt = encryptionUtils.generateSalt();
    expect(salt).toBeTruthy();
    expect(typeof salt).toBe('string');
    
    // Default length is 16 bytes = 32 hex characters
    expect(salt.length).toBe(32); 
    
    const anotherSalt = encryptionUtils.generateSalt();
    expect(salt).not.toBe(anotherSalt); // Should generate different salts
  });

  test('should encrypt and decrypt data with password correctly', () => {
    const encrypted = encryptionUtils.encryptWithPassword(testData.text, testData.password);
    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
    
    const decrypted = encryptionUtils.decryptWithPassword(encrypted, testData.password);
    expect(decrypted).toBe(testData.text);
    
    // Should fail with wrong password
    expect(() => {
      encryptionUtils.decryptWithPassword(encrypted, 'WrongPassword');
    }).toThrow();
  });
});

describe('AES Encryption', () => {
  test('should encrypt and decrypt data with AES correctly', () => {
    const key = encryptionUtils.deriveKeyFromPassword(testData.password, testData.salt);
    
    const encrypted = encryptionUtils.encryptWithAES(testData.text, key, testData.iv);
    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
    
    const decrypted = encryptionUtils.decryptWithAES(encrypted, key, testData.iv);
    expect(decrypted).toBe(testData.text);
  });

  test('should generate random initialization vectors', () => {
    const iv = encryptionUtils.generateIV();
    expect(iv).toBeTruthy();
    expect(typeof iv).toBe('string');
    
    // IV length should match the ENCRYPTION_CONSTANTS.IV_LENGTH * 2 (hex encoding)
    expect(iv.length).toBe(encryptionUtils.ENCRYPTION_CONSTANTS.IV_LENGTH * 2);
    
    const anotherIv = encryptionUtils.generateIV();
    expect(iv).not.toBe(anotherIv); // Should generate different IVs
  });

  test('should encrypt and decrypt objects correctly', () => {
    const key = encryptionUtils.deriveKeyFromPassword(testData.password, testData.salt);
    
    const encrypted = encryptionUtils.encryptObject(testData.object, key, testData.iv);
    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
    
    const decrypted = encryptionUtils.decryptObject(encrypted, key, testData.iv);
    expect(decrypted).toEqual(testData.object);
  });
});

describe('Encryption Level Validation', () => {
  test('should correctly validate encryption levels', () => {
    // NONE meets NONE
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.NONE, 
      StorageEncryptionLevel.NONE
    )).toBe(true);
    
    // STANDARD meets NONE
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.STANDARD, 
      StorageEncryptionLevel.NONE
    )).toBe(true);
    
    // HIGH meets NONE
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.HIGH, 
      StorageEncryptionLevel.NONE
    )).toBe(true);
    
    // STANDARD meets STANDARD
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.STANDARD, 
      StorageEncryptionLevel.STANDARD
    )).toBe(true);
    
    // HIGH meets STANDARD
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.HIGH, 
      StorageEncryptionLevel.STANDARD
    )).toBe(true);
    
    // NONE does not meet STANDARD
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.NONE, 
      StorageEncryptionLevel.STANDARD
    )).toBe(false);
    
    // HIGH meets HIGH
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.HIGH, 
      StorageEncryptionLevel.HIGH
    )).toBe(true);
    
    // NONE does not meet HIGH
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.NONE, 
      StorageEncryptionLevel.HIGH
    )).toBe(false);
    
    // STANDARD does not meet HIGH
    expect(encryptionUtils.validateEncryptionLevel(
      StorageEncryptionLevel.STANDARD, 
      StorageEncryptionLevel.HIGH
    )).toBe(false);
  });
});

describe('Error Handling', () => {
  test('should throw error when decrypting invalid data', () => {
    const keyPair1 = encryptionUtils.generateKeyPair();
    const keyPair2 = encryptionUtils.generateKeyPair();
    const sharedSecret = encryptionUtils.deriveSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
    
    // Create invalid encrypted data
    const invalidEncryptedData = 'not-valid-encrypted-data';
    const nonce = encryptionUtils.encodeBase64(encryptionUtils.generateRandomBytes(encryptionUtils.ENCRYPTION_CONSTANTS.NONCE_LENGTH));
    
    expect(() => {
      encryptionUtils.decryptMessage(invalidEncryptedData, nonce, sharedSecret);
    }).toThrow();
  });

  test('should throw error when decrypting with wrong key', () => {
    const keyPair1 = encryptionUtils.generateKeyPair();
    const keyPair2 = encryptionUtils.generateKeyPair();
    const keyPair3 = encryptionUtils.generateKeyPair(); // Different key pair
    
    const sharedSecret1 = encryptionUtils.deriveSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
    const sharedSecret2 = encryptionUtils.deriveSharedSecret(keyPair1.privateKey, keyPair3.publicKey); // Different shared secret
    
    const encrypted = encryptionUtils.encryptMessage(testData.text, sharedSecret1);
    
    expect(() => {
      encryptionUtils.decryptMessage(encrypted.encryptedData, encrypted.nonce, sharedSecret2);
    }).toThrow();
  });

  test('should return false when verifying with invalid signature', () => {
    const keyPair = encryptionUtils.generateSigningKeyPair();
    
    // Create an invalid signature
    const invalidSignature = encryptionUtils.encodeBase64(encryptionUtils.generateRandomBytes(64)); // Ed25519 signatures are 64 bytes
    
    const isValid = encryptionUtils.verifySignature(testData.text, invalidSignature, keyPair.publicKey);
    expect(isValid).toBe(false);
    
    // Sign a message
    const signature = encryptionUtils.signMessage(testData.text, keyPair.privateKey);
    
    // Verify with modified message
    const isValidModifiedMessage = encryptionUtils.verifySignature('Modified text', signature, keyPair.publicKey);
    expect(isValidModifiedMessage).toBe(false);
  });
});