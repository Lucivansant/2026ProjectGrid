import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, LogIn } from 'lucide-react'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Ops! Algo deu errado.
        </h1>
        
        <p className="text-slate-600 mb-8">
          A página que você está procurando não existe ou sua sessão expirou. Por favor, faça login novamente.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-indigo-200"
        >
          <LogIn className="w-5 h-5" />
          Fazer Login Novamente
        </button>
      </div>
      
      <p className="mt-8 text-sm text-slate-400">
        ProjectGrid 2026 &copy; Todos os direitos reservados
      </p>
    </div>
  )
}

export default NotFound
