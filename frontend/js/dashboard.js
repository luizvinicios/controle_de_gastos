import { api, logout, token, userName } from './api.js';

const $ = selector => document.querySelector(selector);
const month = $('#month');
const filters = $('#filters');
const dialog = $('#entry');
const entry = $('#entry-form');
const notice = $('#notice');
const sections = { dashboard:'Dashboard', extrato:'Extrato Completo', categorias:'Categorias', orcamentos:'Orçamentos / Metas' };
const currency = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const brl = number => currency.format(Number(number));
const dateLabel = date => date.split('-').reverse().join('/');
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
let categories = [];
let request = 0;
let editing;
let donut;
let bars;

function node(tag, value = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = value;
  element.className = className;
  return element;
}
function message(text = '') {
  notice.textContent = text;
  notice.hidden = !text;
}
function options(select, list, label) {
  const previous = select.value;
  select.replaceChildren(new Option(label, ''), ...list.map(item => new Option(item.nome, item.id)));
  if (list.some(item => String(item.id) === previous)) select.value = previous;
}
function colorDot(color) {
  const dot = node('span', '', 'dot');
  dot.style.backgroundColor = color;
  return dot;
}
function table(target, records) {
  target.replaceChildren();
  if (!records.length) {
    const cell = node('td', 'Nenhum lançamento encontrado.', 'empty');
    cell.colSpan = 5;
    target.insertRow().append(cell);
  }
  for (const item of records) {
    const row = target.insertRow();
    row.insertCell().textContent = item.descricao;
    row.insertCell().append(colorDot(item.cor_hex), item.categoria);
    row.insertCell().textContent = dateLabel(item.data);
    const amount = row.insertCell();
    amount.className = item.tipo === 'receita' ? 'positive' : 'negative';
    amount.textContent = (item.tipo === 'receita' ? '+' : '−') + brl(item.valor);
    const actions = row.insertCell();
    const edit = node('button', 'Editar');
    const remove = node('button', 'Excluir', 'delete');
    edit.addEventListener('click', () => openEntry(item));
    remove.addEventListener('click', async () => {
      if (!confirm('Excluir o lançamento “' + item.descricao + '”?')) return;
      remove.disabled = true;
      try {
        await api('/transacoes/' + item.id, { method: 'DELETE' });
        await refresh();
      } catch (err) {
        message(err.message);
      } finally {
        remove.disabled = false;
      }
    });
    actions.append(edit, remove);
  }
}
function draw(data) {
  donut?.destroy();
  bars?.destroy();
  const available = Boolean(window.Chart);
  const slices = available && data.categorias.length > 0;
  $('#donut').hidden = !slices;
  $('#donut-empty').hidden = slices;
  $('#donut-empty').textContent = available ? 'Nenhuma despesa neste mês.' : 'Chart.js indisponível. Confira o acesso à internet.';
  if (!available) return;
  const tooltip = { callbacks:{ label: item => (item.dataset.label || item.label) + ' · ' + brl(item.raw) } };
  const shared = { responsive:true, maintainAspectRatio:false };
  if (slices) donut = new Chart($('#donut'), {
    type:'doughnut',
    data:{ labels:data.categorias.map(item => item.nome), datasets:[{ data:data.categorias.map(item => Number(item.total)), backgroundColor:data.categorias.map(item => item.cor_hex), borderWidth:2 }] },
    options:{ ...shared, cutout:'69%', plugins:{ tooltip, legend:{ position:'right' } } }
  });
  bars = new Chart($('#bars'), {
    type:'bar',
    data:{
      labels:data.mensal.map(item => item.mes.slice(5) + '/' + item.mes.slice(2,4)),
      datasets:[
        { label:'Receitas', data:data.mensal.map(item => Number(item.receitas)), backgroundColor:'#7663df', borderRadius:5 },
        { label:'Despesas', data:data.mensal.map(item => Number(item.despesas)), backgroundColor:'#ee9b87', borderRadius:5 }
      ]
    },
    options:{ ...shared, plugins:{ tooltip, legend:{ position:'bottom' } }, scales:{ y:{ beginAtZero:true, ticks:{ callback:value => brl(value) } }, x:{ grid:{ display:false } } } }
  });
}

