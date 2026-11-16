// =====================================================================
// 1) O QUE VOCÊ PODE MUDAR
// =====================================================================

// Data e hora da festa. O "-03:00" no fim é o horário de Brasília.
const DATA_DA_FESTA = new Date("2026-12-21T19:00:00-03:00");

// Os cartões de "O que levar?". Para criar um cartão novo, copie uma linha e mude.
//   id    = nome interno do cartão (sem espaço e sem acento)
//   nome  = o que aparece escrito no cartão
//   cor   = a cor do cartão
//   itens = a lista inicial (depois, o botão "Editar itens" muda a lista pelo próprio site)
const CARTOES = [
  { id: "comidas",      nome: "Comidas",      emoji: "🍕", cor: "#e8615a", itens: ["Salgadinhos", "Pizza", "Pão de alho"] },
  { id: "bebidas",      nome: "Bebidas",      emoji: "🥤", cor: "#3b6fd8", itens: ["Refrigerante", "Suco", "Água"] },
  { id: "doces",        nome: "Doces",        emoji: "🍰", cor: "#c2456b", itens: ["Bolo", "Brigadeiro", "Sorvete"] },
  { id: "descartaveis", nome: "Descartáveis", emoji: "🍽️", cor: "#6d58c9", itens: ["Copos", "Pratos e talheres", "Guardanapos"] },
];


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
// 4) OS DADOS DA FESTA (ficam guardados no navegador)
//   itens    = { comidas: ["Pizza", ...], ... }   o que tem em cada cartão
//   escolhas = { "Pizza": "Ana", ... }             quem leva cada item
//   alergias = ["Amendoim", ...]                   o que não pode entrar nos cartões
// =====================================================================

// A lista original de itens, montada a partir dos CARTOES lá de cima
const listaOriginal = () => Object.fromEntries(CARTOES.map((cartao) => [cartao.id, [...cartao.itens]]));

let itens = ler("lista", listaOriginal());
let escolhas = ler("quem-leva", {});
let alergias = ler("alergias", []);

// Todos os itens de todos os cartões numa lista só
const todosOsItens = () => Object.values(itens).flat();

// "Camarão" vira "camarao": assim acentos e maiúsculas não fazem diferença
const semAcento = (texto) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

// Diz qual alergia bloqueia o item (ou undefined se o item estiver liberado).
// A alergia precisa estar no começo de uma palavra:
// "ovo" bloqueia "Ovos" e "Bolo de ovo", mas não bloqueia "Novo".
function alergiaDoItem(item) {
  const nome = " " + semAcento(item);
  return alergias.find((alergia) => nome.includes(" " + semAcento(alergia)));
}


