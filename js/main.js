// =====================================================================
// CONFRATERNIZANDO — main.js
//
// COMO FUNCIONA (leia isto primeiro):
//
//   1. Os dados da festa (itens, quem leva o quê, alergias) ficam no
//      Supabase. Por isso TODO MUNDO que abrir a página vê a mesma coisa.
//
//   2. A página nunca muda os dados direto na memória. Toda ação segue
//      sempre o mesmo caminho, de três passos:
//
//            gravar no banco  →  carregar tudo de novo  →  redesenhar
//
//   3. Quando OUTRA pessoa muda algo, o Supabase avisa a página
//      (Realtime) e ela repete só os dois últimos passos sozinha.
//
//   Só duas coisas ficam no navegador (localStorage), porque são
//   preferências de cada pessoa: o tema e o último nome digitado.
//
//   As tabelas no Supabase:
//     items     (card_id, name)       os itens de cada cartão
//     claims    (item_name, person)   quem leva cada item
//     allergies (name)                o que não pode entrar nos cartões
// =====================================================================


// =====================================================================
// 1) O QUE VOCÊ PODE MUDAR
// =====================================================================

// Data e hora da festa. O "-03:00" no fim é o horário de Brasília.
const DATA_DA_FESTA = new Date("2026-12-21T19:00:00-03:00");

// Os cartões de "O que levar?". Para criar um cartão novo, copie uma linha e mude.
//   id    = nome interno do cartão (sem espaço e sem acento)
//   nome  = o que aparece escrito no cartão
//   emoji = o desenho da frente do cartão
//   cor   = a cor do cartão
//   itens = a lista INICIAL. Ela só é usada na primeira vez (banco vazio) e
//           no botão "Voltar à lista original". Depois disso, a lista
//           de verdade é a que está no banco.
const CARTOES = [
  { id: "comidas", nome: "Comidas", emoji: "🍕", cor: "#e8615a", itens: ["Salgadinhos", "Pizza", "Pão de alho"] },
  { id: "bebidas", nome: "Bebidas", emoji: "🥤", cor: "#3b6fd8", itens: ["Refrigerante", "Suco", "Água"] },
  { id: "doces", nome: "Doces", emoji: "🍰", cor: "#c2456b", itens: ["Bolo", "Brigadeiro", "Sorvete"] },
  { id: "descartaveis", nome: "Descartáveis", emoji: "🍽️", cor: "#6d58c9", itens: ["Copos", "Pratos e talheres", "Guardanapos"] },
];


// =====================================================================
// 2) PREFERÊNCIAS DESTE NAVEGADOR (localStorage)
// Só para o que é pessoal: tema e último nome. Os dados da festa NÃO ficam aqui.
// =====================================================================

// Lê um valor guardado. Se não existir (ou der erro), devolve o "padrao".
function ler(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
  catch { return padrao; }
}

// Guarda um valor. O try/catch evita erro em navegadores com o armazenamento bloqueado.
function guardar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { }
}

// O tema roda já aqui em cima, antes da página aparecer, para ela não "piscar" na cor errada.
const temaDoSistema = matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro";
document.documentElement.dataset.tema = ler("tema", temaDoSistema);

function trocarTema() {
  const novo = document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro";
  document.documentElement.dataset.tema = novo;
  guardar("tema", novo);
}


// =====================================================================
// 3) SUPABASE: o banco de dados que todo mundo compartilha
//
// A chave "publishable" pode ficar no site, ela foi feita para isso.
// NUNCA coloque aqui a chave "secret" ou "service_role".
//
// ATENÇÃO: as regras de acesso (RLS) estão ABERTAS, para facilitar o curso.
// Quem tiver o link da página consegue mudar ou apagar tudo.
// =====================================================================
const SUPABASE_URL = "https://dovavtruarzgqlrdgbnf.supabase.co";
const SUPABASE_CHAVE = "sb_publishable_WOT5Iq3xn3e-sk3Wbdi31g_bMEk0u_l";
const banco = supabase.createClient(SUPABASE_URL, SUPABASE_CHAVE);

// Os dados da festa na memória. São sempre uma CÓPIA do que está no banco:
// quem preenche estas variáveis é o carregar(), e só ele.
//   itens    = { comidas: ["Pizza", ...], ... }   o que tem em cada cartão
//   escolhas = { "Pizza": "Ana", ... }            quem leva cada item
//   alergias = ["Amendoim", ...]                  o que não pode entrar nos cartões
let itens = Object.fromEntries(CARTOES.map((cartao) => [cartao.id, []]));
let escolhas = {};
let alergias = [];

