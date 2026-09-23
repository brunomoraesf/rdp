/* ---------- DADOS GLOBAIS ---------- */
var dados = {};
var hoje = new Date();
var diaAtual = hoje.toISOString().slice(0, 10);
var diaSelecionado = diaAtual;
var timerStatus;
var indiceNotaAtual = null;
var conteudoOriginal = "";
var dataChecklistAtual = null;
var indiceChecklistAtual = null;
var checklistAlterado = false;
var isHighlightActive = false;

var ultimoTermoPesquisa = "";
var nenhumResultadoPesquisa = false;

/* ---------- TIPOS CONFIGURÁVEIS ---------- */
var tiposConfig = {};
var tipoConfigSelecionado = null;
var tipoConfigPendenteNome = null;
var ordemTipos = [];

function tiposPadraoNomes() {
    return ["abono", "aposentadoria", "invalidez", "registros", "outros"];
}

function sanitizarTiposConfig(obj) {
    if (!obj || typeof obj !== 'object') return {};
    var out = {};
    Object.keys(obj).forEach(function (t) {
        var entry = obj[t];
        if (!entry || typeof entry !== 'object') entry = {};
        var itens = Array.isArray(entry.itens) ? entry.itens : [];
        itens = itens.map(function (s) { return String(s); });
        out[t] = { itens: itens };
    });
    return out;
}

function salvarOrdemTipos() {
    localStorage.setItem('ordem_tipos', JSON.stringify(ordemTipos));
}

function carregarOrdemTipos() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem('ordem_tipos') || 'null'); } catch (e) { raw = null; }
    ordemTipos = Array.isArray(raw) ? raw.filter(function (t) { return typeof t === 'string'; }) : [];
    Object.keys(tiposConfig).forEach(function (t) {
        if (ordemTipos.indexOf(t) === -1) ordemTipos.push(t);
    });
    ordemTipos = ordemTipos.filter(function (t) { return !!tiposConfig[t]; });
    localStorage.setItem('ordem_tipos', JSON.stringify(ordemTipos));
}

function inicializarTiposConfig() {
    var salvo = null;
    try { salvo = JSON.parse(localStorage.getItem('tipos_config') || 'null'); } catch (e) { salvo = null; }
    tiposConfig = sanitizarTiposConfig(salvo);
    if (Object.keys(tiposConfig).length === 0) {
        tiposPadraoNomes().forEach(function (t) { tiposConfig[t] = { itens: [] }; });
        localStorage.setItem('tipos_config', JSON.stringify(tiposConfig));
    }
    carregarOrdemTipos();
}

function salvarTiposConfig() {
    localStorage.setItem('tipos_config', JSON.stringify(tiposConfig));
}

function popularSelectTipos() {
    var sel = document.getElementById('tipo');
    if (!sel) return;
    var valorAtual = sel.value;
    sel.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = 'Selecione o tipo...';
    opt0.disabled = true;
    sel.appendChild(opt0);
    ordemTipos.forEach(function (t) {
        if (!tiposConfig[t]) return;
        var opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        sel.appendChild(opt);
    });
    if (valorAtual && tiposConfig[valorAtual]) sel.value = valorAtual;
    else sel.value = '';
    atualizarBotaoAdicionar();
}

function atualizarBotaoAdicionar() {
    var btn = document.getElementById('btnAdicionar');
    var sel = document.getElementById('tipo');
    if (!btn || !sel) return;
    var tipoOk = sel.value && tiposConfig[sel.value];
    var fluxoOk = !!document.querySelector('input[name=fluxo]:checked');
    btn.disabled = (diaSelecionado !== diaAtual) || !tipoOk || !fluxoOk;
}

function getItensDoTipo(nomeTipo) {
    if (tiposConfig[nomeTipo] && Array.isArray(tiposConfig[nomeTipo].itens)) {
        return tiposConfig[nomeTipo].itens.slice();
    }
    return [];
}

/* ---------- BUSCA INTELIGENTE ---------- */
function normalizarBuscaInteligente(str) {
    if (!str) return "";
    var s = String(str).toUpperCase().replace(/[^0-9A-Z]/g, '');
    var semZeros = s.replace(/^0+/, '');
    return semZeros.length > 0 ? semZeros : s;
}
function correspondeBusca(haystack, needle) {
    var h = normalizarBuscaInteligente(haystack);
    var n = normalizarBuscaInteligente(needle);
    if (!n) return false;
    return h === n || h.indexOf(n) !== -1;
}

/* ---------- VALIDADORES (fallback para arquivos no formato antigo) ---------- */
function pareceRegistros(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    var chaves = Object.keys(obj);
    if (chaves.length === 0) return true;
    for (var i = 0; i < chaves.length; i++) {
        var k = chaves[i];
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(obj[k])) return true;
    }
    return false;
}
function pareceTipos(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    var chaves = Object.keys(obj);
    if (chaves.length === 0) return true;
    for (var i = 0; i < chaves.length; i++) {
        var v = obj[chaves[i]];
        if (v && typeof v === 'object' && Array.isArray(v.itens)) return true;
    }
    return false;
}

/* ---------- CLIPPY ---------- */
const imagensClippy = [
    'imagens/clippy-01.gif', 'imagens/clippy-03.gif', 'imagens/clippy-04.gif', 'imagens/clippy-06.gif',
    'imagens/clippy-07.gif', 'imagens/clippy-08.gif', 'imagens/clippy-09.gif', 'imagens/clippy-10.gif',
    'imagens/clippy-11.gif', 'imagens/clippy-12.gif', 'imagens/clippy-13.gif', 'imagens/clippy-14.gif',
    'imagens/clippy-16.gif', 'imagens/clippy-17.gif'
];
function trocarClippy() { const img = document.getElementById('clippy-img'); if (img) img.src = imagensClippy[Math.floor(Math.random() * imagensClippy.length)]; }
setInterval(trocarClippy, 10000);
function mostrarStatus(texto) { var pop = document.getElementById('statusPopup'); pop.innerHTML = "💾 <b>Status:</b><br>" + texto; pop.style.display = 'block'; if (timerStatus) clearTimeout(timerStatus); timerStatus = setTimeout(() => { pop.style.display = 'none'; }, 5000); }
function mostrarErroModal(texto) { document.getElementById('modalErroTexto').innerText = texto; abrirOverlay('modalErroOverlay'); }
function fecharModalErro() { fecharOverlay('modalErroOverlay'); }

