console.log("Iniciando fenix.js...");

let memoria = {};
let chatHistory = [];
let mathHistory = [];
let usuario = { nome: "amigo" };
let loadedImage = null;
let chatMode = false;
let mathMode = false;
let aventuraEstado = null;
let vozConfig = { pitch: 1.0, rate: 1.0 };
let isListening = false;
let recognition = null;
let ultimoTextoExtraido = "";
let isProcessing = false;

// Inicializar reconhecimento de voz
function inicializarReconhecimentoVoz() {
  console.log("Inicializando reconhecimento de voz...");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Reconhecimento de voz não suportado.");
    showError("Navegador não suporta voz. Use Chrome.");
    const btnFalar = document.getElementById('btnFalar');
    if (btnFalar) btnFalar.disabled = true;
    return false;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    console.log("Resultado de voz recebido:", event.results);
    const texto = event.results[event.results.length - 1][0].transcript;
    console.log("Texto transcrito:", texto);
    const entrada = document.getElementById('entrada');
    if (entrada) {
      entrada.value = texto;
      if (!chatMode) {
        console.log("Ativando modo conversa automaticamente.");
        toggleChatMode();
      }
      document.getElementById('chatInteraction').style.display = 'flex';
      enviar();
    } else {
      console.error("Elemento 'entrada' não encontrado.");
      showError("Erro interno: textarea não encontrado.");
    }
  };
  recognition.onend = () => {
    console.log("Reconhecimento finalizado.");
    isListening = false;
    const btnFalar = document.getElementById('btnFalar');
    if (btnFalar) {
      btnFalar.classList.remove('listening');
      btnFalar.textContent = "🎤 Falar";
    }
  };
  recognition.onerror = (event) => {
    console.error("Erro no reconhecimento:", event.error);
    let msg = `Erro na voz: ${event.error}`;
    if (event.error === 'no-speech') msg = "Nenhum som detectado. Fale mais alto.";
    if (event.error === 'not-allowed') msg = "Permissão de microfone negada. Ative no navegador.";
    showError(msg);
    isListening = false;
    const btnFalar = document.getElementById('btnFalar');
    if (btnFalar) {
      btnFalar.classList.remove('listening');
      btnFalar.textContent = "🎤 Falar";
    }
  };
  return true;
}

// Carregar JSON
async function carregarJSON(caminho) {
  console.log(`Carregando ${caminho}...`);
  try {
    const res = await fetch(caminho);
    if (!res.ok) throw new Error(`Erro ao carregar ${caminho}`);
    return await res.json();
  } catch (e) {
    console.error("Erro ao carregar JSON:", e);
    showError(`Erro ao carregar ${caminho}.`);
    return {};
  }
}

// Salvar no localStorage
function salvarLocal(nome, dados) {
  console.log(`Salvando ${nome} no localStorage...`);
  try {
    localStorage.setItem(nome, JSON.stringify(dados));
    console.log(`Dados salvos com sucesso: ${nome}`);
  } catch (e) {
    console.error(`Erro ao salvar ${nome} no localStorage:`, e);
    showError(`Falha ao salvar ${nome}. Verifique o console.`);
  }
}

