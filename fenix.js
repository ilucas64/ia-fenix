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
window.onload = function () {
  const imgInput = document.getElementById('imgInput');
  const preview = document.getElementById('preview');
  const resultadoVisual = document.getElementById('resultadoVisual');
  const mathQuestion = document.getElementById('mathQuestion');
  const entrada = document.getElementById('entrada');
  const dropArea = document.getElementById('dropArea');

  if (typeof Tesseract === 'undefined' || typeof math === 'undefined' || typeof jspdf === 'undefined') {
    resultadoVisual.textContent = 'Erro: Bibliotecas não carregadas. Verifique sua conexão.';
    resultadoVisual.classList.add('error');
    return;
  }

  imgInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.style.display = 'block';
      loadedImage = file;
      resultadoVisual.innerText = 'O texto extraído aparecerá aqui...';
      resultadoVisual.classList.remove('error', 'loading');
      detectedColors = new Set();
      recognizedObjects = [];
    }
  });

  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.style.display = 'block';
      loadedImage = file;
      resultadoVisual.innerText = 'O texto extraído aparecerá aqui...';
      resultadoVisual.classList.remove('error', 'loading');
      detectedColors = new Set();
      recognizedObjects = [];
    } else {
      resultadoVisual.textContent = 'Por favor, solte uma imagem válida.';
      resultadoVisual.classList.add('error');
    }
  });

  mathQuestion.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      responderMath();
    }
  });

  entrada.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      enviar();
    }
  });

  carregarTudo();
};

// Alternar modo matemático
window.toggleMathMode = function () {
  if (chatMode) {
    toggleChatMode();
  }
  mathMode = !mathMode;
  document.getElementById('toggleMathMode').textContent = mathMode ? 'Desativar Modo Matemático' : 'Ativar Modo Matemático';
  document.getElementById('toggleMathMode').classList.toggle('active', mathMode);
  document.getElementById('mathInteraction').style.display = mathMode ? 'flex' : 'none';
  document.getElementById('chatInteraction').style.display = chatMode ? 'flex' : 'none';
  document.getElementById('resultadoVisual').style.display = mathMode || chatMode ? 'none' : 'block';
  document.getElementById('mathAnswer').textContent = 'A resposta aparecerá aqui...';
};

// Alternar modo conversa
window.toggleChatMode = function () {
  if (mathMode) {
    mathMode = false;
    document.getElementById('toggleMathMode').textContent = 'Ativar Modo Matemático';
    document.getElementById('toggleMathMode').classList.remove('active');
    document.getElementById('mathInteraction').style.display = 'none';
  }
  chatMode = !chatMode;
  document.getElementById('toggleChatMode').textContent = chatMode ? 'Desativar Modo Conversa' : 'Ativar Modo Conversa';
  document.getElementById('toggleChatMode').classList.toggle('active', chatMode);
  document.getElementById('chatInteraction').style.display = chatMode ? 'flex' : 'none';
  document.getElementById('mathInteraction').style.display = mathMode ? 'flex' : 'none';
  document.getElementById('resultadoVisual').style.display = mathMode || chatMode ? 'none' : 'block';
  document.getElementById('resposta').textContent = chatMode ? 'Oi! Estou pronto para conversar ou responder suas dúvidas.' : '';
};

// Enviar comando/pergunta
window.enviar = function () {
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
    document.getElementById('resposta').innerText = resposta;
    falar(resposta);
    salvarLocal("fenix_historico", historico);
    document.getElementById('entrada').value = "";
    console.log("Resposta enviada:", resposta);
  } catch (e) {
    console.error("Erro em enviar:", e);
    document.getElementById('resposta').innerText = "Erro ao processar. Verifique o console.";
  }
};

// Ensinar nova resposta
window.ensinar = function () {
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
};

// Ativar/desativar voz
window.ativarVoz = function () {
  try {
    usandoVoz = !usandoVoz;
    alert("Modo voz " + (usandoVoz ? "ativado!" : "desativado."));
    if (!usandoVoz) window.speechSynthesis.cancel();
    console.log("Voz:", usandoVoz ? "ativada" : "desativada");
  } catch (e) {
    console.error("Erro em ativarVoz:", e);
  }
};

// Extrair texto (OCR)
window.extrairTexto = async function () {
  if (!loadedImage) {
    document.getElementById('resultadoVisual').textContent = 'Por favor, selecione uma imagem.';
    document.getElementById('resultadoVisual').classList.add('error');
    return;
  }
  if (isProcessing) return;
  isProcessing = true;
  document.getElementById('resultadoVisual').textContent = '🔍 Processando imagem...';
  document.getElementById('resultadoVisual').classList.add('loading');
  try {
    const { data: { text } } = await Tesseract.recognize(
      loadedImage,
      'por',
      { logger: (m) => console.log("Tesseract:", m) }
    );
    extractedText = text.trim() || 'Nenhum texto detectado.';
    document.getElementById('resultadoVisual').textContent = `Texto extraído:\n${extractedText}`;
    falar(extractedText);
    console.log("Texto extraído:", extractedText);
  } catch (e) {
    document.getElementById('resultadoVisual').textContent = 'Erro ao processar imagem.';
    document.getElementById('resultadoVisual').classList.add('error');
    console.error("Erro no OCR:", e);
  } finally {
    isProcessing = false;
    document.getElementById('resultadoVisual').classList.remove('loading');
  }
};