/* ---------- AUXILIARES ---------- */
function format(cmd, val) { document.getElementById('notaEditable').focus(); document.execCommand(cmd, false, val); }
function changeCase(caseType) { const selection = window.getSelection(); if (!selection.rangeCount) return; const range = selection.getRangeAt(0); const selectedText = range.toString(); if (!selectedText) return; const newText = caseType === 'upper' ? selectedText.toUpperCase() : selectedText.toLowerCase(); document.execCommand('insertText', false, newText); }

var confirmaCallbackSim = null, confirmaCallbackNao = null, confirmaCallbackCancelar = null;
function abrirConfirma(titulo, texto, acaoSim, acaoNao, acaoCancelar) {
    document.getElementById('confirmaTitulo').innerText = titulo;
    document.getElementById('confirmaTexto').innerText = texto;
    confirmaCallbackSim = acaoSim || null;
    confirmaCallbackNao = acaoNao || null;
    confirmaCallbackCancelar = acaoCancelar || null;
    document.getElementById('btnConfirmaSim').onclick = () => { if (confirmaCallbackSim) confirmaCallbackSim(); fecharConfirma(); };
    document.getElementById('btnConfirmaNao').onclick = () => { if (confirmaCallbackNao) confirmaCallbackNao(); fecharConfirma(); };
    document.getElementById('btnConfirmaCancelar').onclick = () => { if (confirmaCallbackCancelar) confirmaCallbackCancelar(); fecharConfirma(); };
    abrirOverlay('modalConfirmaOverlay');
}
function fecharConfirma() { fecharOverlay('modalConfirmaOverlay'); confirmaCallbackSim = null; confirmaCallbackNao = null; confirmaCallbackCancelar = null; }

/* ============================================================ */
/* ========== GERENCIADOR DE MODAIS =========================== */
/* ============================================================ */
var zIndexCounter = 15000;

function getModalBox(overlay) {
    var box = overlay.querySelector('.modal-box');
    if (box) return box;
    for (var i = 0; i < overlay.children.length; i++) {
        if (overlay.children[i].tagName === 'DIV') return overlay.children[i];
    }
    return null;
}
function trazerParaFrente(overlay) { zIndexCounter++; overlay.style.zIndex = zIndexCounter; }
function resetarPosicaoModal(overlay) {
    var box = getModalBox(overlay);
    if (!box) return;
    box.style.position = ''; box.style.left = ''; box.style.top = '';
    box.style.margin = ''; box.style.transform = '';
    box.style.right = ''; box.style.bottom = '';
}
function abrirOverlay(id) {
    var overlay = document.getElementById(id);
    if (!overlay) return;
    resetarPosicaoModal(overlay);
    overlay.style.display = 'flex';
    trazerParaFrente(overlay);
}
function fecharOverlay(id) {
    var overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.style.display = 'none';
    resetarPosicaoModal(overlay);
}
function clampPosicao(box, left, top) {
    var w = box.offsetWidth, h = box.offsetHeight;
    var maxLeft = Math.max(0, window.innerWidth - w);
    var maxTop = Math.max(0, window.innerHeight - h);
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left > maxLeft) left = maxLeft;
    if (top > maxTop) top = maxTop;
    return { left: left, top: top };
}
function habilitarArrastoModal(overlay) {
    var box = getModalBox(overlay);
    if (!box) return;
    var titleBar = box.querySelector('.title-bar');
    if (!titleBar) return;
    if (titleBar.__dragBound) return;
    titleBar.__dragBound = true;
    titleBar.style.cursor = 'move';
    titleBar.style.userSelect = 'none';

    var dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    titleBar.addEventListener('mousedown', function (e) {
        var t = e.target;
        while (t && t !== titleBar) {
            if (t.tagName === 'BUTTON') return;
            t = t.parentElement;
        }
        var rect = box.getBoundingClientRect();
        box.style.position = 'fixed';
        box.style.margin = '0';
        box.style.transform = 'none';
        var pos = clampPosicao(box, rect.left, rect.top);
        box.style.left = pos.left + 'px';
        box.style.top = pos.top + 'px';
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        startLeft = pos.left; startTop = pos.top;
        e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - startX, dy = e.clientY - startY;
        var pos = clampPosicao(box, startLeft + dx, startTop + dy);
        box.style.left = pos.left + 'px';
        box.style.top = pos.top + 'px';
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    box.addEventListener('mousedown', function () { trazerParaFrente(overlay); });
}
function inicializarModais() {
    document.querySelectorAll('.overlay').forEach(function (ov) { habilitarArrastoModal(ov); });
}

/* ---------- PERSISTÊNCIA (somente localStorage) ---------- */
function salvarNavegador() {
    localStorage.setItem('registros_processos', JSON.stringify(dados));
}
function salvarTudoNoNavegador() {
    localStorage.setItem('registros_processos', JSON.stringify(dados));
    localStorage.setItem('tipos_config', JSON.stringify(tiposConfig));
    localStorage.setItem('ordem_tipos', JSON.stringify(ordemTipos));
}

function gerarTimestampArquivo() {
    var d = new Date();
    var ano = d.getFullYear();
    var mes = String(d.getMonth() + 1).padStart(2, '0');
    var dia = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    return '' + ano + mes + dia + '-' + hh + mm + ss;
}

function baixarJson(obj, nomeArquivo) {
    try {
        var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    } catch (e) {
        console.warn('Falha ao baixar arquivo:', e);
    }
}

// Garante que o localStorage está atualizado ao fechar
window.addEventListener('beforeunload', function () {
    try { salvarTudoNoNavegador(); } catch (e) { }
});

/* ---------- BACKUP MANUAL (modal) ---------- */
function abrirModalBackup() { abrirOverlay('modalBackupOverlay'); }
function fecharModalBackup() { fecharOverlay('modalBackupOverlay'); }

function exportarRegistrosManual() {
    var ts = gerarTimestampArquivo();
    var pacote = {
        _tipo_arquivo: "registros",
        _versao: 1,
        _geradoEm: new Date().toISOString(),
        dados: dados
    };
    baixarJson(pacote, 'registros-' + ts + '.json');
    mostrarStatus("registros.json exportado.");
}

function exportarTiposManual() {
    var ts = gerarTimestampArquivo();
    var pacote = {
        _tipo_arquivo: "tipos",
        _versao: 1,
        _geradoEm: new Date().toISOString(),
        dados: tiposConfig
    };
    baixarJson(pacote, 'tipos-' + ts + '.json');
    mostrarStatus("tipos.json exportado.");
}

function importarRegistrosManual(input) {
    if (!input.files[0]) return;
    var arquivo = input.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var json = JSON.parse(e.target.result);

            // Formato novo (com cabeçalho _tipo_arquivo)
            if (json && typeof json === 'object' && json._tipo_arquivo !== undefined) {
                if (json._tipo_arquivo !== 'registros') {
                    mostrarErroModal(
                        "Arquivo incorreto.\n\n" +
                        "Esperado: registros\n" +
                        "Recebido: " + json._tipo_arquivo + "\n\n" +
                        "Use o botão 'Carregar tipos.json' para esse arquivo."
                    );
                    input.value = "";
                    return;
                }
                dados = (json.dados && typeof json.dados === 'object') ? json.dados : {};
            } else {
                // Formato antigo (JSON puro, sem cabeçalho)
                if (!pareceRegistros(json)) {
                    mostrarErroModal(
                        "Este arquivo não parece ser de registros.\n\n" +
                        "Você tentou carregar um arquivo de TIPOS no campo de REGISTROS?\n\n" +
                        "Arquivo: " + arquivo.name
                    );
                    input.value = "";
                    return;
                }
                dados = json;
            }

            localStorage.setItem('registros_processos', JSON.stringify(dados));
            renderizar();
            mostrarStatus("registros.json carregado.");
        } catch (err) {
            mostrarErroModal("Arquivo JSON inválido ou corrompido.");
        }
        input.value = "";
    };
    reader.readAsText(arquivo);
}