// Lê as três tabelas do banco e troca os dados da memória por elas.
// "podeSemear" evita um loop infinito se o banco continuar vazio.
async function carregar(podeSemear = true) {
  const [resItens, resEscolhas, resAlergias] = await Promise.all([
    banco.from("items").select("card_id, name").order("id"),
    banco.from("claims").select("item_name, person"),
    banco.from("allergies").select("name").order("id"),
  ]);
  const erro = resItens.error || resEscolhas.error || resAlergias.error;
  if (erro) throw erro;

  // Banco totalmente vazio = primeira vez que alguém abre a página.
  // Então gravamos a lista inicial do CARTOES e carregamos de novo.
  // (ignoreDuplicates: se duas pessoas abrirem ao mesmo tempo, uma não estraga a outra.)
  const bancoVazio = !resItens.data.length && !resEscolhas.data.length && !resAlergias.data.length;
  if (bancoVazio && podeSemear) {
    const linhas = CARTOES.flatMap((cartao) => cartao.itens.map((nome) => ({ card_id: cartao.id, name: nome })));
    await executar(banco.from("items").upsert(linhas, { onConflict: "card_id,name", ignoreDuplicates: true }));
    return carregar(false);
  }

  itens = Object.fromEntries(CARTOES.map((cartao) => [cartao.id, []]));
  resItens.data.forEach((linha) => (itens[linha.card_id] ??= []).push(linha.name));
  escolhas = Object.fromEntries(resEscolhas.data.map((linha) => [linha.item_name, linha.person]));
  alergias = resAlergias.data.map((linha) => linha.name);
}

// O supabase NÃO lança erro sozinho: ele devolve { error }.
// Esta função "espera a consulta terminar" e, se veio erro, lança de verdade.
async function executar(consulta) {
  const { error } = await consulta;
  if (error) throw error;
}