// Carregar dados
async function carregarTudo() {
  console.log("Carregando todos os dados...");
  memoria = await carregarJSON("dados/memoria.json") || {};
  usuario = await carregarJSON("dados/usuario.json") || { nome: "amigo" };
  
  // Carregar históricos do localStorage com validação
  try {
    const chatData = localStorage.getItem("fenix_chat_history");
    chatHistory = chatData ? JSON.parse(chatData) : [];
    if (!Array.isArray(chatHistory)) throw new Error("Chat history corrompido.");
    console.log("Chat history carregado:", chatHistory);
  } catch (e) {
    console.error("Erro ao carregar fenix_chat_history:", e);
    chatHistory = [];
    salvarLocal("fenix_chat_history", chatHistory);
  }
  
  try {
    const mathData = localStorage.getItem("fenix_math_history");
    mathHistory = mathData ? JSON.parse(mathData) : [];
    if (!Array.isArray(mathHistory)) throw new Error("Math history corrompido.");
    console.log("Math history carregado:", mathHistory);
  } catch (e) {
    console.error("Erro ao carregar fenix_math_history:", e);
    mathHistory = [];
    salvarLocal("fenix_math_history", mathHistory);
  }
  
  vozConfig = JSON.parse(localStorage.getItem("fenix_voz_config")) || { pitch: 1.0, rate: 1.0 };
  console.log("Dados carregados:", { memoria, usuario, chatHistory, mathHistory, vozConfig });
}

// Falar
function falar(texto) {
  console.log("Falando:", texto);
  try {
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "pt-BR";
    voz.rate = vozConfig.rate;
    voz.pitch = vozConfig.pitch;
    window.speechSynthesis.speak(voz);
  } catch (e) {
    console.error("Erro na fala:", e);
    showError("Erro na síntese de voz.");
  }
}

// Sanitizar entrada
function sanitizarEntrada(texto) {
  return texto.replace(/[<>{}]/g, "").trim();
}

// Mostrar erro
function showError(msg) {
  console.error("Erro:", msg);
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (resultadoVisual) {
    resultadoVisual.textContent = msg;
    resultadoVisual.classList.add('error');
  }
}

// Pré-processar imagem para OCR
function preprocessarImagem(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    const contrast = brightness > 128 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = contrast;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

// Configurar eventos
function configurarEventos() {
  console.log("Configurando eventos...");
  const elementos = {
    imgInput: document.getElementById('imgInput'),
    preview: document.getElementById('preview'),
    resultadoVisual: document.getElementById('resultadoVisual'),
    entrada: document.getElementById('entrada'),
    dropArea: document.getElementById('dropArea'),
    opcoesAventura: document.getElementById('opcoesAventura')
  };
  for (const [nome, el] of Object.entries(elementos)) {
    if (!el) {
      showError(`Elemento ${nome} não encontrado.`);
      return false;
    }
  }

  const botoes = [
    { id: 'btnExtrairTexto', handler: extrairTexto },
    { id: 'btnDetectarCores', handler: detectarCores },
    { id: 'btnReconhecerObjetos', handler: reconhecerObjetos },
    { id: 'btnExportarPDF', handler: exportarPDF },
    { id: 'btnResetarArquivo', handler: resetarArquivo },
    { id: 'toggleChatMode', handler: toggleChatMode },
    { id: 'toggleMathMode', handler: toggleMathMode },
    { id: 'btnAventura', handler: abrirAventura },
    { id: 'btnFalar', handler: toggleMic },
    { id: 'btnEnsinar', handler: ensinar },
    { id: 'btnModificarVoz', handler: modificarVoz }
  ];
  botoes.forEach(({ id, handler }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        console.log(`Botão ${id} clicado.`);
        handler();
      });
    } else {
      console.warn(`Botão ${id} não encontrado.`);
    }
  });

  elementos.dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elementos.dropArea.classList.add('dragover');
    console.log("Dragover detectado.");
  });
  elementos.dropArea.addEventListener('dragleave', () => {
    elementos.dropArea.classList.remove('dragover');
    console.log("Dragleave detectado.");
  });
  elementos.dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elementos.dropArea.classList.remove('dragover');
    console.log("Drop detectado.");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      elementos.preview.src = url;
      elementos.preview.style.display = 'block';
      loadedImage = file;
      elementos.resultadoVisual.textContent = `Imagem carregada: ${file.name}`;
      enableButtons();
      console.log("Imagem carregada:", file.name);
    } else {
      showError("Solte uma imagem válida.");
    }
  });

  elementos.imgInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      elementos.preview.src = url;
      elementos.preview.style.display = 'block';
      loadedImage = file;
      elementos.resultadoVisual.textContent = `Imagem carregada: ${file.name}`;
      enableButtons();
      console.log("Imagem selecionada:", file.name);
    }
  });

  elementos.entrada.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      console.log("Enter pressionado.");
      enviar();
    }
  });

  disableButtons();
  return true;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM carregado, iniciando...");
  if (configurarEventos() && inicializarReconhecimentoVoz()) {
    carregarTudo();
    document.getElementById('resultadoVisual').textContent = 'Sistema pronto! Tente arrastar uma imagem ou clicar nos botões.';
  } else {
    showError('Erro ao inicializar. Veja o console (F12).');
  }
});

