let usandoVoz = false;
let memoria = {};
let historico = [];
let usuario = { nome: "amigo" };
let aventuraEstado = null;
let mathMode = false;
let chatMode = false;
let extractedText = '';
let detectedColors = new Set();
let recognizedObjects = [];
let loadedImage = null;
let isProcessing = false;
let chatHistory = [];
let lastMathResult = '';

// Carregar dados JSON
async function carregarJSON(caminho) {
  try {
    const res = await fetch(caminho);
    if (!res.ok) throw new Error(`Erro ao carregar ${caminho}: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Erro ao carregar JSON: ${e.message}`);
    return {};
  }
}

// Salvar dados no localStorage
function salvarLocal(nome, dados) {
  try {
    localStorage.setItem(nome, JSON.stringify(dados));
    console.log(`Salvou ${nome} com sucesso`);
  } catch (e) {
    console.error(`Erro ao salvar ${nome}: ${e.message}`);
  }
}

// Carregar todos os dados
async function carregarTudo() {
  try {
    console.log("Iniciando carregamento de dados...");
    memoria = await carregarJSON("dados/memoria.json") || {};
    historico = await carregarJSON("dados/historico.json") || [];
    usuario = await carregarJSON("dados/usuario.json") || { nome: "amigo" };
    console.log("Dados carregados:", { memoria, historico, usuario });
    document.getElementById("resposta").innerText = "Sistema carregado com sucesso!";
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
    document.getElementById("resposta").innerText = "Erro ao carregar dados. Verifique o console.";
  }
}

// Falar com suporte a cancelamento
function falar(texto) {
  if (!usandoVoz) return;
  try {
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "pt-BR";
    voz.rate = 1.0;
    voz.pitch = 1.0;
    window.speechSynthesis.speak(voz);
    console.log("Fala iniciada:", texto);
  } catch (e) {
    console.error("Erro na fala:", e);
  }
}

// Sanitizar entrada
function sanitizarEntrada(texto) {
  return texto.replace(/[<>{}]/g, "").trim();
}

