import Joi from 'joi';
import { VALIDATION_ERRORS } from '../config/error-messages';

/**
 * Reusable email validation schema with custom error messages
 */
const emailSchema = Joi.string()
  .email()
  .required()
  .messages({
    'string.email': VALIDATION_ERRORS.INVALID_EMAIL,
    'any.required': VALIDATION_ERRORS.REQUIRED_FIELD,
  });

/**
 * Reusable password validation schema with strength requirements:
 * - At least 10 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
const passwordSchema = Joi.string()
  .min(10)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/)
  .required()
  .messages({
    'string.min': VALIDATION_ERRORS.PASSWORD_TOO_WEAK,
    'string.pattern.base': VALIDATION_ERRORS.PASSWORD_TOO_WEAK,
    'any.required': VALIDATION_ERRORS.REQUIRED_FIELD,
  });

/**
 * Reusable token validation schema
 */
const tokenSchema = Joi.string()
  .required()
  .messages({
    'any.required': VALIDATION_ERRORS.REQUIRED_FIELD,
  });

/**
 * Validation schema for login requests
 * Requires valid email and password
 */
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string()
    .required()
    .messages({
      'any.required': VALIDATION_ERRORS.REQUIRED_FIELD,
    }),
});

/**
 * Validation schema for registration requests
 * Requires valid email, strong password, and display name
 */
export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: Joi.string()
    .required()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name cannot exceed 50 characters',
      'any.required': VALIDATION_ERRORS.REQUIRED_FIELD,
    }),
});

/**
 * Validation schema for password reset requests
 * Requires valid email
 */
export const passwordResetSchema = Joi.object({
  email: emailSchema,
});

/**
 * Validation schema for token verification requests
 * Requires valid token string
 */
export const verifyTokenSchema = Joi.object({
  token: tokenSchema,
});

/**
 * Validation schema for token refresh requests
 * Requires valid refresh token string
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: tokenSchema,
});