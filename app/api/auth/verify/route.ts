// API: Verify Admin Session
// GET /api/auth/verify

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET() {
  try {
    const isAuthenticated = await isAdminAuthenticated();

    return NextResponse.json({
      success: true,
      authenticated: isAuthenticated,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { success: false, authenticated: false },
      { status: 500 }
    );
  }
}