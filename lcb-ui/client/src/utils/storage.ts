/**
 * Safe storage access helpers to avoid null pointer exceptions and handle storage errors gracefully
 */

export const safeGetLocalStorage = (key: string, defaultValue: string | null = null): string | null => {
  try {
    return localStorage.getItem(key) ?? defaultValue;
  } catch (error) {
    console.warn(`Failed to read from localStorage: ${key}`, error);
    return defaultValue;
  }
};

export const safeSetLocalStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write to localStorage: ${key}`, error);
  }
};

export const safeGetSessionStorage = (key: string, defaultValue: string | null = null): string | null => {
  try {
    return sessionStorage.getItem(key) ?? defaultValue;
  } catch (error) {
    console.warn(`Failed to read from sessionStorage: ${key}`, error);
    return defaultValue;
  }
};

export const safeSetSessionStorage = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write to sessionStorage: ${key}`, error);
  }
};

export const safeRemoveSessionStorage = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove from sessionStorage: ${key}`, error);
  }
};
