"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

export default function OrcamentosList() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Obter orçamentos
        const { data, error } = await supabase
          .from("quotations")
          .select(`
            id, 
            quotation_number, 
            issue_date, 
            total_amount, 
            status,
            clients (id, name)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        setQuotations(data || []);
      } catch (error) {
        console.error("Erro ao carregar orçamentos:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotations();
  }, []);

  const deleteQuotation = async (id) => {
    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
      try {
        const { error } = await supabase
          .from("quotations")
          .delete()
          .eq("id", id);
        
        if (error) throw error;
        
        // Atualiza a lista de orçamentos
        setQuotations(quotations.filter(q => q.id !== id));
      } catch (error) {
        console.error("Erro ao excluir orçamento:", error);
        alert("Erro ao excluir orçamento");
      }
    }
  };

  if (loading) {
    return <div className="animate-pulse">Carregando orçamentos...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Orçamentos</h1>
        <Link
          href="/dashboard/orcamentos/novo"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
        >
          Novo Orçamento
        </Link>
      </div>
      
      <div className="mt-2 flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quotations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                        Nenhum orçamento encontrado. 
                        <Link href="/dashboard/orcamentos/novo" className="text-blue-600 font-medium ml-1">
                          Criar seu primeiro orçamento
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    quotations.map((quotation) => (
                      <tr key={quotation.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {quotation.quotation_number || `#${quotation.id.substring(0, 8)}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {quotation.clients?.name || "Cliente não especificado"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {quotation.issue_date ? new Date(quotation.issue_date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quotation.total_amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            quotation.status === 'approved' ? 'bg-green-100 text-green-800' :
                            quotation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            quotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {quotation.status || "Pendente"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link 
                            href={`/dashboard/orcamentos/${quotation.id}`} 
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Visualizar
                          </Link>
                          <button
                            onClick={() => deleteQuotation(quotation.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}