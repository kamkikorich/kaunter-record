// API: Admin Logout
// POST /api/auth/logout

import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/auth';

export async function POST() {
  try {
    await clearAdminSession();

    return NextResponse.json({
      success: true,
      message: 'Log keluar berjaya',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Ralat sistem' },
      { status: 500 }
    );
  }
}