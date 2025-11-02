'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface DeleteAllAssetsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteAllAssetsModal({ open, onOpenChange, onSuccess }: DeleteAllAssetsModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredText = 'DELETE ALL ASSETS'

  const handleDeleteAll = async () => {
    if (confirmText !== requiredText) {
      setError('Please type the confirmation text exactly as shown')
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/assets/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmAll: true
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete assets')
      }

      onSuccess()
      onOpenChange(false)
      setConfirmText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      onOpenChange(false)
      setConfirmText('')
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete All Assets
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete all assets from the database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Warning: This will delete ALL assets
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• All asset records will be permanently removed</li>
                  <li>• This action cannot be undone</li>
                  <li>• Asset images and related data will be lost</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type <span className="font-mono bg-muted px-1 py-0.5 rounded">{requiredText}</span> to confirm
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredText}
              className="font-mono"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            disabled={isDeleting || confirmText !== requiredText}
          >
            {isDeleting ? 'Deleting...' : 'Delete All Assets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}