// Configurar eventos
function configurarEventos() {
  const imgInput = document.getElementById('imgInput');
  const preview = document.getElementById('preview');
  const resultadoVisual = document.getElementById('resultadoVisual');
  const mathQuestion = document.getElementById('mathQuestion');
  const entrada = document.getElementById('entrada');
  const dropArea = document.getElementById('dropArea');

  // Verificar bibliotecas
  if (typeof Tesseract === 'undefined') {
    resultadoVisual.textContent = 'Erro: Tesseract.js não carregado.';
    resultadoVisual.classList.add('error');
    console.error("Tesseract.js não carregado.");
    return false;
  }
  if (typeof math === 'undefined') {
    resultadoVisual.textContent = 'Erro: Math.js não carregado.';
    resultadoVisual.classList.add('error');
    console.error("Math.js não carregado.");
    return false;
  }
  if (typeof jspdf === 'undefined') {
    resultadoVisual.textContent = 'Erro: jsPDF não carregado.';
    resultadoVisual.classList.add('error');
    console.error("jsPDF não carregado.");
    return false;
  }

  console.log("Configurando eventos dos botões...");
  // Configurar eventos dos botões
  const botoes = [
    { id: 'btnExtrairTexto', handler: extrairTexto },
    { id: 'btnDetectarCores', handler: detectarCores },
    { id: 'btnReconhecerObjetos', handler: reconhecerObjetos },
    { id: 'btnExportarPDF', handler: exportarPDF },
    { id: 'btnResetarArquivo', handler: resetarArquivo },
    { id: 'toggleMathMode', handler: toggleMathMode },
    { id: 'toggleChatMode', handler: toggleChatMode },
    { id: 'btnAventura', handler: abrirAventura },
    { id: 'btnAssistenteCodigo', handler: abrirAssistenteCodigo },
    { id: 'btnEnviar', handler: enviar },
    { id: 'btnEnsinar', handler: ensinar },
    { id: 'btnAtivarVoz', handler: ativarVoz },
    { id: 'btnEnviarMath', handler: responderMath }
  ];

  botoes.forEach(({ id, handler }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        console.log(`Botão ${id} clicado`);
        resultadoVisual.textContent = `Botão "${id}" clicado! Iniciando ação...`;
        resultadoVisual.classList.remove('error', 'loading');
        handler();
      });
      console.log(`Evento de clique registrado para ${id}`);
    } else {
      console.error(`Botão com ID ${id} não encontrado.`);
      resultadoVisual.textContent = `Erro: Botão "${id}" não encontrado.`;
      resultadoVisual.classList.add('error');
    }
  });

  // Configurar eventos de drag-and-drop
  if (dropArea) {
    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('dragover');
      console.log("Dragover detectado");
      resultadoVisual.textContent = 'Solte a imagem aqui...';
    });

    dropArea.addEventListener('dragleave', () => {
      dropArea.classList.remove('dragover');
      console.log("Dragleave detectado");
      resultadoVisual.textContent = 'O texto extraído aparecerá aqui...';
    });

    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('dragover');
      console.log("Drop detectado");
      resultadoVisual.textContent = 'Imagem solta! Carregando...';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.style.display = 'block';
        loadedImage = file;
        resultadoVisual.textContent = 'Imagem carregada com sucesso!';
        resultadoVisual.classList.remove('error', 'loading');
        detectedColors = new Set();
        recognizedObjects = [];
        enableButtons();
        console.log("Imagem carregada via drag-and-drop:", file.name);
      } else {
        resultadoVisual.textContent = 'Por favor, solte uma imagem válida.';
        resultadoVisual.classList.add('error');
        console.error("Arquivo inválido solto:", file ? file.type : 'nenhum arquivo');
      }
    });
  } else {
    console.error("Elemento dropArea não encontrado.");
    resultadoVisual.textContent = 'Erro: Área de drop não encontrada.';
    resultadoVisual.classList.add('error');
  }

  // Configurar evento de input de imagem
  if (imgInput) {
    imgInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.style.display = 'block';
        loadedImage = file;
        resultadoVisual.textContent = 'Imagem carregada com sucesso!';
        resultadoVisual.classList.remove('error', 'loading');
        detectedColors = new Set();
        recognizedObjects = [];
        enableButtons();
        console.log("Imagem selecionada via input:", file.name);
      }
    });
  } else {
    console.error("Elemento imgInput não encontrado.");
    resultadoVisual.textContent = 'Erro: Elemento de input de imagem não encontrado.';
    resultadoVisual.classList.add('error');
  }

  // Configurar eventos de teclado
  if (mathQuestion) {
    mathQuestion.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        console.log("Enter pressionado no mathQuestion");
        resultadoVisual.textContent = 'Enter pressionado no modo matemático!';
        responderMath();
      }
    });
  }

  if (entrada) {
    entrada.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        console.log("Enter pressionado no entrada");
        resultadoVisual.textContent = 'Enter pressionado no modo conversa!';
        enviar();
      }
    });
  }

  // Desabilitar botões de imagem inicialmente
  disableButtons();
  console.log("Configuração de eventos concluída.");
  return true;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM carregado, iniciando configuração...");
  const sucesso = configurarEventos();
  if (sucesso) {
    carregarTudo();
    document.getElementById('resultadoVisual').textContent = 'Sistema pronto! Tente arrastar uma imagem ou clicar nos botões.';
  } else {
    document.getElementById('resultadoVisual').textContent = 'Erro ao inicializar. Verifique o console.';
    document.getElementById('resultadoVisual').classList.add('error');
  }
});

// Habilitar botões de imagem
function enableButtons() {
  const botoes = ['btnExtrairTexto', 'btnDetectarCores', 'btnReconhecerObjetos', 'btnExportarPDF', 'btnResetarArquivo'];
  botoes.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
      console.log(`Botão ${id} habilitado`);
    }
  });
}

