// =====================================================================
// MODO ESCURO / CLARO
// A página tem dois temas. O tema ativo fica escrito na tag <html>,
// no atributo data-tema ("escuro" ou "claro"). O CSS troca as cores
// da página e também o desenho do botão (sol, lua e ursinhos) sozinho.
// =====================================================================

const raiz = document.documentElement;   // a tag <html>

// Ler e guardar a escolha no navegador (localStorage).
// try/catch: se o navegador bloquear os dados do site (cookies), a página NÃO quebra:
// o tema só deixa de ser lembrado na próxima vez.
function lerTemaSalvo() {
  try { return localStorage.getItem("tema"); }
  catch (erro) { return null; }
}

function salvarTema(tema) {
  try { localStorage.setItem("tema", tema); }
  catch (erro) { /* sem problema: só não vai lembrar */ }
}

// 1) Tema inicial: o que a pessoa já escolheu; se nunca escolheu, o do sistema dela.
//    Isso roda ANTES da página aparecer, para ela não "piscar" na cor errada.
const temaDoSistema = window.matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro";
raiz.dataset.tema = lerTemaSalvo() || temaDoSistema;

// 2) O botão. Ele só existe depois que a página carrega.
document.addEventListener("DOMContentLoaded", () => {
  const botao = document.querySelector("#botao-tema");

  // O desenho do botão muda sozinho pelo CSS. Aqui só avisamos os leitores de tela
  // se o modo escuro está ligado (aria-pressed="true") ou desligado ("false").
  function atualizarBotao() {
    botao.setAttribute("aria-pressed", String(raiz.dataset.tema === "escuro"));
  }

  botao.addEventListener("click", () => {
    const novoTema = raiz.dataset.tema === "escuro" ? "claro" : "escuro";
    raiz.dataset.tema = novoTema;   // o CSS troca tudo
    salvarTema(novoTema);           // lembra a escolha
    atualizarBotao();
  });

  atualizarBotao();
});
