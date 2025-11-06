import { redirect } from 'next/navigation'

export default function CleanDataSandboxRedirectPage() {
  redirect('/admin/backup')
}
