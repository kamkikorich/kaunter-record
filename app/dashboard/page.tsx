"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY_ANGGOTA = "rekod_anggota_id";
const STORAGE_KEY_PIN = "rekod_pin";
const STORAGE_KEY_REMEMBER = "rekod_remember_pin";

type StatistikResponse = {
  success: boolean;
  message?: string;
  data?: {
    anggota: { nama: string; gred: string; anggota_id: string };
    peribadi: {
      bulan: {
        hadir_pagi: number;
        hadir_petang: number;
        jumlah_kehadiran: number;
        jumlah_bantuan: number;
        total_durasi_min: number;
      };
      semua: {
        jumlah_bantuan: number;
        total_durasi_min: number;
      };
      hari_ini: { pagi: boolean; petang: boolean };
      streak_hari: number;
      mingguan: { minggu: string; hadir: number }[];
    };
    unit: {
      jumlah_ahli_aktif: number;
      hadir_pagi: number;
      hadir_petang: number;
      bantuan_bulan: number;
      kehadiran_bulan: number;
      durasi_bulan_min: number;
      senarai: {
        nama: string;
        gred: string;
        kehadiran: number;
        bantuan: number;
        durasi_min: number;
      }[];
    };
  };
};

export default function DashboardAnggotaPage() {
  const [step, setStep] = useState<"pin" | "dashboard">("pin");
  const [anggotaId, setAnggotaId] = useState("");
  const [pin, setPin] = useState("");
  const [rememberPin, setRememberPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statistik, setStatistik] = useState<StatistikResponse["data"] | null>(null);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PIN);
    if (saved) setHasSavedCredentials(true);
  }, []);

  // Sasaran kehadiran bulanan (hari)
  const SASARAN_HADIR_BULAN = 20;

  const formatDurasi = (minutes: number) => {
    const totalMinutes = Math.round(minutes);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) return `${hours}j ${mins}m`;
    return `${mins}m`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/anggota/statistik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anggota_id: anggotaId, pin }),
      });

      const data: StatistikResponse = await response.json();

      if (data.success && data.data) {
        if (rememberPin) {
          localStorage.setItem(STORAGE_KEY_ANGGOTA, anggotaId);
          localStorage.setItem(STORAGE_KEY_PIN, pin);
          localStorage.setItem(STORAGE_KEY_REMEMBER, "true");
        }
        setStatistik(data.data);
        setStep("dashboard");
      } else {
        setError(data.message || "PIN tidak sah");
      }
    } catch {
      setError("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setStep("pin");
    setStatistik(null);
    setPin("");
    setError("");
  };

  const clearSavedCredentials = () => {
    localStorage.removeItem(STORAGE_KEY_ANGGOTA);
    localStorage.removeItem(STORAGE_KEY_PIN);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);
    setAnggotaId("");
    setPin("");
    setRememberPin(false);
  };

  // ===== SKRIN PIN =====
  if (step === "pin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link href="/" className="text-blue-600 hover:underline text-sm">
              &larr; Kembali ke utama
            </Link>
          </div>

          <div className="card">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📊</div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                Dashboard Anggota
              </h1>
              <p className="text-sm text-slate-600">
                Lihat perkembangan kehadiran dan sumbangan anda
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                {loading ? "Memproses..." : "Lihat Dashboard"}
              </button>

              {(hasSavedCredentials || rememberPin) && (
                <button
                  type="button"
                  onClick={clearSavedCredentials}
                  className="text-sm text-red-600 hover:underline w-full text-center"
                >
                  Padam PIN yang disimpan
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ===== DASHBOARD =====
  if (!statistik) return null;

  const { anggota, peribadi, unit } = statistik;
  const sisaKeSasaran = Math.max(0, SASARAN_HADIR_BULAN - peribadi.bulan.jumlah_kehadiran);
  const hadirHariIniCount = [peribadi.hari_ini.pagi, peribadi.hari_ini.petang].filter(Boolean).length;

  // Cari minggu maksimum untuk skala bar
  const maxMinggu = Math.max(1, ...peribadi.mingguan.map((m) => m.hadir));

  return (
    <div className="min-h-screen p-4 pb-16">
      <div className="w-full max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            &larr; Utama
          </Link>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:underline"
          >
            Keluar
          </button>
        </div>

        {/* Kad Profil + Ringkasan */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{anggota.nama}</h1>
              <p className="text-sm text-slate-600">
                {anggota.gred} | {anggota.anggota_id}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Kehadiran hari ini</p>
              <p className="text-2xl font-bold text-blue-700">
                {hadirHariIniCount === 2 ? (
                  <span title="Pagi & petang">🌤️ 2/2</span>
                ) : hadirHariIniCount === 1 ? (
                  <span title={peribadi.hari_ini.pagi ? "Pagi sahaja" : "Petang sahaja"}>🌤️ 1/2</span>
                ) : (
                  <span title="Belum hadir">🌤️ 0/2</span>
                )}
              </p>
            </div>
          </div>

          {/* Streak */}
          {peribadi.streak_hari >= 2 ? (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
              🔥 <strong>Streak {peribadi.streak_hari} hari</strong> berturut-turut!
              {peribadi.streak_hari >= 5 && " Hebat, kekalkan momentum anda!"}
            </div>
          ) : peribadi.streak_hari === 1 ? (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
              🔥 <strong>1 hari</strong> — jadikan 2 hari esok!
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              💪 Rekod kehadiran hari ini untuk mulakan streak!
            </div>
          )}
        </div>

        {/* Statistik Bulan Ini */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card !p-4">
            <p className="text-sm text-slate-600">Kehadiran bulan ini</p>
            <p className="text-3xl font-bold text-blue-700">
              {peribadi.bulan.jumlah_kehadiran}
            </p>
            <p className="text-xs text-slate-500">
              {peribadi.bulan.hadir_pagi} pagi · {peribadi.bulan.hadir_petang} petang
            </p>
          </div>
          <div className="card !p-4">
            <p className="text-sm text-slate-600">Bantuan bulan ini</p>
            <p className="text-3xl font-bold text-green-700">
              {peribadi.bulan.jumlah_bantuan}
            </p>
            <p className="text-xs text-slate-500">
              {formatDurasi(peribadi.bulan.total_durasi_min)}
            </p>
          </div>
        </div>

        {/* Sasaran */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-slate-800">
              🎯 Sasaran Kehadiran Bulanan
            </h3>
            <span className="text-sm text-slate-600">
              {peribadi.bulan.jumlah_kehadiran}/{SASARAN_HADIR_BULAN} hari
            </span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (peribadi.bulan.jumlah_kehadiran / SASARAN_HADIR_BULAN) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {peribadi.bulan.jumlah_kehadiran === 0
              ? "Rekod kehadiran pertama anda hari ini untuk mula capai sasaran!"
              : sisaKeSasaran > 0
                ? `${sisaKeSasaran} hari lagi untuk capai sasaran ${SASARAN_HADIR_BULAN} hari!`
                : "🎉 Tahniah! Sasaran kehadiran bulanan telah dicapai!"}
          </p>
        </div>

        {/* Trend Mingguan */}
        <div className="card">
          <h3 className="font-medium text-slate-800 mb-4">📈 Trend Kehadiran Mingguan</h3>
          {peribadi.mingguan.every((m) => m.hadir === 0) ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm">
                Tiada data lagi — rekod kehadiran anda dan trend akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-32">
              {peribadi.mingguan.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-slate-700">{m.hadir}</span>
                  <div
                    className="w-full rounded-t-lg bg-blue-500"
                    style={{
                      height: `${Math.max(6, (m.hadir / maxMinggu) * 100)}%`,
                      opacity: 0.5 + 0.5 * (m.hadir / maxMinggu),
                    }}
                  />
                  <span className="text-xs text-slate-500">{m.minggu}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sumbangan Bantuan */}
        <div className="card">
          <h3 className="font-medium text-slate-800 mb-2">🤝 Sumbangan Bantuan Kaunter</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Bulan ini</span>
            <span className="font-medium text-slate-800">
              {peribadi.bulan.jumlah_bantuan} kali · {formatDurasi(peribadi.bulan.total_durasi_min)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-600">Sepanjang masa</span>
            <span className="font-medium text-slate-800">
              {peribadi.semua.jumlah_bantuan} kali · {formatDurasi(peribadi.semua.total_durasi_min)}
            </span>
          </div>
          {peribadi.bulan.jumlah_bantuan > 0 && (
            <p className="text-xs text-green-700 mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              🌟 Setiap bantuan anda membantu pelanggan dilayan lebih cepat. Terima kasih atas sumbangan anda!
            </p>
          )}
        </div>

        {/* Semangat Pasukan (tanpa ranking) */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-medium text-slate-800 mb-2">👥 Semangat Pasukan Hari Ini</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {unit.hadir_pagi}<span className="text-sm font-normal text-slate-500">/{unit.jumlah_ahli_aktif}</span>
              </p>
              <p className="text-xs text-slate-600">Pagi</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {unit.hadir_petang}<span className="text-sm font-normal text-slate-500">/{unit.jumlah_ahli_aktif}</span>
              </p>
              <p className="text-xs text-slate-600">Petang</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{unit.bantuan_bulan}</p>
              <p className="text-xs text-slate-600">Bantuan unit (bulan)</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {unit.hadir_pagi === unit.jumlah_ahli_aktif && unit.hadir_petang === unit.jumlah_ahli_aktif
              ? "🎉 Semua anggota hadir penuh hari ini!"
              : "Bersama-sama, kita jaga perkhidmatan kaunter."}
          </p>
        </div>

        {/* Keseluruhan Unit - Bulan Ini */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-slate-800">🏢 Keseluruhan Unit — Bulan Ini</h3>
            <span className="text-xs text-slate-500">{unit.jumlah_ahli_aktif} ahli aktif</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div className="p-2 bg-slate-50 rounded-lg">
              <p className="text-xl font-bold text-slate-800">{unit.kehadiran_bulan}</p>
              <p className="text-xs text-slate-600">Jumlah kehadiran</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <p className="text-xl font-bold text-slate-800">{unit.bantuan_bulan}</p>
              <p className="text-xs text-slate-600">Jumlah bantuan</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <p className="text-xl font-bold text-slate-800">{formatDurasi(unit.durasi_bulan_min)}</p>
              <p className="text-xs text-slate-600">Jumlah masa bantuan</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 font-medium text-slate-600">Nama</th>
                  <th className="text-center py-2 px-2 font-medium text-slate-600">Gred</th>
                  <th className="text-center py-2 px-2 font-medium text-slate-600">Kehadiran</th>
                  <th className="text-center py-2 px-2 font-medium text-slate-600">Bantuan</th>
                  <th className="text-center py-2 px-2 font-medium text-slate-600">Masa</th>
                </tr>
              </thead>
              <tbody>
                {unit.senarai.map((a) => (
                  <tr key={a.nama} className="border-b border-slate-100">
                    <td className="py-2 px-2">
                      <span className="font-medium text-slate-800">{a.nama}</span>
                      {a.nama === anggota.nama && (
                        <span className="ml-1 text-xs text-blue-600">(anda)</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-600">{a.gred}</td>
                    <td className="py-2 px-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                        {a.kehadiran}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                        {a.bantuan}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center text-slate-700">
                      {formatDurasi(a.durasi_min)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Disusun mengikut nama — setiap sumbangan anggota dihargai. 💙
          </p>
        </div>
      </div>
    </div>
  );
}