function importarTiposManual(input) {
    if (!input.files[0]) return;
    var arquivo = input.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var json = JSON.parse(e.target.result);
            var base;

            // Formato novo
            if (json && typeof json === 'object' && json._tipo_arquivo !== undefined) {
                if (json._tipo_arquivo !== 'tipos') {
                    mostrarErroModal(
                        "Arquivo incorreto.\n\n" +
                        "Esperado: tipos\n" +
                        "Recebido: " + json._tipo_arquivo + "\n\n" +
                        "Use o botão 'Carregar registros.json' para esse arquivo."
                    );
                    input.value = "";
                    return;
                }
                base = (json.dados && typeof json.dados === 'object') ? json.dados : {};
            } else {
                // Formato antigo
                if (!pareceTipos(json)) {
                    mostrarErroModal(
                        "Este arquivo não parece ser de tipos.\n\n" +
                        "Você tentou carregar um arquivo de REGISTROS no campo de TIPOS?\n\n" +
                        "Arquivo: " + arquivo.name
                    );
                    input.value = "";
                    return;
                }
                base = json;
            }

            var sanit = sanitizarTiposConfig(base);
            if (Object.keys(sanit).length === 0) {
                tiposPadraoNomes().forEach(function (t) { sanit[t] = { itens: [] }; });
            }
            tiposConfig = sanit;
            salvarTiposConfig();
            carregarOrdemTipos();
            popularSelectTipos();
            tipoConfigSelecionado = ordemTipos[0] || null;
            renderizarConfig();
            mostrarStatus("tipos.json carregado.");
        } catch (err) {
            mostrarErroModal("Arquivo JSON inválido ou corrompido.");
        }
        input.value = "";
    };
    reader.readAsText(arquivo);
}

/* ---------- MATRÍCULA / COR DO ÍCONE ---------- */
function normalizarMatricula(valor) {
    if (!valor) return "";
    let str = valor.toUpperCase().replace(/[^0-9X]/g, '');
    if (str.length > 8) str = str.substring(0, 8);
    if (str.indexOf('X') !== -1 && str.indexOf('X') !== str.length - 1) str = str.replace(/X/g, '');
    if (str.endsWith('X')) {
        let numeros = str.substring(0, str.length - 1).replace(/\D/g, '');
        numeros = numeros.padStart(7, '0');
        return numeros + 'X';
    } else {
        return str.padStart(8, '0');
    }
}

function getChecklistIconColor(checklist) {
    if (!checklist) return "black";
    const checks = checklist.checks || [];
    const xmarks = checklist.xmarks || [];
    const nas = checklist.nas || [];
    const total = Math.max(checks.length, xmarks.length, nas.length);
    let hasFalse = false, allLinesHaveResult = total > 0, hasAtLeastOneTrue = false;
    for (let i = 0; i < total; i++) {
        const hasCheckOrNa = checks[i] || nas[i];
        const hasXmark = xmarks[i];
        if (hasCheckOrNa) hasAtLeastOneTrue = true;
        else if (hasXmark) hasFalse = true;
        else allLinesHaveResult = false;
    }
    if (hasFalse) return "red";
    if (allLinesHaveResult && hasAtLeastOneTrue) return "green";
    if ((hasAtLeastOneTrue || hasFalse) && !allLinesHaveResult) return "gold";
    const nomeOk = checklist.nome && checklist.nome.trim() !== "";
    const matOk = checklist.matricula && checklist.matricula.trim() !== "";
    const carOk = checklist.carreira && checklist.carreira.trim() !== "";
    if (nomeOk && matOk && carOk) return "#555555";
    return "black";
}

