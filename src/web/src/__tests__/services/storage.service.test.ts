import '@testing-library/jest-dom';
import { StorageService } from '../../services/storage.service';
import { EncryptionService } from '../../services/encryption.service';
import { 
  IndexedDBStorage, 
  checkIndexedDBSupport 
} from '../../lib/storage/indexedDB';
import {
  SQLiteStorage,
  checkSQLiteSupport
} from '../../lib/storage/sqliteStorage';
import {
  LocalStorageAdapter,
  isLocalStorageAvailable
} from '../../lib/storage/localStorage';
import {
  StorageType,
  StorageEncryptionLevel,
  IStorageSchema,
  IStorageOptions,
  IStorageQuery
} from '../../lib/types/storage.types';
import 'fake-indexeddb';

// Mock data for testing
const mockSchema: IStorageSchema = {
  name: 'test_db',
  version: 1,
  stores: [
    {
      name: 'users',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        {
          name: 'email',
          keyPath: 'email',
          unique: true,
          multiEntry: false
        }
      ]
    },
    {
      name: 'messages',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        {
          name: 'conversationId',
          keyPath: 'conversationId',
          unique: false,
          multiEntry: false
        }
      ]
    }
  ]
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User'
};

const mockMessage = {
  id: 'msg-123',
  conversationId: 'conv-123',
  content: 'Test message',
  timestamp: 1622548800000
};

// Helper function to create a mock EncryptionService
function createMockEncryptionService(initialized: boolean) {
  return {
    initialize: jest.fn().mockResolvedValue(true),
    isInitialized: jest.fn().mockReturnValue(initialized),
    getEncryptionLevel: jest.fn().mockReturnValue(StorageEncryptionLevel.STANDARD),
    encryptObject: jest.fn().mockReturnValue('encrypted-data'),
    decryptObject: jest.fn().mockImplementation((data) => {
      // Return the original object, simulating decryption
      return typeof data === 'object' ? data : { id: 'decrypted-id' };
    })
  };
}

// Helper function to create a mock IndexedDBStorage
function createMockIndexedDBStorage(initialized: boolean) {
  return {
    initialize: jest.fn().mockResolvedValue(true),
    isInitialized: jest.fn().mockReturnValue(initialized),
    create: jest.fn().mockImplementation((storeName, item) => Promise.resolve(item)),
    read: jest.fn().mockImplementation((storeName, key) => Promise.resolve({ id: key, ...mockUser })),
    update: jest.fn().mockImplementation((storeName, key, item) => Promise.resolve(item)),
    delete: jest.fn().mockResolvedValue(true),
    query: jest.fn().mockResolvedValue([mockUser, { ...mockUser, id: 'user-456' }]),
    transaction: jest.fn().mockResolvedValue([mockUser, true]),
    backup: jest.fn().mockResolvedValue({
      id: 'backup-id',
      userId: 'user-id',
      timestamp: Date.now(),
      schemaVersion: 1,
      data: {
        users: [mockUser],
        messages: [mockMessage]
      }
    }),
    restore: jest.fn().mockResolvedValue(true),
    getMetrics: jest.fn().mockResolvedValue({
      totalSize: 1024,
      storeMetrics: {
        users: { count: 1, size: 512, avgItemSize: 512 },
        messages: { count: 1, size: 512, avgItemSize: 512 }
      },
      lastUpdated: Date.now()
    }),
    clearAll: jest.fn().mockResolvedValue(true)
  };
}

// Mock the storage detection functions
jest.mock('../../lib/storage/indexedDB', () => ({
  IndexedDBStorage: jest.fn().mockImplementation(() => createMockIndexedDBStorage(true)),
  checkIndexedDBSupport: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../lib/storage/sqliteStorage', () => ({
  SQLiteStorage: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true)
  })),
  checkSQLiteSupport: jest.fn().mockResolvedValue(false)
}));

jest.mock('../../lib/storage/localStorage', () => ({
  LocalStorageAdapter: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true)
  })),
  isLocalStorageAvailable: jest.fn().mockReturnValue(true)
}));

