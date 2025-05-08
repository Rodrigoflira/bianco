"use client";

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Gera um PDF a partir de um objeto de orçamento
 * @param {Object} orcamento - O objeto de orçamento completo com itens e cliente
 * @param {Uint8Array|string} logoData - O logo da empresa em formato bytes ou string base64
 * @returns {Promise<Uint8Array>} - O PDF gerado como array de bytes
 */
export async function generateQuotationPDF(orcamento, logoData = null) {
  // Criar um novo documento PDF
  const pdfDoc = await PDFDocument.create();
  
  // Adicionar uma página em branco
  const page = pdfDoc.addPage([595.28, 841.89]); // Tamanho A4 em pontos
  
  // Obter as fontes padrão
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Definir margens
  const margin = 50;
  const width = page.getWidth() - 2 * margin;
  
  // Cores
  const primaryColor = rgb(0, 0.47, 0.8); // Azul corporativo
  const textColor = rgb(0.1, 0.1, 0.1); // Quase preto
  const lightGray = rgb(0.9, 0.9, 0.9);
  
  // Posição inicial (topo da página após margem)
  let y = page.getHeight() - margin;
  
  // Função de utilidade para desenhar texto
  const drawText = (text, { fontSize = 12, font = helveticaFont, color = textColor, x = margin, yPos = null, maxWidth = width } = {}) => {
    if (yPos === null) {
      yPos = y;
    }
    
    page.drawText(text, {
      x,
      y: yPos,
      size: fontSize,
      font,
      color,
      maxWidth,
    });
    
    return fontSize + 5; // Retorna o espaço usado + um pouco de espaço extra
  };
  
  // Função para desenhar uma linha
  const drawLine = (startX, startY, endX, endY, { color = textColor, thickness = 1 } = {}) => {
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      thickness,
      color,
    });
  };
  
  // Função para desenhar retângulo
  const drawRect = (x, y, width, height, { color = lightGray } = {}) => {
    page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      color,
    });
  };
  
  // Adicionar logotipo
  try {
    // Se logoData for fornecido e for uma string não vazia
    if (logoData && typeof logoData === 'string' && logoData.length > 0) {
      let logoImageBytes;
      console.log("Processando logo para PDF. Tipo:", typeof logoData);
      
      // É uma string URL ou base64
      if (logoData.startsWith('data:image')) {
        // É uma string base64 com prefixo data URL
        console.log("Logo em formato data URL detectado");
        const base64Data = logoData.split(',')[1];
        
        if (!base64Data || base64Data.length === 0) {
          console.error("Dados base64 vazios após split");
          throw new Error("Dados base64 vazios");
        }
        
        console.log("Base64 extraído. Tamanho:", base64Data.length);
        
        try {
          logoImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          console.log("Conversão para bytes bem-sucedida. Tamanho do array:", logoImageBytes.length);
          
          if (logoImageBytes.length === 0) {
            console.error("Array de bytes vazio após conversão");
            throw new Error("Array de bytes vazio");
          }
          
          // Incorporar a imagem ao documento PDF
          const logoImage = await pdfDoc.embedPng(logoImageBytes);
          console.log("Imagem incorporada com sucesso. Dimensões:", logoImage.width, "x", logoImage.height);
          
          // Dimensões e posição do logotipo
          const logoWidth = 150;
          const logoHeight = logoWidth / (logoImage.width / logoImage.height);
          
          // Desenhar o logotipo no canto superior direito
          page.drawImage(logoImage, {
            x: page.getWidth() - margin - logoWidth,
            y: page.getHeight() - margin - logoHeight / 2,
            width: logoWidth,
            height: logoHeight,
          });
          console.log("Logo desenhado no PDF com sucesso");
        } catch (e) {
          console.error("Erro ao processar imagem:", e);
          // Continuar sem o logo
        }
      } else {
        console.log("Formato de logo não suportado, deve ser uma data URL");
      }
    } else {
      console.log("Nenhum logo válido fornecido, continuando sem logo", 
        logoData ? `Tipo: ${typeof logoData}, Comprimento: ${typeof logoData === 'string' ? logoData.length : 'N/A'}` : 'null');
    }
    
  } catch (error) {
    console.error('Erro detalhado ao adicionar logotipo:', error);
    // Continuar sem o logotipo em caso de erro
  }
  
  // Cabeçalho do documento
  const headerHeight = drawText("ORÇAMENTO", { 
    fontSize: 24, 
    font: helveticaBold, 
    color: primaryColor
  });
  
  y -= headerHeight;
  
  // Número do orçamento
  const quotNumberHeight = drawText(`Nº ${orcamento.quotation_number}`, { 
    fontSize: 12,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  y -= quotNumberHeight + 20;
  
  // Dados do cliente e orçamento em duas colunas
  const colWidth = width / 2 - 10;
  
  // Coluna da esquerda - Informações do cliente
  let leftColY = y;
  
  // Título da seção
  leftColY -= drawText("DADOS DO CLIENTE", { 
    fontSize: 10, 
    font: helveticaBold,
    yPos: leftColY 
  });
  
  // Nome do cliente
  leftColY -= 15;
  drawRect(margin, leftColY, colWidth, 20);
  leftColY -= drawText(`Cliente: ${orcamento.clients?.name || ""}`, { 
    fontSize: 10,
    yPos: leftColY - 15
  });
  
  // Email e telefone
  leftColY -= 25;
  drawText(`Email: ${orcamento.clients?.email || ""}`, { 
    fontSize: 10,
    yPos: leftColY
  });
  
  leftColY -= 20;
  drawText(`Telefone: ${orcamento.clients?.phone || ""}`, { 
    fontSize: 10,
    yPos: leftColY
  });
  
  // Endereço
  leftColY -= 20;
  drawText(`Endereço: ${orcamento.clients?.address || ""}`, { 
    fontSize: 10,
    yPos: leftColY
  });
  
  leftColY -= 20;
  const locationText = [
    orcamento.clients?.city || "",
    orcamento.clients?.state || ""
  ].filter(Boolean).join(", ");
  
  drawText(`Cidade/Estado: ${locationText}`, { 
    fontSize: 10,
    yPos: leftColY
  });
  
  // Coluna da direita - Informações do orçamento
  let rightColY = y;
  const rightColX = margin + colWidth + 20;
  
  // Título da seção
  rightColY -= drawText("DETALHES DO ORÇAMENTO", { 
    fontSize: 10, 
    font: helveticaBold,
    x: rightColX,
    yPos: rightColY 
  });
  
  // Formatar as datas
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Data de emissão
  rightColY -= 15;
  drawRect(rightColX, rightColY, colWidth, 20);
  rightColY -= drawText(`Data de Emissão: ${formatDate(orcamento.issue_date)}`, { 
    fontSize: 10,
    x: rightColX,
    yPos: rightColY - 15
  });
  
  // Válido até
  rightColY -= 25;
  drawText(`Válido Até: ${formatDate(orcamento.valid_until)}`, { 
    fontSize: 10,
    x: rightColX,
    yPos: rightColY
  });
  
  // Status
  rightColY -= 20;
  let statusText = "Pendente";
  let statusColor = rgb(0.9, 0.7, 0.1); // Amarelo para pendente
  
  if (orcamento.status === 'approved') {
    statusText = "Aprovado";
    statusColor = rgb(0.2, 0.7, 0.2); // Verde para aprovado
  } else if (orcamento.status === 'rejected') {
    statusText = "Rejeitado";
    statusColor = rgb(0.8, 0.2, 0.2); // Vermelho para rejeitado
  }
  
  drawText(`Status: `, { 
    fontSize: 10,
    x: rightColX,
    yPos: rightColY
  });
  
  // Status com cor específica
  drawText(statusText, { 
    fontSize: 10,
    font: helveticaBold,
    color: statusColor,
    x: rightColX + 40,
    yPos: rightColY
  });
  
  // Usar a posição Y mais baixa entre as duas colunas
  y = Math.min(leftColY, rightColY) - 40;
  
  // Tabela de itens
  const tableTitle = drawText("ITENS DO ORÇAMENTO", { 
    fontSize: 12, 
    font: helveticaBold,
    yPos: y 
  });
  
  y -= tableTitle + 10;
  
  // Cabeçalho da tabela
  const tableTop = y;
  drawRect(margin, y, width, 25, { color: lightGray });
  
  y -= 17;
  const columnWidths = [width * 0.5, width * 0.15, width * 0.15, width * 0.2];
  const columnStarts = [
    margin, 
    margin + columnWidths[0], 
    margin + columnWidths[0] + columnWidths[1], 
    margin + columnWidths[0] + columnWidths[1] + columnWidths[2]
  ];
  
  // Títulos das colunas
  drawText("Descrição", { 
    fontSize: 10, 
    font: helveticaBold,
    x: columnStarts[0] + 5,
    yPos: y
  });
  
  drawText("Quantidade", { 
    fontSize: 10, 
    font: helveticaBold,
    x: columnStarts[1] + 5,
    yPos: y
  });
  
  drawText("Preço Unit.", { 
    fontSize: 10, 
    font: helveticaBold,
    x: columnStarts[2] + 5,
    yPos: y
  });
  
  drawText("Total", { 
    fontSize: 10, 
    font: helveticaBold,
    x: columnStarts[3] + 5,
    yPos: y
  });
  
  y -= 20;
  
  // Linha após o cabeçalho
  drawLine(margin, y + 10, margin + width, y + 10);
  
  // Itens do orçamento
  if (orcamento.quotation_items && orcamento.quotation_items.length > 0) {
    orcamento.quotation_items.forEach((item, index) => {
      // Verificar se precisamos de uma nova página
      if (y < margin + 50) {
        // Adicionar nova página
        page = pdfDoc.addPage([595.28, 841.89]);
        y = page.getHeight() - margin;
        
        // Adicionar cabeçalho na nova página
        const headerHeight = drawText("CONTINUAÇÃO DO ORÇAMENTO", { 
          fontSize: 14, 
          font: helveticaBold, 
          color: primaryColor
        });
        
        y -= headerHeight + 20;
      }
      
      // Altura da linha de item
      const rowHeight = 25;
      
      // Desenhar fundo para linhas alternadas
      if (index % 2 === 0) {
        drawRect(margin, y + 10, width, rowHeight, { color: rgb(0.97, 0.97, 0.97) });
      }
      
      // Desenhar textos
      drawText(item.description, { 
        fontSize: 9,
        x: columnStarts[0] + 5,
        yPos: y
      });
      
      drawText(item.quantity.toString(), { 
        fontSize: 9,
        x: columnStarts[1] + 5,
        yPos: y
      });
      
      drawText(`R$ ${parseFloat(item.unit_price).toFixed(2)}`, { 
        fontSize: 9,
        x: columnStarts[2] + 5,
        yPos: y
      });
      
      drawText(`R$ ${parseFloat(item.total_price).toFixed(2)}`, { 
        fontSize: 9,
        x: columnStarts[3] + 5,
        yPos: y
      });
      
      // Linha após o item
      y -= rowHeight;
      drawLine(margin, y + 10, margin + width, y + 10, { color: rgb(0.8, 0.8, 0.8) });
    });
  } else {
    // Nenhum item
    y -= 30;
    drawText("Nenhum item no orçamento", { 
      fontSize: 10,
      x: margin + width / 2 - 70,
      yPos: y,
    });
    
    y -= 20;
  }
  
  // Total
  y -= 20;
  drawText("Total:", { 
    fontSize: 12,
    font: helveticaBold,
    x: columnStarts[3] - 50,
    yPos: y
  });
  
  drawText(`R$ ${parseFloat(orcamento.total_amount).toFixed(2)}`, { 
    fontSize: 12,
    font: helveticaBold,
    color: primaryColor,
    x: columnStarts[3] + 5,
    yPos: y
  });
  
  // Observações
  if (orcamento.notes && orcamento.notes.trim().length > 0) {
    y -= 40;
    
    // Verificar se precisamos de uma nova página
    if (y < margin + 100) {
      // Adicionar nova página
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getHeight() - margin;
    }
    
    const notesTitle = drawText("OBSERVAÇÕES", { 
      fontSize: 12, 
      font: helveticaBold,
      yPos: y 
    });
    
    y -= notesTitle + 10;
    
    // Criar um retângulo para as observações
    drawRect(margin, y, width, 100, { color: rgb(0.95, 0.95, 0.95) });
    
    // Dividir o texto em linhas
    const maxCharsPerLine = 90; // Aproximadamente para o tamanho da fonte
    const notes = orcamento.notes.trim();
    
    let currentLine = '';
    let lineY = y - 15;
    
    for (let i = 0; i < notes.length; i++) {
      currentLine += notes[i];
      
      if (currentLine.length >= maxCharsPerLine || notes[i] === '\n' || i === notes.length - 1) {
        drawText(currentLine, { 
          fontSize: 9,
          x: margin + 10,
          yPos: lineY
        });
        
        lineY -= 15;
        currentLine = '';
        
        // Se chegarmos ao final da caixa de observações
        if (lineY < y - 90) {
          drawText("...", { 
            fontSize: 9,
            x: margin + 10,
            yPos: lineY
          });
          break;
        }
      }
    }
    
    y -= 110;
  }
  
  // Rodapé
  // Verificar se precisamos de uma nova página
  if (y < margin + 60) {
    // Adicionar nova página
    page = pdfDoc.addPage([595.28, 841.89]);
    y = page.getHeight() - margin;
  }
  
  y = margin + 50;
  
  drawLine(margin, y, margin + width, y, { color: primaryColor });
  
  y -= 20;
  drawText("Orçamento gerado automaticamente pelo sistema.", { 
    fontSize: 8,
    x: margin,
    yPos: y,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  y -= 10;
  
  const today = new Date();
  drawText(`Documento gerado em ${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR')}`, { 
    fontSize: 8,
    x: margin,
    yPos: y,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  y -= 15;
  
  // Página X de Y
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const currentPage = pdfDoc.getPages()[i];
    currentPage.drawText(`Página ${i + 1} de ${pageCount}`, {
      x: currentPage.getWidth() - 100,
      y: 30,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  // Serializar o documento para bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Função para download do PDF no navegador
 * @param {Uint8Array} pdfBytes - O PDF em bytes
 * @param {string} filename - Nome do arquivo
 */
export function downloadPDF(pdfBytes, filename) {
  // Criar um Blob a partir dos bytes
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  
  // Criar URL para o Blob
  const url = URL.createObjectURL(blob);
  
  // Criar um link de download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'orcamento.pdf';
  
  // Adicionar o link ao body
  document.body.appendChild(link);
  
  // Clicar no link para iniciar o download
  link.click();
  
  // Limpar
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
}