/* ---------- RENDERIZAÇÃO ---------- */
function renderizar() {
    document.getElementById('tituloDia').innerText = 'Data: ' + diaSelecionado;
    atualizarBotaoAdicionar();
    var lista = document.getElementById('listaRegistros');
    lista.innerHTML = '';
    var registros = dados[diaSelecionado] || [];
    registros.forEach((r, i) => {
        var temNota = r.nota && r.nota.replace(/<[^>]*>/g, '').trim().length > 0;
        var iconColor = getChecklistIconColor(r.checklist);
        var div = document.createElement('div');
        div.className = 'registro';
        div.setAttribute('data-indice', i);
        div.innerHTML = `
            <div class="info-proc">
                <span class="numero-processo" data-proc="${r.processo}">${String(i + 1).padStart(2, '0')}. ${r.processo}</span>
                <span style="cursor:pointer; margin-left:5px;" onclick="abrirModalNota(${i})">${temNota ? "📝" : "📄"}</span>
                <i class="fa-solid fa-clipboard-check" style="color: ${iconColor}; cursor:pointer; margin-left:5px;" onclick="abrirModalChecklist('${diaSelecionado}', ${i})"></i>
                <div style="font-size:9px; color:#666;">${r.tipo} | ${r.fluxo}</div>
            </div>
            <div class="controles-registro" style="display: flex; gap: 8px; align-items: center;">
                <label style="display:flex;cursor:pointer;"><input type="checkbox" data-i="${i}" data-tipo="aviso" ${r.aviso ? 'checked' : ''}> ⚠️</label>
                <span>|</span>
                <label style="display:flex;cursor:pointer;"><input type="checkbox" data-i="${i}" data-tipo="atualizacao" ${r.atualizacao ? 'checked' : ''}> 🔄</label>
                <span>|</span>
                <label style="display:flex;cursor:pointer;"><input type="checkbox" data-i="${i}" data-tipo="tempo" ${r.tempo ? 'checked' : ''}> ⏳</label>
                <span>|</span>
                <label style="display:flex;cursor:pointer;"><input type="checkbox" data-i="${i}" data-tipo="obras" ${r.obras ? 'checked' : ''}> 🚧</label>
                <span>|</span>
                <label style="display:flex;cursor:pointer;"><input type="checkbox" data-i="${i}" data-tipo="concluido" ${r.concluido ? 'checked' : ''}> OK</label>
                <button onclick="abrirConfirma('Excluir', 'Remover este registro?', () => { dados[diaSelecionado].splice(${i}, 1); salvarNavegador(); renderizar(); mostrarStatus('Registro excluído.'); })"><i style="color: rgba(255, 0, 0, 0.5);" class="fa-solid fa-trash-can"></i></button>
            </div>`;
        if (r.concluido) div.classList.add('status-concluido');
        else {
            let count = (r.aviso ? 1 : 0) + (r.atualizacao ? 1 : 0) + (r.tempo ? 1 : 0) + (r.obras ? 1 : 0);
            if (count > 1) div.classList.add('status-multiplo');
            else if (r.aviso) div.classList.add('status-aviso');
            else if (r.atualizacao) div.classList.add('status-atualizacao');
            else if (r.tempo) div.classList.add('status-tempo');
            else if (r.obras) div.classList.add('status-obras');
        }
        lista.appendChild(div);
    });
    renderizarCalendario();
}

function renderizarCalendario() {
    var cal = document.getElementById('calendario'); cal.innerHTML = '';
    var datas = Object.keys(dados).sort();
    if (!datas.includes(diaAtual)) { datas.push(diaAtual); datas.sort(); }
    var anoAtual = '', mesAtual = '';
    datas.forEach(data => {
        var [ano, mes, dia] = data.split('-');
        if (ano !== anoAtual) { anoAtual = ano; var t = document.createElement('div'); t.className = 'linha-titulo'; t.innerText = ano; cal.appendChild(t); }
        if (mes !== mesAtual) { mesAtual = mes; var m = document.createElement('div'); m.className = 'linha-divisoria'; m.innerText = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][parseInt(mes) - 1]; cal.appendChild(m); }
        var btn = document.createElement('div'); btn.className = 'dia'; btn.innerText = dia;
        if (data === diaAtual) btn.classList.add('hoje');
        else if (dados[data]?.length > 0) btn.classList.add(dados[data].every(r => r.concluido) ? 'legado' : 'pendente');
        if (data === diaSelecionado) btn.classList.add('selecionado');
        btn.onclick = () => { diaSelecionado = data; renderizar(); };
        cal.appendChild(btn);
    });
}

/* ---------- CHECKBOX E NOTAS ---------- */
document.addEventListener('change', e => {
    if (e.target.type === 'checkbox' && e.target.dataset.i !== undefined) {
        let idx = parseInt(e.target.dataset.i);
        let tipo = e.target.dataset.tipo;
        if (dados[diaSelecionado] && dados[diaSelecionado][idx]) {
            if (tipo) dados[diaSelecionado][idx][tipo] = e.target.checked;
            else dados[diaSelecionado][idx].concluido = e.target.checked;
            salvarNavegador(); renderizar();
            mostrarStatus(`Atualizado ${tipo || 'OK'}.`);
        }
    }
});
document.addEventListener('click', e => { if (e.target.classList.contains('numero-processo')) { navigator.clipboard.writeText(e.target.dataset.proc); mostrarStatus("Número copiado."); } });

function abrirModalNota(index) { indiceNotaAtual = index; var reg = dados[diaSelecionado][index]; conteudoOriginal = reg.nota || ""; document.getElementById('notaTitulo').innerText = "Bloco de Notas - " + reg.processo; document.getElementById('notaEditable').innerHTML = conteudoOriginal; abrirOverlay('modalNotaOverlay'); }
function tentarSalvarNota() { abrirConfirma("Salvar", "Deseja sobrescrever a nota?", () => { dados[diaSelecionado][indiceNotaAtual].nota = document.getElementById('notaEditable').innerHTML; salvarNavegador(); renderizar(); fecharOverlay('modalNotaOverlay'); mostrarStatus("Nota salva."); }); }
function tentarFecharNota() { let atual = document.getElementById('notaEditable').innerHTML; if (atual !== conteudoOriginal) abrirConfirma("Aviso", "Sair sem salvar?", () => { fecharOverlay('modalNotaOverlay'); mostrarStatus("Edição cancelada."); }); else fecharOverlay('modalNotaOverlay'); }
function limparConteudo() { abrirConfirma("Limpar", "Apagar tudo?", () => { document.getElementById('notaEditable').innerHTML = ""; mostrarStatus("Conteúdo limpo."); }); }

/* ---------- MODAL CHECKLIST ---------- */
function abrirModalChecklist(data, indice) {
    dataChecklistAtual = data;
    indiceChecklistAtual = indice;
    const registro = dados[data][indice];
    if (!registro.checklist) {
        var itensDoTipo = getItensDoTipo(registro.tipo);
        registro.checklist = {
            nome: "", matricula: "", carreira: "", processo: registro.processo,
            itens: itensDoTipo.slice(),
            checks: new Array(itensDoTipo.length).fill(false),
            xmarks: new Array(itensDoTipo.length).fill(false),
            nas: new Array(itensDoTipo.length).fill(false),
            revisoes: new Array(itensDoTipo.length).fill(false),
            observacao: "",
            versao: 1,
            data: new Date().toISOString()
        };
    } else if (!Array.isArray(registro.checklist.itens)) {
        var len = (registro.checklist.checks || []).length || 0;
        var itens = [];
        for (var k = 0; k < len; k++) itens.push("");
        registro.checklist.itens = itens;
    }
    carregarChecklistNoModal(registro.checklist);
    document.getElementById('checklistTitulo').innerHTML = `Checklist - ${registro.processo}`;
    abrirOverlay('modalChecklistOverlay');
    checklistAlterado = false;
}