// Desabilitar botões de imagem
function disableButtons() {
  const botoes = ['btnExtrairTexto', 'btnDetectarCores', 'btnReconhecerObjetos', 'btnExportarPDF', 'btnResetarArquivo'];
  botoes.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = true;
      console.log(`Botão ${id} desabilitado`);
    }
  });
}

// Alternar modo matemático
function toggleMathMode() {
  console.log("Toggling modo matemático...");
  if (chatMode) {
    toggleChatMode();
  }
  mathMode = !mathMode;
  const btn = document.getElementById('toggleMathMode');
  if (btn) {
    btn.textContent = mathMode ? 'Desativar Modo Matemático' : 'Ativar Modo Matemático';
    btn.classList.toggle('active', mathMode);
  }
  document.getElementById('mathInteraction').style.display = mathMode ? 'flex' : 'none';
  document.getElementById('chatInteraction').style.display = chatMode ? 'flex' : 'none';
  document.getElementById('resultadoVisual').style.display = mathMode || chatMode ? 'none' : 'block';
  document.getElementById('mathAnswer').textContent = 'A resposta aparecerá aqui...';
  console.log("Modo matemático:", mathMode ? "ativado" : "desativado");
}

// Alternar modo conversa
function toggleChatMode() {
  console.log("Toggling modo conversa...");
  if (mathMode) {
    mathMode = false;
    const btnMath = document.getElementById('toggleMathMode');
    if (btnMath) {
      btnMath.textContent = 'Ativar Modo Matemático';
      btnMath.classList.remove('active');
    }
    document.getElementById('mathInteraction').style.display = 'none';
  }
  chatMode = !chatMode;
  const btn = document.getElementById('toggleChatMode');
  if (btn) {
    btn.textContent = chatMode ? 'Desativar Modo Conversa' : 'Ativar Modo Conversa';
    btn.classList.toggle('active', chatMode);
  }
  document.getElementById('chatInteraction').style.display = chatMode ? 'flex' : 'none';
  document.getElementById('mathInteraction').style.display = mathMode ? 'flex' : 'none';
  document.getElementById('resultadoVisual').style.display = mathMode || chatMode ? 'none' : 'block';
  document.getElementById('resposta').textContent = chatMode ? 'Oi! Estou pronto para conversar ou responder suas dúvidas.' : '';
  console.log("Modo conversa:", chatMode ? "ativado" : "desativado");
}

// Enviar comando/pergunta
function enviar() {
  console.log("Enviando entrada...");
  try {
    const entrada = sanitizarEntrada(document.getElementById('entrada').value);
    if (!entrada) {
      document.getElementById('resposta').innerText = "Por favor, digite algo.";
      console.log("Entrada vazia");
      return;
    }

    const normal = entrada.toLowerCase();
    let resposta = "";
    console.log("Processando entrada:", entrada);

    if (normal.includes("oi") || normal.includes("olá")) {
      resposta = `Olá, ${usuario.nome}! Como posso te ajudar hoje?`;
    } else if (memoria[normal]) {
      resposta = memoria[normal];
    } else if (normal.includes("quanto é") || normal.match(/[0-9+\-*/]/)) {
      try {
        const calculo = normal.replace("quanto é", "").trim();
        const resultado = math.evaluate(calculo);
        if (!isNaN(resultado) && isFinite(resultado)) {
          resposta = `O resultado é: ${resultado}`;
        } else {
          resposta = "Resultado inválido.";
        }
      } catch (e) {
        resposta = "Erro no cálculo. Verifique a expressão.";
      }
    } else if (aventuraEstado) {
      resposta = processarAventura(entrada);
    } else {
      resposta = "Não sei responder isso. Quer me ensinar?";
    }

    historico.push({ pergunta: entrada, resposta, timestamp: new Date().toISOString() });
    chatHistory.push({ user: entrada, ai: resposta });
    if (chatHistory.length > 10) chatHistory.shift();
    document.getElementById('resposta').innerText = chatHistory.map(entry => `Você: ${entry.user}\nIA: ${entry.ai}`).join('\n');
    falar(resposta);
    salvarLocal("fenix_historico", historico);
    document.getElementById('entrada').value = "";
    console.log("Resposta enviada:", resposta);
  } catch (e) {
    console.error("Erro em enviar:", e);
    document.getElementById('resposta').innerText = "Erro ao processar. Verifique o console.";
  }
}

