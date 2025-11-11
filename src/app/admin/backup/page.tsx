'use client'

import { Database, Shield } from 'lucide-react'

import ProtectedRoute from '@/components/ProtectedRoute'
import BackupManagerPanel from '@/components/backup-manager-panel'

export default function AdminBackupPage() {
  return (
    <ProtectedRoute>
      <div className="bg-gray-50 min-h-screen w-full overflow-x-hidden p-3 sm:p-4">
        <div className="mb-4 sm:mb-6">
          <div className="mb-2 flex items-center gap-3 sm:gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 sm:h-10 sm:w-10">
              <Shield className="h-4 w-4 text-white sm:h-6 sm:w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 sm:text-2xl">SYSTEM BACKUP & RESTORE</h1>
              <p className="text-xs text-gray-600 sm:text-sm">
                One click to export the database plus uploads and restore everything atomically.
              </p>
            </div>
          </div>
        </div>

        <BackupManagerPanel />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Tips Export</h2>
            </div>
            <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
              <li>Ensure your connection is stable before starting the download.</li>
              <li>The zip file contains `database.json`, `metadata.json`, and the `uploads/` folder.</li>
              <li>Store the backup in a secure location (cloud storage or external drive).</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Tips Restore</h2>
            </div>
            <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
              <li>Use the most recent exported zip file (maximum 200 MB).</li>
              <li>During restore, existing data is overwritten automatically.</li>
              <li>If an error occurs, the system automatically rolls back to the state before the restore.</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
