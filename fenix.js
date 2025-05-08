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
    document.getElementById('resultadoVisual').textContent = "Seu navegador não suporta reconhecimento de voz. Use Chrome/Edge.";
    document.getElementById('resultadoVisual').classList.add('error');
    document.getElementById('btnFalar').disabled = true;
    return false;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let interim = "";
    let finalTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const txt = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += txt + " ";
      } else {
        interim += txt;
      }
    }
    document.getElementById('entrada').value = finalTranscript + interim;
    console.log("Transcrição parcial:", document.getElementById('entrada').value);
  };

  recognition.onend = () => {
    console.log("Reconhecimento de voz finalizado");
    if (document.getElementById('entrada').value.trim()) {
      enviar();
    }
    document.getElementById('btnFalar').classList.remove('listening');
    document.getElementById('btnFalar').textContent = "🎤 Falar";
    isListening = false;
  };

  recognition.onerror = (event) => {
    let errorMessage = "Erro no reconhecimento de voz: ";
    if (event.error === "no-speech") {
      errorMessage += "Nenhum som detectado.";
    } else if (event.error === "audio-capture") {
      errorMessage += "Microfone não disponível.";
    } else if (event.error === "not-allowed") {
      errorMessage += "Permissão para microfone negada.";
    } else {
      errorMessage += event.error;
    }
    console.error("Erro no reconhecimento:", event.error);
    document.getElementById('resultadoVisual').textContent = errorMessage;
    document.getElementById('resultadoVisual').classList.add('error');
    document.getElementById('btnFalar').classList.remove('listening');
    document.getElementById('btnFalar').textContent = "🎤 Falar";
    isListening = false;
  };

  return true;
}

// Verificar permissões do microfone
async function checkMicPermission() {
  try {
    const permission = await navigator.permissions.query({ name: "microphone" });
    if (permission.state === "denied") {
      document.getElementById('resultadoVisual').textContent = "Permissão para microfone negada. Habilite nas configurações.";
      document.getElementById('resultadoVisual').classList.add('error');
      document.getElementById('btnFalar').disabled = true;
      return false;
    }
    return true;
  } catch (e) {
    console.error("Erro ao verificar permissões do microfone:", e);
    return true;
  }
}

// Verificar Math.js
function verificarMathJS() {
  if (typeof math === 'undefined') {
    console.error("Math.js não carregado.");
    document.getElementById('resultadoVisual').textContent = "Erro: Math.js não carregado. Modo matemático indisponível.";
    document.getElementById('resultadoVisual').classList.add('error');
    return false;
  }
  return true;
}

// Verificar jsPDF
function verificarJSPDF() {
  if (typeof jspdf === 'undefined') {
    console.error("jsPDF não carregado.");
    document.getElementById('resultadoVisual').textContent = "Erro: jsPDF não carregado. Exportação de PDF indisponível.";
    document.getElementById('resultadoVisual').classList.add('error');
    return false;
  }
  return true;
}

// Carregar dados JSON
async function carregarJSON(caminho) {
  try {
    const res = await fetch(caminho);
    if (!res.ok) throw new Error(`Erro ao carregar ${caminho}: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Erro ao carregar JSON: ${e.message}`);
    document.getElementById('resultadoVisual').textContent = `Erro ao carregar ${caminho}. Verifique a pasta 'dados/'.`;
    document.getElementById('resultadoVisual').classList.add('error');
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
    chatHistory = JSON.parse(localStorage.getItem("fenix_chat_history")) || [];
    mathHistory = JSON.parse(localStorage.getItem("fenix_math_history")) || [];
    usuario = await carregarJSON("dados/usuario.json") || { nome: "amigo" };
    vozConfig = JSON.parse(localStorage.getItem("fenix_voz_config")) || { pitch: 1.0, rate: 1.0 };
    console.log("Dados carregados:", { memoria, chatHistory, mathHistory, usuario, vozConfig });
    document.getElementById("resposta").innerText = "Sistema carregado com sucesso!";
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
    document.getElementById("resposta").innerText = "Erro ao carregar dados. Verifique o console.";
    document.getElementById("resposta").classList.add('error');
  }
}

