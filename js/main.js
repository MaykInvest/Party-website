// MODO ESCURO / CLARO
// O tema ativo fica no atributo data-tema da tag <html> ("escuro" ou "claro"); o CSS faz o resto.
// try/catch: se o navegador bloquear o localStorage, a página funciona, só não lembra a escolha.

const raiz = document.documentElement;

// Tema inicial: o que a pessoa escolheu antes; se nunca escolheu, o do sistema.
// Roda antes da página aparecer, para ela não "piscar" na cor errada.
let salvo = null;
try { salvo = localStorage.getItem("tema"); } catch {}
raiz.dataset.tema = salvo || (matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro");

document.addEventListener("DOMContentLoaded", () => {
  const botao = document.querySelector("#botao-tema");
  // aria-pressed avisa os leitores de tela se o modo escuro está ligado
  const atualizar = () => botao.setAttribute("aria-pressed", raiz.dataset.tema === "escuro");

  botao.addEventListener("click", () => {
    raiz.dataset.tema = raiz.dataset.tema === "escuro" ? "claro" : "escuro";
    try { localStorage.setItem("tema", raiz.dataset.tema); } catch {}
    atualizar();
  });

  atualizar();
});


// =====================================================================
// CONTAGEM REGRESSIVA ATÉ A FESTA
// Troque a data aqui. Formato: ANO-MÊS-DIATHORA:MINUTO:SEGUNDO-03:00
// O "-03:00" é o fuso de Brasília: assim a contagem fica certa
// mesmo para quem abrir o site com o relógio em outro fuso.
// =====================================================================
const DATA_DA_FESTA = new Date("2026-12-21T19:00:00-03:00");

document.addEventListener("DOMContentLoaded", () => {
  const caixa = document.querySelector("#contagem");
  const campos = {
    dias: document.querySelector("#dias"),
    horas: document.querySelector("#horas"),
    minutos: document.querySelector("#minutos"),
    segundos: document.querySelector("#segundos"),
  };

  // Escreve a data por extenso, em português: "sábado, 12 de dezembro às 19:00"
  document.querySelector("#data-festa").textContent =
    DATA_DA_FESTA.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) +
    " às " +
    DATA_DA_FESTA.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  const doisDigitos = (n) => String(n).padStart(2, "0");   // 7 vira "07"

  function atualizarContagem() {
    const falta = DATA_DA_FESTA - Date.now();              // milissegundos que faltam

    if (falta <= 0) {                                       // chegou a hora!
      caixa.innerHTML = '<p class="contagem-fim">A festa começou! 🎉</p>';
      clearInterval(relogio);
      return;
    }

    const totalSegundos = Math.floor(falta / 1000);
    campos.dias.textContent = Math.floor(totalSegundos / 86400);           // 86400 segundos = 1 dia
    campos.horas.textContent = doisDigitos(Math.floor(totalSegundos / 3600) % 24);
    campos.minutos.textContent = doisDigitos(Math.floor(totalSegundos / 60) % 60);
    campos.segundos.textContent = doisDigitos(totalSegundos % 60);
  }

  const relogio = setInterval(atualizarContagem, 1000);   // atualiza a cada 1 segundo
  atualizarContagem();                                    // e já mostra na hora, sem esperar 1 segundo
});


// =====================================================================
// CARTÕES + LISTA "QUEM LEVA O QUÊ"
// As escolhas ficam guardadas num objeto assim: { pizza: "Ana", suco: "João" }
// (a chave é o name da caixinha; o valor é o nome da pessoa).
//
// ATENÇÃO: por enquanto, isso fica salvo SÓ NESTE NAVEGADOR (localStorage).
// Outras pessoas NÃO veem. Para todo mundo ver, troque só estas duas funções
// por um banco de dados online (Firebase, Supabase...). O resto do código continua igual.
// =====================================================================
function carregarEscolhas() {
  try { return JSON.parse(localStorage.getItem("escolhas")) || {}; }
  catch { return {}; }
}

function salvarEscolhas(escolhas) {
  try { localStorage.setItem("escolhas", JSON.stringify(escolhas)); } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  const escolhas = carregarEscolhas();
  const janela = document.querySelector("#janela-nome");
  const tituloJanela = document.querySelector("#janela-titulo");
  const campoNome = document.querySelector("#campo-nome");
  const listaFinal = document.querySelector("#lista-final");
  const listaVazia = document.querySelector("#lista-vazia");
  const caixas = document.querySelectorAll(".lista-itens input[type=checkbox]");
  let caixaAtual = null;                       // a caixinha que está esperando o nome

  const nomeDoItem = (caixa) => caixa.nextElementSibling.textContent.trim();
  const categoriaDe = (caixa) => caixa.closest(".verso").querySelector("h3").textContent.trim();

  // ---------- 1) Virar os cartões ----------
  document.querySelectorAll(".cartao-virar").forEach((cartao) => {
    const frente = cartao.querySelector(".frente");
    const verso = cartao.querySelector(".verso");

    function virar(mostrarVerso) {
      cartao.classList.toggle("virado", mostrarVerso);
      frente.inert = mostrarVerso;             // inert: o lado escondido não recebe clique nem Tab
      verso.inert = !mostrarVerso;
      (mostrarVerso ? verso.querySelector("input") : frente).focus({ preventScroll: true });
    }

    verso.inert = true;                        // começa mostrando a frente
    frente.addEventListener("click", () => virar(true));
    cartao.querySelector(".voltar").addEventListener("click", () => virar(false));
  });

  // Embaixo de cada item, um lugar para o nome de quem vai levar
  caixas.forEach((caixa) => {
    const quem = document.createElement("small");
    quem.className = "quem";
    caixa.closest("label").after(quem);
  });

  // ---------- 2) Mostrar tudo: caixinhas marcadas + lista do fim da página ----------
  function mostrar() {
    listaFinal.replaceChildren();              // apaga a lista e monta de novo

    caixas.forEach((caixa) => {
      const pessoa = escolhas[caixa.name];
      caixa.checked = Boolean(pessoa);
      caixa.closest("label").nextElementSibling.textContent = pessoa ? "— " + pessoa : "";

      if (pessoa) {
        // textContent (e não innerHTML): se alguém digitar código no nome, ele aparece como texto e não roda
        const li = document.createElement("li");
        const item = document.createElement("span");
        const categoria = document.createElement("span");
        const nome = document.createElement("span");
        item.className = "lf-item";            item.textContent = nomeDoItem(caixa);
        categoria.className = "lf-categoria";  categoria.textContent = categoriaDe(caixa);
        nome.className = "lf-nome";            nome.textContent = pessoa;
        li.append(item, categoria, nome);
        listaFinal.append(li);
      }
    });

    listaVazia.hidden = listaFinal.children.length > 0;
  }

  // ---------- 3) Marcar e desmarcar ----------
  caixas.forEach((caixa) => {
    caixa.addEventListener("change", () => {
      if (caixa.checked) {
        // Marcou: desmarca de novo até a pessoa confirmar o nome
        caixa.checked = false;
        caixaAtual = caixa;
        tituloJanela.textContent = `Quem vai levar ${nomeDoItem(caixa).toLowerCase()}?`;
        try { campoNome.value = localStorage.getItem("meu-nome") || ""; } catch {}   // lembra o último nome usado
        janela.returnValue = "";
        janela.showModal();
      } else {
        // Desmarcou: confirma antes de tirar o nome
        const pessoa = escolhas[caixa.name];
        if (confirm(`Tirar "${nomeDoItem(caixa)}" de ${pessoa}?`)) {
          caixa.classList.remove("pristine");  // agora pode animar (o risco "desfaz")
          delete escolhas[caixa.name];
          salvarEscolhas(escolhas);
          mostrar();
        } else {
          caixa.checked = true;
        }
      }
    });
  });

  // ---------- 4) A janelinha fechou (Confirmar, Cancelar ou tecla Esc) ----------
  janela.addEventListener("close", () => {
    const nome = campoNome.value.trim();

    if (janela.returnValue === "ok" && nome && caixaAtual) {
      escolhas[caixaAtual.name] = nome;
      salvarEscolhas(escolhas);
      try { localStorage.setItem("meu-nome", nome); } catch {}
      caixaAtual.classList.remove("pristine"); // agora pode animar (o risco atravessa o item)
      mostrar();
    }

    caixaAtual?.focus();
    caixaAtual = null;
  });

  mostrar();                                   // ao abrir a página, mostra o que já estava salvo
});
