/**
 * preferenceStore.ts
 * 
 * Implements a global state management store for user preferences using Zustand.
 * This store manages user preferences for scheduling, location, communication style,
 * and privacy settings, supporting the privacy-first, local-first architecture of
 * the AI Agent Network application.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { 
  StorageType, 
  StorageEncryptionLevel 
} from '../lib/types/storage.types';

import { 
  STORAGE_KEYS,
  MEETING_TYPES,
  LOCATION_TYPES
} from '../lib/constants';

import {
  getFromStorage,
  saveToStorage,
  updateInStorage
} from '../lib/storage/indexedDB';

import {
  encryptObject,
  decryptObject,
  generateIV
} from '../lib/utils/encryption';

// Define interfaces for preference data structures
export interface UserPreferences {
  id: string;
  userId: string;
  scheduling: SchedulingPreferences;
  location: LocationPreferences;
  communication: CommunicationPreferences;
  privacy: PrivacyPreferences;
  createdAt: number;
  updatedAt: number;
}

export interface SchedulingPreferences {
  workingHours: WorkingHours;
  meetingTypes: string[];
  bufferTime: number; // minutes before/after meetings
  advanceNotice: number; // hours of notice required
}

export interface LocationPreferences {
  preferredLocations: Location[];
  locationTypes: string[]; // from LOCATION_TYPES
  travelRadius: number; // in miles/kilometers
}

export interface CommunicationPreferences {
  communicationStyle: string; // formal, casual, etc.
  responseLength: string; // brief, detailed, balanced
  formality: string; // formal, casual, professional
}

export interface PrivacyPreferences {
  dataStorage: string; // local, cloud, etc.
  encryptionLevel: StorageEncryptionLevel;
  dataSharingConsent: Record<string, boolean>; // what data can be shared
}

export interface WorkingHours {
  monday: TimeRange[];
  tuesday: TimeRange[];
  wednesday: TimeRange[];
  thursday: TimeRange[];
  friday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
}

export interface TimeRange {
  start: string; // format: "HH:MM"
  end: string; // format: "HH:MM"
}

export interface Location {
  id: string;
  name: string;
  address: string;
  type: string; // from LOCATION_TYPES
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Create the preference store
export const usePreferenceStore = create((set, get) => {
  // Helper function to create a slice for general preferences
  const createPreferenceSlice = (set, get) => ({
    // State
    preferences: null,
    loading: false,
    error: null,
    
    // Actions
    setPreferences: (preferences) => set({ preferences }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
  });

  // Helper function to create a slice for scheduling preferences
  const createSchedulingPreferenceSlice = (set, get) => ({
    // State
    workingHours: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
    meetingTypes: [],
    bufferTime: 15, // default 15 minutes
    advanceNotice: 24, // default 24 hours
    
    // Actions
    setWorkingHours: (workingHours) => {
      set({ workingHours });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            scheduling: {
              ...preferences.scheduling,
              workingHours,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setMeetingTypes: (meetingTypes) => {
      set({ meetingTypes });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            scheduling: {
              ...preferences.scheduling,
              meetingTypes,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setBufferTime: (bufferTime) => {
      set({ bufferTime });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            scheduling: {
              ...preferences.scheduling,
              bufferTime,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setAdvanceNotice: (advanceNotice) => {
      set({ advanceNotice });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            scheduling: {
              ...preferences.scheduling,
              advanceNotice,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
  });

  // Helper function to create a slice for location preferences
  const createLocationPreferenceSlice = (set, get) => ({
    // State
    preferredLocations: [],
    locationTypes: [],
    travelRadius: 10, // default 10 miles/km
    
    // Actions
    setPreferredLocations: (preferredLocations) => {
      set({ preferredLocations });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            location: {
              ...preferences.location,
              preferredLocations,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setLocationTypes: (locationTypes) => {
      set({ locationTypes });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            location: {
              ...preferences.location,
              locationTypes,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setTravelRadius: (travelRadius) => {
      set({ travelRadius });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            location: {
              ...preferences.location,
              travelRadius,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
  });

  // Helper function to create a slice for communication preferences
  const createCommunicationPreferenceSlice = (set, get) => ({
    // State
    communicationStyle: 'balanced', // default balanced
    responseLength: 'medium', // default medium
    formality: 'casual', // default casual
    
    // Actions
    setCommunicationStyle: (communicationStyle) => {
      set({ communicationStyle });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            communication: {
              ...preferences.communication,
              communicationStyle,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setResponseLength: (responseLength) => {
      set({ responseLength });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            communication: {
              ...preferences.communication,
              responseLength,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setFormality: (formality) => {
      set({ formality });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            communication: {
              ...preferences.communication,
              formality,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
  });

  // Helper function to create a slice for privacy preferences
  const createPrivacyPreferenceSlice = (set, get) => ({
    // State
    dataStorage: 'local', // default local storage
    encryptionLevel: StorageEncryptionLevel.STANDARD, // default standard encryption
    dataSharingConsent: {}, // empty by default
    encryptionKey: null,
    
    // Actions
    setDataStorage: (dataStorage) => {
      set({ dataStorage });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            privacy: {
              ...preferences.privacy,
              dataStorage,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setEncryptionLevel: (encryptionLevel) => {
      set({ encryptionLevel });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            privacy: {
              ...preferences.privacy,
              encryptionLevel,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
    
    setDataSharingConsent: (dataSharingConsent) => {
      set({ dataSharingConsent });
      const { preferences } = get();
      if (preferences) {
        set({
          preferences: {
            ...preferences,
            privacy: {
              ...preferences.privacy,
              dataSharingConsent,
            },
            updatedAt: Date.now(),
          },
        });
      }
    },
  });

  // Function to fetch user preferences from local storage
  const fetchUserPreferences = async (userId) => {
    set({ loading: true, error: null });
    
    try {
      // Query IndexedDB for preferences with matching userId
      const preferences = await getFromStorage(
        STORAGE_KEYS.USER_PROFILE,
        userId
      );
      
      if (preferences) {
        // Decrypt sensitive data if needed
        const state = get();
        if (preferences.privacy?.encryptionLevel !== StorageEncryptionLevel.NONE && state.encryptionKey) {
          // Future implementation would decrypt encrypted fields
          // For example:
          // const iv = preferences.iv;
          // const decryptedData = decryptObject(preferences.encryptedData, state.encryptionKey, iv);
          // preferences = { ...preferences, ...decryptedData };
        }
        
        // Update state with loaded preferences
        set({ preferences });
        
        // Update individual preference sections
        set({
          workingHours: preferences.scheduling.workingHours,
          meetingTypes: preferences.scheduling.meetingTypes,
          bufferTime: preferences.scheduling.bufferTime,
          advanceNotice: preferences.scheduling.advanceNotice,
          
          preferredLocations: preferences.location.preferredLocations,
          locationTypes: preferences.location.locationTypes,
          travelRadius: preferences.location.travelRadius,
          
          communicationStyle: preferences.communication.communicationStyle,
          responseLength: preferences.communication.responseLength,
          formality: preferences.communication.formality,
          
          dataStorage: preferences.privacy.dataStorage,
          encryptionLevel: preferences.privacy.encryptionLevel,
          dataSharingConsent: preferences.privacy.dataSharingConsent,
        });
        
        return preferences;
      }
      
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error(String(error)) });
      return null;
    } finally {
      set({ loading: false });
    }
  };

  // Function to save user preferences to local storage
  const saveUserPreferences = async (userId, preferences) => {
    set({ loading: true, error: null });
    
    try {
      // Check if preferences already exist
      let existingPreferences = await getFromStorage(
        STORAGE_KEYS.USER_PROFILE,
        userId
      );
      
      let prefsToSave;
      
      if (existingPreferences) {
        // Update existing preferences
        prefsToSave = {
          ...existingPreferences,
          ...preferences,
          updatedAt: Date.now(),
        };
        
        await updateInStorage(
          STORAGE_KEYS.USER_PROFILE,
          userId,
          prefsToSave
        );
      } else {
        // Create new preferences with a unique ID
        prefsToSave = {
          id: uuidv4(),
          userId,
          ...preferences,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        await saveToStorage(
          STORAGE_KEYS.USER_PROFILE,
          prefsToSave
        );
      }
      
      // Encrypt sensitive data if needed
      const state = get();
      if (prefsToSave.privacy?.encryptionLevel !== StorageEncryptionLevel.NONE && state.encryptionKey) {
        // Future implementation would encrypt sensitive fields
        // For example:
        // const sensitiveData = { /* extract sensitive fields */ };
        // const iv = generateIV();
        // const encryptedData = encryptObject(sensitiveData, state.encryptionKey, iv);
        // prefsToSave = { ...prefsToSave, encryptedData, iv };
      }
      
      set({ preferences: prefsToSave });
      return prefsToSave;
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    } finally {
      set({ loading: false });
    }
  };

  // Function to update specific preference categories
  const updateUserPreferences = async (userId, category, updates) => {
    set({ loading: true, error: null });
    
    try {
      // Get current preferences or create new ones
      const state = get();
      let currentPrefs = state.preferences;
      
      if (!currentPrefs) {
        currentPrefs = await fetchUserPreferences(userId);
        
        if (!currentPrefs) {
          // Create default preferences if none exist
          currentPrefs = {
            id: uuidv4(),
            userId,
            scheduling: {
              workingHours: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: [],
              },
              meetingTypes: [],
              bufferTime: 15,
              advanceNotice: 24,
            },
            location: {
              preferredLocations: [],
              locationTypes: [],
              travelRadius: 10,
            },
            communication: {
              communicationStyle: 'balanced',
              responseLength: 'medium',
              formality: 'casual',
            },
            privacy: {
              dataStorage: 'local',
              encryptionLevel: StorageEncryptionLevel.STANDARD,
              dataSharingConsent: {},
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
      }
      
      // Update the specific category
      const updatedPrefs = {
        ...currentPrefs,
        [category]: {
          ...currentPrefs[category],
          ...updates,
        },
        updatedAt: Date.now(),
      };
      
      // Save to storage
      await updateInStorage(
        STORAGE_KEYS.USER_PROFILE,
        userId,
        updatedPrefs
      );
      
      // Update state
      set({ preferences: updatedPrefs });
      
      // Update specific category states
      if (category === 'scheduling') {
        set({
          workingHours: updatedPrefs.scheduling.workingHours,
          meetingTypes: updatedPrefs.scheduling.meetingTypes,
          bufferTime: updatedPrefs.scheduling.bufferTime,
          advanceNotice: updatedPrefs.scheduling.advanceNotice,
        });
      } else if (category === 'location') {
        set({
          preferredLocations: updatedPrefs.location.preferredLocations,
          locationTypes: updatedPrefs.location.locationTypes,
          travelRadius: updatedPrefs.location.travelRadius,
        });
      } else if (category === 'communication') {
        set({
          communicationStyle: updatedPrefs.communication.communicationStyle,
          responseLength: updatedPrefs.communication.responseLength,
          formality: updatedPrefs.communication.formality,
        });
      } else if (category === 'privacy') {
        set({
          dataStorage: updatedPrefs.privacy.dataStorage,
          encryptionLevel: updatedPrefs.privacy.encryptionLevel,
          dataSharingConsent: updatedPrefs.privacy.dataSharingConsent,
        });
      }
      
      return updatedPrefs;
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    } finally {
      set({ loading: false });
    }
  };

  // Function to set encryption level and key for preferences
  const setEncryptionForPreferences = async (level, encryptionKey) => {
    set({ loading: true, error: null });
    
    try {
      // Store the encryption level and key
      set({
        encryptionLevel: level,
        encryptionKey,
      });
      
      // If preferences are loaded, update their encryption
      const state = get();
      if (state.preferences) {
        // Update privacy settings with new encryption level
        await updateUserPreferences(state.preferences.userId, 'privacy', {
          encryptionLevel: level,
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    } finally {
      set({ loading: false });
    }
  };

  return {
    // Combine all slices
    ...createPreferenceSlice(set, get),
    ...createSchedulingPreferenceSlice(set, get),
    ...createLocationPreferenceSlice(set, get),
    ...createCommunicationPreferenceSlice(set, get),
    ...createPrivacyPreferenceSlice(set, get),
    
    // Async actions
    fetchUserPreferences,
    saveUserPreferences,
    updateUserPreferences,
    setEncryptionForPreferences,
  };
});