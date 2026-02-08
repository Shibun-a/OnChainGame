import { Link, useLocation } from 'react-router-dom'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { cn } from '@/utils/format'

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/dice', label: 'Dice' },
  { path: '/poker', label: 'Poker' },
  { path: '/profile', label: 'Profile' },
]

export function Header() {
  const location = useLocation()

  return (
    <header className="bg-gray-800/80 backdrop-blur border-b border-gray-700 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            OnChain Games
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === link.path
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <ConnectButton />
      </div>
    </header>
  )
}
