"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const STORAGE_KEY_ANGGOTA = "rekod_anggota_id";
const STORAGE_KEY_PIN = "rekod_pin";
const STORAGE_KEY_REMEMBER = "rekod_remember_pin";

export default function BantuanPage() {
  const [step, setStep] = useState<"pin" | "form" | "active" | "end" | "success">("pin");
  const [anggotaId, setAnggotaId] = useState("");
  const [pin, setPin] = useState("");
  const [rememberPin, setRememberPin] = useState(false);
  const [remark, setRemark] = useState("");
  const [anggotaInfo, setAnggotaInfo] = useState<{
    nama: string;
    gred: string;
    anggota_id: string;
  } | null>(null);
  const [activeBantuan, setActiveBantuan] = useState<{
    record_id: string;
    bantuan_start: string;
    remark: string;
  } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    duration_min: number;
  } | null>(null);

  useEffect(() => {
    const savedAnggotaId = localStorage.getItem(STORAGE_KEY_ANGGOTA);
    const savedPin = localStorage.getItem(STORAGE_KEY_PIN);
    const savedRemember = localStorage.getItem(STORAGE_KEY_REMEMBER) === "true";

    if (savedAnggotaId) {
      setAnggotaId(savedAnggotaId);
    }
    if (savedPin && savedRemember) {
      setPin(savedPin);
      setRememberPin(true);
    }
  }, []);

  useEffect(() => {
    if (rememberPin && pin.length === 6) {
      localStorage.setItem(STORAGE_KEY_ANGGOTA, anggotaId);
      localStorage.setItem(STORAGE_KEY_PIN, pin);
      localStorage.setItem(STORAGE_KEY_REMEMBER, "true");
    } else if (!rememberPin) {
      localStorage.removeItem(STORAGE_KEY_PIN);
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
    }
  }, [rememberPin, pin, anggotaId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (step === "active" && activeBantuan) {
      interval = setInterval(() => {
        const start = new Date(activeBantuan.bantuan_start).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, activeBantuan]);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/sahih-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anggota_id: anggotaId, pin }),
      });

      const data = await response.json();

      if (data.valid) {
        if (rememberPin) {
          localStorage.setItem(STORAGE_KEY_ANGGOTA, anggotaId);
          localStorage.setItem(STORAGE_KEY_PIN, pin);
          localStorage.setItem(STORAGE_KEY_REMEMBER, "true");
        }
        setAnggotaInfo({
          nama: data.nama,
          gred: data.gred,
          anggota_id: data.anggota_id,
        });

        const activeResponse = await fetch(
          `/api/bantuan/aktif?anggota_id=${data.anggota_id}`
        );
        const activeData = await activeResponse.json();

        if (activeData.active && activeData.data) {
          setActiveBantuan({
            record_id: activeData.data.record_id,
            bantuan_start: activeData.data.bantuan_start,
            remark: activeData.data.remark,
          });
          setStep("active");
        } else {
          setStep("form");
        }
      } else {
        setError(data.message || "PIN tidak sah");
      }
    } catch {
      setError("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartBantuan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/bantuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anggota_id: anggotaInfo?.anggota_id,
          remark,
          action: "START",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActiveBantuan({
          record_id: data.data.record_id,
          bantuan_start: new Date().toISOString(),
          remark,
        });
        setStep("active");
      } else {
        setError(data.message || "Gagal memulakan bantuan");
      }
    } catch {
      setError("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleEndBantuan = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/bantuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anggota_id: anggotaInfo?.anggota_id,
          action: "END",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessData({
          duration_min: data.data.duration_min,
        });
        setStep("success");
      } else {
        setError(data.message || "Gagal menamatkan bantuan");
      }
    } catch {
      setError("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("pin");
    setRemark("");
    setAnggotaInfo(null);
    setActiveBantuan(null);
    setElapsedTime(0);
    setError("");
    setSuccessData(null);
  };

  const clearSavedCredentials = () => {
    localStorage.removeItem(STORAGE_KEY_ANGGOTA);
    localStorage.removeItem(STORAGE_KEY_PIN);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);
    setAnggotaId("");
    setPin("");
    setRememberPin(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            &larr; Kembali ke utama
          </Link>
        </div>

        <div className="card">
          <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            Rekod Bantuan
          </h1>

          {step === "pin" && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="anggotaId">
                  ID Anggota
                </label>
                <input
                  id="anggotaId"
                  type="text"
                  className="input"
                  value={anggotaId}
                  onChange={(e) => setAnggotaId(e.target.value.toUpperCase())}
                  placeholder="Contoh: ANG-0001"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="label" htmlFor="pin">
                  PIN (6 digit)
                </label>
                <input
                  id="pin"
                  type="password"
                  className="input"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Masukkan PIN"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d{6}"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="rememberPin"
                  type="checkbox"
                  checked={rememberPin}
                  onChange={(e) => setRememberPin(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="rememberPin" className="text-sm text-slate-600">
                  Ingat PIN untuk sesi seterusnya
                </label>
              </div>

              {error && <div className="status-error text-sm">{error}</div>}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || pin.length !== 6}
              >
                {loading ? "Memproses..." : "Sahkan PIN"}
              </button>

              {(localStorage.getItem(STORAGE_KEY_PIN) || rememberPin) && (
                <button
                  type="button"
                  onClick={clearSavedCredentials}
                  className="text-sm text-red-600 hover:underline w-full text-center"
                >
                  Padam PIN yang disimpan
                </button>
              )}
            </form>
          )}

          {step === "form" && anggotaInfo && (
            <form onSubmit={handleStartBantuan} className="space-y-4">
              <div className="text-center mb-4 p-4 bg-slate-100 rounded-lg">
                <p className="text-lg font-medium text-slate-800">
                  {anggotaInfo.nama}
                </p>
                <p className="text-sm text-slate-600">
                  {anggotaInfo.gred} | {anggotaInfo.anggota_id}
                </p>
              </div>

              <div>
                <label className="label" htmlFor="remark">
                  Keterangan Bantuan
                </label>
                <textarea
                  id="remark"
                  className="input min-h-[100px] resize-none"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Terangkan bantuan yang akan diberikan (minima 20 aksara)"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {remark.length}/20 aksara minimum
                </p>
              </div>

              {error && <div className="status-error text-sm">{error}</div>}

              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={resetForm}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={loading || remark.trim().length < 20}
                >
                  {loading ? "Memproses..." : "Mulakan Bantuan"}
                </button>
              </div>
            </form>
          )}

          {step === "active" && anggotaInfo && activeBantuan && (
            <div className="space-y-4">
              <div className="text-center mb-4 p-4 bg-slate-100 rounded-lg">
                <p className="text-lg font-medium text-slate-800">
                  {anggotaInfo.nama}
                </p>
                <p className="text-sm text-slate-600">
                  {anggotaInfo.gred} | {anggotaInfo.anggota_id}
                </p>
              </div>

              <div className="text-center py-6">
                <p className="text-sm text-slate-600 mb-2">Masa Berlalu</p>
                <div className="timer-display">{formatTime(elapsedTime)}</div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  Keterangan:
                </p>
                <p className="text-sm text-blue-700">{activeBantuan.remark}</p>
              </div>

              {error && <div className="status-error text-sm">{error}</div>}

              <button
                type="button"
                className="btn-danger w-full"
                onClick={handleEndBantuan}
                disabled={loading}
              >
                {loading ? "Memproses..." : "Tamatkan Bantuan"}
              </button>
            </div>
          )}

          {step === "success" && successData && (
            <div className="text-center space-y-4">
              <div className="status-success">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium">Bantuan Berjaya Ditamatkan</p>
              </div>

              <div className="p-4 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Jumlah Durasi</p>
                <p className="text-2xl font-bold text-slate-800">
                  {successData.duration_min} minit
                </p>
              </div>

              <button
                type="button"
                className="btn-primary w-full"
                onClick={resetForm}
              >
                Rekod Bantuan Lain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}