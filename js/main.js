// =====================================================================
// 1) O QUE VOCÊ PODE MUDAR
// =====================================================================

// Data da festa. Formato: ANO-MÊS-DIATHORA:MINUTO:SEGUNDO-03:00 (-03:00 = horário de Brasília)
const DATA_DA_FESTA = new Date("2026-12-21T19:00:00-03:00");

// A lista inicial de itens de cada cartão.
// O nome antes dos ":" é o data-categoria do cartão no index.html.
// (O botão "Editar itens" do site muda essa lista sem precisar mexer aqui.)
const ITENS_INICIAIS = {
  comidas: ["Salgadinhos", "Pizza", "Pão de alho"],
  bebidas: ["Refrigerante", "Suco", "Água"],
  doces: ["Bolo", "Brigadeiro", "Sorvete"],
  descartaveis: ["Copos", "Pratos e talheres", "Guardanapos"],
};


// =====================================================================
// 2) GUARDAR NO NAVEGADOR (localStorage)
// ATENÇÃO: fica salvo SÓ neste navegador; outras pessoas não veem.
// Para todo mundo ver, troque estas duas funções por um banco de dados online.
// =====================================================================
function ler(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
  catch { return padrao; }
}

function guardar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch {}
}


// =====================================================================
// 3) TEMA ESCURO / CLARO
// Roda antes da página aparecer, para ela não "piscar" na cor errada.
// =====================================================================
const temaDoSistema = matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro";
document.documentElement.dataset.tema = ler("tema", temaDoSistema);

function trocarTema() {
  const novo = document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro";
  document.documentElement.dataset.tema = novo;
  guardar("tema", novo);
}


// =====================================================================
// 4) OS DADOS DA FESTA
//   itens    = { comidas: ["Pizza", ...], ... }   (o que tem em cada cartão)
//   escolhas = { "Pizza": "Ana", ... }             (quem leva cada item)
// =====================================================================
let itens = ler("lista", structuredClone(ITENS_INICIAIS));
let escolhas = ler("quem-leva", {});
let itemEscolhido = null;                      // o item que está esperando o nome na janelinha

const todosOsItens = () => Object.values(itens).flat();