// Ensinar nova resposta
function ensinar() {
  console.log("Iniciando ensinar...");
  try {
    const pergunta = sanitizarEntrada(prompt("Digite a pergunta:"));
    if (!pergunta) return alert("Pergunta inválida.");
    const resposta = sanitizarEntrada(prompt("Digite a resposta:"));
    if (!resposta) return alert("Resposta inválida.");
    memoria[pergunta.toLowerCase()] = resposta;
    salvarLocal("fenix_memoria", memoria);
    alert(`Aprendi: "${pergunta}" → "${resposta}"`);
    console.log("Ensinado:", { pergunta, resposta });
  } catch (e) {
    console.error("Erro em ensinar:", e);
    alert("Erro ao ensinar. Verifique o console.");
  }
}

// Ativar/desativar voz
function ativarVoz() {
  console.log("Toggling voz...");
  try {
    usandoVoz = !usandoVoz;
    alert("Modo voz " + (usandoVoz ? "ativado!" : "desativado."));
    if (!usandoVoz) window.speechSynthesis.cancel();
    console.log("Voz:", usandoVoz ? "ativada" : "desativada");
  } catch (e) {
    console.error("Erro em ativarVoz:", e);
  }
}

// Extrair texto (OCR)
async function extrairTexto() {
  console.log("Iniciando extração de texto...");
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (!loadedImage) {
    resultadoVisual.textContent = 'Por favor, selecione ou arraste uma imagem.';
    resultadoVisual.classList.add('error');
    console.log("Nenhuma imagem carregada");
    return;
  }
  if (isProcessing) {
    resultadoVisual.textContent = 'Processamento em andamento...';
    resultadoVisual.classList.add('loading');
    console.log("Processamento já em andamento");
    return;
  }
  isProcessing = true;
  disableButtons();
  resultadoVisual.textContent = '🔍 Processando imagem...';
  resultadoVisual.classList.add('loading');
  try {
    const { data: { text } } = await Tesseract.recognize(
      loadedImage,
      'por',
      { logger: (m) => console.log("Tesseract:", m) }
    );
    extractedText = text.trim() || 'Nenhum texto detectado.';
    resultadoVisual.textContent = `Texto extraído:\n${extractedText}`;
    falar(extractedText);
    console.log("Texto extraído:", extractedText);
  } catch (e) {
    resultadoVisual.textContent = 'Erro ao processar imagem: ' + e.message;
    resultadoVisual.classList.add('error');
    console.error("Erro no OCR:", e);
  } finally {
    isProcessing = false;
    enableButtons();
    resultadoVisual.classList.remove('loading');
  }
}

