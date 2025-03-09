import { useState, useEffect, useCallback, useRef } from 'react';
import { validateRequiredFields } from '../lib/utils/validation';
import { createValidationError } from '../lib/utils/errorHandling';
import { useLocalStorage } from './useLocalStorage';

/**
 * Interface defining the form state structure
 */
export interface FormState<T = any> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isValid: boolean;
}

/**
 * Interface defining the options for the useForm hook
 */
export interface FormOptions<T = any> {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
  persistKey?: string;
  onSubmit?: (values: T, formState: FormState<T>) => Promise<void> | void;
}

/**
 * Interface defining the validation schema structure
 */
export interface ValidationSchema {
  [field: string]: (value: any) => string | null;
}

/**
 * Interface defining the return value of the useForm hook
 */
export interface UseFormReturn<T = any> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isValid: boolean;
  handleChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: string | null) => void;
  setFieldTouched: (field: string, isTouched: boolean) => void;
  validateField: (field: string) => string | null;
  validateForm: () => boolean;
  resetForm: () => void;
}

/**
 * Validates a single form field against the validation schema
 * 
 * @param name Field name to validate
 * @param value Field value to validate
 * @param validationSchema Validation schema object
 * @returns Validation error message or null if valid
 */
function validateField(name: string, value: any, validationSchema?: ValidationSchema): string | null {
  if (!validationSchema || !validationSchema[name]) {
    return null;
  }
  
  return validationSchema[name](value);
}

/**
 * Helper function to create a validation schema from validation functions
 * 
 * @param schema Object containing field validation functions
 * @returns Validation schema object
 */
export function createValidationSchema(schema: Record<string, (value: any) => string | null>): ValidationSchema {
  return schema;
}