function limparChecklistAtual() {
    abrirConfirma("Limpar Checklist", "Deseja limpar todos os campos?", () => {
        const registro = dados[dataChecklistAtual][indiceChecklistAtual];
        if (registro) {
            var itens = (registro.checklist && registro.checklist.itens) || getItensDoTipo(registro.tipo);
            registro.checklist = {
                nome: "", matricula: "", carreira: "", processo: registro.processo,
                itens: itens.slice(),
                checks: new Array(itens.length).fill(false),
                xmarks: new Array(itens.length).fill(false),
                nas: new Array(itens.length).fill(false),
                revisoes: new Array(itens.length).fill(false),
                observacao: "",
                versao: (registro.checklist?.versao || 0) + 1,
                data: new Date().toISOString()
            };
            salvarNavegador();
            carregarChecklistNoModal(registro.checklist);
            renderizar();
            checklistAlterado = false;
            mostrarStatus("Checklist limpo.");
        }
    });
}

function fecharModalChecklist() {
    if (checklistAlterado) {
        abrirConfirma("Aviso", "Há alterações não salvas. Deseja salvar antes de fechar?",
            () => {
                const salvou = salvarChecklistAtual();
                if (salvou) { fecharOverlay('modalChecklistOverlay'); mostrarStatus("Checklist salvo."); }
            },
            () => { fecharOverlay('modalChecklistOverlay'); },
            () => { }
        );
    } else {
        fecharOverlay('modalChecklistOverlay');
    }
}

function salvarChecklistAtual() {
    if (!dataChecklistAtual || indiceChecklistAtual === null) return false;
    const registro = dados[dataChecklistAtual][indiceChecklistAtual];
    if (!registro) return false;
    const nome = document.getElementById('check_nome')?.value.trim() || "";
    const matriculaRaw = document.getElementById('check_matricula')?.value.trim() || "";
    const carreira = document.getElementById('check_carreira')?.value.trim() || "";
    const observacao = document.getElementById('observacao-checklist')?.innerHTML || "";
    const itens = (registro.checklist && registro.checklist.itens) || getItensDoTipo(registro.tipo);
    const checks = [], xmarks = [], nas = [], revisoes = [];
    for (let i = 0; i < itens.length; i++) {
        checks.push(!!document.getElementById(`check_chk_${i}`)?.checked);
        xmarks.push(!!document.getElementById(`check_xmark_${i}`)?.checked);
        nas.push(!!document.getElementById(`check_na_${i}`)?.checked);
        revisoes.push(!!document.getElementById(`check_revisar_${i}`)?.checked);
    }
    if (nome === "" || matriculaRaw === "" || carreira === "") {
        mostrarErroModal("Não foi possível salvar: Nome, Matrícula e Carreira são obrigatórios.");
        return false;
    }
    const matricula = normalizarMatricula(matriculaRaw);
    registro.checklist = {
        nome, matricula, carreira, processo: registro.processo,
        itens: itens.slice(),
        checks, xmarks, nas, revisoes, observacao,
        versao: (registro.checklist?.versao || 0) + 1,
        data: new Date().toISOString()
    };
    salvarNavegador();
    renderizar();
    checklistAlterado = false;
    mostrarStatus(`Checklist salvo (versão ${registro.checklist.versao})`);
    return true;
}

function carregarChecklistNoModal(checklist) {
    const body = document.getElementById('checklistBody');
    const itens = (checklist.itens && checklist.itens.length) ? checklist.itens : [];
    let html = `
        <div class="checklist-header-fixo">
            <label>Nome:<br><input type="text" id="check_nome" value="${escapeHtml(checklist.nome || '')}" style="width:100%"></label><br>
            <label>Matrícula:<br><input type="text" id="check_matricula" value="${escapeHtml(checklist.matricula || '')}" style="width:100%"></label><br>
            <label>Carreira:<br><input type="text" id="check_carreira" value="${escapeHtml(checklist.carreira || '')}" style="width:100%"></label><br>
            <div class="controle-checklist">
                <button onclick="salvarChecklistAtual()">💾 Salvar Checklist</button>
                <button onclick="limparChecklistAtual()">🧹 Limpar campos</button>
                <button onclick="fecharModalChecklist()">❌ Fechar</button>
            </div>
        </div>
        <div class="checklist-tabela-rolagem">`;
    if (itens.length === 0) {
        html += `<div style="padding: 16px; text-align: center; color: #666; font-style: italic;">
                    Nenhum item configurado para este tipo.<br>Vá em ⚙️ Configurações para adicionar itens.
                 </div>`;
    } else {
        html += `<table>
                <thead><tr><th class="descricao">Descrição</th><th class="check">✔️</th><th class="xmark">❌</th><th class="na">⛔</th><th class="revisar">↩</th></tr></thead>
                <tbody>`;
        for (let i = 0; i < itens.length; i++) {
            var texto = itens[i] && String(itens[i]).trim() !== "" ? itens[i] : "(sem nome)";
            html += `<tr>
                <td>${escapeHtml(texto)}</td>
                <td class="check"><input type="checkbox" id="check_chk_${i}" class="check" ${checklist.checks[i] ? 'checked' : ''} onchange="marcarAlterado()"></td>
                <td class="xmark"><input type="checkbox" id="check_xmark_${i}" class="xmark" ${checklist.xmarks[i] ? 'checked' : ''} onchange="marcarAlterado()"></td>
                <td class="na"><input type="checkbox" id="check_na_${i}" class="na" ${checklist.nas[i] ? 'checked' : ''} onchange="marcarAlterado()"></td>
                <td class="revisar"><input type="checkbox" id="check_revisar_${i}" class="revisar" ${checklist.revisoes[i] ? 'checked' : ''} onchange="marcarAlterado()"></td>
            </tr>`;
        }
        html += `</tbody></table>`;
    }
    html += `</div>
        <div class="checklist-footer-fixo">
            <div class="format-toolbar">
                <button class="format-btn" onclick="formatChecklist('bold')"><b>N</b></button>
                <button class="format-btn" onclick="formatChecklist('strikeThrough')"><s>S</s></button>
                <button class="format-btn" onclick="toggleHighlightChecklist()">🖍️</button>
            </div>
            <div id="observacao-checklist" contenteditable="true">${checklist.observacao || ''}</div>
            <div style="margin-top:8px; font-size:10px;">Versão: ${checklist.versao || 1} | ${new Date(checklist.data).toLocaleString()}</div>
        </div>`;
    body.innerHTML = html;

    body.querySelectorAll('input, [contenteditable]').forEach(el => el.addEventListener('input', () => { checklistAlterado = true; }));
    body.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', () => { checklistAlterado = true; }));
    const obs = document.getElementById('observacao-checklist');
    if (obs) {
        obs.addEventListener('input', () => { checklistAlterado = true; });
        obs.addEventListener('paste', function (e) {
            e.preventDefault();
            const texto = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, texto);
            checklistAlterado = true;
        });
    }
}

