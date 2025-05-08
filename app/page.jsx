export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold mb-6">
          Sistema de Orçamentos
        </h1>
        
        <p className="mt-3 text-xl max-w-2xl mx-auto">
          Gerencie orçamentos de forma simples e eficiente.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/auth/login" className="bg-blue-600 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-blue-700">
            Acessar Sistema
          </a>
          
          <a href="/auth/register" className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-md text-lg font-medium hover:bg-gray-50">
            Criar Conta
          </a>
        </div>
      </main>
    </div>
  );
}