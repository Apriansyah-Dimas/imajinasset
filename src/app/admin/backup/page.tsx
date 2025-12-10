'use client'

import { Database, Shield } from 'lucide-react'

import ProtectedRoute from '@/components/protected-route'
import BackupManagerPanel from '@/components/backup-manager-panel'

export default function AdminBackupPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full overflow-x-hidden bg-background px-4 py-6 lg:px-10">
        <div className="surface-card relative mb-6 overflow-hidden rounded-[var(--radius)]">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-emerald-200/50 via-transparent to-primary/10" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Safety Center
                </p>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">System Backup & Restore</h1>
                <p className="text-sm text-text-muted">
                  Export database + uploads and restore everything with rollback protection.
                </p>
              </div>
            </div>
          </div>
        </div>

        <BackupManagerPanel />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="surface-card space-y-3 rounded-[var(--radius)]">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground sm:text-base">Backup Tips</h2>
            </div>
            <ul className="space-y-2 text-xs text-text-muted sm:text-sm">
              <li>Use a stable connection before downloading the archive.</li>
              <li>Zip includes `database.json`, `metadata.json`, and the `uploads/` folder.</li>
              <li>Store backups in a secure, off-site location (cloud or external drive).</li>
            </ul>
          </div>
          <div className="surface-card space-y-3 rounded-[var(--radius)]">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-semibold text-foreground sm:text-base">Restore Tips</h2>
            </div>
            <ul className="space-y-2 text-xs text-text-muted sm:text-sm">
              <li>Use the latest exported zip (max 200 MB).</li>
              <li>Restore overwrites existing data automatically; ensure maintenance window.</li>
              <li>If errors occur, the system rolls back to the previous state.</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