// Habilitar/desabilitar botões
function enableButtons() {
  ['btnExtrairTexto', 'btnDetectarCores', 'btnReconhecerObjetos', 'btnExportarPDF', 'btnResetarArquivo'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
      console.log(`Botão ${id} habilitado.`);
    }
  });
}
function disableButtons() {
  ['btnExtrairTexto', 'btnDetectarCores', 'btnReconhecerObjetos', 'btnExportarPDF', 'btnResetarArquivo'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = true;
      console.log(`Botão ${id} desabilitado.`);
    }
  });
}

// Funções de imagem
async function extrairTexto() {
  console.log("Executando extrairTexto...");
  if (!loadedImage) {
    showError('Nenhuma imagem carregada.');
    return;
  }
  if (typeof Tesseract === 'undefined') {
    showError('Tesseract.js não carregado.');
    return;
  }
  try {
    const resultadoVisual = document.getElementById('resultadoVisual');
    resultadoVisual.textContent = 'Extraindo texto...';
    const preview = document.getElementById('preview');
    const processedImage = preprocessarImagem(preview);
    const { data: { text } } = await Tesseract.recognize(processedImage, 'por', {
      logger: m => console.log("Progresso Tesseract:", m)
    });
    const texto = text.trim() || "Nenhum texto encontrado.";
    ultimoTextoExtraido = texto;
    resultadoVisual.textContent = `Texto extraído de "${loadedImage.name}": ${texto}`;
    falar(texto);
  } catch (e) {
    console.error("Erro ao extrair texto:", e);
    showError("Erro ao extrair texto da imagem. Tente uma imagem mais clara.");
  }
}

function detectarCores() {
  console.log("Executando detectarCores...");
  if (!loadedImage) {
    showError('Nenhuma imagem carregada.');
    return;
  }
  const preview = document.getElementById('preview');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = preview.width;
  canvas.height = preview.height;
  ctx.drawImage(preview, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const colorMap = {};
  for (let i = 0; i < imageData.length; i += 4) {
    const r = Math.round(imageData[i] / 10) * 10;
    const g = Math.round(imageData[i + 1] / 10) * 10;
    const b = Math.round(imageData[i + 2] / 10) * 10;
    const key = `${r},${g},${b}`;
    colorMap[key] = (colorMap[key] || 0) + 1;
  }
  const cores = Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => `rgb(${key})`);
  const coresLista = cores.length > 0 ? cores.join(", ") : "Nenhuma cor dominante.";
  const resultadoVisual = document.getElementById('resultadoVisual');
  resultadoVisual.innerHTML = `Cores em "${loadedImage.name}":<br>`;
  cores.forEach(cor => {
    const div = document.createElement('div');
    div.style.display = 'inline-block';
    div.style.width = '20px';
    div.style.height = '20px';
    div.style.backgroundColor = cor;
    div.style.margin = '5px';
    div.style.border = '1px solid #333';
    resultadoVisual.appendChild(div);
  });
  resultadoVisual.innerHTML += `<br>${coresLista}`;
  falar(`Cores detectadas: ${coresLista}`);
}