// Falar com suporte a cancelamento
function falar(texto) {
  try {
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "pt-BR";
    voz.rate = vozConfig.rate;
    voz.pitch = vozConfig.pitch;
    voz.volume = 1.0;
    const voices = speechSynthesis.getVoices();
    const ptBrVoice = voices.find(voice => voice.lang === "pt-BR") || voices[0];
    voz.voice = ptBrVoice;
    window.speechSynthesis.speak(voz);
    console.log("Fala iniciada:", texto);
  } catch (e) {
    console.error("Erro na fala:", e);
    document.getElementById('resultadoVisual').textContent = "Erro na síntese de voz.";
    document.getElementById('resultadoVisual').classList.add('error');
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
      console.error(`Elemento ${nome} não encontrado.`);
      elementos.resultadoVisual.textContent = `Erro: Elemento ${nome} não encontrado.`;
      elementos.resultadoVisual.classList.add('error');
      return false;
    }
  }

  console.log("Configurando eventos dos botões...");
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
    if (btn) {
      btn.addEventListener('click', () => {
        console.log(`Botão ${id} clicado`);
        elementos.resultadoVisual.textContent = `Botão "${id}" clicado! Executando ação...`;
        elementos.resultadoVisual.classList.remove('error', 'loading');
        handler();
      });
      console.log(`Evento de clique registrado para ${id}`);
    } else {
      console.error(`Botão com ID ${id} não encontrado.`);
      elementos.resultadoVisual.textContent = `Erro: Botão "${id}" não encontrado.`;
      elementos.resultadoVisual.classList.add('error');
    }
  });

  // Configurar eventos de drag-and-drop
  elementos.dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elementos.dropArea.classList.add('dragover');
    console.log("Dragover detectado");
    elementos.resultadoVisual.textContent = 'Solte a imagem aqui...';
  });

  elementos.dropArea.addEventListener('dragleave', () => {
    elementos.dropArea.classList.remove('dragover');
    console.log("Dragleave detectado");
    elementos.resultadoVisual.textContent = 'O texto extraído aparecerá aqui...';
  });

  elementos.dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elementos.dropArea.classList.remove('dragover');
    console.log("Drop detectado");
    elementos.resultadoVisual.textContent = 'Imagem solta! Carregando...';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      elementos.preview.src = url;
      elementos.preview.style.display = 'block';
      loadedImage = file;
      elementos.resultadoVisual.textContent = 'Imagem carregada com sucesso! Nome: ' + file.name;
      elementos.resultadoVisual.classList.remove('error', 'loading');
      enableButtons();
      console.log("Imagem carregada via drag-and-drop:", file.name);
    } else {
      elementos.resultadoVisual.textContent = 'Por favor, solte uma imagem válida.';
      elementos.resultadoVisual.classList.add('error');
      console.error("Arquivo inválido solto:", file ? file.type : 'nenhum arquivo');
    }
  });

  // Configurar evento de input de imagem
  elementos.imgInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      elementos.preview.src = url;
      elementos.preview.style.display = 'block';
      loadedImage = file;
      elementos.resultadoVisual.textContent = 'Imagem carregada com sucesso! Nome: ' + file.name;
      elementos.resultadoVisual.classList.remove('error', 'loading');
      enableButtons();
      console.log("Imagem selecionada via input:", file.name);
    }
  });

  // Configurar evento de teclado
  elementos.entrada.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      console.log("Enter pressionado no entrada");
      elementos.resultadoVisual.textContent = 'Enter pressionado!';
      enviar();
    }
  });

  // Desabilitar botões de imagem inicialmente
  disableButtons();
  console.log("Configuração de eventos concluída.");
  return true;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM carregado, iniciando configuração...");
  const sucesso = configurarEventos() && inicializarReconhecimentoVoz();
  if (sucesso) {
    carregarTudo();
    document.getElementById('resultadoVisual').textContent = 'Sistema pronto! Tente arrastar uma imagem ou clicar nos botões.';
  } else {
    document.getElementById('resultadoVisual').textContent = 'Erro ao inicializar. Verifique o console (F12).';
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

// Funções de imagem
function extrairTexto() {
  if (!loadedImage) {
    document.getElementById('resultadoVisual').textContent = 'Nenhuma imagem carregada.';
    document.getElementById('resultadoVisual').classList.add('error');
    return;
  }
  const texto = `Texto fictício extraído da imagem "${loadedImage.name}": Lorem ipsum dolor sit amet.`;
  document.getElementById('resultadoVisual').textContent = texto;
  document.getElementById('resultadoVisual').classList.remove('error', 'loading');
  falar(texto);
}

function detectarCores() {
  if (!loadedImage) {
    document.getElementById('resultadoVisual').textContent = 'Nenhuma imagem carregada.';
    document.getElementById('resultadoVisual').classList.add('error');
    return;
  }
  const cores = `Cores detectadas na imagem "${loadedImage.name}": Vermelho, Azul, Verde.`;
  document.getElementById('resultadoVisual').textContent = cores;
  document.getElementById('resultadoVisual').classList.remove('error', 'loading');
  falar(cores);
}

function reconhecerObjetos() {
  if (!loadedImage) {
    document.getElementById('resultadoVisual').textContent = 'Nenhuma imagem carregada.';
    document.getElementById('resultadoVisual').classList.add('error');
    return;
  }
  const objetos = `Objetos reconhecidos na imagem "${loadedImage.name}": Mesa, Cadeira, Livro.`;
  document.getElementById('resultadoVisual').textContent = objetos;
  document.getElementById('resultadoVisual').classList.remove('error', 'loading');
  falar(objetos);
}

function exportarPDF() {
  if (!loadedImage) {
    document.getElementById('resultadoVisual').textContent = 'Nenhuma imagem carregada.';
    document.getElementById('resultadoVisual').classList.add('error');
    return;
  }
  if (!verificarJSPDF()) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(`Relatório da Imagem: ${loadedImage.name}`, 10, 10);
  doc.text("Texto extraído: Lorem ipsum dolor sit amet.", 10, 20);
  doc.text("Cores detectadas: Vermelho, Azul, Verde.", 10, 30);
  doc.text("Objetos reconhecidos: Mesa, Cadeira, Livro.", 10, 40);
  doc.save(`relatorio_${loadedImage.name}.pdf`);
  document.getElementById('resultadoVisual').textContent = `PDF gerado para "${loadedImage.name}"!`;
  document.getElementById('resultadoVisual').classList.remove('error', 'loading');
  falar("PDF gerado com sucesso!");
}

// Alternar modo conversa
function toggleChatMode() {
  console.log("Toggling modo conversa...");
  chatMode = !chatMode;
  mathMode = false;
  const btnChat = document.getElementById('toggleChatMode');
  const btnMath = document.getElementById('toggleMathMode');
  if (btnChat) {
    btnChat.textContent = chatMode ? 'Desativar Modo Conversa' : 'Ativar Modo Conversa';
    btnChat.classList.toggle('active', chatMode);
  }
  if (btnMath) {
    btnMath.classList.remove('active');
    btnMath.textContent = 'Ativar Modo Matemático';
  }
  document.getElementById('chatInteraction').style.display = chatMode ? 'flex' : 'none';
  document.getElementById('opcoesAventura').style.display = 'none';
  document.getElementById('resultadoVisual').style.display = chatMode ? 'none' : 'block';
  document.getElementById('resposta').textContent = chatMode
    ? (chatHistory.length ? chatHistory.map(entry => `Você: ${entry.user}\nFênix: ${entry.ai}`).join('\n') : 'Oi! Estou pronta para conversar. Pergunte algo!')
    : '';
  console.log("Modo conversa:", chatMode ? "ativado" : "desativado");
}

// Alternar modo matemático
function toggleMathMode() {
  console.log("Toggling modo matemático...");
  if (!verificarMathJS()) return;
  mathMode = !mathMode;
  chatMode = false;
  const btnMath = document.getElementById('toggleMathMode');
  const btnChat = document.getElementById('toggleChatMode');
  if (btnMath) {
    btnMath.textContent = mathMode ? 'Desativar Modo Matemático' : 'Ativar Modo Matemático';
    btnMath.classList.toggle('active', mathMode);
  }
  if (btnChat) {
    btnChat.classList.remove('active');
    btnChat.textContent = 'Ativar Modo Conversa';
  }
  document.getElementById('chatInteraction').style.display = mathMode ? 'flex' : 'none';
  document.getElementById('opcoesAventura').style.display = 'none';
  document.getElementById('resultadoVisual').style.display = mathMode ? 'none' : 'block';
  document.getElementById('resposta').textContent = mathMode
    ? (mathHistory.length ? mathHistory.map(entry => `Você: ${entry.user}\nFênix: ${entry.ai}`).join('\n') : 'Digite uma expressão matemática (ex.: 2+2, resolver x^2=4)')
    : '';
  console.log("Modo matemático:", mathMode ? "ativado" : "desativado");
}

// Alternar microfone
async function toggleMic() {
  if (!recognition) return;
  if (!isListening) {
    if (!(await checkMicPermission())) return;
    document.getElementById('entrada').value = "";
    try {
      recognition.start();
      console.log("Reconhecimento de voz iniciado");
      document.getElementById('btnFalar').classList.add('listening');
      document.getElementById('btnFalar').textContent = "🔴 Gravando...";
      isListening = true;
    } catch (e) {
      console.error("Erro ao iniciar reconhecimento:", e);
      document.getElementById('resultadoVisual').textContent = "Erro ao iniciar microfone: " + e.message;
      document.getElementById('resultadoVisual').classList.add('error');
    }
  } else {
    recognition.stop();
    console.log("Reconhecimento de voz parado");
    document.getElementById('btnFalar').classList.remove('listening');
    document.getElementById('btnFalar').textContent = "🎤 Falar";
    isListening = false;
  }
}

// Modificar voz
function modificarVoz() {
  console.log("Modificando voz...");
  try {
    const pitch = prompt("Digite o tom da voz (0.5 a 1.5, padrão 1.0):", vozConfig.pitch);
    const rate = prompt("Digite a velocidade da voz (0.8 a 1.2, padrão 1.0):", vozConfig.rate);
    vozConfig.pitch = parseFloat(pitch) || 1.0;
    vozConfig.rate = parseFloat(rate) || 1.0;
    if (vozConfig.pitch < 0.5 || vozConfig.pitch > 1.5) vozConfig.pitch = 1.0;
    if (vozConfig.rate < 0.8 || vozConfig.rate > 1.2) vozConfig.rate = 1.0;
    salvarLocal("fenix_voz_config", vozConfig);
    document.getElementById('resultadoVisual').textContent = `Voz modificada! Tom: ${vozConfig.pitch}, Velocidade: ${vozConfig.rate}`;
    document.getElementById('resultadoVisual').classList.remove('error', 'loading');
    falar("Voz modificada com sucesso!");
    console.log("Voz modificada:", vozConfig);
  } catch (e) {
    console.error("Erro em modificarVoz:", e);
    document.getElementById('resultadoVisual').textContent = "Erro ao modificar voz.";
    document.getElementById('resultadoVisual').classList.add('error');
  }
}

// Explicar funcionalidades
function explicarFuncionalidades() {
  const texto = `Eu sou a Fênix, sua IA avançada! Aqui está o que posso fazer:
- **Drag-and-Drop de Imagens**: Arraste uma imagem pra área de upload ou clique pra selecionar. Depois, use os botões pra:
  - Extrair texto (simula extração de texto).
  - Detectar cores (lista cores fictícias).
  - Reconhecer objetos (lista objetos fictícios).
  - Exportar PDF (gera um relatório em PDF).
- **Modo Conversa**: Ative pra bater papo, perguntar coisas ou me ensinar respostas novas. Exemplo: "Qual a capital do Brasil?".
- **Modo Matemático**: Ative pra resolver cálculos ou equações. Exemplo: "2+2" ou "resolver x^2=4".
- **Modo Aventura**: Escolha uma história interativa (Floresta, Castelo, Ilha) e faça escolhas pra avançar.
- **Falar**: Use o botão "Falar" pra me perguntar por voz. Eu transformo sua fala em texto e respondo.
- **Modificar Voz**: Ajuste o tom e velocidade da minha voz com o botão "Modificar Voz".
- **Ensinar**: Use "Ensinar Fênix" pra me dar novas perguntas e respostas.
Tente algo agora!`;
  return texto;
}

// Processar pergunta no modo conversa
function processarPergunta(pergunta) {
  const texto = pergunta.toLowerCase().trim();

  if (["oi", "olá", "e aí", "fala", "opa"].some(p => texto.includes(p)))
    return `Oi, ${usuario.nome}! Como posso te ajudar hoje?`;
  if (texto.includes("bom dia"))
    return "Bom dia! Espero que seu dia esteja começando bem! 😊";
  if (texto.includes("boa tarde"))
    return "Boa tarde! Como posso te ajudar agora?";
  if (texto.includes("boa noite"))
    return "Boa noite! Quer conversar sobre algo especial?";
  if (texto.includes("tudo bem"))
    return "Tudo ótimo por aqui! E contigo, como tá?";
  if (texto.includes("qual seu nome"))
    return "Eu sou Fênix, sua IA avançada!";
  if (texto.includes("como você está"))
    return "Tô de boa, pronta pra responder suas perguntas! 😄";
  if (texto.includes("obrigado") || texto.includes("valeu"))
    return "Por nada! Sempre que precisar, é só chamar.";
  if (texto.includes("quem é você"))
    return "Sou Fênix, criada pra ajudar com perguntas, cálculos, aventuras e análise de imagens!";
  if (texto.includes("ajuda") || texto.includes("o que você sabe fazer") || texto.includes("funcionalidades"))
    return explicarFuncionalidades();
  if (texto.includes("capital do brasil"))
    return "A capital do Brasil é Brasília.";
  if (texto.includes("maior planeta"))
    return "O maior planeta do sistema solar é Júpiter.";
  if (texto.includes("quem descobriu o brasil"))
    return "O Brasil foi descoberto oficialmente por Pedro Álvares Cabral em 22 de abril de 1500.";
  if (texto.includes("quantos continentes"))
    return "Existem sete continentes habitados: África, Antártida, Ásia, Austrália, Europa, América do Norte e América do Sul.";
  if (memoria[texto])
    return memoria[texto];

  return "Hmm, não sei responder isso. Tenta reformular ou use o botão 'Ensinar Fênix' pra me ensinar algo novo!";
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

    if (mathMode) {
      if (!verificarMathJS()) {
        resposta = "Erro: Modo matemático indisponível.";
      } else {
        try {
          if (normal.includes("resolver")) {
            const equacao = entrada.replace(/resolver\s*/i, "").trim();
            const resultado = math.evaluate(equacao);
            resposta = `Solução: ${JSON.stringify(resultado)}`;
          } else {
            const resultado = math.evaluate(entrada);
            resposta = `Resultado: ${resultado}`;
          }
        } catch (e) {
          resposta = `Erro ao calcular: ${e.message}`;
          console.error("Erro no cálculo:", e);
        }
        mathHistory.push({ user: entrada, ai: resposta });
        if (mathHistory.length > 10) mathHistory.shift();
        salvarLocal("fenix_math_history", mathHistory);
        document.getElementById('resposta').innerText = mathHistory.map(entry => `Você: ${entry.user}\nFênix: ${entry.ai}`).join('\n');
      }
    } else if (chatMode) {
      resposta = processarPergunta(entrada);
      chatHistory.push({ user: entrada, ai: resposta });
      if (chatHistory.length > 10) chatHistory.shift();
      salvarLocal("fenix_chat_history", chatHistory);
      document.getElementById('resposta').innerText = chatHistory.map(entry => `Você: ${entry.user}\nFênix: ${entry.ai}`).join('\n');
    } else if (aventuraEstado) {
      resposta = processarAventura(entrada);
    } else {
      resposta = "Por favor, ative um modo (Conversa, Matemático ou Aventura).";
    }

    if (resposta && (chatMode || mathMode)) {
      falar(resposta);
    }
    document.getElementById('entrada').value = "";
    console.log("Resposta enviada:", resposta);
  } catch (e) {
    console.error("Erro em enviar:", e);
    document.getElementById('resposta').innerText = "Erro ao processar. Verifique o console (F12).";
    document.getElementById('resposta').classList.add('error');
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
    alert("Erro ao ensinar. Verifique o console (F12).");
  }
}