// =====================================================================
// 5) QUANDO A PÁGINA CARREGA: liga os botões e desenha tudo
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
  const $ = (seletor) => document.querySelector(seletor);   // atalho para achar um elemento

  $("#botao-tema").onclick = trocarTema;

  // ---------- Contagem regressiva ----------
  $("#data-festa").textContent =
    DATA_DA_FESTA.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) +
    " às " + DATA_DA_FESTA.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  const doisDigitos = (n) => String(n).padStart(2, "0");    // 7 vira "07"

  function contar() {
    const segundos = Math.floor((DATA_DA_FESTA - Date.now()) / 1000);
    if (segundos <= 0) {
      $("#contagem").innerHTML = '<p class="festa-comecou">A festa começou! 🎉</p>';
      clearInterval(relogio);
      return;
    }
    $("#dias").textContent = Math.floor(segundos / 86400);
    $("#horas").textContent = doisDigitos(Math.floor(segundos / 3600) % 24);
    $("#minutos").textContent = doisDigitos(Math.floor(segundos / 60) % 60);
    $("#segundos").textContent = doisDigitos(segundos % 60);
  }
  const relogio = setInterval(contar, 1000);
  contar();

  // ---------- Virar os cartões ----------
  document.querySelectorAll(".cartao").forEach((cartao) => {
    const frente = cartao.querySelector(".frente");
    const verso = cartao.querySelector(".verso");
    verso.inert = true;                        // inert: o lado escondido não recebe clique nem Tab

    function virar(mostrarVerso) {
      cartao.classList.toggle("virado", mostrarVerso);
      frente.inert = mostrarVerso;
      verso.inert = !mostrarVerso;
      (mostrarVerso ? cartao.querySelector(".voltar") : frente).focus();
    }

    frente.onclick = () => virar(true);
    cartao.querySelector(".voltar").onclick = () => virar(false);
  });

  // ---------- Desenhar: cartões, selos, lista do fim e barra de progresso ----------
  // Sempre que algo muda, esta função guarda os dados e desenha tudo de novo.
  function desenhar() {
    guardar("lista", itens);
    guardar("quem-leva", escolhas);
    $("#lista-final").innerHTML = "";

    document.querySelectorAll(".cartao").forEach((cartao) => {
      const lista = itens[cartao.dataset.categoria] ??= [];
      const categoria = cartao.querySelector("h3").textContent;
      const ul = cartao.querySelector(".itens");
      ul.innerHTML = "";

      lista.forEach((item) => {
        const pessoa = escolhas[item];

        // O item no verso do cartão: caixinha + nome do item + quem leva
        // (textContent em vez de innerHTML: se alguém digitar código, ele aparece como texto e não roda)
        const li = document.createElement("li");
        li.innerHTML = "<label><input type='checkbox'> <span></span></label><small></small>";
        li.querySelector("span").textContent = item;
        li.querySelector("small").textContent = pessoa ? "— " + pessoa : "";
        const caixa = li.querySelector("input");
        caixa.checked = Boolean(pessoa);
        caixa.onchange = () => marcar(item, caixa);
        ul.append(li);

        // A linha na lista "Quem leva o quê"
        if (pessoa) {
          const linha = document.createElement("li");
          linha.innerHTML = "<b></b> <small></small> <span class='etiqueta'></span>";
          linha.querySelector("b").textContent = item;
          linha.querySelector("small").textContent = categoria;
          linha.querySelector(".etiqueta").textContent = pessoa;
          $("#lista-final").append(linha);
        }
      });

      // Selo da frente: "1/3", ou "Completo ✓"
      const comDono = lista.filter((item) => escolhas[item]).length;
      const completo = lista.length > 0 && comDono === lista.length;
      const selo = cartao.querySelector(".selo");
      selo.textContent = completo ? "Completo ✓" : `${comDono}/${lista.length}`;
      selo.classList.toggle("completo", completo);
    });

    // Barra de progresso
    const total = todosOsItens().length;
    const comDono = $("#lista-final").children.length;
    $("#progresso-texto").textContent = total > 0 && comDono === total
      ? "Tudo certo: todos os itens já têm alguém para levar! 🎉"
      : `${comDono} de ${total} itens já têm alguém para levar`;
    $("#barra-cheia").style.width = total ? (comDono / total) * 100 + "%" : "0";
    $("#lista-vazia").hidden = comDono > 0;
  }

  // ---------- Marcar e desmarcar um item ----------
  function marcar(item, caixa) {
    if (caixa.checked) {
      caixa.checked = false;                   // só fica marcado depois que a pessoa confirmar o nome
      itemEscolhido = item;
      $("#janela-titulo").textContent = `Quem vai levar ${item.toLowerCase()}?`;
      $("#campo-nome").value = ler("meu-nome", "");   // lembra o último nome usado
      $("#janela-nome").returnValue = "";
      $("#janela-nome").showModal();
    } else if (confirm(`Tirar "${item}" de ${escolhas[item]}?`)) {
      delete escolhas[item];
      desenhar();
    } else {
      caixa.checked = true;
    }
  }

  // A janelinha fechou (Confirmar, Cancelar ou Esc)
  $("#janela-nome").onclose = () => {
    const nome = $("#campo-nome").value.trim();
    if ($("#janela-nome").returnValue === "ok" && nome && itemEscolhido) {
      escolhas[itemEscolhido] = nome;
      guardar("meu-nome", nome);
      desenhar();
    }
    itemEscolhido = null;                      // pronto: nenhum item esperando nome
  };

  // ---------- Painel "Editar itens" ----------
  function desenharPainel() {
    $("#painel-categorias").innerHTML = "";

    document.querySelectorAll(".cartao").forEach((cartao) => {
      const categoria = cartao.dataset.categoria;
      const bloco = document.createElement("section");
      bloco.className = "painel-categoria";
      bloco.innerHTML = "<h3></h3><div class='linhas'></div>" +
        "<form><input placeholder='Novo item…' maxlength='40'> <button class='botao'>Adicionar</button></form>";
      bloco.querySelector("h3").textContent = cartao.querySelector("h3").textContent;

      // Uma linha por item: o nome (dá para editar) e o botão de remover
      itens[categoria].forEach((item, posicao) => {
        const linha = document.createElement("div");
        linha.className = "linha";
        linha.innerHTML = "<input maxlength='40'> <button class='botao-contorno' aria-label='Remover'>🗑</button>";
        const campo = linha.querySelector("input");
        campo.value = item;
        campo.onchange = () => renomear(categoria, posicao, campo.value.trim());
        linha.querySelector("button").onclick = () => remover(categoria, posicao);
        bloco.querySelector(".linhas").append(linha);
      });

      // Adicionar um item novo
      const form = bloco.querySelector("form");
      form.onsubmit = (evento) => {
        evento.preventDefault();               // não recarrega a página
        adicionar(categoria, form.querySelector("input").value.trim());
      };

      $("#painel-categorias").append(bloco);
    });
  }

  function adicionar(categoria, nome) {
    if (!nome) return;
    if (todosOsItens().includes(nome)) return alert(`"${nome}" já está na lista.`);
    itens[categoria].push(nome);
    desenhar();
    desenharPainel();
  }

  function renomear(categoria, posicao, novoNome) {
    const antigo = itens[categoria][posicao];
    if (!novoNome || (novoNome !== antigo && todosOsItens().includes(novoNome))) {
      desenharPainel();                        // nome vazio ou repetido: volta ao nome antigo
      return;
    }
    itens[categoria][posicao] = novoNome;
    if (escolhas[antigo]) {                    // quem ia levar continua levando, com o nome novo
      escolhas[novoNome] = escolhas[antigo];
      delete escolhas[antigo];
    }
    desenhar();
  }

  function remover(categoria, posicao) {
    const item = itens[categoria][posicao];
    const pergunta = escolhas[item]
      ? `"${item}" já está com ${escolhas[item]}. Remover mesmo assim?`
      : `Remover "${item}"?`;
    if (!confirm(pergunta)) return;
    itens[categoria].splice(posicao, 1);
    delete escolhas[item];
    desenhar();
    desenharPainel();
  }

  $("#botao-editar").onclick = () => {
    desenharPainel();
    $("#painel").showModal();
  };

  $("#painel-fechar").onclick = () => $("#painel").close();

  $("#painel-restaurar").onclick = () => {
    if (!confirm("Voltar para a lista original? Os itens que você adicionou serão apagados.")) return;
    itens = structuredClone(ITENS_INICIAIS);
    // quem tinha escolhido um item que não existe mais sai da lista
    for (const item in escolhas) {
      if (!todosOsItens().includes(item)) delete escolhas[item];
    }
    desenhar();
    desenharPainel();
  };

  desenhar();
});
