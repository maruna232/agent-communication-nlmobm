import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { Schema } from 'joi'; // ^17.9.2
import { createValidationError } from '../utils/error.utils';
import { VALIDATION_ERRORS } from '../config/error-messages';

/**
 * Creates a middleware that validates request data against a Joi schema
 * 
 * @param schema - Joi schema to validate against
 * @param source - Request property to validate ('body', 'params', or 'query')
 * @returns Express middleware function
 */
export function validate(schema: Schema, source: string = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get the data to validate based on the source
    const data = req[source as keyof Request];
    
    // Validate the data against the schema
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
      allowUnknown: false // Don't allow fields not in the schema
    });
    
    if (error) {
      // Create validation error details from Joi error
      const details = error.details.reduce((acc: Record<string, string>, curr) => {
        const path = curr.path.join('.');
        acc[path] = curr.message;
        return acc;
      }, {});
      
      // Create a validation error
      const validationError = createValidationError(
        VALIDATION_ERRORS.INVALID_FORMAT,
        { field: source, details }
      );
      
      return next(validationError);
    }
    
    // Update request with validated data
    req[source as keyof Request] = value;
    next();
  };
}