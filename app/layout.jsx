import './globals.css';

export const metadata = {
  title: 'Sistema de Orçamentos',
  description: 'Sistema profissional para gerenciamento de orçamentos',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}