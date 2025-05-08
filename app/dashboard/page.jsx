'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase'; // ajuste o caminho se for diferente

export default function DashboardPage() {
  const [perfilCompleto, setPerfilCompleto] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPerfil() {
      // pega usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // busca company_name e logo_url na tabela users
      const { data: perfil, error } = await supabase
        .from('users')
        .select('company_name, logo_url')
        .eq('id', user.id)
        .single();

      if (perfil && (!perfil.company_name || !perfil.logo_url)) {
        setPerfilCompleto(false);
      }

      setLoading(false);
    }

    checkPerfil();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      { !perfilCompleto && (
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-yellow-400">
          <div className="px-4 py-5 sm:p-6 flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Complete seu perfil</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Adicione o logo e informações da sua empresa para personalizar seus orçamentos.
              </p>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6 text-right">
            <Link href="/dashboard/perfil" className="font-medium text-yellow-600 hover:text-yellow-500">
              Atualizar perfil &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Aqui entram os outros cards do seu dashboard, por exemplo: */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        {/* Card 2 */}
        {/* etc. */}
      </div>
    </div>
  );
}
