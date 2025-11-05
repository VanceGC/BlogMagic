/**
 * Local File Storage Module
 * 
 * Stores generated images locally on the web server with user-specific directory structure.
 * Directory structure: /uploads/{userEmail}/{blogConfigName}/images/{filename}
 * 
 * This makes the solution completely independent of external services like S3.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

// Base upload directory (relative to project root)
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads');

/**
 * Sanitize string for use in filesystem paths
 */
function sanitizeForPath(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100); // Limit length
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await access(dirPath);
  } catch {
    // Directory doesn't exist, create it
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Get the storage path for a user's blog config
 */
export function getStoragePath(userEmail: string, blogConfigName: string): string {
  const sanitizedEmail = sanitizeForPath(userEmail);
  const sanitizedBlogName = sanitizeForPath(blogConfigName);
  
  return path.join(UPLOAD_BASE_DIR, sanitizedEmail, sanitizedBlogName, 'images');
}

/**
 * Get the public URL for an image
 */
export function getImageUrl(userEmail: string, blogConfigName: string, filename: string): string {
  const sanitizedEmail = sanitizeForPath(userEmail);
  const sanitizedBlogName = sanitizeForPath(blogConfigName);
  
  // Return URL path that will be served by Express
  return `/uploads/${sanitizedEmail}/${sanitizedBlogName}/images/${filename}`;
}

/**
 * Save image buffer to local storage
 * 
 * @param userEmail - User's email address
 * @param blogConfigName - Blog configuration name
 * @param buffer - Image data as Buffer
 * @param extension - File extension (e.g., 'png', 'jpg')
 * @returns Object with local file path and public URL
 */
export async function saveImageLocally(
  userEmail: string,
  blogConfigName: string,
  buffer: Buffer,
  extension: string = 'png'
): Promise<{ filePath: string; url: string }> {
  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const filename = `${timestamp}-${random}.${extension}`;
  
  // Get storage directory and ensure it exists
  const storageDir = getStoragePath(userEmail, blogConfigName);
  await ensureDirectory(storageDir);
  
  // Full file path
  const filePath = path.join(storageDir, filename);
  
  // Save file
  await writeFile(filePath, buffer);
  
  // Generate public URL
  const url = getImageUrl(userEmail, blogConfigName, filename);
  
  console.log(`[Local Storage] Image saved: ${filePath}`);
  console.log(`[Local Storage] Public URL: ${url}`);
  
  return { filePath, url };
}

/**
 * Initialize local storage (create base directory)
 */
export async function initializeLocalStorage(): Promise<void> {
  await ensureDirectory(UPLOAD_BASE_DIR);
  console.log(`[Local Storage] Initialized at: ${UPLOAD_BASE_DIR}`);
}

