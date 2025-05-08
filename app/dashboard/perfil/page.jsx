"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Perfil() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [userProfile, setUserProfile] = useState({
    full_name: "",
    company_name: "",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    primary_color: "#3b82f6",
    logo_url: "",
  });
  
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }
      
      setUser(user);
      
      // Buscar perfil do usuário
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        setUserProfile({
          full_name: data.full_name || "",
          company_name: data.company_name || "",
          company_address: data.company_address || "",
          company_phone: data.company_phone || "",
          company_email: data.company_email || "",
          company_website: data.company_website || "",
          primary_color: data.primary_color || "#3b82f6",
          logo_url: data.logo_url || "",
        });
      }
      
      setLoading(false);
    };
    
    getUser();
  }, [router]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserProfile({ ...userProfile, [name]: value });
  };
  
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Verificar tamanho do arquivo (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("O arquivo é muito grande. Tamanho máximo: 2MB");
      return;
    }
    
    // Verificar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido.");
      return;
    }
    
    setUploadingLogo(true);
    
    try {
      // Criar nome único para o arquivo
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload do arquivo para o Storage
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);
      
      // Atualizar perfil do usuário com a URL do logo
      setUserProfile({ ...userProfile, logo_url: publicUrl });
      
    } catch (error) {
      console.error("Erro ao fazer upload do logo:", error);
      alert("Erro ao fazer upload do logo: " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: userProfile.full_name,
          company_name: userProfile.company_name,
          company_address: userProfile.company_address,
          company_phone: userProfile.company_phone,
          company_email: userProfile.company_email,
          company_website: userProfile.company_website,
          primary_color: userProfile.primary_color,
          logo_url: userProfile.logo_url,
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      alert("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      alert("Erro ao atualizar perfil: " + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Perfil da Empresa</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Pessoais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={userProfile.full_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informações da Empresa</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logotipo da Empresa
              </label>
              <div className="flex items-center">
                <div className="mr-4 border border-gray-300 rounded-md p-2 bg-gray-50 w-32 h-32 flex items-center justify-center">
                  {userProfile.logo_url ? (
                    <img
                      src={userProfile.logo_url}
                      alt="Logo da empresa"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm text-center">
                      Nenhum logo<br />carregado
                    </span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploadingLogo}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {uploadingLogo ? "Enviando..." : "Carregar Logo"}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos: JPG, PNG. Tamanho máximo: 2MB
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={userProfile.company_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  name="company_address"
                  value={userProfile.company_address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  name="company_phone"
                  value={userProfile.company_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="company_email"
                  value={userProfile.company_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  name="company_website"
                  value={userProfile.company_website}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor Principal
                </label>
                <div className="flex items-center">
                  <input
                    type="color"
                    name="primary_color"
                    value={userProfile.primary_color}
                    onChange={handleChange}
                    className="w-12 h-10 border-0 p-0 mr-2"
                  />
                  <input
                    type="text"
                    name="primary_color"
                    value={userProfile.primary_color}
                    onChange={handleChange}
                    className="w-28 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 mr-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}