function showCategories() {
  const list = $('#category-list');
  list.replaceChildren();
  if (!categories.length) list.append(node('p', 'Nenhuma categoria cadastrada.', 'empty'));
  for (const item of categories) {
    const card = node('article', '', 'card');
    const title = node('h2');
    title.append(colorDot(item.cor_hex), item.nome);
    card.append(title, node('p', item.tipo === 'receita' ? 'Receita' : 'Despesa', 'muted'));
    list.append(card);
  }
}
function showBudgets(records) {
  const list = $('#budget-list');
  list.replaceChildren();
  if (!records.length) list.append(node('p', 'Nenhum orçamento definido para este mês.', 'empty'));
  for (const item of records) {
    const ratio = Number(item.gasto) / Number(item.limite_mensal);
    const card = node('article', '', 'card');
    const title = node('h2', item.nome);
    const progress = node('progress');
    progress.max = 1;
    progress.value = Math.min(1, ratio);
    progress.style.setProperty('--progress', ratio >= 1 ? '#d84444' : ratio >= .8 ? '#e1a424' : '#58a889');
    const percent = new Intl.NumberFormat('pt-BR', { style:'percent', maximumFractionDigits:1 }).format(ratio);
    progress.setAttribute('aria-label', item.nome + ' · ' + percent + ' do limite');
    const edit = node('button', 'Alterar limite', 'secondary');
    edit.onclick = () => {
      $('#budget-category').value = item.categoria_id;
      const input = $('#budget-form').elements.limite_mensal;
      input.value = item.limite_mensal;
      input.focus();
    };
    card.append(title, progress, node('p', brl(item.gasto) + ' de ' + brl(item.limite_mensal) + ' · ' + percent, 'muted'), edit);
    list.append(card);
  }
}
function entryOptions() {
  const fields = entry.elements;
  options(fields.categoria_id, categories.filter(item => item.tipo === fields.tipo.value), 'Selecione');
}
function openEntry(item) {
  if (dialog.open) return;
  editing = item?.id;
  entry.reset();
  $('#entry-error').textContent = '';
  $('#entry-title').textContent = editing ? 'Editar lançamento' : 'Novo lançamento';
  const fields = entry.elements;
  fields.data.value = month.value === today.slice(0, 7) ? today : month.value + '-01';
  if (item) for (const key of ['descricao','valor','data','tipo']) fields[key].value = item[key];
  entryOptions();
  if (item) fields.categoria_id.value = item.categoria_id;
  dialog.showModal();
}

async function refresh() {
  const current = ++request;
  if (!month.reportValidity()) return;
  const mes = month.value;
  message();
  try {
    const active = $('#title').dataset.section;
    const period = new URLSearchParams({ mes });
    const query = new URLSearchParams(period);
    for (const [key, value] of new FormData(filters)) if (value.trim()) query.set(key, value.trim());
    const jobs = {
      dashboard: () => Promise.all([api('/dashboard/summary?' + period), api('/dashboard/chart?' + period), api('/transacoes?' + period)]),
      extrato: () => api('/transacoes?' + query),
      categorias: () => Promise.resolve(),
      orcamentos: () => api('/orcamentos?' + period)
    };
    const [nextCategories, data] = await Promise.all([api('/categorias'), jobs[active]()]);
    if (current !== request) return;
    categories = nextCategories;
    entryOptions();
    options($('#filter-category'), categories, 'Todas');
    options($('#budget-category'), categories.filter(item => item.tipo === 'despesa'), 'Selecione');
    if (active === 'dashboard') {
      const [summary, charts, recent] = data;
      $('#balance').textContent = brl(summary.saldo_total);
      $('#income').textContent = brl(summary.receitas_mes);
      $('#expense').textContent = brl(summary.despesas_mes);
      table($('#recent'), recent.slice(0, 5));
      draw(charts);
    }
    if (active === 'extrato') table($('#transactions'), data);
    if (active === 'categorias') showCategories();
    if (active === 'orcamentos') showBudgets(data);
  } catch (err) {
    if (current === request) message(err.message);
  }
}

function navigate() {
  const key = location.hash.slice(1);
  const active = Object.hasOwn(sections, key) ? key : 'dashboard';
  for (const section of Object.keys(sections)) {
    const link = $('.sidebar nav a[href="#' + section + '"]');
    $('#' + section).hidden = section !== active;
    if (section === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  $('#title').textContent = sections[active];
  $('#title').dataset.section = active;
  refresh();
}
function onSubmit(form, action, onError = message) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      await action(Object.fromEntries(new FormData(form)));
    } catch (err) {
      onError(err.message);
    } finally {
      button.disabled = false;
    }
  });
}
if (!token()) {
  logout();
} else {
  month.value = today.slice(0, 7);
  $('#member').textContent = userName() || 'Minha conta';
  $('#logout').onclick = logout;
  $('#new').onclick = () => openEntry();
  $('#close-entry').onclick = () => dialog.close();
  entry.elements.tipo.onchange = entryOptions;
  month.onchange = refresh;
  filters.onsubmit = event => { event.preventDefault(); refresh(); };
  window.addEventListener('hashchange', navigate);
  document.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.key.toLowerCase() !== 'n') return;
    if (event.target.closest?.('input, select, textarea, [contenteditable]')) return;
    event.preventDefault();
    openEntry();
  });
  onSubmit(entry, async body => {
    $('#entry-error').textContent = '';
    await api(editing ? '/transacoes/' + editing : '/transacoes', { method:editing ? 'PUT' : 'POST', body });
    dialog.close();
    await refresh();
  }, error => { $('#entry-error').textContent = error; });
  onSubmit($('#category-form'), async body => {
    await api('/categorias', { method:'POST', body });
    $('#category-form').reset();
    await refresh();
  });
  onSubmit($('#budget-form'), async body => {
    await api('/orcamentos', { method:'POST', body:{ ...body, mes_ano:month.value } });
    $('#budget-form').reset();
    await refresh();
  });
  navigate();
}
