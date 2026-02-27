"use client";

import { useState, useEffect } from "react";

type AnggotaStats = {
  anggota_id: string;
  nama: string;
  gred: string;
  jumlah_kehadiran: number;
  jumlah_bantuan: number;
  total_durasi_min: number;
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
                    Jumlah Masa
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
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                        {anggota.jumlah_bantuan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-800 font-medium">
                      {formatDuration(anggota.total_durasi_min)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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