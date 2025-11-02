'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import BackupManagerPanel from '@/components/backup-manager-panel'
import { Shield, Database } from 'lucide-react'

export default function AdminBackupPage() {
  return (
    <ProtectedRoute>
      <div className="p-3 sm:p-4 bg-gray-50 min-h-screen w-full overflow-x-hidden">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">SYSTEM BACKUP & RESTORE</h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Satu klik untuk export database + uploads dan restore secara atomic
              </p>
            </div>
          </div>
        </div>

        <BackupManagerPanel />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="bg-white border border-gray-200 shadow-sm p-4 sm:p-5 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Database className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">Tips Export</h2>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
              <li>Pastikan koneksi stabil sebelum memulai proses download.</li>
              <li>File zip berisi `database.json`, `metadata.json`, dan folder `uploads/`.</li>
              <li>Simpan backup di lokasi aman (cloud storage atau external drive).</li>
            </ul>
          </div>
          <div className="bg-white border border-gray-200 shadow-sm p-4 sm:p-5 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">Tips Restore</h2>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
              <li>Gunakan file zip hasil export terbaru (maksimal 200&nbsp;MB).</li>
              <li>Selama proses restore, data lama akan ditimpa secara otomatis.</li>
              <li>
                Jika terjadi error, sistem otomatis rollback database & uploads ke kondisi sebelum restore.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

