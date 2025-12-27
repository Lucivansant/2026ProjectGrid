import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(!!sessionId);

  useEffect(() => {
    if (sessionId) {
      const fetchCredentials = async () => {
        // Poll for a few seconds because webhook might be slightly slower than redirect
        let attempts = 0;
        const maxAttempts = 5;
        
        const poll = async () => {
             const { data, error } = await supabase
              .rpc('get_temp_access', { p_session_id: sessionId });

            if (data && data.email) {
                setCredentials(data);
                setLoading(false);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, 1000); // Retry every second
            } else {
                setLoading(false); // Give up
            }
        };
        
        poll();
      };
      
      fetchCredentials();
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
        
        {/* Icon */}
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Pagamento Confirmado!</h1>
        
        <p className="text-slate-300 mb-6 leading-relaxed">
          Obrigado por assinar o ProjectGrid PRO.
        </p>

        {/* Credentials Box */}
        {loading && (
             <div className="bg-slate-900/50 p-4 rounded-lg mb-6 animate-pulse">
                <p className="text-slate-400 text-sm">Gerando seu acesso...</p>
             </div>
        )}

        {credentials && (
            <div className="bg-indigo-900/30 border border-indigo-500/30 p-5 rounded-xl mb-8 text-left">
                <h3 className="text-indigo-400 font-semibold mb-3 text-sm uppercase tracking-wider">Seus Dados de Acesso</h3>
                
                <div className="mb-3">
                    <label className="text-xs text-slate-400 block mb-1">E-mail</label>
                    <code className="bg-black/30 px-2 py-1 rounded text-white block w-full select-all">
                        {credentials.email}
                    </code>
                </div>
                
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Senha Provisória</label>
                    <div className="flex gap-2">
                        <code className="bg-black/30 px-2 py-1 rounded text-green-400 font-bold block w-full tracking-wider select-all">
                            {credentials.temp_password}
                        </code>
                    </div>
                </div>

                <p className="text-xs text-slate-500 mt-3 text-center">
                    Salve estes dados! Você poderá alterar a senha depois.
                </p>
            </div>
        )}

        {!credentials && !loading && (
             <p className="text-slate-400 mb-8 text-sm bg-slate-900/50 p-3 rounded">
                Se você já tinha conta, seu plano foi atualizado automaticamente.
             </p>
        )}

        <div className="space-y-4">
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
          >
            Acessar Plataforma
          </button>
        </div>
      </div>
    </div>
  );
}
