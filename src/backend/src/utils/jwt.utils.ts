import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { config } from '../config/config';
import { JWT_CONFIG } from '../config/constants';
import { ITokenPayload } from '../interfaces/auth.interface';
import { createAuthError } from '../utils/error.utils';
import { logger } from '../utils/logging.utils';

/**
 * Generates a JWT token with the provided payload
 * 
 * @param payload - Data to include in the token
 * @returns Signed JWT token
 */
export function generateToken(payload: object): string {
  try {
    const { jwtSecret, jwtAlgorithm } = config.auth;
    
    // Add timestamps if not present
    const tokenPayload = {
      ...payload,
      iat: payload.hasOwnProperty('iat') ? payload['iat'] : Math.floor(Date.now() / 1000),
      exp: payload.hasOwnProperty('exp') ? payload['exp'] : Math.floor(Date.now() / 1000) + JWT_CONFIG.EXPIRY
    };
    
    // Sign the token
    const token = jwt.sign(tokenPayload, jwtSecret, { algorithm: jwtAlgorithm as jwt.Algorithm });
    
    logger.debug('JWT token generated successfully');
    return token;
  } catch (error) {
    logger.error('Failed to generate JWT token', { error });
    throw createAuthError('auth_error.token_invalid');
  }
}

/**
 * Verifies a JWT token and returns the decoded payload
 * 
 * @param token - JWT token to verify
 * @returns Promise resolving to the decoded token payload
 * @throws Auth error if token is invalid
 */
export async function verifyToken(token: string): Promise<ITokenPayload> {
  try {
    const { jwtSecret, jwtAlgorithm } = config.auth;
    
    // Verify the token
    const decoded = jwt.verify(token, jwtSecret, { algorithms: [jwtAlgorithm as jwt.Algorithm] }) as ITokenPayload;
    
    logger.debug('JWT token verified successfully');
    return decoded;
  } catch (error) {
    logger.error('JWT token verification failed', { error });
    
    if (error.name === 'TokenExpiredError') {
      throw createAuthError('auth_error.token_expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw createAuthError('auth_error.token_invalid');
    } else {
      throw createAuthError('auth_error.unauthorized');
    }
  }
}

/**
 * Generates a refresh token with extended expiry time
 * 
 * @param payload - Data to include in the refresh token
 * @returns Signed refresh token
 */
export function generateRefreshToken(payload: object): string {
  try {
    const { jwtSecret, jwtAlgorithm } = config.auth;
    
    // Add timestamps with longer expiry
    const tokenPayload = {
      ...payload,
      iat: payload.hasOwnProperty('iat') ? payload['iat'] : Math.floor(Date.now() / 1000),
      exp: payload.hasOwnProperty('exp') ? payload['exp'] : Math.floor(Date.now() / 1000) + JWT_CONFIG.REFRESH_EXPIRY
    };
    
    // Sign the token
    const refreshToken = jwt.sign(tokenPayload, jwtSecret, { algorithm: jwtAlgorithm as jwt.Algorithm });
    
    logger.debug('Refresh token generated successfully');
    return refreshToken;
  } catch (error) {
    logger.error('Failed to generate refresh token', { error });
    throw createAuthError('auth_error.token_invalid');
  }
}

/**
 * Verifies a refresh token and returns the decoded payload
 * 
 * @param refreshToken - Refresh token to verify
 * @returns Promise resolving to the decoded token payload
 * @throws Auth error if token is invalid
 */
export async function verifyRefreshToken(refreshToken: string): Promise<ITokenPayload> {
  try {
    const { jwtSecret, jwtAlgorithm } = config.auth;
    
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, jwtSecret, { algorithms: [jwtAlgorithm as jwt.Algorithm] }) as ITokenPayload;
    
    logger.debug('Refresh token verified successfully');
    return decoded;
  } catch (error) {
    logger.error('Refresh token verification failed', { error });
    
    if (error.name === 'TokenExpiredError') {
      throw createAuthError('auth_error.token_expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw createAuthError('auth_error.token_invalid');
    } else {
      throw createAuthError('auth_error.unauthorized');
    }
  }
}

/**
 * Extracts JWT token from the Authorization header
 * 
 * @param req - Express request object
 * @returns Extracted token or null if not found
 */
export function extractTokenFromHeader(req: Request): string | null {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }
    
    // Check for Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    return token;
  } catch (error) {
    logger.error('Failed to extract token from header', { error });
    return null;
  }
}

/**
 * Checks if a token is expired based on its payload
 * 
 * @param payload - Token payload containing expiration
 * @returns True if token is expired, false otherwise
 */
export function isTokenExpired(payload: ITokenPayload): boolean {
  if (!payload || !payload.exp) {
    return true;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime >= payload.exp;
}

/**
 * Decodes a JWT token without verification
 * Useful for reading token data without validating signatures
 * 
 * @param token - JWT token to decode
 * @returns Decoded token payload or null if invalid
 */
export function decodeToken(token: string): ITokenPayload | null {
  try {
    // Decode without verification
    const decoded = jwt.decode(token) as ITokenPayload;
    return decoded;
  } catch (error) {
    logger.error('Failed to decode token', { error });
    return null;
  }
}

/**
 * Gets the expiration time of a token in seconds
 * 
 * @param token - JWT token
 * @returns Token expiration timestamp in seconds or null if invalid
 */
export function getTokenExpiration(token: string): number | null {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.exp) {
    return null;
  }
  
  return decoded.exp;
}

/**
 * Gets the remaining time of a token in seconds
 * 
 * @param token - JWT token
 * @returns Remaining time in seconds or null if invalid/expired
 */
export function getTokenRemainingTime(token: string): number | null {
  const expiration = getTokenExpiration(token);
  
  if (!expiration) {
    return null;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  const remainingTime = expiration - currentTime;
  
  // If token is already expired, return 0
  return remainingTime > 0 ? remainingTime : 0;
}