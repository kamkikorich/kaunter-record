// API: Admin Login
// POST /api/auth/login

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, setAdminSession, checkRateLimit, recordFailedLogin, clearRateLimit, generateCSRFToken } from '@/lib/auth';
import { validateAdminPassword } from '@/lib/validators';

function getClientIP(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      const remainingMin = Math.ceil((rateLimit.remainingMs || 0) / 60000);
      return NextResponse.json(
        { 
          success: false, 
          message: `Terlalu banyak percubaan. Cuba lagi dalam ${remainingMin} minit.`,
          retryAfter: rateLimit.remainingMs
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.remainingMs || 0) / 1000))
          }
        }
      );
    }

    const body = await request.json();
    const { password } = body;

    const validation = validateAdminPassword(password);
    if (!validation.valid) {
      recordFailedLogin(clientIP);
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    if (!verifyAdminPassword(password)) {
      recordFailedLogin(clientIP);
      return NextResponse.json(
        { success: false, message: 'Kata laluan tidak sah' },
        { status: 401 }
      );
    }

    clearRateLimit(clientIP);
    
    await setAdminSession();
    
    const csrfToken = generateCSRFToken();

    const response = NextResponse.json({
      success: true,
      message: 'Log masuk berjaya',
      csrfToken,
    });

    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}