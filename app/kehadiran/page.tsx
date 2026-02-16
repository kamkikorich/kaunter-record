"use client";

import { useState } from "react";
import Link from "next/link";

type SesiType = "PAGI" | "PETANG";

export default function KehadiranPage() {
  const [step, setStep] = useState<"pin" | "sesi" | "success">("pin");
  const [anggotaId, setAnggotaId] = useState("");
  const [pin, setPin] = useState("");
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

  // Auto-detect sesi based on current time
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
    setAnggotaId("");
    setPin("");
    setSesi("");
    setAnggotaInfo(null);
    setError("");
    setSuccessData(null);
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
                  placeholder="Contoh: A001"
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

              {error && <div className="status-error text-sm">{error}</div>}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || pin.length !== 6}
              >
                {loading ? "Memproses..." : "Sahkan PIN"}
              </button>
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