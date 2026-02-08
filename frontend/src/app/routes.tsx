import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RootLayout from './RootLayout'

const HomePage = lazy(() => import('@/pages/HomePage'))
const DicePage = lazy(() => import('@/pages/DicePage'))
const PokerPage = lazy(() => import('@/pages/PokerPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))

function PageLoader() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function LazyPage({ Component }: { Component: React.LazyExoticComponent<() => React.JSX.Element> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LazyPage Component={HomePage} /> },
      { path: 'dice', element: <LazyPage Component={DicePage} /> },
      { path: 'poker', element: <LazyPage Component={PokerPage} /> },
      { path: 'profile', element: <LazyPage Component={ProfilePage} /> },
    ],
  },
])
