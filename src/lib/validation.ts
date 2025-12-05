/**
 * Validation utilities for input security
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' };
  }

  if (trimmedEmail.length > 255) {
    return { isValid: false, error: 'Email is too long' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }

  if (password.length > 100) {
    return { isValid: false, error: 'Password is too long' };
  }

  return { isValid: true };
}

/**
 * Validates asset name
 */
export function validateAssetName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Asset name is required' };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Asset name cannot be empty' };
  }

  if (trimmedName.length > 200) {
    return { isValid: false, error: 'Asset name is too long (max 200 characters)' };
  }

  // Allow only basic characters, numbers, spaces, and common punctuation
  const allowedChars = /^[a-zA-Z0-9\s\-_.,()\/&]+$/;
  if (!allowedChars.test(trimmedName)) {
    return { isValid: false, error: 'Asset name contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Validates general text input
 */
export function validateTextInput(input: string, maxLength: number = 1000, fieldName: string = 'Field'): ValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmedInput = input.trim();
  if (trimmedInput.length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }

  if (trimmedInput.length > maxLength) {
    return { isValid: false, error: `${fieldName} is too long (max ${maxLength} characters)` };
  }

  return { isValid: true };
}

/**
 * Sanitizes text input to prevent XSS
 */
export function sanitizeTextInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validates numeric input
 */
export function validateNumericInput(input: string | number, fieldName: string = 'Field'): ValidationResult {
  const num = typeof input === 'string' ? parseFloat(input) : input;

  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (num < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }

  return { isValid: true };
}

/**
 * Validates ID format (cuid or uuid)
 */
export function validateId(id: string, fieldName: string = 'ID'): ValidationResult {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmedId = id.trim();
  if (trimmedId.length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }

  // Basic validation for cuid or uuid format
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  if (!idRegex.test(trimmedId) || trimmedId.length < 10) {
    return { isValid: false, error: `Invalid ${fieldName} format` };
  }

  return { isValid: true };
}