function marcarAlterado() { checklistAlterado = true; }
function formatChecklist(cmd) { const el = document.getElementById('observacao-checklist'); if (el) { el.focus(); document.execCommand(cmd, false, null); checklistAlterado = true; } }
function toggleHighlightChecklist() { const el = document.getElementById('observacao-checklist'); if (el) { el.focus(); if (isHighlightActive) { document.execCommand('removeFormat', false, null); isHighlightActive = false; } else { document.execCommand('styleWithCSS', false, true); document.execCommand('hiliteColor', false, 'yellow'); isHighlightActive = true; } checklistAlterado = true; } }
function escapeHtml(str) { if (str === null || str === undefined) return ''; return String(str).replace(/[&<>"]/g, function (m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; if (m === '"') return '&quot;'; return m; }); }

/* ========== BUSCAR REGISTRO ANTERIOR ========== */
function buscarRegistroAnteriorPorProcesso(processo) {
    let registrosAnteriores = [];
    var procNorm = normalizarBuscaInteligente(processo);
    for (let data in dados) {
        if (data === diaAtual) continue;
        let registros = dados[data];
        for (let i = 0; i < registros.length; i++) {
            if (normalizarBuscaInteligente(registros[i].processo) === procNorm) {
                registrosAnteriores.push({ data: data, registro: registros[i] });
            }
        }
    }
    if (registrosAnteriores.length === 0) return null;
    registrosAnteriores.sort((a, b) => b.data.localeCompare(a.data));
    return registrosAnteriores[0].registro;
}

/* ---------- PESQUISA ---------- */
function abrirPesquisa() {
    nenhumResultadoPesquisa = false;
    ultimoTermoPesquisa = "";
    document.getElementById('inputBusca').value = '';
    var res = document.getElementById('resultadoBusca');
    res.style.display = 'none';
    res.innerHTML = '';
    abrirOverlay('modalPesquisaOverlay');
    document.getElementById('inputBusca').focus();
}
function fecharPesquisa() {
    if (nenhumResultadoPesquisa && ultimoTermoPesquisa.trim() !== "") {
        document.getElementById('processo').value = ultimoTermoPesquisa;
        document.getElementById('tipo').value = '';
        diaSelecionado = diaAtual;
        renderizar();
        mostrarStatus("Nenhum resultado. Campo preenchido e dia atual selecionado.");
        nenhumResultadoPesquisa = false;
        ultimoTermoPesquisa = "";
    }
    var res = document.getElementById('resultadoBusca');
    res.style.display = 'none';
    res.innerHTML = '';
    document.getElementById('inputBusca').value = '';
    fecharOverlay('modalPesquisaOverlay');
}
function executarPesquisa() {
    const termo = document.getElementById('inputBusca').value.trim();
    const listaResultados = document.getElementById('resultadoBusca');
    listaResultados.innerHTML = '';
    if (!termo) {
        listaResultados.style.display = 'none';
        return;
    }

    let resultados = [];
    for (let data in dados) {
        dados[data].forEach((reg, idx) => {
            if (correspondeBusca(reg.processo, termo))
                resultados.push({ data, idx, processo: reg.processo, tipo: 'processo' });
            if (reg.checklist && reg.checklist.matricula && correspondeBusca(reg.checklist.matricula, termo))
                resultados.push({ data, idx, processo: reg.processo, tipo: 'matrícula', matricula: reg.checklist.matricula });
        });
    }

    if (resultados.length) {
        nenhumResultadoPesquisa = false;
        ultimoTermoPesquisa = "";
        resultados.forEach(res => {
            const item = document.createElement('div');
            item.style.cssText = "padding: 5px; border-bottom: 1px dotted #CCC; cursor: pointer; color: #003399; font-size: 11px;";
            item.innerHTML = `<strong>Data: ${res.data}</strong> - ${res.processo} (${res.tipo === 'matrícula' ? `Matr: ${res.matricula}` : 'Documento'})`;
            item.onclick = () => {
                diaSelecionado = res.data;
                renderizar();
                var resDiv = document.getElementById('resultadoBusca');
                resDiv.style.display = 'none';
                resDiv.innerHTML = '';
                document.getElementById('inputBusca').value = '';
                fecharOverlay('modalPesquisaOverlay');
                setTimeout(() => {
                    const divs = document.querySelectorAll('.registro');
                    for (let i = 0; i < divs.length; i++) {
                        if (parseInt(divs[i].getAttribute('data-indice')) === res.idx) {
                            divs[i].classList.add('destaque-amarelo');
                            divs[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => divs[i].classList.remove('destaque-amarelo'), 3000);
                            break;
                        }
                    }
                }, 100);
            };
            listaResultados.appendChild(item);
        });
        listaResultados.style.display = 'block';
    } else {
        nenhumResultadoPesquisa = true;
        ultimoTermoPesquisa = termo;
        listaResultados.style.display = 'block';
        listaResultados.innerHTML = '<div style="padding:5px; color:red;">Nenhum documento ou matrícula encontrado.</div>';
    }
}

/* ============================================================ */
/* ========== CONFIGURAÇÃO DE TIPOS E ITENS =================== */
/* ============================================================ */

function abrirConfig() {
    if (!Object.keys(tiposConfig).length) {
        tiposPadraoNomes().forEach(function (t) { tiposConfig[t] = { itens: [] }; });
        salvarTiposConfig();
        carregarOrdemTipos();
    }
    tipoConfigSelecionado = ordemTipos[0] || Object.keys(tiposConfig)[0] || null;
    tipoConfigPendenteNome = null;
    renderizarConfig();
    abrirOverlay('modalConfigOverlay');
}

function fecharConfig() {
    if (tipoConfigPendenteNome && tiposConfig[tipoConfigPendenteNome]) {
        var itensPend = tiposConfig[tipoConfigPendenteNome].itens || [];
        if (itensPend.length === 0) {
            delete tiposConfig[tipoConfigPendenteNome];
            ordemTipos = ordemTipos.filter(function (t) { return t !== tipoConfigPendenteNome; });
            salvarTiposConfig();
            salvarOrdemTipos();
            popularSelectTipos();
            mostrarStatus("Tipo '" + tipoConfigPendenteNome + "' descartado (sem itens).");
        }
        tipoConfigPendenteNome = null;
    }
    fecharOverlay('modalConfigOverlay');
}

function renderizarConfig() {
    var listaTipos = document.getElementById('configListaTipos');
    listaTipos.innerHTML = '';
    ordemTipos.forEach(function (t) {
        if (!tiposConfig[t]) return;
        var item = document.createElement('div');
        var pendente = (tipoConfigPendenteNome === t);
        item.className = 'config-tipo-item' + (t === tipoConfigSelecionado ? ' selecionado' : '') + (pendente ? ' pendente' : '');
        item.textContent = t + (pendente ? ' *' : '');
        item.setAttribute('data-tipo', t);
        item.draggable = true;
        item.addEventListener('click', function () { tipoConfigSelecionado = t; renderizarConfig(); });

        item.addEventListener('dragstart', function (e) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', t);
            item.classList.add('arrastando');
        });
        item.addEventListener('dragend', function () { item.classList.remove('arrastando'); });
        item.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            item.classList.add('sobre');
        });
        item.addEventListener('dragleave', function () { item.classList.remove('sobre'); });
        item.addEventListener('drop', function (e) {
            e.preventDefault();
            item.classList.remove('sobre');
            var origem = e.dataTransfer.getData('text/plain');
            var destino = t;
            if (!origem || origem === destino) return;
            var idxOrig = ordemTipos.indexOf(origem);
            var idxDest = ordemTipos.indexOf(destino);
            if (idxOrig === -1 || idxDest === -1) return;
            ordemTipos.splice(idxOrig, 1);
            ordemTipos.splice(idxDest, 0, origem);
            salvarOrdemTipos();
            popularSelectTipos();
            renderizarConfig();
            mostrarStatus("Ordem atualizada.");
        });

        listaTipos.appendChild(item);
    });

    var spanNome = document.getElementById('configTipoNomeAtual');
    if (spanNome) spanNome.textContent = tipoConfigSelecionado || '(nenhum)';

    var listaItens = document.getElementById('configListaItens');
    listaItens.innerHTML = '';

    if (!tipoConfigSelecionado || !tiposConfig[tipoConfigSelecionado]) {
        listaItens.innerHTML = '<div class="config-vazio">Nenhum tipo selecionado.</div>';
    } else {
        var itens = tiposConfig[tipoConfigSelecionado].itens;
        if (!itens.length) {
            listaItens.innerHTML = '<div class="config-vazio">Nenhum item. Clique em "➕ Adicionar Item".</div>';
        } else {
            itens.forEach(function (it, idx) {
                var row = document.createElement('div');
                row.className = 'config-item-row';
                var inp = document.createElement('input');
                inp.type = 'text';
                inp.className = 'config-item-input';
                inp.placeholder = 'Adicione um nome';
                inp.value = it;
                inp.setAttribute('data-idx', idx);
                inp.addEventListener('input', function () {
                    if (!tipoConfigSelecionado || !tiposConfig[tipoConfigSelecionado]) return;
                    tiposConfig[tipoConfigSelecionado].itens[idx] = inp.value;
                    salvarTiposConfig();
                    atualizarBotoesTipo();
                });
                inp.addEventListener('blur', function () {
                    if (!tipoConfigSelecionado || !tiposConfig[tipoConfigSelecionado]) return;
                    tiposConfig[tipoConfigSelecionado].itens[idx] = inp.value;
                    salvarTiposConfig();
                    atualizarBotoesTipo();
                });
                var btnDel = document.createElement('button');
                btnDel.type = 'button';
                btnDel.className = 'config-item-del';
                btnDel.textContent = '🗑️';
                btnDel.title = 'Remover item';
                btnDel.setAttribute('data-idx', idx);
                btnDel.setAttribute('onclick', 'removerItemConfig(' + idx + ')');
                row.appendChild(inp);
                row.appendChild(btnDel);
                listaItens.appendChild(row);
            });
        }
    }
    atualizarBotoesTipo();
}

