import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export default function TestCreateUser() {
  const [email, setEmail] = useState('test.novo.usuario@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fazer logout ao carregar a página para evitar problemas de sessão
  useEffect(() => {
    supabase.auth.signOut();
  }, []);

  const testCreateUser = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-create-user', {
        body: { email }
      });

      if (error) {
        setError(error.message);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Teste de Criação de Usuário</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de Teste
            </label>
            <input
              type="email"
              defaultValue="test.novo.usuario@gmail.com"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@exemplo.com"
            />
          </div>

          <button
            onClick={testCreateUser}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Testando...' : 'Testar Criação de Usuário'}
          </button>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Erro:</strong> {error}
            </div>
          )}

          {result && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              <strong>Sucesso:</strong>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>Após testar, verifique os logs em:</p>
          <a 
            href="https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/functions" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Supabase Functions → test-create-user
          </a>
        </div>
      </div>
    </div>
  );
}
