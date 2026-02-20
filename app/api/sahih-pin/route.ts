// API: Sahkan PIN Anggota
// POST /api/sahih-pin
// Semua pengesahan server-side, PIN tidak didedahkan

import { NextRequest, NextResponse } from 'next/server';
import { findAnggotaById } from '@/lib/google-sheets';
import { verifyPin } from '@/lib/pin';
import { validateAnggotaId, sanitizeString } from '@/lib/validators';
import { validatePinFormat } from '@/lib/pin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { anggota_id, pin } = body;

    // Sanitasi input
    anggota_id = sanitizeString(anggota_id || '');
    pin = (pin || '').trim();

    // Validasi input
    const anggotaValidation = validateAnggotaId(anggota_id);
    if (!anggotaValidation.valid) {
      return NextResponse.json(
        { valid: false, message: anggotaValidation.error },
        { status: 400 }
      );
    }

    const pinValidation = validatePinFormat(pin);
    if (!pinValidation.valid) {
      return NextResponse.json(
        { valid: false, message: pinValidation.error },
        { status: 400 }
      );
    }

    // Cari anggota
    const anggota = await findAnggotaById(anggota_id);
    if (!anggota) {
      return NextResponse.json(
        { valid: false, message: 'ID anggota tidak dijumpai' },
        { status: 404 }
      );
    }

    // Verify PIN (server-side sahaja)
    const isPinValid = verifyPin(pin, anggota.pin_hash);
    if (!isPinValid) {
      return NextResponse.json(
        { valid: false, message: 'PIN tidak sah' },
        { status: 401 }
      );
    }

    // Return data anggota (tanpa pin_hash)
    return NextResponse.json({
      valid: true,
      nama: anggota.nama,
      gred: anggota.gred,
      anggota_id: anggota.anggota_id,
    });
  } catch (error) {
    const err = error as Error;
    console.error('PIN validation error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
    return NextResponse.json(
      { valid: false, message: 'Ralat sistem', debug: err?.message },
      { status: 500 }
    );
  }
}