// Resetar arquivo
function resetarArquivo() {
  console.log("Resetando arquivo...");
  try {
    document.getElementById('imgInput').value = '';
    document.getElementById('preview').src = '';
    document.getElementById('preview').style.display = 'none';
    loadedImage = null;
    document.getElementById('resultadoVisual').innerHTML = 'O texto extraído aparecerá aqui...';
    document.getElementById('resultadoVisual').classList.remove('error', 'loading');
    document.getElementById('resposta').textContent = '';
    disableButtons();
    console.log("Arquivo resetado");
  } catch (e) {
    console.error("Erro em resetarArquivo:", e);
    document.getElementById('resultadoVisual').textContent = "Erro ao resetar arquivo.";
    document.getElementById('resultadoVisual').classList.add('error');
  }
}

// Modo aventura
function abrirAventura() {
  console.log("Iniciando modo aventura...");
  try {
    const resultadoVisual = document.getElementById('resultadoVisual');
    const opcoesAventura = document.getElementById('opcoesAventura');

    const aventuras = [
      { id: 'floresta', nome: 'Floresta Sombria' },
      { id: 'castelo', nome: 'Castelo Amaldiçoado' },
      { id: 'ilha', nome: 'Ilha Perdida' }
    ];

    resultadoVisual.textContent = 'Escolha sua aventura:';
    opcoesAventura.style.display = 'flex';
    opcoesAventura.innerHTML = '';
    aventuras.forEach(aventura => {
      const btn = document.createElement('button');
      btn.textContent = aventura.nome;
      btn.addEventListener('click', () => iniciarAventura(aventura.id));
      opcoesAventura.appendChild(btn);
    });

    console.log("Opções de aventura exibidas");
  } catch (e) {
    console.error("Erro em abrirAventura:", e);
    document.getElementById('resultadoVisual').textContent = "Erro ao abrir aventura.";
    document.getElementById('resultadoVisual').classList.add('error');
  }
}

