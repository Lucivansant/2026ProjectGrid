import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Success() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">Pagamento Confirmado!</h1>
        
        <p className="text-slate-300 mb-8 leading-relaxed">
          Obrigado por assinar o ProjectGrid PRO. <br/>
          <span className="text-indigo-400 font-semibold">Verifique seu e-mail</span> agora mesmo para criar sua senha e acessar a plataforma.
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Ir para Login
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-transparent text-slate-400 hover:text-white font-medium py-2 transition-colors text-sm"
          >
            Voltar para Início
          </button>
        </div>
      </div>
    </div>
  );
}
