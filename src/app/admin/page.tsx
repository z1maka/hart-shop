import { redirect } from 'next/navigation'

// Proxy has already proven the session by the time this route renders.
export default function AdminIndexPage() {
  redirect('/admin/catalog')
}
