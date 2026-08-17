"use client";

import { useState, useEffect } from "react";

type AnggotaStats = {
  anggota_id: string;
  nama: string;
  gred: string;
  jumlah_kehadiran: number;
  hadir_pagi: number;
  hadir_petang: number;
  jumlah_bantuan: number;
  total_durasi_min: number;
  jumlah_tugasan: number;
  total_durasi_tugasan_min: number;
};

type RekodAnggota = {
  record_id: string;
  server_ts: string;
  jenis: string;
  tarikh: string;
  sesi: string;
  nama: string;
  remark: string;
  bantuan_start: string;
  bantuan_end: string;
  durasi_min: number;
  lokasi: string;
  kategori: string;
  sub_kategori: string;
};

export default function AdminDashboardPage() {
  const [anggotaList, setAnggotaList] = useState<AnggotaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [integriti, setIntegriti] = useState<{
    valid: boolean;
    total_records: number;
    message: string;
  } | null>(null);
  const [selectedAnggota, setSelectedAnggota] = useState<AnggotaStats | null>(null);
  const [rekodDetail, setRekodDetail] = useState<RekodAnggota[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch anggota list
      const anggotaResponse = await fetch("/api/admin/statistik");
      if (anggotaResponse.ok) {
        const anggotaData = await anggotaResponse.json();
        setAnggotaList(anggotaData.data || []);
      }

      // Fetch integriti status
      const integritiResponse = await fetch("/api/integriti");
      if (integritiResponse.ok) {
        const integritiData = await integritiResponse.json();
        setIntegriti({
          valid: integritiData.valid,
          total_records: integritiData.total_records,
          message: integritiData.message,
        });
      }
    } catch {
      setError("Gagal memuatkan data");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes % 1) * 60);
    
    if (hours > 0) {
      return `${hours}j ${mins}m`;
    }
    if (mins > 0) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${secs}s`;
  };

  const loadRekodAnggota = async (anggota: AnggotaStats) => {
    setSelectedAnggota(anggota);
    setRekodDetail(null);
    setDetailLoading(true);
    setDetailError("");

    try {
      const response = await fetch(`/api/admin/statistik/anggota?anggota_id=${anggota.anggota_id}`);
      if (response.ok) {
        const data = await response.json();
        setRekodDetail(data.data?.rekod || []);
      } else {
        setDetailError("Gagal memuatkan rekod anggota");
      }
    } catch {
      setDetailError("Ralat sistem");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedAnggota(null);
    setRekodDetail(null);
    setDetailError("");
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("ms-MY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const jenisLabel = (jenis: string) => {
    switch (jenis) {
      case "KEHADIRAN": return "⏰ Kehadiran";
      case "BANTUAN_START": return "💬 Bantuan Mula";
      case "BANTUAN_END": return "💬 Bantuan Tamat";
      case "TUGASAN_START": return "🚗 Tugasan Mula";
      case "TUGASAN_END": return "🚗 Tugasan Tamat";
      default: return jenis;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Memuatkan data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="status-error">{error}</div>}

      {/* Integriti Status */}
      {integriti && (
        <div
          className={`card ${
            integriti.valid ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-800">
                Status Integriti Data
              </h3>
              <p className="text-sm text-slate-600">{integriti.message}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Jumlah Rekod</p>
              <p className="text-xl font-bold text-slate-800">
                {integriti.total_records}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistik Individu */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Statistik Individu
        </h2>

        {anggotaList.length === 0 ? (
          <p className="text-slate-600 text-center py-8">
            Tiada data statistik tersedia
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Nama
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Gred
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">
                    Kehadiran
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">
                    Bantuan
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">
                    Masa Bantuan
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">
                    Tugasan Luar
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">
                    Masa Tugasan
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">
                    Semak
                  </th>
                </tr>
              </thead>
              <tbody>
                {anggotaList.map((anggota) => (
                  <tr
                    key={anggota.anggota_id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">
                        {anggota.nama}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        ({anggota.anggota_id})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {anggota.gred}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                        {anggota.jumlah_kehadiran}
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {anggota.hadir_pagi}p · {anggota.hadir_petang}pt
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                        {anggota.jumlah_bantuan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-800 font-medium">
                      {formatDuration(anggota.total_durasi_min)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                        {anggota.jumlah_tugasan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-800 font-medium">
                      {formatDuration(anggota.total_durasi_tugasan_min)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => loadRekodAnggota(anggota)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        📋 Semak Rekod
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel Detail Anggota (Drill-down) */}
      {selectedAnggota && (
        <div className="card border-blue-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                📋 Rekod {selectedAnggota.nama}
              </h2>
              <p className="text-sm text-slate-600">
                {selectedAnggota.gred} | {selectedAnggota.anggota_id}
              </p>
            </div>
            <button
              onClick={closeDetail}
              className="text-sm text-red-600 hover:underline"
            >
              ✕ Tutup
            </button>
          </div>

          {detailLoading ? (
            <p className="text-slate-600 text-center py-6">Memuatkan rekod...</p>
          ) : detailError ? (
            <div className="status-error text-sm">{detailError}</div>
          ) : rekodDetail && rekodDetail.length === 0 ? (
            <p className="text-slate-600 text-center py-6">Tiada rekod untuk anggota ini</p>
          ) : rekodDetail ? (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Tarikh</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Jenis</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Sesi</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Keterangan</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600">Masa</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600">Durasi</th>
                  </tr>
                </thead>
                <tbody>
                  {rekodDetail.map((r) => (
                    <tr key={r.record_id} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{r.tarikh}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.jenis === "KEHADIRAN"
                            ? "bg-blue-100 text-blue-800"
                            : r.jenis.includes("BANTUAN")
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                        }`}>
                          {jenisLabel(r.jenis)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{r.sesi || "-"}</td>
                      <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={r.remark}>
                        {r.remark || "-"}
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-xs">
                        {r.jenis.includes("END") ? formatDateTime(r.bantuan_end) : formatDateTime(r.bantuan_start)}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-800 font-medium whitespace-nowrap">
                        {r.jenis.includes("END") ? formatDuration(r.durasi_min) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={fetchDashboardData}
          className="btn-secondary"
        >
          Muat Semula Data
        </button>
      </div>
    </div>
  );
}