"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateQuotationPDF, downloadPDF } from "@/lib/pdfGenerator";
import { use } from 'react';

export default function OrcamentoPage({ params }) {
  const router = useRouter();
  // Usar React.use() para desempacotar o objeto params
  const { id } = use(params);
  const previewRef = useRef(null);
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrcamento = async () => {
      try {
        setLoading(true);
        
        // Verificar autenticação
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }
        
        // Buscar dados do orçamento
        const { data: orcamentoData, error: orcamentoError } = await supabase
          .from("quotations")
          .select(`
            *,
            clients:client_id(*),
            quotation_items(*)
          `)
          .eq("id", id)
          .eq("user_id", user.id)
          .single();
        
        if (orcamentoError) throw orcamentoError;
        if (!orcamentoData) throw new Error("Orçamento não encontrado");
        
        setOrcamento(orcamentoData);
      } catch (error) {
        console.error("Erro ao carregar orçamento:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchOrcamento();
    }
  }, [id, router]);

  // Função para buscar a URL do logo do usuário que criou o orçamento
  const getLogoUrl = async (userId) => {
    try {
      // Buscar logo_url da tabela users
      const { data, error } = await supabase
        .from("users")
        .select("logo_url")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      
      return data?.logo_url || null;
    } catch (error) {
      console.error("Erro ao buscar URL do logo:", error);
      return null;
    }
  };

  // Função para gerar e baixar o PDF
  const handleGeneratePDF = async () => {
    if (!orcamento) return;
    
    try {
      setPdfLoading(true);
      
      // Buscar o URL do logo
      const logoUrl = await getLogoUrl(orcamento.user_id);
      console.log("URL do logo recuperada:", logoUrl);
      
      // Converter o logo para um formato utilizável pelo PDF
      let logoData = null;
      
      if (logoUrl) {
        try {
          console.log("Tentando buscar logo da URL:", logoUrl);
          // Adicionar timestamp para evitar cache
          const urlWithCache = `${logoUrl}?t=${new Date().getTime()}`;
          const response = await fetch(urlWithCache, { mode: 'cors' }); 
          console.log("Resposta do fetch:", response.status, response.statusText);
          
          if (response.ok) {
            const blob = await response.blob();
            console.log("Blob obtido:", blob.type, blob.size, "bytes");
            
            if (blob.size > 0) {
              logoData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result;
                  console.log("Imagem convertida para data URL. Tamanho:", result.length);
                  resolve(result);
                };
                reader.readAsDataURL(blob);
              });
              
              console.log("Logo data URL gerada com sucesso");
            } else {
              console.error("Blob de imagem vazio");
            }
          } else {
            console.error("Falha ao buscar logo:", response.status, response.statusText);
          }
        } catch (logoError) {
          console.error("Erro detalhado ao processar logo:", logoError);
          // Continuar sem logo
        }
      } else {
        console.log("Nenhuma URL de logo disponível");
      }
      
      // Verificar se temos dados de imagem válidos
      console.log("Dados de logo para PDF:", logoData ? `Recebido (${typeof logoData}, ${logoData.substring(0, 50)}...)` : "Nenhum");
      
      // Gerar o PDF com o logo
      const pdfBytes = await generateQuotationPDF(orcamento, logoData);
      
      // Iniciar o download
      downloadPDF(pdfBytes, `Orcamento-${orcamento.quotation_number}.pdf`);
      
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar o PDF. Por favor, tente novamente.");
    } finally {
      setPdfLoading(false);
    }
  };

  // Função para imprimir orçamento (método anterior)
  const handlePrint = () => {
    if (previewRef.current) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Por favor, permita popups para imprimir o orçamento.");
        return;
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Orçamento ${orcamento?.quotation_number || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .info-section { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f2f2f2; }
              .total { font-weight: bold; text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              ${previewRef.current.innerHTML}
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    }
  };

  // Função para voltar à lista de orçamentos
  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return <div className="p-4">Carregando orçamento...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Erro: {error}
        </div>
        <button 
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!orcamento) {
    return <div className="p-4">Orçamento não encontrado.</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Orçamento #{orcamento.quotation_number}
        </h1>
        <div className="flex space-x-2">
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
          >
            Voltar
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-500 text-white rounded-md"
          >
            Imprimir
          </button>
          <button 
            onClick={handleGeneratePDF}
            disabled={pdfLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
          >
            {pdfLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gerando PDF...
              </>
            ) : (
              "Baixar PDF"
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6" ref={previewRef}>
        {/* Conteúdo do orçamento que será impresso */}
        <div className="header">
          <h2 className="text-xl font-bold mb-1">ORÇAMENTO</h2>
          <p className="text-gray-600">{orcamento.quotation_number}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="info-section">
            <h3 className="text-md font-medium text-gray-900 mb-2">Informações do Cliente</h3>
            <p><strong>Nome:</strong> {orcamento.clients?.name}</p>
            {orcamento.clients?.email && <p><strong>Email:</strong> {orcamento.clients.email}</p>}
            {orcamento.clients?.phone && <p><strong>Telefone:</strong> {orcamento.clients.phone}</p>}
            {orcamento.clients?.address && <p><strong>Endereço:</strong> {orcamento.clients.address}</p>}
            {(orcamento.clients?.city || orcamento.clients?.state) && (
              <p>
                <strong>Cidade/Estado:</strong> {orcamento.clients.city}
                {orcamento.clients.city && orcamento.clients.state && ", "}
                {orcamento.clients.state}
              </p>
            )}
          </div>
          
          <div className="info-section">
            <h3 className="text-md font-medium text-gray-900 mb-2">Detalhes do Orçamento</h3>
            <p><strong>Data de Emissão:</strong> {new Date(orcamento.issue_date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Válido Até:</strong> {new Date(orcamento.valid_until).toLocaleDateString('pt-BR')}</p>
            <p>
              <strong>Status:</strong> {" "}
              <span className={`
                ${orcamento.status === 'approved' ? 'text-green-600' : ''} 
                ${orcamento.status === 'pending' ? 'text-yellow-600' : ''} 
                ${orcamento.status === 'rejected' ? 'text-red-600' : ''}
              `}>
                {orcamento.status === 'approved' ? 'Aprovado' : 
                 orcamento.status === 'pending' ? 'Pendente' : 
                 orcamento.status === 'rejected' ? 'Rejeitado' : orcamento.status}
              </span>
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-2">Itens do Orçamento</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Unitário
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orcamento.quotation_items && orcamento.quotation_items.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 text-sm">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">R$ {parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right">R$ {parseFloat(item.total_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="px-4 py-3 text-right font-medium">
                    Total do Orçamento:
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">
                    R$ {parseFloat(orcamento.total_amount).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        {orcamento.notes && (
          <div className="mb-4">
            <h3 className="text-md font-medium text-gray-900 mb-2">Observações</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-gray-700 whitespace-pre-line">{orcamento.notes}</p>
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 text-center mt-8 pt-4 border-t border-gray-200">
          Orçamento gerado pelo sistema em {new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>
  );
}