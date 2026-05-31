import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('sokogate_token')
    const savedUser = localStorage.getItem('sokogate_user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch { /* invalid stored user */ }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    setError(null)
    try {
      const res = await authAPI.login(email, password)
      const { tokens, user: userData } = res.data.data
      const token = tokens.accessToken
      const refreshToken = tokens.refreshToken
      localStorage.setItem('sokogate_token', token)
      localStorage.setItem('sokogate_refresh', refreshToken)
      localStorage.setItem('sokogate_user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed'
      setError(msg)
      throw new Error(msg)
    }
  }

  const register = async (data) => {
    setError(null)
    try {
      const res = await authAPI.register(data)
      const { tokens, user: userData } = res.data.data
      const token = tokens.accessToken
      const refreshToken = tokens.refreshToken
      localStorage.setItem('sokogate_token', token)
      localStorage.setItem('sokogate_refresh', refreshToken)
      localStorage.setItem('sokogate_user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed'
      setError(msg)
      throw new Error(msg)
    }
  }

  const logout = () => {
    localStorage.removeItem('sokogate_token')
    localStorage.removeItem('sokogate_refresh')
    localStorage.removeItem('sokogate_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, error, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
