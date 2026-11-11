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
