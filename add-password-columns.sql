-- Migration: Add password authentication columns to users table
-- This migration adds support for email/password authentication alongside Google OAuth

-- Add password column (nullable for OAuth users)
ALTER TABLE `users` ADD COLUMN `password` VARCHAR(255) NULL AFTER `email`;

-- Add password reset columns
ALTER TABLE `users` ADD COLUMN `passwordResetToken` VARCHAR(255) NULL AFTER `password`;
ALTER TABLE `users` ADD COLUMN `passwordResetExpires` TIMESTAMP NULL AFTER `passwordResetToken`;

-- Make openId nullable (for email/password users)
ALTER TABLE `users` MODIFY COLUMN `openId` VARCHAR(64) NULL;

-- Verify the changes
DESCRIBE `users`;