// =====================================================================
// 4) FUNÇÕES AUXILIARES
// =====================================================================

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
// (Tudo isto fica dentro do DOMContentLoaded porque precisa que os
// elementos do HTML já existam.)
// =====================================================================
document.addEventListener("DOMContentLoaded", async () => {
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


  // ---------- GRAVAR E ATUALIZAR ----------

  // Toda mudança nos dados passa por aqui:
  //   1) roda as gravações no banco (a função "escrever" que você passa)
  //   2) se algo deu errado, avisa a pessoa
  //   3) carrega tudo de novo e redesenha (mesmo com erro, para a tela voltar ao que está no banco)
  async function gravar(escrever) {
    try {
      await escrever();
    } catch (erro) {
      console.error(erro);
      alert("Não consegui salvar no banco. Tente de novo.");
    }
    await atualizar();
  }

  // Carrega os dados do banco e redesenha a tela inteira
  async function atualizar() {
    await carregar();
    await carregarData();   // ← add this line
    desenhar();
    desenharAlergias();


    // Se o painel "Editar itens" está aberto, redesenha também, MAS não enquanto
    // a pessoa digita num campo de nome (senão o texto dela sumiria).
    const digitando = document.activeElement?.matches("#painel-itens input");
    if ($("#painel").open && !digitando) desenharPainel();
  }


  // ---------- CONTAGEM REGRESSIVA ----------
  // A data começa com a DATA_DA_FESTA do código. Se alguém mudar pelo
  // botão "Mudar data", ela vai para o banco (tabela "config") e vale para todo mundo.
  const fuso = { timeZone: "America/Sao_Paulo" };
  const doisDigitos = (numero) => String(numero).padStart(2, "0");   // 7 vira "07"
  const MOLDE_CONTAGEM = $("#contagem").innerHTML;   // guarda os 4 quadradinhos para poder voltar com eles
  let dataDaFesta = DATA_DA_FESTA;

  // Escreve "sábado, 21 de dezembro às 19:00" embaixo do título
  function mostrarData() {
    $("#data-festa").textContent =
      dataDaFesta.toLocaleDateString("pt-BR", { ...fuso, weekday: "long", day: "numeric", month: "long" }) +
      " às " + dataDaFesta.toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" });
  }

  function contar() {
    const segundos = Math.floor((dataDaFesta - Date.now()) / 1000);
    if (segundos <= 0) {
      if (!$(".festa-comecou")) $("#contagem").innerHTML = '<p class="festa-comecou">A festa começou! 🎉</p>';
      return;
    }
    if (!$("#dias")) $("#contagem").innerHTML = MOLDE_CONTAGEM;   // a data mudou para o futuro: volta os números
    $("#dias").textContent = Math.floor(segundos / 86400);
    $("#horas").textContent = doisDigitos(Math.floor(segundos / 3600) % 24);
    $("#minutos").textContent = doisDigitos(Math.floor(segundos / 60) % 60);
    $("#segundos").textContent = doisDigitos(segundos % 60);
  }
  setInterval(contar, 1000);   // roda o contar() a cada 1 segundo

  // Lê a data do banco. Se ainda não tem nenhuma lá, fica a do código.
  async function carregarData() {
    const { data, error } = await banco.from("config").select("valor").eq("chave", "data_festa").maybeSingle();
    if (error) console.error(error);
    else if (data) dataDaFesta = new Date(data.valor);
    mostrarData();
    contar();
  }

  // Botão "Mudar data": abre a janelinha já com a data atual preenchida
  $("#botao-data").onclick = () => {
    // "sv-SE" escreve a data como 2026-12-21 19:00:00, que é quase o formato do campo
    $("#campo-data").value = dataDaFesta.toLocaleString("sv-SE", fuso).replace(" ", "T").slice(0, 16);
    $("#janela-data").returnValue = "";
    $("#janela-data").showModal();
  };

  // Quando a janelinha fecha com "Salvar", grava a nova data no banco
  $("#janela-data").onclose = async () => {
    const valor = $("#campo-data").value;   // ex.: "2026-12-21T19:00"
    if ($("#janela-data").returnValue !== "ok" || !valor) return;
    try {
      await executar(banco.from("config").upsert({ chave: "data_festa", valor: valor + ":00-03:00" }));
    } catch (erro) {
      console.error(erro);
      alert("Não consegui salvar a data. Tente de novo.");
    }
    await carregarData();
  };

  mostrarData();
  contar();
  carregarData();

  // ---------- MONTAR OS CARTÕES (um para cada linha de CARTOES) ----------
  // Frente: emoji + nome. Verso: a lista de itens com as caixinhas.
  // Aqui só se monta a "casca"; os itens entram depois, no desenhar().
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


  // ---------- DESENHAR (só mostra na tela; não grava nada) ----------
  function desenhar() {
    desenharCartoes();
    desenharQuemLeva();
    desenharProgresso();
  }

  // O verso de cada cartão (caixinha + item + quem leva) e o selo "1/3" da frente
  function desenharCartoes() {
    CARTOES.forEach((info) => {
      const lista = itens[info.id];
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

  // Chamado quando alguém clica numa caixinha
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
      // Desmarcou e confirmou: apaga a linha de "claims" desse item
      gravar(() => executar(banco.from("claims").delete().eq("item_name", item)));
    } else {
      // Desmarcou mas desistiu: a caixinha volta a ficar marcada
      caixa.checked = true;
    }
  }

  // A janelinha do nome fechou (Confirmar, Cancelar ou Esc)
  $("#janela-nome").onclose = () => {
    const nome = $("#campo-nome").value.trim();
    const item = itemEsperandoNome;
    itemEsperandoNome = null;

    if ($("#janela-nome").returnValue === "ok" && nome && item) {
      guardar("meu-nome", nome);
      // upsert = "insere, e se o item já tem dono, troca o nome"
      gravar(() => executar(banco.from("claims").upsert({ item_name: item, person: nome })));
    }
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
    lista.forEach((item) => {
      const linha = criar("div", "<input maxlength='40' aria-label='Nome do item'> " +
        `<button class="botao-icone perigo" aria-label="Remover">${ICONE_LIXEIRA}</button>`, "linha");
      const campo = linha.querySelector("input");
      campo.value = item;
      campo.onchange = () => renomear(item, campo.value.trim());
      linha.querySelector("button").onclick = () => remover(item);
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
    campo.value = "";
    gravar(() => executar(banco.from("items").insert({ card_id: cartaoAberto, name: nome })));
  };

  // Mudar o nome de um item. Quem ia levar continua levando: o nome também muda em "claims".
  function renomear(antigo, novoNome) {
    if (novoNome === antigo) return;
    if (!nomePermitido(novoNome)) return desenharPainel();   // não pode: volta ao nome antigo

    gravar(async () => {
      await executar(banco.from("items").update({ name: novoNome }).eq("card_id", cartaoAberto).eq("name", antigo));
      if (escolhas[antigo]) {
        await executar(banco.from("claims").update({ item_name: novoNome }).eq("item_name", antigo));
      }
    });
  }

  // Remover um item (pergunta antes). O dono do item também sai de "claims".
  function remover(item) {
    const pessoa = escolhas[item];
    const pergunta = pessoa ? `"${item}" já está com ${pessoa}. Remover mesmo assim?` : `Remover "${item}"?`;
    if (!confirm(pergunta)) return;

    gravar(async () => {
      await executar(banco.from("claims").delete().eq("item_name", item));
      await executar(banco.from("items").delete().eq("card_id", cartaoAberto).eq("name", item));
    });
  }

  // Abrir o painel
  $("#botao-editar").onclick = () => {
    desenharPainel();
    $("#painel").showModal();
  };

  // Voltar para a lista original (sem os itens que têm alergia).
  // Quem já escolheu um item que continua existindo mantém a escolha.
  $("#painel-restaurar").onclick = () => {
    if (!confirm("Voltar para a lista original? Os itens que você adicionou serão apagados.")) return;

    const linhas = CARTOES.flatMap((cartao) =>
      cartao.itens.filter((nome) => !alergiaDoItem(nome)).map((nome) => ({ card_id: cartao.id, name: nome })));
    const nomesFinais = linhas.map((linha) => linha.name);
    const escolhasQueSobram = Object.keys(escolhas).filter((item) => !nomesFinais.includes(item));

    gravar(async () => {
      // (o banco exige um filtro para apagar: "id diferente de 0" pega todas as linhas)
      await executar(banco.from("items").delete().neq("id", 0));
      await executar(banco.from("items").insert(linhas));
      if (escolhasQueSobram.length) {
        await executar(banco.from("claims").delete().in("item_name", escolhasQueSobram));
      }
    });
  };


  // ---------- "NÃO PODE LEVAR" (alergias) ----------

  // Desenha a lista vermelha nos dois lugares:
  //   - embaixo de "Quem leva o quê": só o nome
  //   - dentro da janela "Não pode levar": o nome + o ✕ para remover
  function desenharAlergias() {
    $("#lista-alergias").innerHTML = "";
    $("#janela-alergias-lista").innerHTML = "";

    alergias.forEach((alergia) => {
      const li = criar("li", "<b></b>");
      li.querySelector("b").textContent = alergia;
      $("#lista-alergias").append(li);

      // A cópia da janela ganha o ✕, que pergunta antes de remover
      const liJanela = li.cloneNode(true);
      const botaoRemover = criar("button", "✕");
      botaoRemover.setAttribute("aria-label", "Remover da lista");
      botaoRemover.onclick = () => {
        const certeza = confirm(`Tem certeza que quer remover "${alergia}"?\n\n` +
          "Alguém colocou isso na lista por um motivo (pode ser uma alergia).");
        if (!certeza) return;
        gravar(() => executar(banco.from("allergies").delete().eq("name", alergia)));
      };
      liJanela.append(" ", botaoRemover);
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

    // Quais itens atuais seriam bloqueados? Para descobrir, a alergia entra na lista
    // só por um instante; o carregar() depois substitui tudo pelo que está no banco.
    alergias.push(nome);
    const bloqueados = todosOsItens().filter(alergiaDoItem);
    alergias.pop();

    if (bloqueados.length > 0 &&
      !confirm(`Estes itens têm ${nome.toLowerCase()}: ${bloqueados.join(", ")}.\nTirar dos cartões?`)) {
      return;                                    // desistiu: a alergia não entra
    }

    campo.value = "";
    gravar(async () => {
      await executar(banco.from("allergies").insert({ name: nome }));
      if (bloqueados.length) {
        await executar(banco.from("claims").delete().in("item_name", bloqueados));
        await executar(banco.from("items").delete().in("name", bloqueados));
      }
    });
  };


  // ---------- PRIMEIRO DESENHO E TEMPO REAL ----------

  // Mostra a tela com os dados que estão no banco
  try {
    await atualizar();
  } catch (erro) {
    console.error(erro);
    $("#progresso-texto").textContent = "Não consegui conectar ao banco de dados. Recarregue a página.";
  }

  // Tempo real: quando QUALQUER pessoa muda uma das tabelas, esta página se atualiza sozinha.
  // O setTimeout junta várias mudanças seguidas numa só atualização.
  let espera;
  banco.channel("festa")
    .on("postgres_changes", { event: "*", schema: "public" }, () => {
      clearTimeout(espera);
      espera = setTimeout(() => atualizar().catch(console.error), 250);
    })
    .subscribe();
});
