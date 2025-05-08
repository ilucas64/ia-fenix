let memoria = {};
let chatHistory = [];
let mathHistory = [];
let usuario = { nome: "amigo" };
let aventuraEstado = null;
let chatMode = false;
let mathMode = false;
let loadedImage = null;
let vozConfig = { pitch: 1.0, rate: 1.0 };
let isListening = false;
let recognition = null;

// Inicializar reconhecimento de voz
function inicializarReconhecimentoVoz() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Reconhecimento de voz não suportado.");
    showError("Seu navegador não suporta reconhecimento de voz. Use Chrome/Edge.");
    disableButton('btnFalar');
    return false;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    let interim = "";
    let finalTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const txt = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += txt;
      else interim += txt;
    }
    const entrada = document.getElementById('entrada');
    if (entrada) entrada.value = finalTranscript + interim;
  };
  recognition.onend = () => {
    isListening = false;
    const btnFalar = document.getElementById('btnFalar');
    if (btnFalar) {
      btnFalar.classList.remove('listening');
      btnFalar.textContent = "🎤 Falar";
    }
    const entrada = document.getElementById('entrada');
    if (entrada && entrada.value.trim()) enviar();
  };
  recognition.onerror = (event) => {
    isListening = false;
    const btnFalar = document.getElementById('btnFalar');
    if (btnFalar) {
      btnFalar.classList.remove('listening');
      btnFalar.textContent = "🎤 Falar";
    }
    showError(`Erro no reconhecimento de voz: ${event.error}`);
  };
  return true;
}

// Mostrar erro
function showError(msg) {
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (resultadoVisual) {
    resultadoVisual.textContent = msg;
    resultadoVisual.classList.add('error');
  }
  console.error(msg);
}

// Desabilitar botão
function disableButton(id) {
  const btn = document.getElementById(id);
  if (btn) btn.disabled = true;
}

// Carregar JSON
async function carregarJSON(caminho) {
  try {
    const res = await fetch(caminho);
    if (!res.ok) throw new Error(`Erro ao carregar ${caminho}`);
    return await res.json();
  } catch (e) {
    showError(`Erro ao carregar ${caminho}.`);
    return {};
  }
}

// Salvar no localStorage
function salvarLocal(nome, dados) {
  try {
    localStorage.setItem(nome, JSON.stringify(dados));
  } catch (e) {
    console.error(`Erro ao salvar ${nome}:`, e);
  }
}

// Carregar dados
async function carregarTudo() {
  memoria = await carregarJSON("dados/memoria.json") || {};
  chatHistory = JSON.parse(localStorage.getItem("fenix_chat_history")) || [];
  mathHistory = JSON.parse(localStorage.getItem("fenix_math_history")) || [];
  usuario = await carregarJSON("dados/usuario.json") || { nome: "amigo" };
  vozConfig = JSON.parse(localStorage.getItem("fenix_voz_config")) || { pitch: 1.0, rate: 1.0 };
  const resposta = document.getElementById('resposta');
  if (resposta) resposta.textContent = "Sistema carregado!";
}

// Falar
function falar(texto) {
  try {
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "pt-BR";
    voz.rate = vozConfig.rate;
    voz.pitch = vozConfig.pitch;
    window.speechSynthesis.speak(voz);
  } catch (e) {
    showError("Erro na síntese de voz.");
  }
}

// Sanitizar entrada
function sanitizarEntrada(texto) {
  return texto.replace(/[<>{}]/g, "").trim();
}

// Configurar eventos
function configurarEventos() {
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
    { id: 'btnEnviar', handler: enviar },
    { id: 'btnFalar', handler: toggleMic },
    { id: 'btnEnsinar', handler: ensinar },
    { id: 'btnModificarVoz', handler: modificarVoz }
  ];

  botoes.forEach(({ id, handler }) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', handler);
    else console.warn(`Botão ${id} não encontrado.`);
  });

  elementos.dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elementos.dropArea.classList.add('dragover');
  });
  elementos.dropArea.addEventListener('dragleave', () => {
    elementos.dropArea.classList.remove('dragover');
  });
  elementos.dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elementos.dropArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      elementos.preview.src = url;
      elementos.preview.style.display = 'block';
      loadedImage = file;
      elementos.resultadoVisual.textContent = `Imagem carregada: ${file.name}`;
      enableButtons();
    } else {
      showError('Por favor, solte uma imagem válida.');
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
    }
  });

  elementos.entrada.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      enviar();
    }
  });

  disableButtons();
  return true;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  if (configurarEventos() && inicializarReconhecimentoVoz()) {
    carregarTudo();
  } else {
    showError('Erro ao inicializar. Verifique o console (F12).');
  }
});

