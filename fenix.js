let usandoVoz = false;
let memoria = {};
let historico = [];
let usuario = { nome: "amigo" };
let aventuraEstado = null;
let chatMode = false;
let mathMode = false;
let loadedImage = null;
let chatHistory = [];

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

// Carregar dados JSON
async function carregarJSON(caminho) {
  try {
    const res = await fetch(caminho);
    if (!res.ok) throw new Error(`Erro ao carregar ${caminho}: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Erro ao carregar JSON: ${e.message}`);
    document.getElementById('resultadoVisual').textContent = `Erro ao carregar ${caminho}. Teste localmente ou verifique a pasta 'dados/'.`;
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
    historico = await carregarJSON("dados/historico.json") || [];
    usuario = await carregarJSON("dados/usuario.json") || { nome: "amigo" };
    console.log("Dados carregados:", { memoria, historico, usuario });
    document.getElementById("resposta").innerText = "Sistema carregado com sucesso!";
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
    document.getElementById("resposta").innerText = "Erro ao carregar dados. Verifique o console.";
    document.getElementById("resposta").classList.add('error');
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
    { id: 'btnExtrairTexto', handler: () => elementos.resultadoVisual.textContent = 'Botão Extrair Texto clicado! (Funcionalidade desativada temporariamente)' },
    { id: 'btnDetectarCores', handler: () => elementos.resultadoVisual.textContent = 'Botão Detectar Cores clicado! (Funcionalidade desativada temporariamente)' },
    { id: 'btnReconhecerObjetos', handler: () => elementos.resultadoVisual.textContent = 'Botão Reconhecer Objetos clicado! (Funcionalidade desativada temporariamente)' },
    { id: 'btnExportarPDF', handler: () => elementos.resultadoVisual.textContent = 'Botão Exportar PDF clicado! (Funcionalidade desativada temporariamente)' },
    { id: 'btnResetarArquivo', handler: resetarArquivo },
    { id: 'toggleChatMode', handler: toggleChatMode },
    { id: 'toggleMathMode', handler: toggleMathMode },
    { id: 'btnAventura', handler: abrirAventura },
    { id: 'btnEnviar', handler: enviar },
    { id: 'btnEnsinar', handler: ensinar },
    { id: 'btnAtivarVoz', handler: ativarVoz }
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
  const sucesso = configurarEventos();
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
  document.getElementById('resposta').textContent = chatMode ? 'Oi! Estou pronto para conversar ou responder suas dúvidas.' : '';
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
  document.getElementById('resposta').textContent = mathMode ? 'Digite uma expressão matemática (ex.: 2+2, resolver x^2=4)' : '';
  console.log("Modo matemático:", mathMode ? "ativado" : "desativado");
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
      }
    } else if (chatMode) {
      if (normal.includes("oi") || normal.includes("olá")) {
        resposta = `Olá, ${usuario.nome}! Como posso te ajudar hoje?`;
      } else if (memoria[normal]) {
        resposta = memoria[normal];
      } else if (aventuraEstado) {
        resposta = processarAventura(entrada);
      } else {
        resposta = "Não sei responder isso. Quer me ensinar?";
      }
    } else if (aventuraEstado) {
      resposta = processarAventura(entrada);
    } else {
      resposta = "Por favor, ative um modo (Conversa, Matemático ou Aventura).";
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
    document.getElementById('resultadoVisual').textContent = "Erro ao ativar voz.";
    document.getElementById('resultadoVisual').classList.add('error');
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

    aventuraEstado = { heroi: nome, aventura: aventuraId, etapa: 1 };
    const resultadoVisual = document.getElementById('resultadoVisual');
    const opcoesAventura = document.getElementById('opcoesAventura');
    let resp = '';

    if (aventuraId === 'floresta') {
      resp = `🌲 Você acorda numa floresta sombria, ${nome}. Um caminho leva ao norte (montanhas), outro ao sul (vila). Qual direção seguir?`;
      mostrarOpcoes(['Norte', 'Sul']);
    } else if (aventuraId === 'castelo') {
      resp = `🏰 Você está diante de um castelo amaldiçoado, ${nome}. A porta principal está aberta, mas há uma passagem lateral escura. Entrar pela porta ou pela passagem?`;
      mostrarOpcoes(['Porta Principal', 'Passagem Lateral']);
    } else if (aventuraId === 'ilha') {
      resp = `🏝️ Você naufraga numa ilha perdida, ${nome}. Há uma caverna à esquerda e pegadas levando à direita. Explorar a caverna ou seguir as pegadas?`;
      mostrarOpcoes(['Caverna', 'Pegadas']);
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
          resp = `🏔️ Você segue para as montanhas. Um lobo aparece! Lutar ou fugir?`;
          mostrarOpcoes(['Lutar', 'Fugir']);
        } else if (normal.includes("sul") || normal.includes("vila")) {
          aventuraEstado.local = "vila";
          aventuraEstado.etapa = 2;
          resp = `🏘️ Você chega a uma vila tranquila. Um mercador oferece uma espada por 10 moedas. Comprar ou continuar?`;
          mostrarOpcoes(['Comprar', 'Continuar']);
        } else {
          resp = `Por favor, escolha "Norte" ou "Sul".`;
          mostrarOpcoes(['Norte', 'Sul']);
        }
      } else if (aventuraEstado.etapa === 2) {
        if (aventuraEstado.local === "montanhas") {
          if (normal.includes("lutar")) {
            aventuraEstado.etapa = 3;
            resp = `⚔️ Você enfrenta o lobo e vence, mas está ferido. Descansar ou seguir?`;
            mostrarOpcoes(['Descansar', 'Seguir']);
          } else if (normal.includes("fugir")) {
            resp = `🏃 Você foge do lobo, mas cai num penhasco. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha "Lutar" ou "Fugir".`;
            mostrarOpcoes(['Lutar', 'Fugir']);
          }
        } else if (aventuraEstado.local === "vila") {
          if (normal.includes("comprar")) {
            aventuraEstado.etapa = 3;
            resp = `🗡️ Você compra a espada. Um bandido aparece! Lutar ou negociar?`;
            mostrarOpcoes(['Lutar', 'Negociar']);
          } else if (normal.includes("continuar")) {
            aventuraEstado.etapa = 3;
            resp = `🚶 Você segue pela vila e encontra um rio. Nadar ou procurar ponte?`;
            mostrarOpcoes(['Nadar', 'Ponte']);
          } else {
            resp = `Por favor, escolha "Comprar" ou "Continuar".`;
            mostrarOpcoes(['Comprar', 'Continuar']);
          }
        }
      } else if (aventuraEstado.etapa === 3) {
        if (aventuraEstado.local === "montanhas") {
          if (normal.includes("descansar")) {
            aventuraEstado.etapa = 4;
            resp = `🛌 Você descansa e se recupera. Uma caverna misteriosa está à frente. Entrar ou voltar?`;
            mostrarOpcoes(['Entrar', 'Voltar']);
          } else if (normal.includes("seguir")) {
            resp = `🚶 Ferido, você desmaia na trilha. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha "Descansar" ou "Seguir".`;
            mostrarOpcoes(['Descansar', 'Seguir']);
          }
        } else if (aventuraEstado.local === "vila") {
          if (normal.includes("lutar")) {
            aventuraEstado.etapa = 4;
            resp = `⚔️ Com sua espada, você derrota o bandido! Um tesouro está escondido na vila. Procurar ou sair?`;
            mostrarOpcoes(['Procurar', 'Sair']);
          } else if (normal.includes("negociar")) {
            resp = `🗣️ Você negocia com o bandido, mas ele foge com suas moedas. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("nadar")) {
            resp = `🏊 Você tenta nadar, mas a correnteza é forte. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else if (normal.includes("ponte")) {
            aventuraEstado.etapa = 4;
            resp = `🌉 Você encontra uma ponte e cruza o rio. Um velho sábio oferece um enigma. Resolver ou ignorar?`;
            mostrarOpcoes(['Resolver', 'Ignorar']);
          } else {
            resp = `Por favor, escolha uma ação válida.`;
            mostrarOpcoes(['Lutar', 'Negociar', 'Nadar', 'Ponte']);
          }
        }
      }
    } else if (aventuraEstado.aventura === 'castelo') {
      if (aventuraEstado.etapa === 1) {
        if (normal.includes("porta") || normal.includes("principal")) {
          aventuraEstado.local = "sala_trono";
          aventuraEstado.etapa = 2;
          resp = `🏰 Você entra pela porta principal e chega a uma sala do trono vazia. Há uma escada para cima e um alçapão para baixo. Subir ou descer?`;
          mostrarOpcoes(['Subir', 'Descer']);
        } else if (normal.includes("passagem") || normal.includes("lateral")) {
          aventuraEstado.local = "tunel";
          aventuraEstado.etapa = 2;
          resp = `🕳️ Você entra pela passagem lateral e encontra um túnel escuro. Acender uma tocha ou prosseguir no escuro?`;
          mostrarOpcoes(['Acender Tocha', 'Prosseguir no Escuro']);
        } else {
          resp = `Por favor, escolha "Porta Principal" ou "Passagem Lateral".`;
          mostrarOpcoes(['Porta Principal', 'Passagem Lateral']);
        }
      } else if (aventuraEstado.etapa === 2) {
        if (aventuraEstado.local === "sala_trono") {
          if (normal.includes("subir")) {
            aventuraEstado.etapa = 3;
            resp = `🪜 Você sobe a escada e encontra um cavaleiro espectral. Lutar ou tentar conversar?`;
            mostrarOpcoes(['Lutar', 'Conversar']);
          } else if (normal.includes("descer")) {
            resp = `🕳️ O alçapão cede e você cai num fosso. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha "Subir" ou "Descer".`;
            mostrarOpcoes(['Subir', 'Descer']);
          }
        } else if (aventuraEstado.local === "tunel") {
          if (normal.includes("tocha") || normal.includes("acender")) {
            aventuraEstado.etapa = 3;
            resp = `🔥 Você acende a tocha e vê um baú trancado. Forçar a abertura ou procurar a chave?`;
            mostrarOpcoes(['Forçar', 'Procurar Chave']);
          } else if (normal.includes("escuro") || normal.includes("prosseguir")) {
            resp = `🌑 No escuro, você tropeça e é capturado por armadilhas. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha "Acender Tocha" ou "Prosseguir no Escuro".`;
            mostrarOpcoes(['Acender Tocha', 'Prosseguir no Escuro']);
          }
        }
      }
    } else if (aventuraEstado.aventura === 'ilha') {
      if (aventuraEstado.etapa === 1) {
        if (normal.includes("caverna")) {
          aventuraEstado.local = "caverna";
          aventuraEstado.etapa = 2;
          resp = `🕸️ Você entra na caverna e encontra aranhas gigantes. Atacar ou tentar passar furtivamente?`;
          mostrarOpcoes(['Atacar', 'Passar Furtivamente']);
        } else if (normal.includes("pegadas")) {
          aventuraEstado.local = "acampamento";
          aventuraEstado.etapa = 2;
          resp = `🏕️ Você segue as pegadas até um acampamento abandonado. Investigar ou continuar explorando?`;
          mostrarOpcoes(['Investigar', 'Continuar']);
        } else {
          resp = `Por favor, escolha "Caverna" ou "Pegadas".`;
          mostrarOpcoes(['Caverna', 'Pegadas']);
        }
      } else if (aventuraEstado.etapa === 2) {
        if (aventuraEstado.local === "caverna") {
          if (normal.includes("atacar")) {
            aventuraEstado.etapa = 3;
            resp = `⚔️ Você luta contra as aranhas e vence, mas está cansado. Descansar ou prosseguir?`;
            mostrarOpcoes(['Descansar', 'Prosseguir']);
          } else if (normal.includes("furtivamente") || normal.includes("passar")) {
            resp = `🕷️ As aranhas te notam e atacam. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha "Atacar" ou "Passar Furtivamente".`;
            mostrarOpcoes(['Atacar', 'Passar Furtivamente']);
          }
        } else if (aventuraEstado.local === "acampamento") {
          if (normal.includes("investigar")) {
            aventuraEstado.etapa = 3;
            resp = `🔍 Você encontra um mapa do tesouro. Seguir o mapa ou procurar suprimentos?`;
            mostrarOpcoes(['Seguir Mapa', 'Procurar Suprimentos']);
          } else if (normal.includes("continuar")) {
            resp = `🚶 Você se perde na selva. Fim da aventura.`;
            aventuraEstado = null;
            document.getElementById('opcoesAventura').style.display = 'none';
          } else {
            resp = `Por favor, escolha "Investigar" ou "Continuar".`;
            mostrarOpcoes(['Investigar', 'Continuar']);
          }
        }
      }
    }

    resultadoVisual.textContent = resp;
    falar(resp);
    salvarLocal("fenix_aventura", aventuraEstado);
    console.log("Aventura processada:", { entrada, resposta: resp, estado: aventuraEstado });
  } catch (e) {
    console.error("Erro em processarAventura:", e);
    document.getElementById('resultadoVisual').textContent = "Erro ao processar aventura.";
    document.getElementById('resultadoVisual').classList.add('error');
  }
}