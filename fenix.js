let usandoVoz = false;
let memoria = {};
let historico = [];
let usuario = { nome: "amigo" };

// carregar dados .json
async function carregarJSON(caminho) {
  const res = await fetch(caminho);
  return await res.json();
}

// salvar dados .json (simulado no navegador — precisa Node.js real p/ gravar de verdade)
function salvarLocal(nome, dados) {
  localStorage.setItem(nome, JSON.stringify(dados));
}

async function carregarTudo() {
  memoria = await carregarJSON("dados/memoria.json");
  historico = await carregarJSON("dados/historico.json");
  usuario = await carregarJSON("dados/usuario.json");
}

function falar(texto) {
  if (!usandoVoz) return;
  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = "pt-BR";
  window.speechSynthesis.speak(voz);
}

window.enviar = function () {
  const entrada = document.getElementById("entrada").value.trim();
  if (!entrada) return;

  const normal = entrada.toLowerCase();
  let resposta = "";

  if (normal.includes("oi") || normal.includes("olá")) {
    resposta = `Olá, ${usuario.nome}! Como posso ajudar?`;
  } else if (memoria[normal]) {
    resposta = memoria[normal];
  } else if (normal.includes("quanto é") || normal.match(/[0-9+\-*/]/)) {
    try {
      const calculo = normal.replace("quanto é", "").trim();
      const resultado = eval(calculo);
      if (!isNaN(resultado)) resposta = `O resultado é: ${resultado}`;
    } catch (e) {
      resposta = "Erro no cálculo.";
    }
  } else {
    resposta = "Não sei responder isso ainda. Me ensine!";
  }

  historico.push({ pergunta: entrada, resposta });
  document.getElementById("resposta").innerText = resposta;
  falar(resposta);
  salvarLocal("fenix_historico", historico);
}

window.ensinar = function () {
  const pergunta = prompt("Digite a pergunta:");
  const resposta = prompt("Digite a resposta:");
  if (pergunta && resposta) {
    memoria[pergunta.toLowerCase()] = resposta;
    salvarLocal("fenix_memoria", memoria);
    alert("Aprendido com sucesso!");
  }
}

window.ativarVoz = function () {
  usandoVoz = !usandoVoz;
  alert("Modo voz " + (usandoVoz ? "ativado!" : "desativado."));
}

// === OCR ===
window.extrairTexto = function () {
  const file = document.getElementById("imgInput").files[0];
  if (!file) return alert("Escolha uma imagem.");
  document.getElementById("resultadoVisual").textContent = "🔍 Lendo imagem...";
  Tesseract.recognize(file, 'eng').then(({ data: { text } }) => {
    document.getElementById("resultadoVisual").textContent = "Texto extraído:\n" + text;
  });
};

// === Detecção de Cor ===
window.detectarCores = function () {
  const file = document.getElementById("imgInput").files[0];
  if (!file) return alert("Selecione uma imagem.");
  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width; canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const cores = new Set();
    for (let i = 0; i < data.length; i += 4 * 100) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
      cores.add(hex);
      if (cores.size >= 10) break;
    }
    document.getElementById("resultadoVisual").innerHTML = "🎨 Cores:<br>" + [...cores].map(c => `<span style="background:${c};padding:5px">${c}</span>`).join(" ");
  };
};

// === Exportação PDF ===
window.exportarPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("FÊNIX - IA Avançada", 20, 20);
  doc.text("Histórico:", 20, 30);
  let y = 40;
  historico.slice(-10).forEach(item => {
    doc.text(`Q: ${item.pergunta}`, 20, y); y += 10;
    doc.text(`A: ${item.resposta}`, 20, y); y += 10;
  });
  doc.save("fenix_resultado.pdf");
};

// === Modo aventura ===
window.abrirAventura = function () {
  const nome = prompt("Digite o nome do herói:");
  const resp = `🌲 Você acorda numa floresta sombria, ${nome}. Um caminho leva ao norte, outro ao sul. Qual direção seguir?`;
  document.getElementById("resposta").textContent = resp;
  falar(resp);
}

// === Assistente de código ===
window.abrirAssistenteCodigo = function () {
  const entrada = prompt("Cole aqui seu código:");
  if (entrada.includes("<") && entrada.includes(">")) {
    document.getElementById("resposta").textContent = "Parece que você está colando HTML. Deseja ajuda com estrutura ou CSS?";
  } else if (entrada.includes("function")) {
    document.getElementById("resposta").textContent = "Detectei uma função JavaScript. Posso revisar a lógica ou explicar linha por linha.";
  } else {
    document.getElementById("resposta").textContent = "Código recebido. Deseja que eu revise ou melhore?";
  }
}
