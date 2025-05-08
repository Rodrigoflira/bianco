"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function NovoOrcamento() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  
  // Dados do orçamento
  const [quotationNumber, setQuotationNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");
  
  // Dados do cliente novo
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientCity, setNewClientCity] = useState("");
  const [newClientState, setNewClientState] = useState("");
  
  // Itens do orçamento
  const [items, setItems] = useState([
    { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }
  ]);
  
  // Carregar usuário e clientes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }
        
        setUser(user);
        
        // Gerar número do orçamento automático
        const timestamp = new Date().getTime().toString().slice(-6);
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        setQuotationNumber(`ORC-${timestamp}-${randomNum}`);
        
        // Preencher datas
        const today = new Date();
        setIssueDate(today.toISOString().split('T')[0]);
        
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        setValidUntil(thirtyDaysLater.toISOString().split('T')[0]);
        
        // Carregar clientes
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id);
        
        if (clientsError) throw clientsError;
        
        setClients(clientsData || []);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    
    loadData();
  }, [router]);
  
  // Função para adicionar novo cliente
  const handleAddClient = async (e) => {
    e.preventDefault();
    
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("clients")
        .insert([
          {
            user_id: user.id,
            name: newClientName,
            email: newClientEmail,
            phone: newClientPhone,
            address: newClientAddress,
            city: newClientCity,
            state: newClientState
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Adicionar novo cliente à lista e selecioná-lo
      setClients([...clients, data[0]]);
      setSelectedClient(data[0].id);
      setShowClientForm(false);
      
      // Limpar formulário
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientAddress("");
      setNewClientCity("");
      setNewClientState("");
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      alert("Erro ao adicionar cliente: " + error.message);
    }
  };
  
  // Funções para manipular itens do orçamento
  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };
  
  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Calcular o preço total do item
    if (field === "quantity" || field === "unitPrice") {
      const quantity = field === "quantity" ? parseFloat(value) || 0 : parseFloat(newItems[index].quantity) || 0;
      const unitPrice = field === "unitPrice" ? parseFloat(value) || 0 : parseFloat(newItems[index].unitPrice) || 0;
      newItems[index].totalPrice = (quantity * unitPrice).toFixed(2);
    }
    
    setItems(newItems);
  };
  
  // Calcular total do orçamento
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + parseFloat(item.totalPrice || 0);
    }, 0).toFixed(2);
  };
  
  // Salvar orçamento
  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    
    if (!selectedClient) {
      alert("Por favor, selecione ou adicione um cliente");
      return;
    }
    
    if (items.length === 0 || !items[0].description) {
      alert("Por favor, adicione pelo menos um item ao orçamento");
      return;
    }
    
    setLoading(true);
    
    try {
      if (!user) return;
      
      // Inserir orçamento
      const { data: quotationData, error: quotationError } = await supabase
        .from("quotations")
        .insert([
          {
            user_id: user.id,
            client_id: selectedClient,
            quotation_number: quotationNumber,
            issue_date: issueDate,
            valid_until: validUntil,
            total_amount: calculateTotal(),
            status: status,
            notes: notes
          }
        ])
        .select();
      
      if (quotationError) throw quotationError;
      
      // Inserir itens do orçamento
      const quotationItems = items.map(item => ({
        quotation_id: quotationData[0].id,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unitPrice) || 0,
        total_price: parseFloat(item.totalPrice) || 0
      }));
      
      const { error: itemsError } = await supabase
        .from("quotation_items")
        .insert(quotationItems);
      
      if (itemsError) throw itemsError;
      
      // Atualizar contagem de orçamentos do usuário - versão corrigida
      const { data: incrementData, error: incrementError } = await supabase.rpc('increment', { x: 1 });
      
      if (incrementError) throw incrementError;
      
      // Depois, atualize o campo quotation_count com o novo valor
      const { error: userError } = await supabase
        .from("users")
        .update({ quotation_count: incrementData })
        .eq("id", user.id);
      
      if (userError) throw userError;
      
      alert("Orçamento criado com sucesso!");
      router.push("/dashboard/orcamentos");
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
      alert("Erro ao salvar orçamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Novo Orçamento</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Informações do Orçamento</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número do Orçamento
            </label>
            <input
              type="text"
              value={quotationNumber}
              onChange={(e) => setQuotationNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Emissão
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Válido Até
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <div className="flex space-x-2">
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={showClientForm}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowClientForm(!showClientForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                {showClientForm ? "Cancelar" : "Novo Cliente"}
              </button>
            </div>
          </div>
        </div>
        
        {/* Formulário de novo cliente */}
        {showClientForm && (
          <div className="border border-gray-200 rounded-md p-4 mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">Novo Cliente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={newClientCity}
                  onChange={(e) => setNewClientCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={newClientState}
                  onChange={(e) => setNewClientState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddClient}
                className="px-4 py-2 bg-green-600 text-white rounded-md"
              >
                Adicionar Cliente
              </button>
            </div>
          </div>
        )}
        
        {/* Observações */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          ></textarea>
        </div>
        
        <h2 className="text-lg font-medium text-gray-900 mb-4">Itens do Orçamento</h2>
        
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Unitário
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded-md"
                      placeholder="Descrição do item"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      className="w-20 px-3 py-1 border border-gray-300 rounded-md"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R$</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                        className="w-32 pl-10 px-3 py-1 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R$</span>
                      </div>
                      <input
                        type="text"
                        value={item.totalPrice}
                        readOnly
                        className="w-32 pl-10 px-3 py-1 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-900"
                      disabled={items.length === 1}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5" className="px-4 py-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm"
                  >
                    Adicionar Item
                  </button>
                </td>
              </tr>
              <tr>
                <td colSpan="3" className="px-4 py-2 text-right font-medium">
                  Total do Orçamento:
                </td>
                <td className="px-4 py-2 font-medium">
                  R$ {calculateTotal()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/orcamentos")}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveQuotation}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            {loading ? "Salvando..." : "Salvar Orçamento"}
          </button>
        </div>
      </div>
    </div>
  );
}