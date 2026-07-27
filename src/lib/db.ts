import fs from 'fs/promises';
import path from 'path';

// Define the shape of our database
export interface Branch {
  id: string;
  name: string;
}

export interface Bench {
  id: string;
  branchId: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  benchId: string;
  isParked: boolean;
  parkedAt?: string;
}

export interface DatabaseState {
  totalSpaces: number;
  branches: Branch[];
  benches: Bench[];
  users: User[];
}

// Ensure we get the correct path whether in dev or production
const getDbPath = () => {
  return path.join(process.cwd(), 'src', 'data', 'db.json');
};

// In-memory mutex to prevent race conditions during concurrent API requests
let isLocked = false;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const acquireLock = async () => {
  while (isLocked) {
    await wait(10); // Wait 10ms and try again
  }
  isLocked = true;
};

const releaseLock = () => {
  isLocked = false;
};

export async function readDB(): Promise<DatabaseState> {
  const dbPath = getDbPath();
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data) as DatabaseState;
  } catch (error) {
    console.error('Error reading db.json:', error);
    // Return a default state if file doesn't exist or is corrupted
    return {
      totalSpaces: 50,
      branches: [],
      benches: [],
      users: []
    };
  }
}

export async function writeDB(state: DatabaseState): Promise<void> {
  const dbPath = getDbPath();
  const dirPath = path.dirname(dbPath);
  
  try {
    await acquireLock();
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    // Write atomically using a temporary file (optional but safer)
    const tempPath = `${dbPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(tempPath, dbPath);
  } catch (error) {
    console.error('Error writing db.json:', error);
    throw new Error('Failed to write database');
  } finally {
    releaseLock();
  }
}

// Helper functions for specific operations
export async function toggleParking(userId: string, name: string, benchId: string, isParked: boolean): Promise<DatabaseState> {
  await acquireLock();
  try {
    // We read while holding the lock to ensure state consistency
    const state = await readDB();
    const userIndex = state.users.findIndex(u => u.id === userId);
    
    if (userIndex >= 0) {
      state.users[userIndex].isParked = isParked;
      state.users[userIndex].name = name; // Update name in case it changed
      state.users[userIndex].benchId = benchId;
      if (isParked) {
        state.users[userIndex].parkedAt = new Date().toISOString();
      } else {
        delete state.users[userIndex].parkedAt;
      }
    } else {
      // New user
      state.users.push({
        id: userId,
        name,
        benchId,
        isParked,
        parkedAt: isParked ? new Date().toISOString() : undefined
      });
    }

    // Write back
    const tempPath = `${getDbPath()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(tempPath, getDbPath());
    
    return state;
  } finally {
    releaseLock();
  }
}