// =====================================================================
// 5) QUANDO A PÁGINA CARREGA: monta os cartões, liga os botões e desenha tudo
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Atalho para achar um elemento da página: $("#lista-final")
  const $ = (seletor) => document.querySelector(seletor);

  // Atalho para criar um elemento já com o HTML de dentro (e uma classe, se quiser)
  function criar(tag, html, classe = "") {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    elemento.innerHTML = html;
    return elemento;
  }

  $("#botao-tema").onclick = trocarTema;

  // As janelas: qualquer botão com data-fechar fecha a janela dele,
  // e clicar fora da janela (na parte escura) também fecha.
  document.querySelectorAll("[data-fechar]").forEach((botao) => {
    botao.onclick = () => botao.closest("dialog").close();
  });
  document.querySelectorAll("dialog").forEach((janela) => {
    janela.addEventListener("click", (evento) => {
      if (evento.target === janela) janela.close();
    });
  });


  // ---------- CONTAGEM REGRESSIVA ----------
  const fuso = { timeZone: "America/Sao_Paulo" };
  $("#data-festa").textContent =
    DATA_DA_FESTA.toLocaleDateString("pt-BR", { ...fuso, weekday: "long", day: "numeric", month: "long" }) +
    " às " + DATA_DA_FESTA.toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" });

  const doisDigitos = (numero) => String(numero).padStart(2, "0");   // 7 vira "07"

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
  const relogio = setInterval(contar, 1000);   // roda o contar() a cada 1 segundo
  contar();


  // ---------- MONTAR OS CARTÕES (um para cada linha de CARTOES) ----------
  // Frente: emoji + nome. Verso: a lista de itens com as caixinhas.
  CARTOES.forEach((info) => {
    const cartao = criar("article", `
      <button class="frente">
        <span class="selo"></span>
        <span class="emoji">${info.emoji}</span>
        <span class="nome">${info.nome}</span>
        <span class="dica">Toque para escolher</span>
      </button>
      <div class="verso" inert>
        <h3>${info.nome}</h3>
        <ul class="itens"></ul>
        <button class="voltar botao-contorno">↩ Voltar</button>
      </div>`, "cartao");
    cartao.style.setProperty("--cor", info.cor);
    info.elemento = cartao;                      // guarda o cartão para o desenhar() achar depois

    // Virar o cartão. "inert" = o lado escondido não recebe clique nem Tab.
    const frente = cartao.querySelector(".frente");
    const verso = cartao.querySelector(".verso");
    function virar(mostrarVerso) {
      cartao.classList.toggle("virado", mostrarVerso);
      frente.inert = mostrarVerso;
      verso.inert = !mostrarVerso;
      (mostrarVerso ? verso.querySelector(".voltar") : frente).focus();
    }
    frente.onclick = () => virar(true);
    verso.querySelector(".voltar").onclick = () => virar(false);

    $("#cartoes").append(cartao);
  });


  // ---------- DESENHAR TUDO ----------
  // Sempre que algo muda, chame desenhar(): ele guarda os dados e redesenha a página.
  function desenhar() {
    // Quem escolheu um item que não existe mais (removido ou renomeado) sai da lista
    for (const item in escolhas) {
      if (!todosOsItens().includes(item)) delete escolhas[item];
    }
    guardar("lista", itens);
    guardar("quem-leva", escolhas);

    desenharCartoes();
    desenharQuemLeva();
    desenharProgresso();
  }

  // O verso de cada cartão (caixinha + item + quem leva) e o selo "1/3" da frente
  function desenharCartoes() {
    CARTOES.forEach((info) => {
      const lista = (itens[info.id] ??= []);     // cartão novo ainda sem itens guardados: começa vazio
      const ul = info.elemento.querySelector(".itens");
      ul.innerHTML = "";

      lista.forEach((item) => {
        const pessoa = escolhas[item];
        // textContent (e não innerHTML) para o que as pessoas digitam: se alguém digitar código, ele não roda
        const li = criar("li", "<label><input type='checkbox'> <span></span></label><small></small>");
        li.querySelector("span").textContent = item;
        li.querySelector("small").textContent = pessoa ? "— " + pessoa : "";
        const caixa = li.querySelector("input");
        caixa.checked = Boolean(pessoa);
        caixa.onchange = () => marcar(item, caixa);
        ul.append(li);
      });

      // Selo da frente: "1/3", ou "Completo ✓" quando todos os itens têm dono
      const comDono = lista.filter((item) => escolhas[item]).length;
      const completo = lista.length > 0 && comDono === lista.length;
      const selo = info.elemento.querySelector(".selo");
      selo.textContent = completo ? "Completo ✓" : `${comDono}/${lista.length}`;
      selo.classList.toggle("completo", completo);
    });
  }

  // A lista "Quem leva o quê": UMA linha por pessoa, com tudo o que ela marcou.
  // ("ana", "Ana" e "ANA" contam como a mesma pessoa.)
  function desenharQuemLeva() {
    const ul = $("#lista-final");
    ul.innerHTML = "";
    const linhaDaPessoa = {};

    CARTOES.forEach((info) => {
      itens[info.id].forEach((item) => {
        const pessoa = escolhas[item];
        if (!pessoa) return;                     // ninguém leva este item: pula

        const chave = semAcento(pessoa);
        if (!linhaDaPessoa[chave]) {             // primeira vez que aparece: cria a linha dela
          linhaDaPessoa[chave] = criar("li", "<span class='etiqueta'></span><div class='levados'></div>");
          linhaDaPessoa[chave].querySelector(".etiqueta").textContent = pessoa;
          ul.append(linhaDaPessoa[chave]);
        }
        const levado = criar("span", "<b></b> <small></small>", "levado");
        levado.querySelector("b").textContent = item;
        levado.querySelector("small").textContent = info.nome;
        linhaDaPessoa[chave].querySelector(".levados").append(levado);
      });
    });

    $("#lista-vazia").hidden = ul.children.length > 0;
  }

  // A barra de progresso e o texto em cima dela
  function desenharProgresso() {
    const todos = todosOsItens();
    const total = todos.length;
    const comDono = todos.filter((item) => escolhas[item]).length;
    $("#progresso-texto").textContent = total > 0 && comDono === total
      ? "Tudo certo: todos os itens já têm alguém para levar! 🎉"
      : `${comDono} de ${total} itens já têm alguém para levar`;
    $("#barra-cheia").style.width = total ? (comDono / total) * 100 + "%" : "0";
  }


  // ---------- MARCAR / DESMARCAR UM ITEM ----------
  let itemEsperandoNome = null;                  // o item que está esperando o nome na janelinha

  function marcar(item, caixa) {
    if (caixa.checked) {
      // Marcou: abre a janelinha do nome. A caixinha só fica marcada depois de confirmar.
      caixa.checked = false;
      itemEsperandoNome = item;
      $("#janela-titulo").textContent = `Quem vai levar ${item.toLowerCase()}?`;
      $("#campo-nome").value = ler("meu-nome", "");   // lembra o último nome usado
      $("#janela-nome").returnValue = "";
      $("#janela-nome").showModal();
    } else if (confirm(`Tirar "${item}" de ${escolhas[item]}?`)) {
      // Desmarcou e confirmou
      delete escolhas[item];
      desenhar();
    } else {
      // Desmarcou mas desistiu
      caixa.checked = true;
    }
  }

  // A janelinha do nome fechou (Confirmar, Cancelar ou Esc)
  $("#janela-nome").onclose = () => {
    const nome = $("#campo-nome").value.trim();
    if ($("#janela-nome").returnValue === "ok" && nome && itemEsperandoNome) {
      escolhas[itemEsperandoNome] = nome;
      guardar("meu-nome", nome);
      desenhar();
    }
    itemEsperandoNome = null;
  };


  // ---------- PAINEL "EDITAR ITENS" ----------
  // Mostra um cartão por vez; as abas em cima trocam de cartão.
  let cartaoAberto = CARTOES[0].id;

  const ICONE_LIXEIRA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>`;

  function desenharPainel() {
    // As abas: emoji + nome + quantos itens o cartão tem
    $("#painel-abas").innerHTML = "";
    CARTOES.forEach((info) => {
      const aba = criar("button", `<span>${info.emoji}</span> <b>${info.nome}</b> <small>${itens[info.id].length}</small>`, "chip");
      aba.setAttribute("aria-pressed", info.id === cartaoAberto);
      aba.style.setProperty("--cor", info.cor);
      aba.onclick = () => {
        cartaoAberto = info.id;
        desenharPainel();
      };
      $("#painel-abas").append(aba);
    });

    // Os itens do cartão aberto: uma linha com o nome (dá para editar) e a lixeira
    const lista = itens[cartaoAberto];
    $("#painel-itens").innerHTML = "";
    lista.forEach((item, posicao) => {
      const linha = criar("div", "<input maxlength='40' aria-label='Nome do item'> " +
        `<button class="botao-icone perigo" aria-label="Remover">${ICONE_LIXEIRA}</button>`, "linha");
      const campo = linha.querySelector("input");
      campo.value = item;
      campo.onchange = () => renomear(posicao, campo.value.trim());
      linha.querySelector("button").onclick = () => remover(posicao);
      $("#painel-itens").append(linha);
    });
    if (lista.length === 0) {
      $("#painel-itens").append(criar("p", "Este cartão está vazio.", "lista-vazia"));
    }
  }

  // Confere se um nome de item pode ser usado: não pode ser vazio, repetido ou ter alergia.
  // Se não puder, avisa a pessoa e devolve false.
  function nomePermitido(nome) {
    if (!nome) return false;
    if (todosOsItens().includes(nome)) {
      alert(`"${nome}" já está na lista.`);
      return false;
    }
    const alergia = alergiaDoItem(nome);
    if (alergia) {
      alert(`"${nome}" não pode entrar: alguém tem alergia a ${alergia.toLowerCase()}.`);
      return false;
    }
    return true;
  }

  // Adicionar um item novo no cartão aberto
  $("#form-item").onsubmit = (evento) => {
    evento.preventDefault();                     // não recarrega a página
    const campo = $("#campo-item");
    const nome = campo.value.trim();
    if (!nomePermitido(nome)) return;
    itens[cartaoAberto].push(nome);
    campo.value = "";
    desenhar();
    desenharPainel();
  };

  // Mudar o nome de um item (quem ia levar continua levando, com o nome novo)
  function renomear(posicao, novoNome) {
    const antigo = itens[cartaoAberto][posicao];
    if (novoNome === antigo) return;
    if (!nomePermitido(novoNome)) return desenharPainel();   // não pode: volta ao nome antigo
    itens[cartaoAberto][posicao] = novoNome;
    if (escolhas[antigo]) escolhas[novoNome] = escolhas[antigo];
    desenhar();
  }

  // Remover um item (pergunta antes)
  function remover(posicao) {
    const item = itens[cartaoAberto][posicao];
    const pessoa = escolhas[item];
    const pergunta = pessoa ? `"${item}" já está com ${pessoa}. Remover mesmo assim?` : `Remover "${item}"?`;
    if (!confirm(pergunta)) return;
    itens[cartaoAberto].splice(posicao, 1);
    desenhar();
    desenharPainel();
  }

  // Abrir o painel
  $("#botao-editar").onclick = () => {
    desenharPainel();
    $("#painel").showModal();
  };

  // Voltar para a lista original (sem os itens que têm alergia)
  $("#painel-restaurar").onclick = () => {
    if (!confirm("Voltar para a lista original? Os itens que você adicionou serão apagados.")) return;
    itens = listaOriginal();
    tirarItensComAlergia();
    desenhar();
    desenharPainel();
  };


  // ---------- "NÃO PODE LEVAR" (alergias) ----------
  // Tira dos cartões todo item bloqueado por alguma alergia
  function tirarItensComAlergia() {
    for (const id in itens) {
      itens[id] = itens[id].filter((item) => !alergiaDoItem(item));
    }
  }

  // Desenha a lista vermelha nos dois lugares:
  //   - embaixo de "Quem leva o quê": só o nome
  //   - dentro da janela "Não pode levar": o nome + o ✕ para remover
  function desenharAlergias() {
    guardar("alergias", alergias);
    $("#lista-alergias").innerHTML = "";
    $("#janela-alergias-lista").innerHTML = "";

    alergias.forEach((alergia, posicao) => {
      const li = criar("li", "<b></b>");
      li.querySelector("b").textContent = alergia;
      $("#lista-alergias").append(li);

      // A cópia da janela ganha o ✕, que pergunta antes de remover
      const liJanela = li.cloneNode(true);
      const remover = criar("button", "✕");
      remover.setAttribute("aria-label", "Remover da lista");
      remover.onclick = () => {
        const certeza = confirm(`Tem certeza que quer remover "${alergia}"?\n\n` +
          "Alguém colocou isso na lista por um motivo (pode ser uma alergia).");
        if (!certeza) return;
        alergias.splice(posicao, 1);
        desenharAlergias();
      };
      liJanela.append(" ", remover);
      $("#janela-alergias-lista").append(liJanela);
    });

    $("#alergias-vazia").hidden = alergias.length > 0;
  }

  $("#botao-alergias").onclick = () => $("#janela-alergias").showModal();

  // Adicionar uma alergia. Se algum item dos cartões tiver ela, pergunta se pode tirar.
  $("#form-alergia").onsubmit = (evento) => {
    evento.preventDefault();
    const campo = $("#campo-alergia");
    const nome = campo.value.trim();
    if (!nome) return;
    if (alergias.some((alergia) => semAcento(alergia) === semAcento(nome))) {
      return alert(`"${nome}" já está na lista.`);
    }

    alergias.push(nome);
    const bloqueados = todosOsItens().filter((item) => alergiaDoItem(item));
    if (bloqueados.length > 0) {
      const tirar = confirm(`Estes itens têm ${nome.toLowerCase()}: ${bloqueados.join(", ")}.\nTirar dos cartões?`);
      if (!tirar) {
        alergias.pop();                          // desistiu: a alergia não entra
        return;
      }
      tirarItensComAlergia();
      desenhar();
    }
    campo.value = "";
    desenharAlergias();
  };


  // ---------- PRIMEIRO DESENHO DA PÁGINA ----------
  desenharAlergias();
  desenhar();
});
