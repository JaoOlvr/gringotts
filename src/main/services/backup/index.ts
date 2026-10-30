import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';
import crypto from 'node:crypto';

// Encryption key for backup files (in a real app, this would be derived from user password)
// For now, we'll use a fixed key for demonstration - in production, use proper key derivation
const ENCRYPTION_KEY = 'gringotts-backup-key-2026'; // 32 bytes for AES-256
const IV_LENGTH = 16; // For AES

export interface BackupOptions {
  encrypt: boolean;
  password?: string; // If provided, used to derive encryption key
}

export class BackupService {
  private readonly backupDir: string;

  constructor() {
    // Create backup directory in user data folder
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    // Ensure directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Creates a backup of the database
   * @param options Backup options including encryption
   * @returns Path to the created backup file
   */
  async createBackup(options: BackupOptions = { encrypt: false }): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gringotts-backup-${timestamp}.db${options.encrypt ? '.enc' : ''}`;
    const backupPath = path.join(this.backupDir, filename);

    // Read the database file
    const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
    const buffer = fs.readFileSync(dbPath);

    let dataToWrite: Buffer = buffer;

    // Encrypt if requested
    if (options.encrypt) {
      const key = this.deriveKey(options.password || '');
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      const tag = cipher.getAuthTag();
      
      // Format: IV (16 bytes) + TAG (16 bytes) + ENCRYPTED DATA
      dataToWrite = Buffer.concat([iv, tag, encrypted]);
    }

    // Write backup file
    fs.writeFileSync(backupPath, dataToWrite);
    return backupPath;
  }

  /**
   * Restores database from a backup file
   * @param backupPath Path to the backup file
   * @param options Backup options including encryption
   * @returns True if successful
   */
  async restoreBackup(backupPath: string, options: BackupOptions = { encrypt: false }): Promise<boolean> {
    try {
      // Read backup file
      const buffer = fs.readFileSync(backupPath);
      
      let dataToDecrypt: Buffer = buffer;

      // Decrypt if encrypted
      if (options.encrypt) {
        if (buffer.length < IV_LENGTH * 2) {
          throw new Error('Invalid backup file: too short for encrypted backup');
        }
        
        const iv = buffer.slice(0, IV_LENGTH);
        const tag = buffer.slice(IV_LENGTH, IV_LENGTH * 2);
        const encrypted = buffer.slice(IV_LENGTH * 2);
        
        const key = this.deriveKey(options.password || '');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        
        dataToDecrypt = decrypted;
      }

      // Close existing database connections
      // Note: In a real app, we'd need to properly close connections
      // For now, we'll just overwrite the file while the app is running
      // This is not ideal but works for demonstration
      
      // Write to database file
      const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
      fs.writeFileSync(dbPath, dataToDecrypt);
      
      return true;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }

  /**
   * Lists all available backups
   * @returns Array of backup file information
   */
  listBackups(): Array<{
    name: string;
    path: string;
    size: number;
    date: Date;
    encrypted: boolean;
  }> {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const files = fs.readdirSync(this.backupDir);
    return files
      .filter(file => file.startsWith('gringotts-backup-') && (file.endsWith('.db') || file.endsWith('.db.enc')))
      .map(file => {
        const fullPath = path.join(this.backupDir, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          path: fullPath,
          size: stats.size,
          date: stats.mtime,
          encrypted: file.endsWith('.enc')
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // newest first
  }

  /**
   * Deletes a backup file
   * @param backupPath Path to the backup file to delete
   * @returns True if successful
   */
  deleteBackup(backupPath: string): boolean {
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting backup:', error);
      return false;
    }
  }

  /**
   * Derives encryption key from password
   * In a real app, use a proper key derivation function like PBKDF2 or argon2
   * @param password User password
   * @returns 32-byte key for AES-256
   */
  private deriveKey(password: string): Buffer {
    // Simple key derivation for demonstration - NOT SECURE for production
    // In production, use crypto.pbkdf2Sync or similar with salt and iterations
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest(); // 32 bytes for AES-256
  }
}

// Export singleton instance
export const backupService = new BackupService();