async function reconhecerObjetos() {
  console.log("Executando reconhecerObjetos...");
  if (!loadedImage) {
    showError('Nenhuma imagem carregada.');
    return;
  }
  if (isProcessing) {
    showError('Processamento em andamento, por favor aguarde...');
    return;
  }

  isProcessing = true;
  disableButtons();
  const resultadoVisual = document.getElementById('resultadoVisual');
  resultadoVisual.textContent = 'Reconhecendo objetos...';

  try {
    const img = new Image();
    img.src = URL.createObjectURL(loadedImage);
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = () => {
        throw new Error('Falha ao carregar a imagem.');
      };
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    // Pré-processamento: Converter para escala de cinza
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b; // Fórmula de luminância
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);

    // Binarização: Aplicar threshold pra destacar bordas
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

    // Detecção de bordas simples (Sobel-like)
    const edgeData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const edge = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const i = (y * canvas.width + x) * 4;
        const gx = -binary[i - 4] + binary[i + 4]; // Diferença horizontal
        const gy = -binary[i - canvas.width * 4] + binary[i + canvas.width * 4]; // Diferença vertical
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edge[y * canvas.width + x] = magnitude > 50 ? 255 : 0;
      }
    }

    // Encontrar contornos
    const contours = [];
    const visited = new Set();
    const minArea = 500; // Filtra contornos pequenos

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

    const objetosDetectados = [];
    if (contours.length > 0) {
      objetosDetectados.push(`${contours.length} objeto${contours.length > 1 ? 's' : ''}`);
    }

    if (objetosDetectados.length === 0) {
      resultadoVisual.textContent = 'Nenhum objeto reconhecido.';
      falar('Nenhum objeto reconhecido.');
    } else {
      const texto = `Objetos detectados em "${loadedImage.name}": ${objetosDetectados.join(', ')}.`;
      resultadoVisual.textContent = texto;
      falar(texto);
    }
  } catch (error) {
    console.error('Erro ao reconhecer objetos:', error);
    showError('Erro ao reconhecer objetos: ' + error.message);
  } finally {
    isProcessing = false;
    enableButtons();
  }
}

