"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SesiType = "PAGI" | "PETANG";

const STORAGE_KEY_ANGGOTA = "rekod_anggota_id";
const STORAGE_KEY_PIN = "rekod_pin";
const STORAGE_KEY_REMEMBER = "rekod_remember_pin";

export default function KehadiranPage() {
  const [step, setStep] = useState<"pin" | "sesi" | "success">("pin");
  const [anggotaId, setAnggotaId] = useState("");
  const [pin, setPin] = useState("");
  const [rememberPin, setRememberPin] = useState(false);
  const [sesi, setSesi] = useState<SesiType | "">("");
  const [anggotaInfo, setAnggotaInfo] = useState<{
    nama: string;
    gred: string;
    anggota_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    nama: string;
    sesi: string;
    tarikh: string;
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

  const autoDetectSesi = (): SesiType => {
    const hour = new Date().getHours();
    return hour < 14 ? "PAGI" : "PETANG";
  };

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
        setSesi(autoDetectSesi());
        setStep("sesi");
      } else {
        setError(data.message || "PIN tidak sah");
      }
    } catch {
      setError("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleKehadiranSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/kehadiran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anggota_id: anggotaInfo?.anggota_id,
          sesi,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessData({
          nama: data.data.nama,
          sesi: data.data.sesi,
          tarikh: data.data.tarikh,
        });
        setStep("success");
      } else {
        setError(data.message || "Gagal merekod kehadiran");
      }
    } catch {
      setError("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("pin");
    setSesi("");
    setAnggotaInfo(null);
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
            Rekod Kehadiran
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

          {step === "sesi" && anggotaInfo && (
            <form onSubmit={handleKehadiranSubmit} className="space-y-4">
              <div className="text-center mb-4 p-4 bg-slate-100 rounded-lg">
                <p className="text-lg font-medium text-slate-800">
                  {anggotaInfo.nama}
                </p>
                <p className="text-sm text-slate-600">
                  {anggotaInfo.gred} | {anggotaInfo.anggota_id}
                </p>
              </div>

              <div>
                <label className="label">Pilih Sesi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`p-4 rounded-lg border-2 transition-all ${
                      sesi === "PAGI"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setSesi("PAGI")}
                  >
                    <span className="block text-2xl mb-1">🌅</span>
                    <span className="font-medium">PAGI</span>
                  </button>
                  <button
                    type="button"
                    className={`p-4 rounded-lg border-2 transition-all ${
                      sesi === "PETANG"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setSesi("PETANG")}
                  >
                    <span className="block text-2xl mb-1">🌆</span>
                    <span className="font-medium">PETANG</span>
                  </button>
                </div>
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
                  disabled={loading || !sesi}
                >
                  {loading ? "Memproses..." : "Sahkan Kehadiran"}
                </button>
              </div>
            </form>
          )}

          {step === "success" && successData && (
            <div className="text-center space-y-4">
              <div className="status-success">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium">Kehadiran Berjaya Direkodkan</p>
              </div>

              <div className="p-4 bg-slate-100 rounded-lg text-left">
                <p>
                  <span className="text-slate-600">Nama:</span>{" "}
                  <span className="font-medium">{successData.nama}</span>
                </p>
                <p>
                  <span className="text-slate-600">Tarikh:</span>{" "}
                  <span className="font-medium">{successData.tarikh}</span>
                </p>
                <p>
                  <span className="text-slate-600">Sesi:</span>{" "}
                  <span className="font-medium">{successData.sesi}</span>
                </p>
              </div>

              <button
                type="button"
                className="btn-primary w-full"
                onClick={resetForm}
              >
                Rekod Kehadiran Lain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}