// Detectar cores
async function detectarCores() {
  console.log("Iniciando detecção de cores...");
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (!loadedImage) {
    resultadoVisual.textContent = 'Por favor, selecione ou arraste uma imagem.';
    resultadoVisual.classList.add('error');
    console.log("Nenhuma imagem carregada");
    return;
  }
  if (isProcessing) {
    resultadoVisual.textContent = 'Processamento em andamento...';
    resultadoVisual.classList.add('loading');
    console.log("Processamento já em andamento");
    return;
  }
  isProcessing = true;
  disableButtons();
  resultadoVisual.textContent = '🎨 Carregando imagem...';
  resultadoVisual.classList.add('loading');
  try {
    const img = new Image();
    img.src = URL.createObjectURL(loadedImage);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const step = 5;
    detectedColors = new Set();
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
        if (a < 128) continue;
        const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
        detectedColors.add(hex);
        if (detectedColors.size > 100) break;
      }
      if (detectedColors.size > 100) break;
    }
    let html = '<strong>Cores detectadas:</strong><br>';
    detectedColors.forEach(hex => {
      html += `<div class="color-box" style="background-color: #${hex};"></div> #${hex}<br>`;
    });
    resultadoVisual.innerHTML = html || 'Nenhuma cor detectada.';
    console.log("Cores detectadas:", [...detectedColors]);
  } catch (e) {
    resultadoVisual.textContent = 'Erro ao detectar cores: ' + e.message;
    resultadoVisual.classList.add('error');
    console.error("Erro em detectarCores:", e);
  } finally {
    isProcessing = false;
    enableButtons();
    resultadoVisual.classList.remove('loading');
  }
}

// Reconhecer objetos
async function reconhecerObjetos() {
  console.log("Iniciando reconhecimento de objetos...");
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (!loadedImage) {
    resultadoVisual.textContent = 'Por favor, selecione ou arraste uma imagem.';
    resultadoVisual.classList.add('error');
    console.log("Nenhuma imagem carregada");
    return;
  }
  if (isProcessing) {
    resultadoVisual.textContent = 'Processamento em andamento...';
    resultadoVisual.classList.add('loading');
    console.log("Processamento já em andamento");
    return;
  }
  isProcessing = true;
  disableButtons();
  resultadoVisual.textContent = '🔍 Reconhecendo objetos...';
  resultadoVisual.classList.add('loading');
  try {
    const img = new Image();
    img.src = URL.createObjectURL(loadedImage);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);

    const threshold = 128;
    const binaryData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const binary = binaryData.data;
    for (let i = 0; i < binary.length; i += 4) {
      const gray = binary[i];
      const value = gray > threshold ? 255 : 0;
      binary[i] = value;
      binary[i + 1] = value;
      binary[i + 2] = value;
    }
    ctx.putImageData(binaryData, 0, 0);

    const edgeData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const edge = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const i = (y * canvas.width + x) * 4;
        const gx = -binary[i - 4] + binary[i + 4];
        const gy = -binary[i - canvas.width * 4] + binary[i + canvas.width * 4];
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edge[y * canvas.width + x] = magnitude > 50 ? 255 : 0;
      }
    }

    const contours = [];
    const visited = new Set();
    const minArea = 500;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = y * canvas.width + x;
        if (edge[idx] === 255 && !visited.has(idx)) {
          const contour = [];
          const stack = [[x, y]];
          let minX = x, maxX = x, minY = y, maxY = y;
          let area = 0;

          while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const cidx = cy * canvas.width + cx;
            if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height || visited.has(cidx) || edge[cidx] !== 255) {
              continue;
            }
            visited.add(cidx);
            contour.push([cx, cy]);
            area++;
            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy);
            stack.push([cx + 1, cy]);
            stack.push([cx - 1, cy]);
            stack.push([cx, cy + 1]);
            stack.push([cx, cy - 1]);
          }

          if (area > minArea) {
            let isOverlap = false;
            for (let existing of contours) {
              const overlapX = maxX > existing.boundingBox.minX && minX < existing.boundingBox.maxX;
              const overlapY = maxY > existing.boundingBox.minY && minY < existing.boundingBox.maxY;
              if (overlapX && overlapY && Math.abs(area - existing.area) < 200) {
                isOverlap = true;
                break;
              }
            }
            if (!isOverlap) {
              contours.push({ points: contour, area, boundingBox: { minX, maxX, minY, maxY } });
            }
          }
        }
      }
    }

    recognizedObjects = [];
    if (contours.length > 0) {
      recognizedObjects.push(`${contours.length} objeto${contours.length > 1 ? 's' : ''}`);
    }

    resultadoVisual.textContent = recognizedObjects.length ? `Objetos detectados: ${recognizedObjects.join(', ')}.` : 'Nenhum objeto reconhecido.';
    console.log("Objetos detectados:", recognizedObjects);
  } catch (e) {
    resultadoVisual.textContent = 'Erro ao reconhecer objetos: ' + e.message;
    resultadoVisual.classList.add('error');
    console.error("Erro em reconhecerObjetos:", e);
  } finally {
    isProcessing = false;
    enableButtons();
    resultadoVisual.classList.remove('loading');
  }
}