function exportarPDF() {
  console.log("Executando exportarPDF...");
  if (!loadedImage) {
    showError('Nenhuma imagem carregada.');
    return;
  }
  if (typeof jspdf === 'undefined') {
    showError('jsPDF não carregado.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(`Relatório: ${loadedImage.name}`, 10, 10);
  const resultadoVisual = document.getElementById('resultadoVisual').textContent;
  doc.text(resultadoVisual, 10, 20);
  doc.save(`relatorio_${loadedImage.name}.pdf`);
  document.getElementById('resultadoVisual').textContent = `PDF gerado!`;
  falar("PDF gerado!");
}

function resetarArquivo() {
  console.log("Executando resetarArquivo...");
  const imgInput = document.getElementById('imgInput');
  const preview = document.getElementById('preview');
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (imgInput) imgInput.value = '';
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  if (resultadoVisual) resultadoVisual.textContent = 'O texto extraído aparecerá aqui...';
  loadedImage = null;
  ultimoTextoExtraido = "";
  disableButtons();
}

// Modos
function toggleChatMode() {
  console.log("Toggling modo conversa...");
  chatMode = !chatMode;
  mathMode = false;
  const btnChat = document.getElementById('toggleChatMode');
  const btnMath = document.getElementById('toggleMathMode');
  if (btnChat) btnChat.textContent = chatMode ? 'Desativar Conversa' : 'Ativar Conversa';
  if (btnMath) btnMath.textContent = 'Ativar Matemático';
  document.getElementById('chatInteraction').style.display = chatMode ? 'flex' : 'none';
  document.getElementById('opcoesAventura').style.display = 'none';
  document.getElementById('resultadoVisual').style.display = chatMode ? 'none' : 'block';
  const resposta = document.getElementById('resposta');
  if (resposta) {
    resposta.textContent = chatMode
      ? (chatHistory.length ? chatHistory.map(e => `Você: ${e.user}\nFênix: ${e.ai}`).join('\n') : 'Oi! Pergunte algo!')
      : '';
  }
}

function toggleMathMode() {
  console.log("Toggling modo matemático...");
  mathMode = !mathMode;
  chatMode = false;
  const btnMath = document.getElementById('toggleMathMode');
  const btnChat = document.getElementById('toggleChatMode');
  if (btnMath) btnMath.textContent = mathMode ? 'Desativar Matemático' : 'Ativar Matemático';
  if (btnChat) btnChat.textContent = 'Ativar Conversa';
  document.getElementById('chatInteraction').style.display = mathMode ? 'flex' : 'none';
  document.getElementById('opcoesAventura').style.display = 'none';
  document.getElementById('resultadoVisual').style.display = mathMode ? 'none' : 'block';
  const resposta = document.getElementById('resposta');
  if (resposta) {
    resposta.textContent = mathMode
      ? (mathHistory.length ? mathHistory.map(e => `Você: ${e.user}\nFênix: ${e.ai}`).join('\n') : 'Digite uma expressão (ex.: 2+2)')
      : '';
  }
}

// Microfone
function toggleMic() {
  console.log("Toggling microfone...");
  if (!recognition) {
    showError("Reconhecimento de voz não inicializado.");
    return;
  }
  if (!chatMode) {
    console.log("Ativando modo conversa via toggleMic.");
    toggleChatMode();
  }
  const btnFalar = document.getElementById('btnFalar');
  if (!isListening) {
    try {
      recognition.start();
      isListening = true;
      if (btnFalar) {
        btnFalar.classList.add('listening');
        btnFalar.textContent = "🔴 Gravando...";
      }
      console.log("Microfone iniciado.");
    } catch (e) {
      showError("Erro ao iniciar microfone. Verifique permissões.");
      console.error("Erro ao iniciar:", e);
    }
  } else {
    recognition.stop();
    isListening = false;
    if (btnFalar) {
      btnFalar.classList.remove('listening');
      btnFalar.textContent = "🎤 Falar";
    }
    console.log("Microfone parado.");
  }
}

// Modificar voz
function modificarVoz() {
  console.log("Modificando voz...");
  const pitch = prompt("Tom (0.5 a 1.5):", vozConfig.pitch);
  const rate = prompt("Velocidade (0.8 a 1.2):", vozConfig.rate);
  vozConfig.pitch = parseFloat(pitch) || 1.0;
  vozConfig.rate = parseFloat(rate) || 1.0;
  if (vozConfig.pitch < 0.5 || vozConfig.pitch > 1.5) vozConfig.pitch = 1.0;
  if (vozConfig.rate < 0.8 || vozConfig.rate > 1.2) vozConfig.rate = 1.0;
  salvarLocal("fenix_voz_config", vozConfig);
  document.getElementById('resultadoVisual').textContent = `Voz: Tom ${vozConfig.pitch}, Velocidade ${vozConfig.rate}`;
  falar("Voz modificada!");
}

// Ensinar
function ensinar() {
  console.log("Executando ensinar...");
  const pergunta = sanitizarEntrada(prompt("Digite a pergunta:"));
  if (!pergunta) {
    showError("Pergunta inválida.");
    return;
  }
  const resposta = sanitizarEntrada(prompt("Digite a resposta:"));
  if (!resposta) {
    showError("Resposta inválida.");
    return;
  }
  memoria[pergunta.toLowerCase()] = resposta;
  salvarLocal("fenix_memoria", memoria);
  document.getElementById('resultadoVisual').textContent = `Aprendi: "${pergunta}" → "${resposta}"`;
  falar("Aprendi algo novo!");
}

// Processar pergunta
function processarPergunta(pergunta) {
  console.log("Processando pergunta:", pergunta);
  const texto = pergunta.toLowerCase().trim();
  const hora = new Date().getHours();

  // Saudações
  if (texto.includes("bom dia")) {
    return hora < 12 ? `Bom dia, ${usuario.nome}! Como tá começando o dia?` : `Hehe, já tá meio tarde pro bom dia, mas tudo bem! 😄 Como posso ajudar?`;
  }
  if (texto.includes("boa tarde")) {
    return hora >= 12 && hora < 18 ? `Boa tarde, ${usuario.nome}! Tô pronto pra ajudar!` : `Opa, já tá mais pro fim do dia, né? 😜 O que precisa?`;
  }
  if (texto.includes("boa noite")) {
    return hora >= 18 ? `Boa noite, ${usuario.nome}! Hora de brilhar na escuridão! 🌙` : `Boa noite já? Ainda tá claro lá fora! 😅 Como posso te ajudar?`;
  }
  if (texto.includes("olá") || texto.includes("oi")) {
    return `Oi, ${usuario.nome}! Tô na área, pronto pra conversar! 😎`;
  }

  // Perguntas casuais
  if (texto.includes("tudo bem") || texto.includes("como tá")) {
    return `Tô de boa, e tu, ${usuario.nome}? 😄 Qual é a vibe hoje?`;
  }
  if (texto.includes("quem é você") || texto.includes("quem é voce")) {
    return `Eu sou a Fênix IA, sua parceira pra aventuras, cálculos e papos! Criada pra ajudar e aprender com você, ${usuario.nome}! 🔥`;
  }

  // Respostas fixas
  if (texto.includes("capital do brasil")) {
    return "A capital do Brasil é Brasília.";
  }
  if (memoria[texto]) {
    return memoria[texto];
  }

  // Fallback
  return "Hmm, não sei essa, mas sou curioso! 😄 Ensina aí com 'Ensinar Fênix' ou pergunta outra coisa!";
}

// Enviar
function enviar() {
  console.log("Executando enviar...");
  const entrada = document.getElementById('entrada');
  const resposta = document.getElementById('resposta');
  if (!entrada || !resposta) {
    showError("Elementos de entrada não encontrados.");
    return;
  }
  const texto = sanitizarEntrada(entrada.value);
  if (!texto) {
    showError("Digite algo.");
    return;
  }
  entrada.value = "";

  if (mathMode) {
    if (typeof math === 'undefined') {
      showError("Math.js não carregado.");
      return;
    }
    try {
      const resultado = math.evaluate(texto);
      const resp = `Resultado: ${resultado}`;
      mathHistory.push({ user: texto, ai: resp });
      if (mathHistory.length > 5) mathHistory.shift();
      salvarLocal("fenix_math_history", mathHistory);
      resposta.textContent = mathHistory.map(e => `Você: ${e.user}\nFênix: ${e.ai}`).join('\n');
      falar(resp);
    } catch (e) {
      showError(`Erro ao calcular: ${e.message}`);
    }
  } else if (chatMode) {
    const resp = processarPergunta(texto);
    chatHistory.push({ user: texto, ai: resp });
    if (chatHistory.length > 5) chatHistory.shift();
    salvarLocal("fenix_chat_history", chatHistory);
    resposta.textContent = chatHistory.map(e => `Você: ${e.user}\nFênix: ${e.ai}`).join('\n');
    falar(resp);
  } else if (aventuraEstado) {
    const resp = processarAventura(texto);
    document.getElementById('resultadoVisual').textContent = resp;
    falar(resp);
  } else {
    showError("Ative um modo (Conversa, Matemático ou Aventura).");
  }
}

// Aventura
function abrirAventura() {
  console.log("Abrindo aventura...");
  const resultadoVisual = document.getElementById('resultadoVisual');
  const opcoesAventura = document.getElementById('opcoesAventura');
  if (!resultadoVisual || !opcoesAventura) {
    showError("Elementos de aventura não encontrados.");
    return;
  }
  resultadoVisual.textContent = 'Escolha sua aventura:';
  opcoesAventura.style.display = 'flex';
  opcoesAventura.innerHTML = '';
  ['Floresta Encantada'].forEach(nome => {
    const btn = document.createElement('button');
    btn.textContent = nome;
    btn.addEventListener('click', () => iniciarAventura('floresta'));
    opcoesAventura.appendChild(btn);
  });
}

function iniciarAventura(aventuraId) {
  console.log("Iniciando aventura:", aventuraId);
  const nome = sanitizarEntrada(prompt("Nome do herói:") || "Herói");
  aventuraEstado = { heroi: nome, aventura: aventuraId, etapa: 1, caminho: [] };
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (resultadoVisual) {
    resultadoVisual.textContent = `🌲 ${nome}, você entra na Floresta Encantada. O ar é úmido, e sons estranhos ecoam. Para onde ir?`;
    mostrarOpcoes(['Norte', 'Sul', 'Oeste']);
    salvarLocal("fenix_aventura", aventuraEstado);
    falar(`Você, ${nome}, entra na Floresta Encantada. Para onde ir?`);
  }
}

function mostrarOpcoes(opcoes) {
  console.log("Mostrando opções:", opcoes);
  const opcoesAventura = document.getElementById('opcoesAventura');
  if (!opcoesAventura) {
    showError("Elemento opcoesAventura não encontrado.");
    return;
  }
  opcoesAventura.innerHTML = '';
  opcoesAventura.style.display = 'flex';
  opcoes.forEach(opcao => {
    const btn = document.createElement('button');
    btn.textContent = opcao;
    btn.addEventListener('click', () => {
      console.log("Opção clicada:", opcao);
      processarAventura(opcao.toLowerCase());
    });
    opcoesAventura.appendChild(btn);
  });
}

function processarAventura(entrada) {
  console.log("Processando aventura:", entrada);
  if (!aventuraEstado) return "Aventura não iniciada.";
  const normal = entrada.toLowerCase();
  let resp = "";
  const resultadoVisual = document.getElementById('resultadoVisual');

  if (aventuraEstado.aventura === 'floresta') {
    if (aventuraEstado.etapa === 1) {
      aventuraEstado.caminho.push(normal);
      if (normal.includes("norte")) {
        aventuraEstado.etapa = 2;
        resp = `🪨 Você segue Norte e encontra uma Caverna escura. Um brilho vem de dentro. O que fazer?`;
        mostrarOpcoes(['Explorar', 'Voltar']);
      } else if (normal.includes("sul")) {
        aventuraEstado.etapa = 2;
        resp = `🏘️ Você vai Sul e chega a uma Vila abandonada. Há uma casa iluminada. O que fazer?`;
        mostrarOpcoes(['Entrar', 'Ignorar']);
      } else if (normal.includes("oeste")) {
        aventuraEstado.etapa = 2;
        resp = `🌊 Você segue Oeste e encontra um Rio cristalino. Há uma ponte frágil. O que fazer?`;
        mostrarOpcoes(['Cruzar', 'Nadar']);
      } else {
        resp = `🌲 Escolha: Norte, Sul, Oeste.`;
        mostrarOpcoes(['Norte', 'Sul', 'Oeste']);
      }
    } else if (aventuraEstado.etapa === 2) {
      aventuraEstado.caminho.push(normal);
      if (aventuraEstado.caminho[0].includes("norte")) {
        if (normal.includes("explorar")) {
          aventuraEstado.etapa = 3;
          resp = `💎 Você explora a Caverna e encontra um Tesouro brilhante, mas ouve um rugido. Correr ou Pegar?`;
          mostrarOpcoes(['Correr', 'Pegar']);
        } else if (normal.includes("voltar")) {
          aventuraEstado.etapa = 3;
          resp = `🏃 Você volta correndo pra Floresta. Está salvo, mas sem aventura. Fim.`;
          aventuraEstado = null;
          document.getElementById('opcoesAventura').style.display = 'none';
        } else {
          resp = `🪨 Escolha: Explorar, Voltar.`;
          mostrarOpcoes(['Explorar', 'Voltar']);
        }
      } else if (aventuraEstado.caminho[0].includes("sul")) {
        if (normal.includes("entrar")) {
          aventuraEstado.etapa = 3;
          resp = `👻 Você entra na casa e encontra um Fantasma amigável. Ele oferece um mapa. Aceitar ou Sair?`;
          mostrarOpcoes(['Aceitar', 'Sair']);
        } else if (normal.includes("ignorar")) {
          aventuraEstado.etapa = 3;
          resp = `🚶 Você ignora a casa e segue pela Vila. A aventura termina sem novidades. Fim.`;
          aventuraEstado = null;
          document.getElementById('opcoesAventura').style.display = 'none';
        } else {
          resp = `🏘️ Escolha: Entrar, Ignorar.`;
          mostrarOpcoes(['Entrar', 'Ignorar']);
        }
      } else if (aventuraEstado.caminho[0].includes("oeste")) {
        if (normal.includes("cruzar")) {
          aventuraEstado.etapa = 3;
          resp = `🌉 Você cruza a ponte, que range, mas aguenta. Do outro lado, há uma Relíquia antiga. Pegar ou Deixar?`;
          mostrarOpcoes(['Pegar', 'Deixar']);
        } else if (normal.includes("nadar")) {
          aventuraEstado.etapa = 3;
          resp = `🏊 Você nada, mas a correnteza é forte. Consegue voltar à margem, mas está exausto. Fim.`;
          aventuraEstado = null;
          document.getElementById('opcoesAventura').style.display = 'none';
        } else {
          resp = `🌊 Escolha: Cruzar, Nadar.`;
          mostrarOpcoes(['Cruzar', 'Nadar']);
        }
      }
    } else if (aventuraEstado.etapa === 3) {
      aventuraEstado.caminho.push(normal);
      if (aventuraEstado.caminho[0].includes("norte") && aventuraEstado.caminho[1].includes("explorar")) {
        if (normal.includes("correr")) {
          resp = `🏃 Você corre da Caverna e escapa do monstro, mas sem o tesouro. Fim da aventura!`;
        } else if (normal.includes("pegar")) {
          resp = `💎 Você pega o Tesouro, mas o monstro te alcança. Game over! 😱`;
        }
        aventuraEstado = null;
        document.getElementById('opcoesAventura').style.display = 'none';
      } else if (aventuraEstado.caminho[0].includes("sul") && aventuraEstado.caminho[1].includes("entrar")) {
        if (normal.includes("aceitar")) {
          resp = `🗺️ Você aceita o mapa e descobre um tesouro escondido na Vila! Fim vitorioso! 🎉`;
        } else if (normal.includes("sair")) {
          resp = `🚪 Você sai da casa e deixa a Vila. Aventura termina sem mistérios. Fim.`;
        }
        aventuraEstado = null;
        document.getElementById('opcoesAventura').style.display = 'none';
      } else if (aventuraEstado.caminho[0].includes("oeste") && aventuraEstado.caminho[1].includes("cruzar")) {
        if (normal.includes("pegar")) {
          resp = `🗿 Você pega a Relíquia e sente um poder místico. Vitória épica! Fim! 🏆`;
        } else if (normal.includes("deixar")) {
          resp = `🙏 Você deixa a Relíquia e segue em paz. Aventura termina calmamente. Fim.`;
        }
        aventuraEstado = null;
        document.getElementById('opcoesAventura').style.display = 'none';
      }
    }
  }

  if (resultadoVisual) resultadoVisual.textContent = resp;
  salvarLocal("fenix_aventura", aventuraEstado);
  return resp;
}