// Iniciar uma aventura específica
function iniciarAventura(aventuraId) {
  console.log(`Iniciando aventura: ${aventuraId}`);
  try {
    const nome = sanitizarEntrada(prompt("Digite o nome do herói:"));
    if (!nome) {
      alert("Nome inválido.");
      console.log("Nome de herói inválido");
      return;
    }

    aventuraEstado = { heroi: nome, aventura: aventuraId, etapa: 1, inventario: [], aliados: [] };
    const resultadoVisual = document.getElementById('resultadoVisual');
    const opcoesAventura = document.getElementById('opcoesAventura');
    let resp = '';

    if (aventuraId === 'floresta') {
      resp = `🌲 Você, ${nome}, desperta numa Floresta Sombria envolto em névoa. Um rugido ecoa ao longe. À sua frente, um caminho leva ao norte (montanhas), outro ao sul (vila), e você vê pegadas frescas a leste. Qual direção seguir?`;
      mostrarOpcoes(['Norte', 'Sul', 'Leste']);
    } else if (aventuraId === 'castelo') {
      resp = `🏰 Você, ${nome}, está diante de um Castelo Amaldiçoado, suas torres cobertas de espinhos negros. A porta principal está entreaberta, uma passagem lateral leva a um túnel escuro, e uma janela quebrada no segundo andar parece acessível. O que fazer?`;
      mostrarOpcoes(['Porta Principal', 'Passagem Lateral', 'Janela']);
    } else if (aventuraId === 'ilha') {
      resp = `🏝️ Após um naufrágio, você, ${nome}, acorda numa Ilha Perdida. A praia está cheia de destroços. Uma caverna escura está à esquerda, pegadas levam à direita, e fumaça sobe ao longe no centro da ilha. Para onde ir?`;
      mostrarOpcoes(['Caverna', 'Pegadas', 'Fumaça']);
    }

    resultadoVisual.textContent = resp;
    falar(resp);
    salvarLocal("fenix_aventura", aventuraEstado);
    console.log("Aventura iniciada:", aventuraEstado);
  } catch (e) {
    console.error("Erro em iniciarAventura:", e);
    document.getElementById('resultadoVisual').textContent = "Erro ao iniciar aventura.";
    document.getElementById('resultadoVisual').classList.add('error');
  }
}

