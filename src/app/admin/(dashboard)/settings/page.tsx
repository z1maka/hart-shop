import { redirect } from 'next/navigation'

// The settings tab opens on the only page there is.
export default function AdminSettingsPage() {
  redirect('/admin/settings/nova-post')
}
