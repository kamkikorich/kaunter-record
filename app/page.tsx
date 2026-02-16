"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Rekod Kaunter
          </h1>
          <p className="text-slate-600">
            Sistem Rekod Kehadiran & Bantuan Kaunter
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/kehadiran"
            className="card block text-center hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="py-4">
              <div className="text-4xl mb-3">
                <span className="inline-block p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                  ⏰
                </span>
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Rekod Kehadiran
              </h2>
              <p className="text-slate-600 text-sm">
                Catat kehadiran harian mengikut sesi PAGI/PETANG
              </p>
            </div>
          </Link>

          <Link
            href="/bantuan"
            className="card block text-center hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="py-4">
              <div className="text-4xl mb-3">
                <span className="inline-block p-4 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                  💬
                </span>
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Rekod Bantuan
              </h2>
              <p className="text-slate-600 text-sm">
                Catat bantuan yang diberikan di kaunter
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/admin/dashboard"
            className="text-slate-500 hover:text-slate-700 text-sm underline"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}