// Mostrar opções de aventura como botões
function mostrarOpcoes(opcoes) {
  try {
    const opcoesAventura = document.getElementById('opcoesAventura');
    opcoesAventura.innerHTML = '';
    opcoesAventura.style.display = 'flex';
    opcoes.forEach(opcao => {
      const btn = document.createElement('button');
      btn.textContent = opcao;
      btn.addEventListener('click', () => processarAventura(opcao.toLowerCase()));
      opcoesAventura.appendChild(btn);
    });
    console.log("Opções exibidas:", opcoes);
  } catch (e) {
    console.error("Erro em mostrarOpcoes:", e);
    document.getElementById('resultadoVisual').textContent = "Erro ao exibir opções de aventura.";
    document.getElementById('resultadoVisual').classList.add('error');
  }
}

// Processar aventura
function processarAventura(entrada) {
  try {
    if (!aventuraEstado) {
      document.getElementById('resultadoVisual').textContent = "Modo aventura não iniciado.";
      return;
    }
    const normal = entrada.toLowerCase();
    const resultadoVisual = document.getElementById('resultadoVisual');
    let resp = "";

    if (aventuraEstado.aventura === 'floresta') {
      if (aventuraEstado.etapa === 1) {
        if (normal.includes("norte") || normal.includes("montanhas")) {
          aventuraEstado.local = "montanhas";
          aventuraEstado.etapa = 2;
          resp = `🏔️ Você, ${aventuraEstado.heroi}, escala as montanhas geladas. Um lobo cinzento bloqueia seu caminho, rosnando. Lutar, fugir ou tentar acalmá-lo?`;
          mostrarOpcoes(['Lutar', 'Fugir', 'Acalmar']);
        } else if (normal.includes("sul") || normal.includes("vila")) {
          aventuraEstado.local = "vila";
          aventuraEstado.etapa = 2;
          resp = `🏘️ Você chega a uma vila tranquila, ${aventuraEstado.heroi}. Um mercador oferece uma espada por 10 moedas, e uma velha sábia pede ajuda com um enigma. Comprar a espada, ajudar a sábia ou continuar explorando?`;
          mostrarOpcoes(['Comprar', 'Ajudar Sábia', 'Continuar']);
        } else if (normal.includes("leste") || normal.includes("pegadas")) {
          aventuraEstado.local = "ruínas";
          aventuraEstado.etapa = 2;
          resp = `🏛️ Seguindo as pegadas, você encontra ruínas antigas cobertas de musgo. Uma inscrição diz: "A verdade está na escuridão". Entrar nas ruínas, decifrar a inscrição ou voltar?`;
          mostrarOpcoes(['Entrar', 'Decifrar', 'Voltar']);
        } else {
          resp = `Por favor, escolha "Norte", "Sul" ou "Leste".`;
          mostrarOpcoes(['Norte', 'Sul', 'Leste']);
        }
      } else if (aventuraEstado.etapa === 2) {
        if (aventuraEstado.local === "montanhas") {
          if (normal.includes("lutar")) {
            aventuraEstado.etapa = 3;
            aventuraEstado.inventario.push("pele de lobo");
            resp = `⚔️ Você enfrenta o lobo e vence, ganhando uma pele de lobo. Exausto, vê uma caverna para descansar ou um caminho que sobe ainda mais. Descansar ou seguir?`;
            mostrarOpcoes(['Descansar', 'Seguir']);
          } else if (normal.includes("fugir")) {
            resp = `🏃 Você tenta fugir, mas escorrega numa encosta gelada. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("acalmar")) {
            aventuraEstado.etapa = 3;
            aventuraEstado.aliados.push("lobo");
            resp = `🐺 Com paciência, você acalma o lobo, que agora te segue. Um caminho leva a um altar antigo, outro desce à floresta. Ir ao altar ou descer?`;
            mostrarOpcoes(['Altar', 'Descer']);
          } else {
            resp = `Por favor, escolha "Lutar", "Fugir" ou "Acalmar".`;
            mostrarOpcoes(['Lutar', 'Fugir', 'Acalmar']);
          }
        } else if (aventuraEstado.local === "vila") {
          if (normal.includes("comprar")) {
            aventuraEstado.etapa = 3;
            aventuraEstado.inventario.push("espada");
            resp = `🗡️ Você compra a espada. À noite, bandidos atacam a vila! Lutar com a espada, negociar com eles ou se esconder?`;
            mostrarOpcoes(['Lutar', 'Negociar', 'Esconder']);
          } else if (normal.includes("ajudar") || normal.includes("sábia")) {
            aventuraEstado.etapa = 3;
            resp = `📜 A sábia te dá um enigma: "O que tem pescoço, mas não tem cabeça?" Responder "camisa", "garrafa" ou desistir?`;
            mostrarOpcoes(['Camisa', 'Garrafa', 'Desistir']);
          } else if (normal.includes("continuar")) {
            aventuraEstado.etapa = 3;
            resp = `🚶 Você segue pela vila e encontra um rio largo. Nadar, procurar uma ponte ou pedir ajuda a um barqueiro?`;
            mostrarOpcoes(['Nadar', 'Ponte', 'Barqueiro']);
          } else {
            resp = `Por favor, escolha "Comprar", "Ajudar Sábia" ou "Continuar".`;
            mostrarOpcoes(['Comprar', 'Ajudar Sábia', 'Continuar']);
          }
        } else if (aventuraEstado.local === "ruínas") {
          if (normal.includes("entrar")) {
            aventuraEstado.etapa = 3;
            resp = `🕳️ Você entra nas ruínas escuras e encontra um baú trancado. Forçar a abertura, procurar uma chave ou explorar mais?`;
            mostrarOpcoes(['Forçar', 'Procurar Chave', 'Explorar']);
          } else if (normal.includes("decifrar")) {
            aventuraEstado.etapa = 3;
            resp = `📜 Você decifra a inscrição: "Ofereça luz à escuridão." Acender uma tocha, ignorar e entrar ou voltar?`;
            mostrarOpcoes(['Acender Tocha', 'Entrar', 'Voltar']);
          } else if (normal.includes("voltar")) {
            resp = `🚶 Você volta à floresta, mas a névoa te engole. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha "Entrar", "Decifrar" ou "Voltar".`;
            mostrarOpcoes(['Entrar', 'Decifrar', 'Voltar']);
          }
        }
      } else if (aventuraEstado.etapa === 3) {
        if (aventuraEstado.local === "montanhas") {
          if (normal.includes("descansar")) {
            aventuraEstado.etapa = 4;
            resp = `🛌 Você descansa na caverna e encontra um mapa antigo indicando um templo. Ir ao templo, seguir o mapa ou explorar a caverna?`;
            mostrarOpcoes(['Templo', 'Mapa', 'Explorar']);
          } else if (normal.includes("seguir")) {
            resp = `🚶 Exausto, você cai numa ravina. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("altar")) {
            aventuraEstado.etapa = 4;
            resp = `🕍 No altar, um espírito oferece um amuleto se você responder: "O que voa sem asas?" Dizer "tempo", "sonho" ou recusar?`;
            mostrarOpcoes(['Tempo', 'Sonho', 'Recusar']);
          } else if (normal.includes("descer")) {
            aventuraEstado.etapa = 4;
            resp = `🌲 Você desce à floresta com seu lobo. Um caçador ameaça o animal. Proteger o lobo, negociar ou abandonar o lobo?`;
            mostrarOpcoes(['Proteger', 'Negociar', 'Abandonar']);
          } else {
            resp = `Por favor, escolha uma ação válida.`;
            mostrarOpcoes(['Descansar', 'Seguir', 'Altar', 'Descer']);
          }
        } else if (aventuraEstado.local === "vila") {
          if (normal.includes("lutar")) {
            aventuraEstado.etapa = 4;
            resp = `⚔️ Com sua espada, você derrota os bandidos e vira herói da vila! Um tesouro está escondido no moinho. Procurar, descansar na vila ou partir?`;
            mostrarOpcoes(['Procurar', 'Descansar', 'Partir']);
          } else if (normal.includes("negociar")) {
            resp = `🗣️ Os bandidos roubam suas moedas e fogem. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("esconder")) {
            aventuraEstado.etapa = 4;
            resp = `🕵️ Você se esconde, mas ouve sobre um tesouro no moinho. Procurar agora, esperar amanhecer ou sair da vila?`;
            mostrarOpcoes(['Procurar', 'Esperar', 'Sair']);
          } else if (normal.includes("camisa")) {
            aventuraEstado.etapa = 4;
            aventuraEstado.inventario.push("amuleto");
            resp = `📜 A sábia sorri e te dá um amuleto mágico. Ela diz que um portal na floresta leva a um tesouro. Ir ao portal, perguntar mais ou partir?`;
            mostrarOpcoes(['Portal', 'Perguntar', 'Partir']);
          } else if (normal.includes("garrafa") || normal.includes("desistir")) {
            resp = `📜 A sábia balança a cabeça. Você falha no enigma. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("nadar")) {
            resp = `🏊 A correnteza é forte e você é levado. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("ponte")) {
            aventuraEstado.etapa = 4;
            resp = `🌉 Você cruza a ponte e encontra um cavaleiro ferido. Ajudá-lo, ignorá-lo ou pedir informações?`;
            mostrarOpcoes(['Ajudar', 'Ignorar', 'Pedir Informações']);
          } else if (normal.includes("barqueiro")) {
            aventuraEstado.etapa = 4;
            resp = `🚣 O barqueiro te leva ao outro lado, mas pede um favor: recuperar um medalhão roubado. Aceitar, negociar preço ou recusar?`;
            mostrarOpcoes(['Aceitar', 'Negociar', 'Recusar']);
          } else {
            resp = `Por favor, escolha uma ação válida.`;
            mostrarOpcoes(['Lutar', 'Negociar', 'Esconder', 'Camisa', 'Garrafa', 'Desistir', 'Nadar', 'Ponte', 'Barqueiro']);
          }
        } else if (aventuraEstado.local === "ruínas") {
          if (normal.includes("forçar")) {
            resp = `🪓 Você quebra o baú, mas ativa uma armadilha. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("procurar") || normal.includes("chave")) {
            aventuraEstado.etapa = 4;
            resp = `🔑 Você encontra uma chave dourada. Usar no baú, procurar outro baú ou explorar mais?`;
            mostrarOpcoes(['Usar Chave', 'Procurar Outro', 'Explorar']);
          } else if (normal.includes("explorar")) {
            aventuraEstado.etapa = 4;
            resp = `🏛️ Você acha um altar com uma joia brilhante. Pegar a joia, oferecer algo ao altar ou ignorar?`;
            mostrarOpcoes(['Pegar Joia', 'Oferecer', 'Ignorar']);
          } else if (normal.includes("tocha") || normal.includes("acender")) {
            aventuraEstado.etapa = 4;
            resp = `🔥 A tocha ilumina um corredor com pinturas antigas. Seguí-las, procurar saídas ou voltar?`;
            mostrarOpcoes(['Seguir Pinturas', 'Procurar Saídas', 'Voltar']);
          } else if (normal.includes("entrar")) {
            resp = `🕳️ No escuro, você cai numa armadilha. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("voltar")) {
            resp = `🚶 Você volta à floresta, mas a névoa te engole. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha uma ação válida.`;
            mostrarOpcoes(['Forçar', 'Procurar Chave', 'Explorar', 'Acender Tocha', 'Entrar', 'Voltar']);
          }
        }
      } else if (aventuraEstado.etapa === 4) {
        if (aventuraEstado.local === "montanhas") {
          if (normal.includes("templo")) {
            aventuraEstado.etapa = 5;
            resp = `🕍 Você chega ao templo, onde um guardião exige um sacrifício. Oferecer a pele de lobo, lutar ou tentar persuadi-lo?`;
            mostrarOpcoes(['Oferecer Pele', 'Lutar', 'Persuadir']);
          } else if (normal.includes("mapa")) {
            aventuraEstado.etapa = 5;
            resp = `🗺️ O mapa leva a um lago com uma ilha no centro. Nadar, construir uma jangada ou procurar outro caminho?`;
            mostrarOpcoes(['Nadar', 'Jangada', 'Outro Caminho']);
          } else if (normal.includes("explorar")) {
            resp = `🪨 Você se perde na caverna escura. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("tempo")) {
            aventuraEstado.etapa = 5;
            aventuraEstado.inventario.push("amuleto");
            resp = `🕍 O espírito te dá o amuleto. Um portal se abre para um tesouro. Entrar, explorar o altar ou recusar?`;
            mostrarOpcoes(['Entrar', 'Explorar', 'Recusar']);
          } else if (normal.includes("sonho") || normal.includes("recusar")) {
            resp = `🕍 O espírito te amaldiçoa. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("proteger")) {
            aventuraEstado.etapa = 5;
            resp = `🐺 Você defende o lobo, que te ajuda a derrotar o caçador. Ele revela um caminho secreto. Seguir o caminho, interrogar o caçador ou descansar?`;
            mostrarOpcoes(['Seguir Caminho', 'Interrogar', 'Descansar']);
          } else if (normal.includes("negociar") || normal.includes("abandonar")) {
            resp = `🐺 O caçador mata o lobo e te ataca. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha uma ação válida.`;
            mostrarOpcoes(['Templo', 'Mapa', 'Explorar', 'Tempo', 'Sonho', 'Recusar', 'Proteger', 'Negociar', 'Abandonar']);
          }
        } else if (aventuraEstado.local === "vila") {
          if (normal.includes("procurar")) {
            aventuraEstado.etapa = 5;
            resp = `🏚️ No moinho, você acha um baú com um mapa para um tesouro. Seguí-lo, vender o mapa ou explorar o moinho?`;
            mostrarOpcoes(['Seguir Mapa', 'Vender', 'Explorar']);
          } else if (normal.includes("descansar") || normal.includes("esperar")) {
            aventuraEstado.etapa = 5;
            resp = `🛌 Você descansa, mas ouve rumores de um dragão na floresta. Investigar, ignorar ou recrutar aliados?`;
            mostrarOpcoes(['Investigar', 'Ignorar', 'Recrutar']);
          } else if (normal.includes("partir") || normal.includes("sair")) {
            resp = `🚶 Você deixa a vila, mas é emboscado por bandidos. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("portal")) {
            aventuraEstado.etapa = 5;
            resp = `🌌 O portal te leva a uma câmara com um cristal brilhante. Pegá-lo, examiná-lo ou destruí-lo?`;
            mostrarOpcoes(['Pegar', 'Examinar', 'Destruir']);
          } else if (normal.includes("perguntar") || normal.includes("partir")) {
            resp = `📜 A sábia desaparece, e você fica sem pistas. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("ajudar")) {
            aventuraEstado.etapa = 5;
            aventuraEstado.aliados.push("cavaleiro");
            resp = `🩺 Você ajuda o cavaleiro, que se junta a você. Ele sugere atacar um acampamento de bandidos. Atacar, espionar ou evitar?`;
            mostrarOpcoes(['Atacar', 'Espionar', 'Evitar']);
          } else if (normal.includes("ignorar") || normal.includes("pedir")) {
            resp = `🚶 O cavaleiro morre, e você é culpado. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("aceitar")) {
            aventuraEstado.etapa = 5;
            resp = `🛡️ Você aceita recuperar o medalhão. O barqueiro indica uma caverna de ladrões. Entrar, emboscar ou negociar?`;
            mostrarOpcoes(['Entrar', 'Emboscar', 'Negociar']);
          } else if (normal.includes("negociar") || normal.includes("recusar")) {
            resp = `🚣 O barqueiro te abandona no rio. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha uma ação válida.`;
            mostrarOpcoes(['Procurar', 'Descansar', 'Partir', 'Portal', 'Perguntar', 'Partir', 'Ajudar', 'Ignorar', 'Pedir Informações', 'Aceitar', 'Negociar', 'Recusar']);
          }
        } else if (aventuraEstado.local === "ruínas") {
          if (normal.includes("usar") || normal.includes("chave")) {
            aventuraEstado.etapa = 5;
            aventuraEstado.inventario.push("cristal");
            resp = `🔑 O baú abre, revelando um cristal mágico. Usá-lo, guardá-lo ou destruí-lo?`;
            mostrarOpcoes(['Usar Cristal', 'Guardar', 'Destruir']);
          } else if (normal.includes("procurar") || normal.includes("outro")) {
            resp = `🏛️ Você se perde nos túneis. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("explorar") || normal.includes("ignorar")) {
            aventuraEstado.etapa = 5;
            resp = `🏛️ Você encontra uma porta selada com um enigma: "O que é sempre velho, mas nunca envelhece?" Responder "deus", "tempo" ou forçar a porta?`;
            mostrarOpcoes(['Deus', 'Tempo', 'Forçar']);
          } else if (normal.includes("pegar") || normal.includes("joia")) {
            resp = `💎 Você pega a joia, mas ativa um golem. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("oferecer")) {
            aventuraEstado.etapa = 5;
            resp = `🕍 Você oferece uma moeda, e o altar revela um mapa. Seguí-lo, explorar mais ou sair?`;
            mostrarOpcoes(['Seguir Mapa', 'Explorar', 'Sair']);
          } else if (normal.includes("seguir") || normal.includes("pinturas")) {
            aventuraEstado.etapa = 5;
            resp = `🎨 As pinturas levam a uma sala com um trono vazio. Sentar, procurar armadilhas ou sair?`;
            mostrarOpcoes(['Sentar', 'Procurar Armadilhas', 'Sair']);
          } else if (normal.includes("procurar") || normal.includes("saídas") || normal.includes("voltar")) {
            resp = `🕳️ Você se perde nos túneis escuros. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha uma ação válida.`;
            mostrarOpcoes(['Usar Chave', 'Procurar Outro', 'Explorar', 'Pegar Joia', 'Oferecer', 'Ignorar', 'Seguir Pinturas', 'Procurar Saídas', 'Voltar']);
          }
        }
      } else if (aventuraEstado.etapa === 5) {
        if (aventuraEstado.local === "montanhas") {
          if (normal.includes("oferecer") || normal.includes("pele")) {
            resp = `🏆 O guardião aceita a pele e te dá o Tesouro da Montanha! Você vence!`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("lutar") || normal.includes("persuadir")) {
            resp = `🗡️ O guardião te derrota. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("nadar")) {
            resp = `🏊 Você é devorado por criaturas do lago. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("jangada") || normal.includes("outro")) {
            resp = `🏆 Você chega à ilha e encontra o Tesouro Perdido! Você vence!`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("entrar")) {
            resp = `🏆 O portal te leva ao Tesouro Eterno! Você vence!`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("explorar") || normal.includes("recusar")) {
            resp = `🕍 O portal se fecha. Fim da aventura.`;
            aventuraEstado = null;
            document.get