// Habilitar/desabilitar botões
function enableButtons() {
  ['btnExtrairTexto', 'btnDetectarCores', 'btnReconhecerObjetos', 'btnExportarPDF', 'btnResetarArquivo'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = false;
  });
}
function disableButtons() {
  ['btnExtrairTexto', 'btnDetectarCores', 'btnReconhecerObjetos', 'btnExportarPDF', 'btnResetarArquivo'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = true;
  });
}

// Funções de imagem
function extrairTexto() {
  if (!loadedImage) return showError('Nenhuma imagem carregada.');
  const texto = `Texto extraído de "${loadedImage.name}": Lorem ipsum.`;
  document.getElementById('resultadoVisual').textContent = texto;
  falar(texto);
}
function detectarCores() {
  if (!loadedImage) return showError('Nenhuma imagem carregada.');
  const cores = `Cores em "${loadedImage.name}": Vermelho, Azul, Verde.`;
  document.getElementById('resultadoVisual').textContent = cores;
  falar(cores);
}
function reconhecerObjetos() {
  if (!loadedImage) return showError('Nenhuma imagem carregada.');
  const objetos = `Objetos em "${loadedImage.name}": Mesa, Cadeira, Livro.`;
  document.getElementById('resultadoVisual').textContent = objetos;
  falar(objetos);
}
function exportarPDF() {
  if (!loadedImage) return showError('Nenhuma imagem carregada.');
  if (typeof jspdf === 'undefined') return showError('jsPDF não carregado.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(`Relatório: ${loadedImage.name}`, 10, 10);
  doc.save(`relatorio_${loadedImage.name}.pdf`);
  document.getElementById('resultadoVisual').textContent = `PDF gerado!`;
  falar("PDF gerado!");
}
function resetarArquivo() {
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
  disableButtons();
}

// Modos
function toggleChatMode() {
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
async function toggleMic() {
  if (!recognition) return;
  const entrada = document.getElementById('entrada');
  const btnFalar = document.getElementById('btnFalar');
  if (!isListening) {
    try {
      recognition.start();
      isListening = true;
      if (entrada) entrada.value = "";
      if (btnFalar) {
        btnFalar.classList.add('listening');
        btnFalar.textContent = "🔴 Gravando...";
      }
    } catch (e) {
      showError("Erro ao iniciar microfone.");
    }
  } else {
    recognition.stop();
    isListening = false;
    if (btnFalar) {
      btnFalar.classList.remove('listening');
      btnFalar.textContent = "🎤 Falar";
    }
  }
}

// Modificar voz
function modificarVoz() {
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

// Processar pergunta
function processarPergunta(pergunta) {
  const texto = pergunta.toLowerCase().trim();
  if (texto.includes("oi")) return `Oi, ${usuario.nome}! Como posso ajudar?`;
  if (texto.includes("capital do brasil")) return "A capital do Brasil é Brasília.";
  if (memoria[texto]) return memoria[texto];
  return "Não sei responder isso. Tente reformular ou use 'Ensinar Fênix'.";
}

// Enviar
function enviar() {
  const entrada = document.getElementById('entrada');
  const resposta = document.getElementById('resposta');
  if (!entrada || !resposta) return showError("Elementos de entrada não encontrados.");
  const texto = sanitizarEntrada(entrada.value);
  if (!texto) return showError("Digite algo.");
  entrada.value = "";

  if (mathMode) {
    if (typeof math === 'undefined') return showError("Math.js não carregado.");
    try {
      const resultado = math.evaluate(texto);
      const resp = `Resultado: ${resultado}`;
      mathHistory.push({ user: texto, ai: resp });
      if (mathHistory.length > 10) mathHistory.shift();
      salvarLocal("fenix_math_history", mathHistory);
      resposta.textContent = mathHistory.map(e => `Você: ${e.user}\nFênix: ${e.ai}`).join('\n');
      falar(resp);
    } catch (e) {
      showError(`Erro ao calcular: ${e.message}`);
    }
  } else if (chatMode) {
    const resp = processarPergunta(texto);
    chatHistory.push({ user: texto, ai: resp });
    if (chatHistory.length > 10) chatHistory.shift();
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

// Ensinar
function ensinar() {
  const pergunta = sanitizarEntrada(prompt("Digite a pergunta:"));
  if (!pergunta) return alert("Pergunta inválida.");
  const resposta = sanitizarEntrada(prompt("Digite a resposta:"));
  if (!resposta) return alert("Resposta inválida.");
  memoria[pergunta.toLowerCase()] = resposta;
  salvarLocal("fenix_memoria", memoria);
  alert(`Aprendi: "${pergunta}" → "${resposta}"`);
}

// Aventura
function abrirAventura() {
  const resultadoVisual = document.getElementById('resultadoVisual');
  const opcoesAventura = document.getElementById('opcoesAventura');
  if (!resultadoVisual || !opcoesAventura) return showError("Elementos de aventura não encontrados.");
  resultadoVisual.textContent = 'Escolha sua aventura:';
  opcoesAventura.style.display = 'flex';
  opcoesAventura.innerHTML = '';
  ['Floresta Sombria', 'Castelo Amaldiçoado', 'Ilha Perdida'].forEach(nome => {
    const btn = document.createElement('button');
    btn.textContent = nome;
    btn.addEventListener('click', () => iniciarAventura(nome.toLowerCase().replace(' ', '_')));
    opcoesAventura.appendChild(btn);
  });
}

function iniciarAventura(aventuraId) {
  const nome = sanitizarEntrada(prompt("Digite o nome do herói:"));
  if (!nome) return showError("Nome inválido.");
  aventuraEstado = { heroi: nome, aventura: aventuraId, etapa: 1, inventario: [] };
  const resultadoVisual = document.getElementById('resultadoVisual');
  const opcoesAventura = document.getElementById('opcoesAventura');
  let resp = '';
  if (aventuraId === 'floresta_sombria') {
    resp = `🌲 Você, ${nome}, está numa Floresta Sombria. Escolha: Norte, Sul, Leste.`;
    mostrarOpcoes(['Norte', 'Sul', 'Leste']);
  } else if (aventuraId === 'castelo_amaldiçoado') {
    resp = `🏰 Você, ${nome}, está num Castelo Amaldiçoado. Escolha: Porta, Passagem, Janela.`;
    mostrarOpcoes(['Porta', 'Passagem', 'Janela']);
  } else if (aventuraId === 'ilha_perdida') {
    resp = `🏝️ Você, ${nome}, está numa Ilha Perdida. Escolha: Caverna, Pegadas, Fumaça.`;
    mostrarOpcoes(['Caverna', 'Pegadas', 'Fumaça']);
  }
  resultadoVisual.textContent = resp;
  salvarLocal("fenix_aventura", aventuraEstado);
  falar(resp);
}

function mostrarOpcoes(opcoes) {
  const opcoesAventura = document.getElementById('opcoesAventura');
  if (!opcoesAventura) return showError("Elemento opcoesAventura não encontrado.");
  opcoesAventura.innerHTML = '';
  opcoesAventura.style.display = 'flex';
  opcoes.forEach(opcao => {
    const btn = document.createElement('button');
    btn.textContent = opcao;
    btn.addEventListener('click', () => processarAventura(opcao.toLowerCase()));
    opcoesAventura.appendChild(btn);
  });
}

function processarAventura(entrada) {
  if (!aventuraEstado) return "Modo aventura não iniciado.";
  const normal = entrada.toLowerCase();
  let resp = "";
  if (aventuraEstado.aventura === 'floresta_sombria' && aventuraEstado.etapa === 1) {
    if (normal.includes("norte")) {
      aventuraEstado.etapa = 2;
      resp = `🏔️ Você vai às montanhas. Um lobo aparece. Lutar, Fugir, Acalmar?`;
      mostrarOpcoes(['Lutar', 'Fugir', 'Acalmar']);
    } else if (normal.includes("sul")) {
      aventuraEstado.etapa = 2;
      resp = `🏘️ Você chega a uma vila. Comprar espada, Ajudar sábia, Continuar?`;
      mostrarOpcoes(['Comprar', 'Ajudar', 'Continuar']);
    } else if (normal.includes("leste")) {
      aventuraEstado.etapa = 2;
      resp = `🏛️ Você acha ruínas. Entrar, Decifrar inscrição, Voltar?`;
      mostrarOpcoes(['Entrar', 'Decifrar', 'Voltar']);
    } else {
      resp = `Escolha: Norte, Sul, Leste.`;
      mostrarOpcoes(['Norte', 'Sul', 'Leste']);
    }
  } else {
    resp = "Aventura não implementada para esta etapa.";
    aventuraEstado = null;
    document.getElementById('opcoesAventura').style.display = 'none';
  }
  salvarLocal("fenix_aventura", aventuraEstado);
  return resp;
}