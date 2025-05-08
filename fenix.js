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
  recognition.onresult = (event) => {
    console.log("Resultado de voz:", event.results);
    const texto = event.results[0][0].transcript;
    const entrada = document.getElementById('entrada');
    if (entrada) {
      entrada.value = texto;
      console.log("Texto transcrito:", texto);
      // Garantir que chatInteraction esteja visível
      if (!chatMode) toggleChatMode();
      document.getElementById('chatInteraction').style.display = 'flex';
      enviar();
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
    showError(`Erro na voz: ${event.error}`);
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
  console.log(`Salvando ${nome}...`);
  try {
    localStorage.setItem(nome, JSON.stringify(dados));
  } catch (e) {
    console.error(`Erro ao salvar ${nome}:`, e);
  }
}

// Carregar dados
async function carregarTudo() {
  console.log("Carregando dados...");
  memoria = await carregarJSON("dados/memoria.json") || {};
  usuario = await carregarJSON("dados/usuario.json") || { nome: "amigo" };
  chatHistory = JSON.parse(localStorage.getItem("fenix_chat_history")) || [];
  mathHistory = JSON.parse(localStorage.getItem("fenix_math_history")) || [];
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
  // Aumentar contraste
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
    // Pré-processar imagem para melhorar OCR
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
  // Mapa de cores para contagem
  const colorMap = {};
  for (let i = 0; i < imageData.length; i += 4) {
    const r = Math.round(imageData[i] / 10) * 10;
    const g = Math.round(imageData[i + 1] / 10) * 10;
    const b = Math.round(imageData[i + 2] / 10) * 10;
    const key = `${r},${g},${b}`;
    colorMap[key] = (colorMap[key] || 0) + 1;
  }
  // Ordenar por frequência
  const cores = Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => `rgb(${key})`);
  const coresLista = cores.length > 0 ? cores.join(", ") : "Nenhuma cor dominante.";
  const texto = `Cores em "${loadedImage.name}": ${coresLista}`;
  document.getElementById('resultadoVisual').textContent = texto;
  falar(texto);
}

function reconhecerObjetos() {
  console.log("Executando reconhecerObjetos...");
  if (!loadedImage) {
    showError('Nenhuma imagem carregada.');
    return;
  }
  // Simulação inteligente baseada no texto extraído
  const objetosPossiveis = {
    "livro": ["Livro", "Caderno", "Papel"],
    "caneta": ["Caneta", "Lápis", "Marcador"],
    "mesa": ["Mesa", "Cadeira", "Escrivaninha"],
    "árvore": ["Árvore", "Planta", "Folha"],
    "carro": ["Carro", "Moto", "Bicicleta"],
    default: ["Objeto desconhecido"]
  };
  let objetos = objetosPossiveis.default;
  for (const [key, value] of Object.entries(objetosPossiveis)) {
    if (ultimoTextoExtraido.toLowerCase().includes(key)) {
      objetos = value;
      break;
    }
  }
  const texto = `Objetos em "${loadedImage.name}": ${objetos.join(", ") || "Nenhum objeto detectado."}`;
  document.getElementById('resultadoVisual').textContent = texto;
  falar(texto);
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
      showError("Erro ao iniciar microfone.");
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
  if (texto.includes("oi")) return `Oi, ${usuario.nome}! Como posso ajudar?`;
  if (texto.includes("capital do brasil")) return "A capital do Brasil é Brasília.";
  if (memoria[texto]) return memoria[texto];
  return "Não sei responder. Use 'Ensinar Fênix' pra me ensinar.";
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
  ['Floresta'].forEach(nome => {
    const btn = document.createElement('button');
    btn.textContent = nome;
    btn.addEventListener('click', () => iniciarAventura('floresta'));
    opcoesAventura.appendChild(btn);
  });
}

function iniciarAventura(aventuraId) {
  console.log("Iniciando aventura:", aventuraId);
  const nome = sanitizarEntrada(prompt("Nome do herói:") || "Herói");
  aventuraEstado = { heroi: nome, aventura: aventuraId, etapa: 1 };
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (resultadoVisual) {
    resultadoVisual.textContent = `🌲 Você, ${nome}, está numa Floresta. Escolha: Norte, Sul.`;
    mostrarOpcoes(['Norte', 'Sul']);
    salvarLocal("fenix_aventura", aventuraEstado);
    falar(`Você, ${nome}, está numa Floresta. Escolha: Norte, Sul.`);
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
  if (aventuraEstado.aventura === 'floresta' && aventuraEstado.etapa === 1) {
    if (normal.includes("norte")) {
      aventuraEstado.etapa = 2;
      resp = `🏔️ Você vai às montanhas. Fim da aventura.`;
      aventuraEstado = null;
      document.getElementById('opcoesAventura').style.display = 'none';
    } else if (normal.includes("sul")) {
      aventuraEstado.etapa = 2;
      resp = `🏘️ Você chega a uma vila. Fim da aventura.`;
      aventuraEstado = null;
      document.getElementById('opcoesAventura').style.display = 'none';
    } else {
      resp = `Escolha: Norte, Sul.`;
      mostrarOpcoes(['Norte', 'Sul']);
    }
  }
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (resultadoVisual) resultadoVisual.textContent = resp;
  salvarLocal("fenix_aventura", aventuraEstado);
  return resp;
}