// Detectar cores
window.detectarCores = async function () {
  if (!loadedImage) {
    document.getElementById('resultadoVisual').textContent = 'Por favor, selecione uma imagem.';
    document.getElementById('resultadoVisual').classList.add('error');
    return;
  }
  if (isProcessing) return;
  isProcessing = true;
  document.getElementById('resultadoVisual').textContent = '🎨 Carregando imagem...';
  document.getElementById('resultadoVisual').classList.add('loading');
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
    document.getElementById('resultadoVisual').innerHTML = html || 'Nenhuma cor detectada.';
    console.log("Cores detectadas:", [...detectedColors]);
  } catch (e) {
    document.getElementById('resultadoVisual').textContent = 'Erro ao detectar cores.';
    document.getElementById('resultadoVisual').classList.add('error');
    console.error("Erro em detectarCores:", e);
  } finally {
    isProcessing = false;
    document.getElementById('resultadoVisual').classList.remove('loading');
  }
};

// Reconhecer objetos
window.reconhecerObjetos = async function () {
  if (!loadedImage) {
    document.getElementById('resultadoVisual').textContent = 'Por favor, selecione uma imagem.';
    document.getElementById('resultadoVisual').classList.add('error');
    return;
  }
  if (isProcessing) return;
  isProcessing = true;
  document.getElementById('resultadoVisual而上

System: It looks like the response was cut off again. I'll complete the `fenix.js` artifact and provide the remaining artifacts (`historico.json`, `memoria.json`, `usuario.json`) to ensure the IA Fênix works with all requested functionalities, including the restored modo aventura and integrated features from the "Processador de Imagens e Calculadora" site. I'll also include clear instructions to test and troubleshoot any issues, addressing your concern that "não está funcionando."

### Explanation
- **Why It Wasn't Working**: The previous issues likely stemmed from empty JSON files, CORS errors with Tesseract.js (as seen in your 27 April 2025 conversation), or incorrect GitHub Pages setup (similar to 25 April 2025). The updated code uses Tesseract.js v5.1.0, populated JSONs, and robust error handling to prevent these issues.
- **Modo Aventura**: Vou restabelecer o modo aventura com uma narrativa mais rica, mantendo o estado persistente via `localStorage`, como você gostou da ideia.
- **Integrated Features**: I've merged the OCR numérico, detecção de cores, reconhecimento de objetos, modo matemático, e exportação de PDF do "Processador de Imagens e Calculadora" com as funcionalidades originais da Fênix (conversa, ensinar, assistente de código, voz).
- **Styling**: Combined the modern Poppins-based CSS from the new site with Fênix's layout for a cohesive, responsive design.
- **Testing Instructions**: Provided detailed steps to test locally and on GitHub Pages, with troubleshooting tips based on your past issues (e.g., CORS, cache).

### Artifacts

<xaiArtifact artifact_id="57be13cc-cd13-45fe-b052-fb8ac5d17a0e" artifact_version_id="2af8e0bd-cd56-4f51-ab3e-fb5337134d0e" title="index.html" contentType="text/html">
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FÊNIX IA v2.2</title>
  <link rel="stylesheet" href="fenix.css" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.6.4/math.min.js"></script>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔥 FÊNIX - IA Avançada</h1>
    </header>
    <main>
      <section class="image-section" aria-label="Ferramentas de imagem">
        <div id="dropArea" class="drop-area">
          <input type="file" id="imgInput" accept="image/*" aria-label="Selecionar imagem" />
          <p>Arraste e solte uma imagem aqui ou clique para selecionar</p>
          <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
        </div>
        <div class="controls">
          <button onclick="extrairTexto()">📄 Extrair Texto</button>
          <button onclick="detectarCores()">🎨 Detectar Cores</button>
          <button onclick="reconhecerObjetos()">🔍 Reconhecer Objetos</button>
          <button onclick="exportarPDF()">🧾 Exportar PDF</button>
          <button onclick="resetarArquivo()">🔄 Novo Arquivo</button>
        </div>
      </section>

      <img id="preview" style="display: none; max-width: 100%; margin-top: 20px;" alt="Pré-visualização da imagem" />
      <div id="resultadoVisual" class="painel" role="region" aria-live="polite">Resultado aparecerá aqui...</div>

      <hr />

      <section class="mode-toggle">
        <button id="toggleMathMode" onclick="toggleMathMode()">Ativar Modo Matemático</button>
        <button id="toggleChatMode" onclick="toggleChatMode()">Ativar Modo Conversa</button>
        <button onclick="abrirAventura()">🧙 Modo Aventura</button>
        <button onclick="abrirAssistenteCodigo()">💻 Assistente de Código</button>
      </section>

      <div id="mathInteraction" class="interaction" style="display: none;">
        <textarea id="mathQuestion" placeholder="Digite sua pergunta matemática..."></textarea>
        <button onclick="responderMath()">Enviar Pergunta</button>
        <div id="mathAnswer">A resposta aparecerá aqui...</div>
      </div>

      <div id="chatInteraction" class="interaction" style="display: none;">
        <textarea id="entrada" placeholder="Digite sua pergunta ou comando..."></textarea>
        <div class="botoes">
          <button onclick="enviar()">Enviar</button>
          <button onclick="ensinar()">📚 Ensinar Fênix</button>
          <button onclick="ativarVoz()">🔊 Alternar Voz</button>
        </div>
        <div id="resposta" role="region" aria-live="polite"></div>
      </div>
    </main>
  </div>

  <script type="module" src="fenix.js"></script>
</body>
</html>