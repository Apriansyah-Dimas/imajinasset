import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Save } from 'lucide-react';

interface ConfirmationDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  trigger?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function ConfirmationDialog({
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  trigger,
  isLoading = false,
  disabled = false,
  children,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild disabled={disabled}>
        {trigger || (
          <Button variant={variant} disabled={disabled}>
            {children || confirmText}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {variant === 'destructive' && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading || disabled}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {isLoading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteConfirmationDialogProps {
  itemName: string;
  itemType?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export function DeleteConfirmationDialog({
  itemName,
  itemType = 'item',
  onConfirm,
  isLoading = false,
  disabled = false,
  trigger,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      title={`Delete ${itemType}`}
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      onConfirm={onConfirm}
      confirmText="Delete"
      variant="destructive"
      trigger={trigger || (
        <Button variant="destructive" size="sm" disabled={disabled}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      isLoading={isLoading}
    />
  );
}

interface SaveConfirmationDialogProps {
  title?: string;
  description?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

export function SaveConfirmationDialog({
  title = 'Save Changes',
  description = 'Are you sure you want to save these changes?',
  onConfirm,
  isLoading = false,
  disabled = false,
  trigger,
  children,
}: SaveConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      title={title}
      description={description}
      onConfirm={onConfirm}
      confirmText="Save"
      trigger={trigger || (
        <Button disabled={disabled} isLoading={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      )}
      isLoading={isLoading}
    >
      {children}
    </ConfirmationDialog>
  );
}

interface CancelConfirmationDialogProps {
  title?: string;
  description?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

export function CancelConfirmationDialog({
  title = 'Cancel Action',
  description = 'Are you sure you want to cancel? Any unsaved changes will be lost.',
  onConfirm,
  isLoading = false,
  disabled = false,
  trigger,
  children,
}: CancelConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      title={title}
      description={description}
      onConfirm={onConfirm}
      confirmText="Cancel"
      trigger={trigger || (
        <Button variant="outline" disabled={disabled}>
          Cancel
        </Button>
      )}
      isLoading={isLoading}
    >
      {children}
    </ConfirmationDialog>
  );
}