function atualizarBotoesTipo() {
    var btnSalvar = document.getElementById('configBtnSalvarTipo');
    var btnCancelar = document.getElementById('configBtnCancelarTipo');
    if (btnSalvar) {
        var temItensValidos = false;
        if (tipoConfigSelecionado && tiposConfig[tipoConfigSelecionado]) {
            var itens = tiposConfig[tipoConfigSelecionado].itens || [];
            temItensValidos = itens.length > 0 && itens.every(function (it) { return it && String(it).trim() !== ''; });
        }
        btnSalvar.disabled = !temItensValidos;
    }
    if (btnCancelar) {
        btnCancelar.style.display = (tipoConfigPendenteNome === tipoConfigSelecionado) ? '' : 'none';
    }
}

function abrirModalNovoTipo() {
    var inp = document.getElementById('novoTipoNomeInput');
    if (inp) inp.value = '';
    abrirOverlay('modalNovoTipoOverlay');
    setTimeout(function () { if (inp) inp.focus(); }, 50);
}
function fecharModalNovoTipo() { fecharOverlay('modalNovoTipoOverlay'); }

function confirmarNovoTipo() {
    var input = document.getElementById('novoTipoNomeInput');
    if (!input) return;
    var nome = (input.value || '').trim().toLowerCase();
    if (!nome) {
        mostrarErroModal("Digite um nome para o novo tipo.");
        input.focus();
        return;
    }
    if (tiposConfig[nome]) {
        mostrarErroModal("Já existe um tipo com esse nome.");
        input.focus();
        input.select();
        return;
    }
    tiposConfig[nome] = { itens: [] };
    ordemTipos.push(nome);
    tipoConfigSelecionado = nome;
    tipoConfigPendenteNome = nome;
    salvarTiposConfig();
    salvarOrdemTipos();
    popularSelectTipos();
    renderizarConfig();
    fecharModalNovoTipo();
    mostrarStatus("Tipo '" + nome + "' criado. Adicione ao menos um item e clique em Salvar.");
}

function removerTipoConfig() {
    if (!tipoConfigSelecionado) return;
    if (Object.keys(tiposConfig).length <= 1) {
        mostrarErroModal("Não é possível remover o último tipo.");
        return;
    }
    var alvo = tipoConfigSelecionado;
    abrirConfirma("Remover Tipo", "Remover o tipo '" + alvo + "' e todos os seus itens?", function () {
        delete tiposConfig[alvo];
        ordemTipos = ordemTipos.filter(function (t) { return t !== alvo; });
        if (tipoConfigPendenteNome === alvo) tipoConfigPendenteNome = null;
        tipoConfigSelecionado = ordemTipos[0] || Object.keys(tiposConfig)[0] || null;
        salvarTiposConfig();
        salvarOrdemTipos();
        popularSelectTipos();
        renderizarConfig();
        mostrarStatus("Tipo removido.");
    });
}

