"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { KATEGORI_TUGASAN_PILIHAN } from "@/lib/constants";

const STORAGE_KEY_ANGGOTA = "rekod_anggota_id";
const STORAGE_KEY_PIN = "rekod_pin";
const STORAGE_KEY_REMEMBER = "rekod_remember_pin";
const STORAGE_KEY_ACTIVE = "rekod_active_tugasan";
const STORAGE_KEY_ANGGOTA_INFO = "rekod_anggota_info_tugasan";

export default function TugasanPage() {
  const [step, setStep] = useState<"pin" | "form" | "active" | "success">("pin");
  const [anggotaId, setAnggotaId] = useState("");
  const [pin, setPin] = useState("");
  const [rememberPin, setRememberPin] = useState(false);
  const [remark, setRemark] = useState("");
  const [kategori, setKategori] = useState("");

  const [anggotaInfo, setAnggotaInfo] = useState<{
    nama: string;
    gred: string;
    anggota_id: string;
  } | null>(null);
  const [activeTugasan, setActiveTugasan] = useState<{
    record_id: string;
    bantuan_start: string;
    remark: string;
    kategori?: string;
  } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    duration_min: number;
    warning?: string;
  } | null>(null);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [isOverdue, setIsOverdue] = useState(false);
  const [overdueReason, setOverdueReason] = useState<"malam" | "max" | "midnight" | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PIN);
    if (saved) setHasSavedCredentials(true);
  }, []);

  useEffect(() => {
    const savedAnggotaId = localStorage.getItem(STORAGE_KEY_ANGGOTA);
    const savedPin = localStorage.getItem(STORAGE_KEY_PIN);
    const savedRemember = localStorage.getItem(STORAGE_KEY_REMEMBER) === "true";

    const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
    const savedInfo = localStorage.getItem(STORAGE_KEY_ANGGOTA_INFO);

    if (savedAnggotaId) setAnggotaId(savedAnggotaId);
    if (savedPin && savedRemember) {
      setPin(savedPin);
      setRememberPin(true);
    }

    if (savedActive && savedInfo) {
      try {
        const parsedActive = JSON.parse(savedActive);
        const parsedInfo = JSON.parse(savedInfo);
        setAnggotaInfo(parsedInfo);
        setActiveTugasan(parsedActive);
        setStep("active");
      } catch (e) {
        console.error("Failed to parse saved active state", e);
      }
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
    if (step === "active" && activeTugasan) {
      setIsOverdue(false);
      setOverdueReason(null);
      interval = setInterval(() => {
        const start = new Date(activeTugasan.bantuan_start);
        const now = new Date();

        // Had maksimum: 12 jam
        const maxEnd = new Date(start.getTime() + 12 * 60 * 60 * 1000);
        const pastMax = now.getTime() > maxEnd.getTime();

        // Had 8 malam (20:00)
        const hadMalam = new Date(start);
        hadMalam.setHours(20, 0, 0, 0);
        const pastMalam =
          now.getTime() > hadMalam.getTime() && start.getTime() < hadMalam.getTime();

        if (pastMax) {
          setElapsedTime(12 * 60 * 60);
          setIsOverdue(true);
          setOverdueReason("max");
        } else if (pastMalam) {
          setElapsedTime(Math.floor((hadMalam.getTime() - start.getTime()) / 1000));
          setIsOverdue(true);
          setOverdueReason("malam");
        } else if (
          start.getDate() !== now.getDate() ||
          start.getMonth() !== now.getMonth() ||
          start.getFullYear() !== now.getFullYear()
        ) {
          const midnight = new Date(start);
          midnight.setHours(23, 59, 59, 999);
          setElapsedTime(Math.floor((midnight.getTime() - start.getTime()) / 1000));
          setIsOverdue(true);
          setOverdueReason("midnight");
        } else {
          setElapsedTime(Math.floor((now.getTime() - start.getTime()) / 1000));
          setIsOverdue(false);
          setOverdueReason(null);
        }
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [step, activeTugasan]);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const isFormValid = useCallback(() => {
    if (!kategori) return false;
    if (remark.trim().length < 20) return false;
    return true;
  }, [kategori, remark]);

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
        const newAnggotaInfo = { nama: data.nama, gred: data.gred, anggota_id: data.anggota_id };
        setAnggotaInfo(newAnggotaInfo);
        const activeResponse = await fetch(`/api/tugasan/aktif?anggota_id=${data.anggota_id}`);
        const activeData = await activeResponse.json();
        if (activeData.active && activeData.data) {
          const activeObj = {
            record_id: activeData.data.record_id,
            bantuan_start: activeData.data.bantuan_start,
            remark: activeData.data.remark,
            kategori: activeData.data.kategori,
          };
          setActiveTugasan(activeObj);
          localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeObj));
          localStorage.setItem(STORAGE_KEY_ANGGOTA_INFO, JSON.stringify(newAnggotaInfo));
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

  const handleStartTugasan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/tugasan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anggota_id: anggotaInfo?.anggota_id,
          remark,
          kategori,
          action: "START",
        }),
      });
      const data = await response.json();
      if (data.success) {
        const activeObj = {
          record_id: data.data.record_id,
          bantuan_start: new Date().toISOString(),
          remark,
          kategori,
        };
        setActiveTugasan(activeObj);
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeObj));
        if (anggotaInfo) {
          localStorage.setItem(STORAGE_KEY_ANGGOTA_INFO, JSON.stringify(anggotaInfo));
        }
        setStep("active");
      } else {
        setError(data.message || "Gagal memulakan tugasan luar");
      }
    } catch {
      setError("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleEndTugasan = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/tugasan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anggota_id: anggotaInfo?.anggota_id, action: "END" }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessData({ duration_min: data.data.duration_min, warning: data.data.warning_msg });
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
        localStorage.removeItem(STORAGE_KEY_ANGGOTA_INFO);
        setStep("success");
      } else {
        if (data.message && data.message.includes("Tiada tugasan aktif")) {
          clearSavedCredentials();
          resetForm();
          setTimeout(() => {
            alert("Tugasan anda didapati sudah ditamatkan oleh sistem (mungkin kerana melepasi had masa). Sila log masuk semula.");
          }, 100);
        } else {
          setError(data.message || "Gagal menamatkan tugasan luar");
        }
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
    setKategori("");
    setAnggotaInfo(null);
    setActiveTugasan(null);
    setElapsedTime(0);
    setError("");
    setSuccessData(null);
    setIsOverdue(false);
    setOverdueReason(null);
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    localStorage.removeItem(STORAGE_KEY_ANGGOTA_INFO);
  };

  const clearSavedCredentials = () => {
    localStorage.removeItem(STORAGE_KEY_ANGGOTA);
    localStorage.removeItem(STORAGE_KEY_PIN);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    localStorage.removeItem(STORAGE_KEY_ANGGOTA_INFO);
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
          <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">
            Rekod Tugasan Luar
          </h1>
          <p className="text-sm text-slate-600 text-center mb-4">
            Ops kesan, pameran, taklimat PERKESO, program luar — <strong>bukan bantuan kaunter</strong>
          </p>

          {/* STEP: PIN */}
          {step === "pin" && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="anggotaId">ID Anggota</label>
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
                <label className="label" htmlFor="pin">PIN (6 digit)</label>
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
              <button type="submit" className="btn-primary w-full" disabled={loading || pin.length !== 6}>
                {loading ? "Memproses..." : "Sahkan PIN"}
              </button>
              {(hasSavedCredentials || rememberPin) && (
                <button type="button" onClick={clearSavedCredentials} className="text-sm text-red-600 hover:underline w-full text-center">
                  Padam PIN yang disimpan
                </button>
              )}
            </form>
          )}

          {/* STEP: FORM */}
          {step === "form" && anggotaInfo && (
            <form onSubmit={handleStartTugasan} className="space-y-4">
              <div className="text-center p-4 bg-slate-100 rounded-lg">
                <p className="text-lg font-medium text-slate-800">{anggotaInfo.nama}</p>
                <p className="text-sm text-slate-600">{anggotaInfo.gred} | {anggotaInfo.anggota_id}</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                ⏰ Tugasan luar boleh berlangsung sehingga <strong>8 malam</strong>. Sistem akan memotong masa automatik pada 20:00 jika terlupa menamatkan.
              </div>

              <div>
                <label className="label" htmlFor="kategori">Kategori Tugasan <span className="text-red-500">*</span></label>
                <select
                  id="kategori"
                  className="input bg-white cursor-pointer"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {KATEGORI_TUGASAN_PILIHAN.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="remark">Keterangan Tugasan <span className="text-red-500">*</span></label>
                <textarea
                  id="remark"
                  className="input min-h-[100px] resize-none"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Terangkan tugasan luar yang dilaksanakan (minima 20 aksara)"
                  required
                />
                <p className={`text-xs mt-1 ${remark.trim().length >= 20 ? "text-green-600" : "text-slate-500"}`}>
                  {remark.trim().length}/20 aksara minimum
                </p>
              </div>

              {error && <div className="status-error text-sm">{error}</div>}

              <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={resetForm}>Batal</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading || !isFormValid()}>
                  {loading ? "Memproses..." : "Mulakan Tugasan"}
                </button>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200">
                <button type="button" onClick={() => { clearSavedCredentials(); resetForm(); }} className="text-sm text-red-600 hover:underline w-full text-center">
                  Keluar (Tukar Anggota)
                </button>
              </div>
            </form>
          )}

          {/* STEP: ACTIVE */}
          {step === "active" && anggotaInfo && activeTugasan && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-slate-100 rounded-lg">
                <p className="text-lg font-medium text-slate-800">{anggotaInfo.nama}</p>
                <p className="text-sm text-slate-600">{anggotaInfo.gred} | {anggotaInfo.anggota_id}</p>
              </div>
              <div className="text-center py-6">
                <p className="text-sm text-slate-600 mb-2">Masa Berlalu</p>
                <div className={`timer-display ${isOverdue ? 'text-red-600' : ''}`}>{formatTime(elapsedTime)}</div>
                {isOverdue && (
                  <p className="text-sm text-red-600 mt-2 bg-red-50 p-3 rounded border border-red-200">
                    {overdueReason === "malam" ? (
                      <>⚠️ <strong>Perhatian:</strong> Tugasan ini telah melepasi had 8 malam. Sistem akan memotong masa secara automatik pada 20:00 untuk rekod yang adil.</>
                    ) : overdueReason === "max" ? (
                      <>⚠️ <strong>Perhatian:</strong> Tugasan ini telah melebihi had maksimum 12 jam. Sistem akan memotong masa secara automatik untuk rekod yang adil.</>
                    ) : (
                      <>⚠️ <strong>Perhatian:</strong> Tugasan ini telah melepasi 12 tengah malam. Sistem akan memotong masa secara automatik kepada 23:59:59 hari yang sama.</>
                    )}
                  </p>
                )}
              </div>
              <div className="p-4 bg-amber-50 rounded-lg space-y-2">
                {activeTugasan.kategori && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-amber-800">Kategori:</span>
                    <span className="text-amber-700">{activeTugasan.kategori}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">Keterangan:</p>
                  <p className="text-sm text-amber-700">{activeTugasan.remark}</p>
                </div>
              </div>
              {error && <div className="status-error text-sm">{error}</div>}
              <button type="button" className="btn-danger w-full" onClick={handleEndTugasan} disabled={loading}>
                {loading ? "Memproses..." : "Tamatkan Tugasan"}
              </button>

              <div className="pt-4 mt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Langkah ini akan membuang memori sesi tempatan sahaja. Sebarang tugasan aktif belum ditamatkan di dalam sistem pangkalan data berpusat. Adakah anda pasti mahu log keluar ketika ada tugasan sedang berjalan? Anda perlu log masuk semula untuk menamatkan tugasan ini nanti.")) {
                      clearSavedCredentials();
                      resetForm();
                    }
                  }}
                  className="text-sm text-red-600 hover:underline w-full text-center"
                >
                  Log Keluar (Tukar Anggota)
                </button>
              </div>
            </div>
          )}

          {/* STEP: SUCCESS */}
          {step === "success" && successData && (
            <div className="text-center space-y-4">
              <div className="status-success">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium">Tugasan Luar Berjaya Ditamatkan</p>
              </div>
              <div className="p-4 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Jumlah Durasi</p>
                <p className="text-2xl font-bold text-slate-800">
                  {successData.duration_min >= 1
                    ? `${successData.duration_min.toFixed(2)} minit`
                    : `${Math.round(successData.duration_min * 60)} saat`}
                </p>
                {successData.warning && (
                  <p className="text-sm text-amber-600 mt-2 bg-amber-50 p-2 rounded text-left border border-amber-200">
                    {successData.warning}
                  </p>
                )}
              </div>
              <button type="button" className="btn-primary w-full" onClick={resetForm}>
                Rekod Lain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