// Exportar PDF
function exportarPDF() {
  console.log("Iniciando exportação de PDF...");
  const resultadoVisual = document.getElementById('resultadoVisual');
  try {
    if (!loadedImage && !extractedText && detectedColors.size === 0 && !lastMathResult && chatHistory.length === 0 && recognizedObjects.length === 0) {
      resultadoVisual.textContent = 'Nada para exportar!';
      resultadoVisual.classList.add('error');
      console.log("Nada para exportar");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text('FÊNIX - Resultados', 20, y);
    y += 10;

    if (extractedText) {
      doc.setFontSize(12);
      doc.text('Texto Extraído:', 20, y);
      y += 10;
      const splitText = doc.splitTextToSize(extractedText, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 10 + 10;
    }

    if (detectedColors.size > 0) {
      doc.text('Cores Detectadas:', 20, y);
      y += 10;
      const colorsText = Array.from(detectedColors).join(', ');
      const splitColors = doc.splitTextToSize(colorsText, 170);
      doc.text(splitColors, 20, y);
      y += splitColors.length * 10 + 10;
    }

    if (recognizedObjects.length > 0) {
      doc.text('Objetos Detectados:', 20, y);
      y += 10;
      doc.text(recognizedObjects.join(', '), 20, y);
      y += 10;
    }

    if (lastMathResult) {
      doc.text('Último Cálculo:', 20, y);
      y += 10;
      doc.text(lastMathResult, 20, y);
      y += 10;
    }

    if (chatHistory.length > 0) {
      doc.text('Histórico do Chat:', 20, y);
      y += 10;
      chatHistory.forEach(entry => {
        if (entry.user) {
          doc.text(`Você: ${entry.user}`, 20, y);
          y += 10;
        }
        if (entry.ai) {
          const splitAi = doc.splitTextToSize(`IA: ${entry.ai}`, 170);
          doc.text(splitAi, 20, y);
          y += splitAi.length * 10;
        }
      });
    }

    doc.save('fenix_resultados.pdf');
    resultadoVisual.textContent = 'PDF exportado com sucesso!';
    console.log("PDF exportado");
  } catch (e) {
    resultadoVisual.textContent = 'Erro ao exportar PDF: ' + e.message;
    resultadoVisual.classList.add('error');
    console.error("Erro em exportarPDF:", e);
  }
}

// Modo aventura
function abrirAventura() {
  console.log("Iniciando modo aventura...");
  const nome = sanitizarEntrada(prompt("Digite o nome do herói:"));
  if (!nome) {
    alert("Nome inválido.");
    console.log("Nome de herói inválido");
    return;
  }
  aventuraEstado = { heroi: nome, local: "floresta", etapa: 1 };
  const resp = `🌲 Você acorda numa floresta sombria, ${nome}. Um caminho leva ao norte (montanhas), outro ao sul (vila). Qual direção seguir?`;
  document.getElementById('resultadoVisual').textContent = resp;
  falar(resp);
  salvarLocal("fenix_aventura", aventuraEstado);
  console.log("Aventura iniciada:", aventuraEstado);
}

// Processar aventura
function processarAventura(entrada) {
  if (!aventuraEstado) return "Modo aventura não iniciado.";
  const normal = entrada.toLowerCase();
  let resp = "";
  if (aventuraEstado.etapa === 1) {
    if (normal.includes("norte") || normal.includes("montanhas")) {
      aventuraEstado.local = "montanhas";
      aventuraEstado.etapa = 2;
      resp = `🏔️ Você segue para as montanhas. Um lobo aparece! Lutar ou fugir?`;
    } else if (normal.includes("sul") || normal.includes("vila")) {
      aventuraEstado.local = "vila";
      aventuraEstado.etapa = 2;
      resp = `🏘️ Você chega a uma vila tranquila. Um mercador oferece uma espada por 10 moedas. Comprar ou continuar?`;
    } else {
      resp = `Por favor, escolha "norte" ou "sul".`;
    }
  } else if (aventuraEstado.etapa === 2) {
    if (aventuraEstado.local === "montanhas") {
      if (normal.includes("lutar")) {
        aventuraEstado.etapa = 3;
        resp = `⚔️ Você enfrenta o lobo e vence, mas está ferido. Descansar ou seguir?`;
      } else if (normal.includes("fugir")) {
        resp = `🏃 Você foge do lobo, mas cai num penhasco. Fim da aventura.`;
        aventuraEstado = null;
      } else {
        resp = `Por favor, escolha "lutar" ou "fugir".`;
      }
    } else if (aventuraEstado.local === "vila") {
      if (normal.includes("comprar")) {
        aventuraEstado.etapa = 3;
        resp = `🗡️ Você compra a espada. Um bandido aparece! Lutar ou negociar?`;
      } else if (normal.includes("continuar")) {
        aventuraEstado.etapa = 3;
        resp = `🚶 Você segue pela vila e encontra um rio. Nadar ou procurar ponte?`;
      } else {
        resp = `Por favor, escolha "comprar" ou "continuar".`;
      }
    }
  } else if (aventuraEstado.etapa === 3) {
    if (aventuraEstado.local === "montanhas") {
      if (normal.includes("descansar")) {
        resp = `🛌 Você descansa e se recupera. Uma caverna misteriosa está à frente. Entrar ou voltar?`;
        aventuraEstado.etapa = 4;
      } else if (normal.includes("seguir")) {
        resp = `🚶 Ferido, você desmaia na trilha. Fim da aventura.`;
        aventuraEstado = null;
      } else {
        resp = `Por favor, escolha "descansar" ou "seguir".`;
      }
    } else if (aventuraEstado.local === "vila") {
      if (normal.includes("lutar") && aventuraEstado.lastChoice === "comprar") {
        resp = `⚔️ Com sua nova espada, você derrota o bandido! Um tesouro está escondido na vila. Procurar ou sair?`;
        aventuraEstado.etapa = 4;
      } else if (normal.includes("negociar") && aventuraEstado.lastChoice === "comprar") {
        resp = `🗣️ Você negocia com o bandido, mas ele foge com suas moedas. Fim da aventura.`;
        aventuraEstado = null;
      } else if (normal.includes("nadar") && aventuraEstado.lastChoice === "continuar") {
        resp = `🏊 Você tenta nadar, mas a correnteza é forte. Fim da aventura.`;
        aventuraEstado = null;
      } else if (normal.includes("ponte") && aventuraEstado.lastChoice === "continuar") {
        resp = `🌉 Você encontra uma ponte e cruza o rio. Um velho sábio oferece um enigma. Resolver ou ignorar?`;
        aventuraEstado.etapa = 4;
      } else {
        resp = `Por favor, escolha uma ação válida.`;
      }
      aventuraEstado.lastChoice = normal;
    }
  }
  salvarLocal("fenix_aventura", aventuraEstado);
  return resp;
}

// Assistente de código
function abrirAssistenteCodigo() {
  console.log("Iniciando assistente de código...");
  try {
    const entrada = sanitizarEntrada(prompt("Cole seu código aqui:"));
    if (!entrada) {
      alert("Nenhum código fornecido.");
      console.log("Nenhum código fornecido");
      return;
    }
    let resposta = "";
    if (entrada.includes("<") && entrada.includes(">")) {
      resposta = `Detectei HTML. Sugestões:\n- Adicione meta viewport para responsividade.\n- Use tags semânticas (header, main, etc.).\nDesejo revisar algo específico?`;
    } else if (entrada.includes("function") || entrada.includes("=>")) {
      resposta = `Detectei JavaScript. Sugestões:\n- Use const/let em vez de var.\n- Adicione try-catch para erros.\nQuer que eu analise a lógica?`;
    } else if (entrada.includes("def ") || entrada.includes("import ")) {
      resposta = `Detectei Python. Sugestões:\n- Use type hints para clareza.\n- Adicione docstrings.\nPosso sugerir otimizações?`;
    } else {
      resposta = `Código não identificado. Por favor, especifique o tipo (HTML, JS, Python, etc.).`;
    }
    document.getElementById('resposta').textContent = resposta;
    falar(resposta);
    console.log("Assistente de código:", resposta);
  } catch (e) {
    console.error("Erro em abrirAssistenteCodigo:", e);
    document.getElementById('resposta').textContent = "Erro ao processar código. Verifique o console.";
  }
}

// Responder pergunta matemática
function responderMath() {
  console.log("Iniciando resposta matemática...");
  const question = sanitizarEntrada(document.getElementById('mathQuestion').value);
  if (!question) {
    document.getElementById('mathAnswer').textContent = 'Por favor, digite uma pergunta matemática.';
    console.log("Pergunta matemática vazia");
    return;
  }
  try {
    let expr = question
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/x/g, '*')
      .replace(/\s+/g, '')
      .replace(/=$/, '');

    if (question.toLowerCase().includes('texto') || question.toLowerCase().includes('imagem')) {
      const match = extractedText.match(/(\d+\s*[+\-*/]\s*\d+\s*[+\-*/]\s*\d+[+\-*/=]*\d*)|(\d+\s*[+\-*/]\s*\d+)/);
      if (match) {
        expr = match[0].replace(/\s+/g, '').replace(/=$/, '');
      } else {
        document.getElementById('mathAnswer').textContent = 'Não encontrei um cálculo válido no texto extraído.';
        console.log("Nenhum cálculo encontrado no texto extraído");
        return;
      }
    }

    if (!/^\d+[+\-*/]\d+[+\-*/\d]*$/.test(expr)) {
      document.getElementById('mathAnswer').textContent = 'Expressão inválida. Tente algo como "2*2/2+2".';
      console.log("Expressão matemática inválida:", expr);
      return;
    }

    const evalResult = math.evaluate(expr);
    if (typeof evalResult === 'number' && !isNaN(evalResult)) {
      lastMathResult = `${expr} = ${evalResult}`;
      document.getElementById('mathAnswer').textContent = `Resultado: ${lastMathResult}`;
      document.getElementById('mathQuestion').value = '';
      console.log("Cálculo bem-sucedido:", lastMathResult);
    } else {
      document.getElementById('mathAnswer').textContent = 'Erro: Não consegui calcular a expressão.';
      console.log("Erro no cálculo: resultado inválido");
    }
  } catch (e) {
    document.getElementById('mathAnswer').textContent = 'Erro ao calcular: ' + e.message;
    console.error("Erro em responderMath:", e);
  }
}

// Resetar arquivo
function resetarArquivo() {
  console.log("Resetando arquivo...");
  document.getElementById('imgInput').value = '';
  document.getElementById('preview').src = '';
  document.getElementById('preview').style.display = 'none';
  loadedImage = null;
  extractedText = '';
  detectedColors = new Set();
  recognizedObjects = [];
  document.getElementById('resultadoVisual').innerHTML = 'O texto extraído aparecerá aqui...';
  document.getElementById('resultadoVisual').classList.remove('error', 'loading');
  document.getElementById('mathAnswer').textContent = 'A resposta aparecerá aqui...';
  disableButtons();
  console.log("Arquivo resetado");
}