function adicionarItemConfig() {
    if (!tipoConfigSelecionado) {
        mostrarErroModal("Selecione ou crie um tipo primeiro.");
        return;
    }
    tiposConfig[tipoConfigSelecionado].itens.push("");
    salvarTiposConfig();
    renderizarConfig();
    setTimeout(function () {
        var inputs = document.querySelectorAll('#configListaItens .config-item-input');
        var last = inputs[inputs.length - 1];
        if (last) last.focus();
    }, 30);
    mostrarStatus("Item adicionado. Digite o nome diretamente.");
}

function removerItemConfig(idx) {
    if (!tipoConfigSelecionado) return;
    if (!tiposConfig[tipoConfigSelecionado]) return;
    var itens = tiposConfig[tipoConfigSelecionado].itens;
    idx = parseInt(idx);
    if (isNaN(idx) || idx < 0 || idx >= itens.length) return;
    itens.splice(idx, 1);
    salvarTiposConfig();
    renderizarConfig();
    mostrarStatus("Item removido.");
}

function salvarTipoConfigAtual() {
    if (!tipoConfigSelecionado || !tiposConfig[tipoConfigSelecionado]) return;
    var itens = tiposConfig[tipoConfigSelecionado].itens || [];
    if (itens.length === 0) {
        mostrarErroModal("Adicione ao menos um item antes de salvar.");
        return;
    }
    var vazios = itens.filter(function (it) { return !it || String(it).trim() === ''; }).length;
    if (vazios > 0) {
        mostrarErroModal("Todos os itens precisam ter um nome antes de salvar.");
        return;
    }
    if (tipoConfigPendenteNome === tipoConfigSelecionado) {
        tipoConfigPendenteNome = null;
    }
    salvarTiposConfig();
    renderizarConfig();
    popularSelectTipos();
    mostrarStatus("Tipo '" + tipoConfigSelecionado + "' salvo.");
}

function cancelarTipoConfigAtual() {
    if (!tipoConfigSelecionado) return;
    if (tipoConfigPendenteNome === tipoConfigSelecionado) {
        delete tiposConfig[tipoConfigSelecionado];
        ordemTipos = ordemTipos.filter(function (t) { return t !== tipoConfigSelecionado; });
        tipoConfigPendenteNome = null;
        salvarTiposConfig();
        salvarOrdemTipos();
        popularSelectTipos();
        tipoConfigSelecionado = ordemTipos[0] || null;
        renderizarConfig();
        mostrarStatus("Criação cancelada. Tipo descartado.");
    }
}

/* ---------- INICIALIZAÇÃO ---------- */
var salvo = localStorage.getItem('registros_processos');
if (salvo) { try { dados = JSON.parse(salvo); } catch (e) { dados = {}; } }
inicializarTiposConfig();
popularSelectTipos();
renderizar();
document.getElementById('ano-atual').textContent = new Date().getFullYear();
inicializarModais();

(function () {
    var inp = document.getElementById('novoTipoNomeInput');
    if (inp && !inp.__bound) {
        inp.__bound = true;
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); confirmarNovoTipo(); }
        });
    }
})();

(function () {
    var sel = document.getElementById('tipo');
    if (sel && !sel.__bound) {
        sel.__bound = true;
        sel.addEventListener('change', atualizarBotaoAdicionar);
    }
})();

(function () {
    document.querySelectorAll('input[name=fluxo]').forEach(function (r) {
        if (r.__bound) return;
        r.__bound = true;
        r.addEventListener('change', atualizarBotaoAdicionar);
    });
})();

async function carregarFraseClippy() {
    const fraseSpan = document.getElementById('frase-clippy');
    fraseSpan.innerText = "Clippy diz: Pensando...";
    try {
        const res = await fetch('https://api.adviceslip.com/advice');
        const data = await res.json();
        const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(data.slip.advice)}&langpair=en|pt-BR`);
        const transData = await transRes.json();
        fraseSpan.innerText = "Clippy diz: " + transData.responseData.translatedText;
    } catch (e) {
        fraseSpan.innerText = "Clippy diz: Parece que você está trabalhando duro hoje!";
    }
}
carregarFraseClippy();

/* ========== ADICIONAR REGISTRO ========== */
function adicionarRegistro() {
    if (diaSelecionado !== diaAtual) return;
    var proc = document.getElementById('processo').value.trim();
    var tipoSel = document.getElementById('tipo').value;
    if (!tipoSel || !tiposConfig[tipoSel]) {
        atualizarBotaoAdicionar();
        return;
    }
    var fluxoInput = document.querySelector('input[name=fluxo]:checked');
    if (!fluxoInput) {
        atualizarBotaoAdicionar();
        return;
    }
    if (!proc) {
        mostrarStatus("Informe o número do documento.");
        return;
    }
    if (!dados[diaSelecionado]) dados[diaSelecionado] = [];
    var fluxo = fluxoInput.value;

    var registroAnterior = buscarRegistroAnteriorPorProcesso(proc);
    var checklistCopiado = null;
    var notaReferencia = "";
    if (registroAnterior) {
        if (registroAnterior.checklist) {
            checklistCopiado = JSON.parse(JSON.stringify(registroAnterior.checklist));
            if (checklistCopiado) checklistCopiado.data = new Date().toISOString();
        }
        var dataAnterior = null;
        for (let d in dados) {
            if (dados[d].indexOf(registroAnterior) !== -1) { dataAnterior = d; break; }
        }
        if (dataAnterior) {
            var partes = dataAnterior.split('-');
            var dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
            notaReferencia = `<br><br>>> incluído anteriormente em ${dataFormatada}`;
        } else {
            notaReferencia = `<br><br>>> incluído anteriormente`;
        }
    }

    var novoRegistro = {
        processo: proc,
        tipo: tipoSel,
        fluxo: fluxo,
        concluido: false,
        nota: "",
        aviso: false,
        atualizacao: false,
        tempo: false,
        obras: false,
        checklist: checklistCopiado
    };
    if (notaReferencia) novoRegistro.nota = notaReferencia;

    dados[diaSelecionado].push(novoRegistro);
    document.getElementById('processo').value = '';
    document.getElementById('tipo').value = '';
    document.querySelectorAll('input[name=fluxo]').forEach(function (r) { r.checked = false; });
    salvarNavegador();
    renderizar();
    mostrarStatus(registroAnterior ? "Registro adicionado com checklist copiado." : "Registro adicionado.");
}