describe('StorageService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should initialize with default options', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    const result = await storageService.initialize();
    
    expect(result).toBe(true);
    expect(storageService.isInitialized()).toBe(true);
    expect(storageService.getStorageType()).toBe(StorageType.INDEXED_DB);
    expect(storageService.getEncryptionLevel()).toBe(StorageEncryptionLevel.STANDARD);
  });
  
  it('should initialize with custom options', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    const options: IStorageOptions = {
      storageType: StorageType.LOCAL_STORAGE,
      encryptionLevel: StorageEncryptionLevel.HIGH,
      version: 2
    };
    
    const result = await storageService.initialize(options);
    
    expect(result).toBe(true);
    expect(storageService.isInitialized()).toBe(true);
    expect(storageService.getStorageType()).toBe(StorageType.LOCAL_STORAGE);
    expect(storageService.getEncryptionLevel()).toBe(StorageEncryptionLevel.HIGH);
  });
  
  it('should detect best storage method when not specified', async () => {
    // Mock IndexedDB as not supported and SQLite as supported
    (checkIndexedDBSupport as jest.Mock).mockResolvedValueOnce(false);
    (checkSQLiteSupport as jest.Mock).mockResolvedValueOnce(true);
    
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    const options: IStorageOptions = {
      encryptionLevel: StorageEncryptionLevel.STANDARD,
      version: 1
    } as IStorageOptions;
    
    await storageService.initialize(options);
    
    expect(storageService.getStorageType()).toBe(StorageType.SQLITE);
  });
  
  it('should create an item in storage', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const result = await storageService.create('users', mockUser);
    
    expect(result).toEqual(mockUser);
    expect(mockAdapter.create).toHaveBeenCalledWith('users', mockUser);
  });
  
  it('should read an item from storage', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const result = await storageService.read('users', 'user-123');
    
    expect(result).toEqual(expect.objectContaining({ id: 'user-123' }));
    expect(mockAdapter.read).toHaveBeenCalledWith('users', 'user-123');
  });
  
  it('should update an item in storage', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const updatedUser = { ...mockUser, name: 'Updated Name' };
    const result = await storageService.update('users', 'user-123', updatedUser);
    
    expect(result).toEqual(updatedUser);
    expect(mockAdapter.update).toHaveBeenCalledWith('users', 'user-123', updatedUser);
  });
  
  it('should delete an item from storage', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const result = await storageService.delete('users', 'user-123');
    
    expect(result).toBe(true);
    expect(mockAdapter.delete).toHaveBeenCalledWith('users', 'user-123');
  });
  
  it('should query items from storage', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const query: IStorageQuery = {
      storeName: 'users',
      indexName: 'email',
      range: { lower: 'a', upper: 'z' }
    };
    
    const result = await storageService.query(query);
    
    expect(result).toEqual([mockUser, { ...mockUser, id: 'user-456' }]);
    expect(mockAdapter.query).toHaveBeenCalledWith(query);
  });
  
  it('should perform transactions', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const operations = [
      { type: 'create', storeName: 'users', value: mockUser },
      { type: 'delete', storeName: 'users', key: 'user-456' }
    ];
    
    const result = await storageService.transaction(operations);
    
    expect(result).toEqual([mockUser, true]);
    expect(mockAdapter.transaction).toHaveBeenCalledWith(operations);
  });
  
  it('should create backup of data', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const result = await storageService.backup('user-id');
    
    expect(result).toEqual({
      id: expect.any(String),
      userId: 'user-id',
      timestamp: expect.any(Number),
      schemaVersion: expect.any(Number),
      data: {
        users: [mockUser],
        messages: [mockMessage]
      }
    });
    expect(mockAdapter.backup).toHaveBeenCalledWith('user-id');
  });
  
  it('should restore data from backup', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const mockBackup = {
      id: 'backup-id',
      userId: 'user-id',
      timestamp: Date.now(),
      schemaVersion: 1,
      data: {
        users: [mockUser],
        messages: [mockMessage]
      }
    };
    
    const result = await storageService.restore(mockBackup);
    
    expect(result).toBe(true);
    expect(mockAdapter.restore).toHaveBeenCalledWith(mockBackup);
  });
  
  it('should get storage metrics', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const result = await storageService.getMetrics();
    
    expect(result).toEqual({
      totalSize: expect.any(Number),
      storeMetrics: expect.objectContaining({
        users: expect.objectContaining({
          count: expect.any(Number),
          size: expect.any(Number),
          avgItemSize: expect.any(Number)
        }),
        messages: expect.objectContaining({
          count: expect.any(Number),
          size: expect.any(Number),
          avgItemSize: expect.any(Number)
        })
      }),
      lastUpdated: expect.any(Number)
    });
    expect(mockAdapter.getMetrics).toHaveBeenCalled();
  });
  
  it('should clear all data', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const mockAdapter = (storageService as any).storageAdapter;
    const result = await storageService.clearAll();
    
    expect(result).toBe(true);
    expect(mockAdapter.clearAll).toHaveBeenCalled();
  });
  
  it('should change storage type', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize({
      storageType: StorageType.INDEXED_DB,
      encryptionLevel: StorageEncryptionLevel.STANDARD,
      version: 1
    }, mockSchema);
    
    // Create mock backup and restore methods
    const backupSpy = jest.spyOn(storageService, 'backup').mockResolvedValue({
      id: 'backup-id',
      userId: 'migration-user',
      timestamp: Date.now(),
      schemaVersion: 1,
      data: {}
    });
    
    const restoreSpy = jest.spyOn(storageService, 'restore').mockResolvedValue(true);
    
    const result = await storageService.changeStorageType(StorageType.LOCAL_STORAGE);
    
    expect(result).toBe(true);
    expect(storageService.getStorageType()).toBe(StorageType.LOCAL_STORAGE);
    expect(backupSpy).toHaveBeenCalled();
    expect(restoreSpy).toHaveBeenCalled();
  });
  
  it('should export data as JSON', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const backupSpy = jest.spyOn(storageService, 'backup').mockResolvedValue({
      id: 'backup-id',
      userId: 'user-id',
      timestamp: Date.now(),
      schemaVersion: 1,
      data: {
        users: [mockUser],
        messages: [mockMessage]
      }
    });
    
    const result = await storageService.exportData('user-id');
    
    expect(typeof result).toBe('string');
    expect(() => JSON.parse(result)).not.toThrow();
    expect(backupSpy).toHaveBeenCalledWith('user-id');
  });
  
  it('should import data from JSON', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize(undefined, mockSchema);
    
    const restoreSpy = jest.spyOn(storageService, 'restore').mockResolvedValue(true);
    
    const mockJsonData = JSON.stringify({
      id: 'backup-id',
      userId: 'user-id',
      timestamp: Date.now(),
      schemaVersion: 1,
      data: {
        users: [mockUser],
        messages: [mockMessage]
      }
    });
    
    const result = await storageService.importData(mockJsonData);
    
    expect(result).toBe(true);
    expect(restoreSpy).toHaveBeenCalled();
  });
  
  it('should throw error when not initialized', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    // Don't initialize the service
    
    await expect(storageService.create('users', mockUser)).rejects.toThrow('Storage service not initialized');
    await expect(storageService.read('users', 'user-123')).rejects.toThrow('Storage service not initialized');
    await expect(storageService.update('users', 'user-123', mockUser)).rejects.toThrow('Storage service not initialized');
    await expect(storageService.delete('users', 'user-123')).rejects.toThrow('Storage service not initialized');
  });
  
  it('should handle encryption integration', async () => {
    const mockEncryptionService = createMockEncryptionService(true);
    const storageService = new StorageService(mockEncryptionService as unknown as EncryptionService);
    
    await storageService.initialize({
      storageType: StorageType.INDEXED_DB,
      encryptionLevel: StorageEncryptionLevel.STANDARD,
      version: 1
    }, mockSchema);
    
    // Create an item
    await storageService.create('users', mockUser);
    
    // Verify that encryption service was used
    expect(mockEncryptionService.encryptObject).toHaveBeenCalled();
    
    // Read an item
    await storageService.read('users', 'user-123');
    
    // Verify that decryption service was used
    expect(mockEncryptionService.decryptObject).toHaveBeenCalled();
  });
});