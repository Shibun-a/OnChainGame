import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { NetworkGuard } from '@/components/layout/NetworkGuard'

export default function RootLayout() {
  return (
    <NetworkGuard>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Outlet />
        </main>
        <Footer />
      </div>
    </NetworkGuard>
  )
}
