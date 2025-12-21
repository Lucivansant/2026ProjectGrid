import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/**
 * Componente ProtectedRoute (Rota Protegida)
 * Um wrapper para rotas que exigem autenticação.
 * Verifica a existência de uma sessão ativa e monitora mudanças no estado de autenticação.
 * Redireciona usuários não autenticados para a página de login.
 */
const ProtectedRoute = () => {
  const [loading, setLoading] = useState(true) // Rastreia se a verificação inicial de autenticação está em progresso
  const [authenticated, setAuthenticated] = useState(false) // Rastreia o status de login do usuário

  /**
   * Efeito de Verificação de Autenticação
   * Executado uma única vez na montagem para verificar a sessão atual e configurar um ouvinte para alterações.
   */
  useEffect(() => {
    // Verificação inicial da sessão
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setAuthenticated(!!session)
      setLoading(false)
    }
    
    checkAuth()

    // Ouve mudanças no estado de autenticação (login, logout, renovação de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
    })

    // Limpeza: para de ouvir quando o componente é desmontado
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return authenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectedRoute
