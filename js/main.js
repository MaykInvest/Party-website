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
const DATA_DA_FESTA = new Date("2026-12-25T19:00:00-03:00");

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