/**
 * Custom React hook for managing form state, validation, and submission
 * 
 * @param initialValues Initial form values
 * @param validationSchema Schema defining validation rules for form fields
 * @param options Configuration options for form behavior
 * @returns Form state and handlers for managing the form
 */
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: ValidationSchema,
  options: FormOptions<T> = {}
): UseFormReturn<T> {
  // Set default options
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnMount = false,
    persistKey = undefined,
    onSubmit = undefined
  } = options;

  // Initialize state from localStorage if persistKey is provided
  const [persistedValues, setPersistedValues, , persistError] = persistKey 
    ? useLocalStorage<T>(persistKey, initialValues)
    : [initialValues, () => {}, () => {}, null];

  // If we have persisted values and no error, use them as initial values
  const startValues = (persistKey && !persistError) 
    ? persistedValues 
    : initialValues;

  // Initialize form state
  const [values, setValues] = useState<T>(startValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  
  // Compute isValid based on the errors object
  const isValid = Object.keys(errors).length === 0;

  // If using persistence, update localStorage when values change
  useEffect(() => {
    if (persistKey && setPersistedValues) {
      setPersistedValues(values);
    }
  }, [persistKey, setPersistedValues, values]);

  // Validate the entire form
  const validateForm = useCallback(() => {
    let newErrors: Record<string, string> = {};
    
    // First check required fields with the utility function
    if (validationSchema) {
      // Get all fields that have validation rules
      const fieldsToValidate = Object.keys(validationSchema);
      
      // For each field with a validation rule, validate it
      fieldsToValidate.forEach(field => {
        const error = validateField(field, values[field], validationSchema);
        if (error) {
          newErrors[field] = error;
        }
      });
      
      // Also check for required fields using the utility
      const requiredErrors = validateRequiredFields(
        values,
        fieldsToValidate.filter(field => 
          // Consider fields required if they have a validation rule
          // This is a simple heuristic - more advanced logic could be added
          validationSchema[field] && validationSchema[field].toString().includes('required')
        )
      );
      
      // Merge both types of errors
      newErrors = { ...newErrors, ...requiredErrors };
    }
    
    // Update errors state
    setErrors(newErrors);
    
    // Return whether the form is valid
    return Object.keys(newErrors).length === 0;
  }, [values, validationSchema]);

  // Validate on mount if option is enabled
  useEffect(() => {
    if (validateOnMount) {
      validateForm();
    }
  }, [validateOnMount, validateForm]);

  // Handle input changes
  const handleChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = event.target;
    
    // Handle different input types
    let newValue: any = value;
    
    if (type === 'checkbox') {
      newValue = (event.target as HTMLInputElement).checked;
    } else if (type === 'number' || type === 'range') {
      newValue = value === '' ? '' : Number(value);
    } else if (type === 'file') {
      newValue = (event.target as HTMLInputElement).files;
    } else if (type === 'radio') {
      // Only update if checked (to avoid duplicate events)
      if (!(event.target as HTMLInputElement).checked) {
        return;
      }
    }
    
    // Update values
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Validate on change if enabled
    if (validateOnChange && validationSchema && validationSchema[name]) {
      const error = validateField(name, newValue, validationSchema);
      setErrors(prev => ({
        ...prev,
        [name]: error || ''
      }));
    }
  }, [validateOnChange, validationSchema]);

  // Handle input blur (when field loses focus)
  const handleBlur = useCallback((
    event: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = event.target;
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate on blur if enabled
    if (validateOnBlur && validationSchema && validationSchema[name]) {
      const error = validateField(name, values[name], validationSchema);
      setErrors(prev => ({
        ...prev,
        [name]: error || ''
      }));
    }
  }, [validateOnBlur, validationSchema, values]);

  // Validate a single field and return the error if any
  const validateFieldValue = useCallback((field: string): string | null => {
    if (!validationSchema || !validationSchema[field]) {
      return null;
    }
    
    const error = validateField(field, values[field], validationSchema);
    
    // Update errors state
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
    
    return error;
  }, [values, validationSchema]);

  // Set a field value programmatically
  const setFieldValue = useCallback((field: string, value: any) => {
    // Update values
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validate if schema exists for this field
    if (validateOnChange && validationSchema && validationSchema[field]) {
      const error = validateField(field, value, validationSchema);
      setErrors(prev => ({
        ...prev,
        [field]: error || ''
      }));
    }
  }, [validateOnChange, validationSchema]);

  // Set a field error programmatically
  const setFieldError = useCallback((field: string, error: string | null) => {
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  }, []);

  // Mark a field as touched programmatically
  const setFieldTouched = useCallback((field: string, isTouched: boolean = true) => {
    setTouched(prev => ({
      ...prev,
      [field]: isTouched
    }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission
    event.preventDefault();
    
    // Mark form as submitted
    setIsSubmitted(true);
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(values).forEach(field => {
      allTouched[field] = true;
    });
    setTouched(allTouched);
    
    // Validate form
    const isFormValid = validateForm();
    
    if (isFormValid && onSubmit) {
      try {
        // Set submitting state
        setIsSubmitting(true);
        
        // Call onSubmit handler
        Promise.resolve(onSubmit(values, { 
          values, 
          errors, 
          touched: allTouched, 
          isSubmitting: true, 
          isSubmitted: true, 
          isValid: isFormValid 
        }))
          .catch(error => {
            // If there's an error during submission, create a validation error
            const validationError = createValidationError(
              'Form submission failed',
              { formErrors: error, values }
            );
            console.error(validationError);
          })
          .finally(() => {
            // Reset submitting state
            setIsSubmitting(false);
          });
      } catch (error) {
        // Handle synchronous errors
        setIsSubmitting(false);
        const validationError = createValidationError(
          'Form submission failed',
          { formErrors: error, values }
        );
        console.error(validationError);
      }
    }
  }, [values, errors, validateForm, onSubmit]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsSubmitted(false);
  }, [initialValues]);

  // Return form state and handlers
  return {
    // Form state
    values,
    errors,
    touched,
    isSubmitting,
    isSubmitted,
    isValid,
    
    // Event handlers
    handleChange,
    handleBlur,
    handleSubmit,
    
    // Field operations
    setFieldValue,
    setFieldError,
    setFieldTouched,
    
    // Validation
    validateField: validateFieldValue,
    validateForm,
    
    // Form operations
    resetForm
  };
}