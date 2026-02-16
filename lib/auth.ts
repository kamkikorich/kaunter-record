// Sistem Rekod Kehadiran & Bantuan Kaunter
// Utiliti Auth Admin

import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE } from './constants';
import crypto from 'crypto';

const activeSessions = new Map<string, { createdAt: number }>();
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

export function getRateLimitKey(ip: string): string {
  return `login:${ip}`;
}

export function checkRateLimit(ip: string): { allowed: boolean; remainingMs?: number } {
  const key = getRateLimitKey(ip);
  const attempt = loginAttempts.get(key);
  
  if (!attempt) {
    return { allowed: true };
  }
  
  const now = Date.now();
  const elapsed = now - attempt.firstAttempt;
  
  if (elapsed > BLOCK_DURATION_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }
  
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, remainingMs: BLOCK_DURATION_MS - elapsed };
  }
  
  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const key = getRateLimitKey(ip);
  const attempt = loginAttempts.get(key);
  const now = Date.now();
  
  if (!attempt || now - attempt.firstAttempt > BLOCK_DURATION_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    attempt.count++;
  }
}

export function clearRateLimit(ip: string): void {
  const key = getRateLimitKey(ip);
  loginAttempts.delete(key);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD tidak dikonfigurasi dalam environment');
    return false;
  }

  return timingSafeEqual(password, adminPassword);
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000;

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, data] of activeSessions.entries()) {
    if (now - data.createdAt > ADMIN_COOKIE_MAX_AGE * 1000) {
      activeSessions.delete(token);
    }
  }
}

setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL);

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  
  if (!session?.value) {
    return false;
  }
  
  const sessionData = activeSessions.get(session.value);
  if (!sessionData) {
    return false;
  }
  
  const now = Date.now();
  if (now - sessionData.createdAt > ADMIN_COOKIE_MAX_AGE * 1000) {
    activeSessions.delete(session.value);
    return false;
  }
  
  return true;
}

export async function setAdminSession(): Promise<string> {
  const token = generateSessionToken();
  activeSessions.set(token, { createdAt: Date.now() });
  
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: '/',
  });
  
  return token;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  
  if (session?.value) {
    activeSessions.delete(session.value);
  }
  
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function requireAdminAuth(): Promise<{ authenticated: boolean }> {
  const isAuthenticated = await isAdminAuthenticated();
  return { authenticated: isAuthenticated };
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) {
    return false;
  }
  return timingSafeEqual(token, storedToken);
}