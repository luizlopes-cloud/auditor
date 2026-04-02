'use client'

import { useState, useEffect } from 'react'

const KEY = 'auditor_admin'
const PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? 'seazone2026'

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem(KEY) === 'true')
  }, [])

  const login = (): boolean => {
    const pin = prompt('PIN de administrador:')
    if (pin === PIN) {
      sessionStorage.setItem(KEY, 'true')
      setIsAdmin(true)
      return true
    }
    return false
  }

  const logout = () => {
    sessionStorage.removeItem(KEY)
    setIsAdmin(false)
  }

  return { isAdmin, login, logout }
}
