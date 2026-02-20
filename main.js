/* ══════════════════════════════════════════════════════════════════
   ZV Cativa — main.js
   ═════════════════════════════════════════════════════════════════ */

const WHATSAPP = '5521973205926';
const API_URL  = '/api/jogos';

// Pacotes: mapeados às chaves de precos retornadas pela API
const PACOTES = [
  { key: 'ingresso',     icon: 'fa-ticket',      label: 'Somente Ingresso'           },
  { key: 'club',         icon: 'fa-star',         label: 'Ingresso + Maracanã Club'   },
  { key: 'transfer',     icon: 'fa-van-shuttle',  label: 'Transfer + Ingresso'        },
  { key: 'transferClub', icon: 'fa-crown',        label: 'Transfer + Ingresso + Club' },
];

// ── Helpers ───────────────────────────────────────────────────────
function badgeClass(competicao) {
  const map = {
    'Camp Carioca':        'badge-carioca',
    'Libertadores':        'badge-libertadores',
    'Copa do Brasil':      'badge-copa-brasil',
    'Camp Brasileiro':     'badge-brasileiro',
    'Recopa Sulamericana': 'badge-recopa',
    'Amistoso':            'badge-amistoso',
    'Evento':              'badge-evento',
    'Musical':             'badge-musical',
  };
  return map[competicao] || 'badge-default';
}

function tipoIcon(tipo) {
  if (!tipo) return '';
  const t = tipo.toLowerCase();
  if (t === 'futebol') return '<i class="fa-solid fa-futbol"></i> Futebol';
  if (t === 'show')    return '<i class="fa-solid fa-music"></i> Show';
  return `<i class="fa-solid fa-calendar-star"></i> ${tipo}`;
}

function formatDate(raw) {
  if (!raw || !raw.trim()) return '—';
  const parts = raw.trim().split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  }
  return raw.trim();
}

function formatBRL(num) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(num);
}

function whatsappURL(jogo, pacote, preco) {
  const msg =
    `Olá! Tenho interesse no pacote *${pacote.label}* ` +
    `para o jogo *${jogo.evento}* em *${formatDate(jogo.data)}*. ` +
    `Valor: *${formatBRL(preco)} por pessoa*. ` +
    `Poderia confirmar disponibilidade?`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

// ── Render de card ────────────────────────────────────────────────
function renderCard(jogo) {
  const bClass   = badgeClass(jogo.competicao);
  const esgotado = jogo.estoque !== null && jogo.estoque <= 0;

  const obsHTML = jogo.obs
    ? `<div class="card-obs"><i class="fa-solid fa-circle-info"></i> ${jogo.obs}</div>`
    : '';

  // Badge de estoque
  const estoqueHTML = esgotado
    ? `<span class="estoque-badge esgotado"><i class="fa-solid fa-ban"></i> Esgotado</span>`
    : (jogo.estoque !== null
        ? `<span class="estoque-badge disponivel"><i class="fa-solid fa-ticket"></i> ${jogo.estoque} disponíveis</span>`
        : '');

  // Menor preço disponível para o "a partir de"
  const precos = Object.values(jogo.precos).filter(p => p !== null && p !== undefined);
  const menorPreco = precos.length ? Math.min(...precos) : null;

  // Botões de pacote ou bloco esgotado
  let pkgsHTML;
  if (esgotado) {
    const msgEspera = encodeURIComponent(`Olá! Vi que o jogo *${jogo.evento}* (${formatDate(jogo.data)}) está esgotado. Gostaria de entrar na lista de espera.`);
    pkgsHTML = `
      <div class="esgotado-block">
        <i class="fa-solid fa-ban"></i>
        <span>Ingressos esgotados no momento</span>
      </div>
      <a href="https://wa.me/${WHATSAPP}?text=${msgEspera}"
         target="_blank" rel="noopener" class="btn-lista-espera">
        <i class="fa-brands fa-whatsapp"></i> Entrar na lista de espera
      </a>`;
  } else {
    pkgsHTML = PACOTES.map(p => {
      const preco = jogo.precos[p.key];
      if (preco === null || preco === undefined) return '';
      return `
        <a href="${whatsappURL(jogo, p, preco)}" target="_blank" rel="noopener" class="pkg-btn">
          <span class="pkg-icon"><i class="fa-brands fa-whatsapp"></i></span>
          <span class="pkg-name">
            <span class="pkg-name-label">${p.label}</span>
            <span class="pkg-name-price">${formatBRL(preco)}<span class="pkg-per-pessoa">/pessoa</span></span>
          </span>
          <i class="fa-solid fa-chevron-right pkg-arrow"></i>
        </a>`;
    }).join('');
  }

  return `
    <article class="jogo-card${esgotado ? ' esgotado-card' : ''}" data-competicao="${jogo.competicao}" data-tipo="${jogo.tipo}">
      <div class="card-header">
        <span class="competition-badge ${bClass}">${jogo.competicao}</span>
        <span class="card-tipo-icon">${tipoIcon(jogo.tipo)}</span>
      </div>
      <div class="card-body">
        <h2 class="card-evento">${jogo.evento}</h2>
        <div class="card-meta">
          <span><i class="fa-solid fa-calendar"></i> ${formatDate(jogo.data)}</span>
          <span><i class="fa-solid fa-location-dot"></i> Maracanã, Rio de Janeiro</span>
          ${estoqueHTML}
        </div>
        ${obsHTML}
        ${menorPreco !== null && !esgotado ? `
        <div class="card-price-area">
          <div class="price-from">A partir de</div>
          <div class="price-value">${formatBRL(menorPreco)}</div>
          <div class="price-label">por pessoa · Escolha o pacote abaixo</div>
        </div>` : ''}
        <div class="card-packages">
          ${pkgsHTML}
        </div>
      </div>
    </article>`;
}

// ── Filtros ───────────────────────────────────────────────────────
function renderFilters(jogos) {
  const bar = document.getElementById('filterBar');
  const competicoes = [...new Set(jogos.map(j => j.competicao).filter(Boolean))];

  competicoes.forEach(comp => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = comp;
    btn.textContent = comp;
    bar.appendChild(btn);
  });

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilter(btn.dataset.filter);
  });
}

// Filtra cards visíveis
function applyFilter(filter) {
  const cards  = document.querySelectorAll('.jogo-card');
  const empty  = document.getElementById('emptyState');
  let visible  = 0;

  cards.forEach(card => {
    const show = filter === 'todos' || card.dataset.competicao === filter;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  empty.hidden = visible > 0;
}

// ── Inicialização ─────────────────────────────────────────────────────────────
async function init() {
  const loading = document.getElementById('loadingState');
  const error   = document.getElementById('errorState');
  const grid    = document.getElementById('jogosGrid');

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { jogos } = await res.json();

    loading.style.display = 'none';

    if (!jogos || jogos.length === 0) {
      document.getElementById('emptyState').hidden = false;
      return;
    }

    grid.innerHTML = jogos.map(renderCard).join('');
    grid.hidden = false;

    renderFilters(jogos);
  } catch (err) {
    console.error('[ZV Cativa] Erro ao carregar jogos:', err);
    loading.style.display = 'none';
    error.hidden = false;
  }
}

document.addEventListener('DOMContentLoaded', init);
