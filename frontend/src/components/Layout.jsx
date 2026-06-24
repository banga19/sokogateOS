import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useDarkMode from '../hooks/useDarkMode'
import { healthAPI } from '../services/api'

// https://heroicons.com — outlined set
const Icons = {
  dashboard: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  procurement: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  logistics: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>,
  executive: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  qme: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  whatsapp: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>,
  trust: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
  customs: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  health: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.66 5.66a2 2 0 01-2.83 0l-1.41-1.41a2 2 0 010-2.83l5.66-5.66m4.25 4.25l5.66-5.66a2 2 0 000-2.83l-1.41-1.41a2 2 0 00-2.83 0l-5.66 5.66" /></svg>,
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { to: '/procurement', label: 'Procurement', icon: Icons.procurement },
  { to: '/logistics', label: 'Logistics', icon: Icons.logistics },
  { to: '/executive', label: 'Executive', icon: Icons.executive },
  { to: '/qme', label: 'QMe Tasks', icon: Icons.qme },
  { to: '/whatsapp', label: 'WhatsApp', icon: Icons.whatsapp },
  { to: '/supplier-trust', label: 'Trust Network', icon: Icons.trust },
  { to: '/customs', label: 'Customs', icon: Icons.customs },
  { to: '/hermes-admin?tab=health', label: 'System Health', icon: Icons.health },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const [isDark, toggleDark] = useDarkMode()
  const [healthData, setHealthData] = useState(null) // { summary, checks, status } | null
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [lastChecked, setLastChecked] = useState(null) // Date | null

  const timeAgo = lastChecked
    ? (() => {
        const sec = Math.floor((Date.now() - lastChecked.getTime()) / 1000)
        if (sec < 60) return 'just now'
        const min = Math.floor(sec / 60)
        if (min < 60) return `${min}m ago`
        return `${Math.floor(min / 60)}h ${min % 60}m ago`
      })()
    : ''
  const healthStatus = healthData
    ? healthData.summary?.requiredFailed > 0 ? 'degraded' : 'healthy'
    : null

  // Poll health status every 60s for the sidebar indicator
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await healthAPI.check()
        setHealthData(res.data)
        setLastChecked(new Date())
      } catch {
        // On fetch error, keep previous data so the dot remains visible
        // The 60s poll will retry
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-200 flex-shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
              SG
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white text-sm">SokogateOS</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">AI Trade Operating System</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/50'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
              {item.to.startsWith('/hermes-admin') && healthStatus && (
                <span
                  className="relative ml-auto flex-shrink-0 group"
                  onMouseEnter={() => setPopoverOpen(true)}
                  onMouseLeave={() => setPopoverOpen(false)}
                >
                  {/* Status dot */}
                  <span
                    className={`block w-2 h-2 rounded-full ${
                      healthStatus === 'healthy'
                        ? 'bg-green-500'
                        : 'bg-red-500 animate-pulse'
                    }`}
                  />

                  {/* Popover */}
                  {popoverOpen && (
                    <div
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 w-64"
                      onMouseEnter={() => setPopoverOpen(true)}
                      onMouseLeave={() => setPopoverOpen(false)}
                    >
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
                        {/* Arrow */}
                        <div className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-l border-b border-gray-200 dark:border-gray-700 -rotate-45" />

                        {healthStatus === 'healthy' ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-200 font-medium">All services healthy</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-200 font-medium">
                                {healthData.summary.requiredFailed} service{healthData.summary.requiredFailed > 1 ? 's' : ''} degraded
                              </span>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {healthData.checks
                                ?.filter((c) => !c.ok)
                                .slice(0, 6)
                                .map((check) => (
                                  <div
                                    key={check.key || check.name}
                                    className="flex items-start gap-2 text-xs pl-4"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1" />
                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-600 dark:text-gray-400 truncate">
                                        {check.name}
                                      </p>
                                      {check.message && (
                                        <p className="text-gray-400 dark:text-gray-500 truncate">
                                          {check.message}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                            {healthData.checks?.filter((c) => !c.ok).length > 6 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 pl-4">
                                +{healthData.checks.filter((c) => !c.ok).length - 6} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {lastChecked && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500">
                          Checked {timeAgo}
                        </div>
                      )}
                    </div>
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: dark mode toggle + user */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-xs font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.role || user?.email || ''}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
