console.log("Iniciando fenix.js...");

let chatHistory = [];
let loadedImage = null;
let chatMode = false;
let aventuraEstado = null;
let isListening = false;
let recognition = null;

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
    console.log("Resultado de voz recebido:", event.results);
    const texto = event.results[0][0].transcript;
    const entrada = document.getElementById('entrada');
    if (entrada) {
      entrada.value = texto;
      console.log("Texto transcrito:", texto);
      enviar();
    }
  };
  recognition.onend = () => {
    console.log("Reconhecimento de voz finalizado.");
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

// Mostrar erro
function showError(msg) {
  console.error("Erro:", msg);
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (resultadoVisual) {
    resultadoVisual.textContent = msg;
    resultadoVisual.classList.add('error');
  }
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
    { id: 'btnExportarPDF', handler: exportarPDF },
    { id: 'btnResetarArquivo', handler: resetarArquivo },
    { id: 'toggleChatMode', handler: toggleChatMode },
    { id: 'btnAventura', handler: abrirAventura },
    { id: 'btnFalar', handler: toggleMic }
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
    console.log("Sistema pronto!");
    document.getElementById('resultadoVisual').textContent = 'Sistema pronto! Tente arrastar uma imagem ou clicar nos botões.';
  } else {
    showError('Erro ao inicializar. Veja o console (F12).');
  }
});

// Habilitar/desabilitar botões
function enableButtons() {
  ['btnExtrairTexto', 'btnExportarPDF', 'btnResetarArquivo'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
      console.log(`Botão ${id} habilitado.`);
    }
  });
}
function disableButtons() {
  ['btnExtrairTexto', 'btnExportarPDF', 'btnResetarArquivo'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = true;
      console.log(`Botão ${id} desabilitado.`);
    }
  });
}

// Funções de imagem
function extrairTexto() {
  console.log("Executando extrairTexto...");
  if (!loadedImage) {
    showError('Nenhuma imagem carregada.');
    return;
  }
  const texto = `Texto extraído de "${loadedImage.name}": Lorem ipsum.`;
  document.getElementById('resultadoVisual').textContent = texto;
}

// Exportar PDF
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
  doc.save(`relatorio_${loadedImage.name}.pdf`);
  document.getElementById('resultadoVisual').textContent = `PDF gerado!`;
}

// Resetar arquivo
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
  disableButtons();
}

// Modo conversa
function toggleChatMode() {
  console.log("Toggling modo conversa...");
  chatMode = !chatMode;
  const btnChat = document.getElementById('toggleChatMode');
  if (btnChat) btnChat.textContent = chatMode ? 'Desativar Conversa' : 'Ativar Conversa';
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

// Microfone
function toggleMic() {
  console.log("Toggling microfone...");
  if (!recognition) {
    showError("Reconhecimento de voz não inicializado.");
    return;
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

// Enviar
function enviar() {
  console.log("Executando enviar...");
  const entrada = document.getElementById('entrada');
  const resposta = document.getElementById('resposta');
  if (!entrada || !resposta) {
    showError("Elementos de entrada não encontrados.");
    return;
  }
  const texto = entrada.value.trim();
  if (!texto) {
    showError("Digite algo.");
    return;
  }
  entrada.value = "";

  if (chatMode) {
    const resp = texto.includes("oi") ? "Oi! Como posso ajudar?" : "Não sei responder isso.";
    chatHistory.push({ user: texto, ai: resp });
    if (chatHistory.length > 5) chatHistory.shift();
    resposta.textContent = chatHistory.map(e => `Você: ${e.user}\nFênix: ${e.ai}`).join('\n');
  } else if (aventuraEstado) {
    const resp = processarAventura(texto);
    document.getElementById('resultadoVisual').textContent = resp;
  } else {
    showError("Ative um modo (Conversa ou Aventura).");
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
  const nome = prompt("Nome do herói:") || "Herói";
  aventuraEstado = { heroi: nome, aventura: aventuraId, etapa: 1 };
  const resultadoVisual = document.getElementById('resultadoVisual');
  if (resultadoVisual) {
    resultadoVisual.textContent = `🌲 Você, ${nome}, está numa Floresta. Escolha: Norte, Sul.`;
    mostrarOpcoes(['Norte', 'Sul']);
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
  return resp;
}