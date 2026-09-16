
        /* ---------- DADOS GLOBAIS ---------- */
        var dados = {};
        var hoje = new Date();
        var diaAtual = hoje.toISOString().slice(0, 10);
        var diaSelecionado = diaAtual;
        var timerStatus;
        const TOTAL_CHECKLIST_ITENS = 39; // número real de linhas do checklist
        var indiceNotaAtual = null;
        var conteudoOriginal = "";
        var dataChecklistAtual = null;
        var indiceChecklistAtual = null;
        var checklistAlterado = false;
        var isHighlightActive = false;

        /* NOVAS VARIÁVEIS PARA PESQUISA SEM RESULTADO */
        var ultimoTermoPesquisa = "";
        var nenhumResultadoPesquisa = false;

        /* ---------- CLIPPY ---------- */
        const imagensClippy = [
            'imagens/clippy-01.gif', 'imagens/clippy-03.gif', 'imagens/clippy-04.gif', 'imagens/clippy-06.gif',
            'imagens/clippy-07.gif', 'imagens/clippy-08.gif', 'imagens/clippy-09.gif', 'imagens/clippy-10.gif',
            'imagens/clippy-11.gif', 'imagens/clippy-12.gif', 'imagens/clippy-13.gif', 'imagens/clippy-14.gif',
            'imagens/clippy-16.gif', 'imagens/clippy-17.gif'
        ];
        function trocarClippy() { const img = document.getElementById('clippy-img'); img.src = imagensClippy[Math.floor(Math.random() * imagensClippy.length)]; }
        setInterval(trocarClippy, 10000);
        function mostrarStatus(texto) { var pop = document.getElementById('statusPopup'); pop.innerHTML = "💾 <b>Status:</b><br>" + texto; pop.style.display = 'block'; if (timerStatus) clearTimeout(timerStatus); timerStatus = setTimeout(() => { pop.style.display = 'none'; }, 5000); }
        function mostrarErroModal(texto) { document.getElementById('modalErroTexto').innerText = texto; document.getElementById('modalErroOverlay').style.display = 'flex'; }
        function fecharModalErro() { document.getElementById('modalErroOverlay').style.display = 'none'; }

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
            document.getElementById('modalConfirmaOverlay').style.display = 'flex';
        }
        function fecharConfirma() { document.getElementById('modalConfirmaOverlay').style.display = 'none'; confirmaCallbackSim = null; confirmaCallbackNao = null; confirmaCallbackCancelar = null; }

        function salvarNavegador() { localStorage.setItem('registros_processos', JSON.stringify(dados)); }
        function forcarSalvar() { salvarNavegador(); mostrarStatus("Dados salvos manualmente!"); }
        function gerarBackup() { var dataStr = new Date(); var dia = String(dataStr.getDate()).padStart(2, '0'); var mes = String(dataStr.getMonth() + 1).padStart(2, '0'); var ano = dataStr.getFullYear(); var dataFormatada = dia + mes + ano; var blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'text/plain' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup-rdp-' + dataFormatada + '.txt'; a.click(); mostrarStatus("Backup exportado com sucesso."); }
        function carregarBackup(input) { if (!input.files[0]) return; var reader = new FileReader(); reader.onload = function (e) { try { var novosDados = JSON.parse(e.target.result); dados = novosDados; localStorage.setItem('registros_processos', JSON.stringify(dados)); diaSelecionado = diaAtual; renderizar(); mostrarStatus("Backup carregado e sincronizado!"); input.value = ""; } catch (err) { mostrarErroModal("Arquivo JSON inválido ou corrompido."); } }; reader.readAsText(input.files[0]); }

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

        /* ---------- COR DO ÍCONE - REGRAS CORRIGIDAS COM OR (✔️ OU ⛔) PRIORIDADE SOBRE ❌ ---------- */
        function getChecklistIconColor(checklist) {
            if (!checklist) return "black";
            const checks = checklist.checks || [];
            const xmarks = checklist.xmarks || [];
            const nas = checklist.nas || [];

            let hasFalse = false;
            let allLinesHaveResult = true;
            let hasAtLeastOneTrue = false;

            for (let i = 0; i < TOTAL_CHECKLIST_ITENS; i++) {
                const hasCheckOrNa = checks[i] || nas[i];
                const hasXmark = xmarks[i];

                if (hasCheckOrNa) {
                    hasAtLeastOneTrue = true;
                } else if (hasXmark) {
                    hasFalse = true;
                } else {
                    allLinesHaveResult = false;
                }
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
            document.getElementById('btnAdicionar').disabled = (diaSelecionado !== diaAtual);
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

        function abrirModalNota(index) { indiceNotaAtual = index; var reg = dados[diaSelecionado][index]; conteudoOriginal = reg.nota || ""; document.getElementById('notaTitulo').innerText = "Bloco de Notas - " + reg.processo; document.getElementById('notaEditable').innerHTML = conteudoOriginal; document.getElementById('modalNotaOverlay').style.display = 'flex'; }
        function tentarSalvarNota() { abrirConfirma("Salvar", "Deseja sobrescrever a nota?", () => { dados[diaSelecionado][indiceNotaAtual].nota = document.getElementById('notaEditable').innerHTML; salvarNavegador(); renderizar(); document.getElementById('modalNotaOverlay').style.display = 'none'; mostrarStatus("Nota salva."); }); }
        function tentarFecharNota() { let atual = document.getElementById('notaEditable').innerHTML; if (atual !== conteudoOriginal) abrirConfirma("Aviso", "Sair sem salvar?", () => { document.getElementById('modalNotaOverlay').style.display = 'none'; mostrarStatus("Edição cancelada."); }); else document.getElementById('modalNotaOverlay').style.display = 'none'; }
        function limparConteudo() { abrirConfirma("Limpar", "Apagar tudo?", () => { document.getElementById('notaEditable').innerHTML = ""; mostrarStatus("Conteúdo limpo."); }); }

        /* ---------- MODAL CHECKLIST ---------- */
        function abrirModalChecklist(data, indice) {
            const container = document.querySelector('#modalChecklistOverlay .modal-checklist-container');
            if (container) { container.style.position = ''; container.style.left = ''; container.style.top = ''; container.style.margin = ''; }
            dataChecklistAtual = data;
            indiceChecklistAtual = indice;
            const registro = dados[data][indice];
            if (!registro.checklist) {
                registro.checklist = {
                    nome: "", matricula: "", carreira: "", processo: registro.processo,
                    checks: new Array(TOTAL_CHECKLIST_ITENS).fill(false),
                    xmarks: new Array(TOTAL_CHECKLIST_ITENS).fill(false),
                    nas: new Array(TOTAL_CHECKLIST_ITENS).fill(false),
                    revisoes: new Array(TOTAL_CHECKLIST_ITENS).fill(false),
                    observacao: "",
                    versao: 1,
                    data: new Date().toISOString()
                };
            }
            carregarChecklistNoModal(registro.checklist);
            document.getElementById('modalChecklistOverlay').style.display = 'flex';
            document.getElementById('checklistTitulo').innerHTML = `Checklist - ${registro.processo}`;
            checklistAlterado = false;
        }

        function limparChecklistAtual() {
            abrirConfirma("Limpar Checklist", "Deseja limpar todos os campos (nome, matrícula, carreira, observação e todos os checkboxes)?", () => {
                const registro = dados[dataChecklistAtual][indiceChecklistAtual];
                if (registro) {
                    registro.checklist = {
                        nome: "", matricula: "", carreira: "", processo: registro.processo,
                        checks: new Array(TOTAL_CHECKLIST_ITENS).fill(false),
                        xmarks: new Array(TOTAL_CHECKLIST_ITENS).fill(false),
                        nas: new Array(TOTAL_CHECKLIST_ITENS).fill(false),
                        revisoes: new Array(TOTAL_CHECKLIST_ITENS).fill(false),
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
                    () => { // Sim
                        const salvou = salvarChecklistAtual();
                        if (salvou) {
                            document.getElementById('modalChecklistOverlay').style.display = 'none';
                            mostrarStatus("Checklist salvo.");
                        }
                    },
                    () => { // Não
                        document.getElementById('modalChecklistOverlay').style.display = 'none';
                    },
                    () => { // Cancelar
                        // nada
                    }
                );
            } else {
                document.getElementById('modalChecklistOverlay').style.display = 'none';
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
            const checks = [], xmarks = [], nas = [], revisoes = [];
            for (let i = 0; i < TOTAL_CHECKLIST_ITENS; i++) {
                checks.push(!!document.getElementById(`check_chk_${i}`)?.checked);
                xmarks.push(!!document.getElementById(`check_xmark_${i}`)?.checked);
                nas.push(!!document.getElementById(`check_na_${i}`)?.checked);
                revisoes.push(!!document.getElementById(`check_revisar_${i}`)?.checked);
            }
            if (nome === "" || matriculaRaw === "" || carreira === "") {
                mostrarStatus("Nome, Matrícula e Carreira são obrigatórios para salvar.");
                mostrarErroModal("Não foi possível salvar: Nome, Matrícula e Carreira são obrigatórios.");
                return false;
            }
            const matricula = normalizarMatricula(matriculaRaw);
            registro.checklist = {
                nome, matricula, carreira, processo: registro.processo,
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
            const descricoes = [
                "SIGRH - Nome Servidor",
                "Quitação Eleitoral",
                "Dados Eleitorais",
                "Endereço",
                "Telefone",
                "E-mail",
                "Filiação - Mãe",
                "Filiação - Pai",
                "Estado Civil",
                "Nome Cônjuge",
                "Nº Doc. Identidade",
                "Data de Emissão Identidade",
                "Órgão de Emissão Identidade",
                "Identidade Modelo Novo",
                "Identidade Modelo Outros",
                "Carteira Motorista",
                "Naturalidade",
                "UF de Nascimento",
                "Nacionalidade",
                "Readaptado?",
                "Último Requerimento",
                "Cabeçalho Completo?",
                "Nome é o Mesmo do Nome Assinado?",
                "Na Assinatura é Carreira Concurso?",
                "SIGRH Verde",
                "Reestruturação",
                "Reestrutura Carreira Certa?",
                "Tabela de Cargos",
                "Matrícula Tab. Carg. Certo é do Servidor?",
                "Concurso Bate?",
                "Estágio Probatório Tem?",
                "Despacho Setor Certo?",
                "Despacho Servidor Certo? (Mat. e Nome)",
                "Termo sem Efeito",
                "Ficha Concurso",
                "Ficha Concurso Assinado?",
                "Cara Crachá Ficha Concurso",
                "Cara Crachá Ficha Cadastro",
                "Cara Crachá Ficha Despacho"
            ];

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
        <div class="checklist-tabela-rolagem">
            <table>
                <thead>
                    <tr><th class="descricao">Descrição</th><th class="check">✔️</th><th class="xmark">❌</th><th class="na">⛔</th><th class="revisar">↩</th></tr>
                </thead>
                <tbody>`;

            for (let i = 0; i < descricoes.length; i++) {
                html += `<tr>
            <td>${descricoes[i]}</td>
            <td class="check"><input type="checkbox" id="check_chk_${i}" class="check" ${checklist.checks[i] ? 'checked' : ''} onchange="marcarAlterado()"></td>
            <td class="xmark"><input type="checkbox" id="check_xmark_${i}" class="xmark" ${checklist.xmarks[i] ? 'checked' : ''} onchange="marcarAlterado()"></td>
            <td class="na"><input type="checkbox" id="check_na_${i}" class="na" ${checklist.nas[i] ? 'checked' : ''} onchange="marcarAlterado()"></td>
            <td class="revisar"><input type="checkbox" id="check_revisar_${i}" class="revisar" ${checklist.revisoes[i] ? 'checked' : ''} onchange="marcarAlterado()"></td>
        </tr>`;
            }

            html += `
                </tbody>
            </table>
        </div>
        <div class="checklist-footer-fixo">
            <div class="format-toolbar">
                <button class="format-btn" onclick="formatChecklist('bold')"><b>N</b></button>
                <button class="format-btn" onclick="formatChecklist('strikeThrough')"><s>S</s></button>
                <button class="format-btn" onclick="toggleHighlightChecklist()">🖍️</button>
                <button class="format-btn" onclick="formatChecklist('insertUnorderedList')">•</button>
            </div>
            <div id="observacao-checklist" contenteditable="true">${checklist.observacao || ''}</div>
            <div style="margin-top:8px; font-size:10px;">Versão: ${checklist.versao || 1} | ${new Date(checklist.data).toLocaleString()}</div>
        </div>`;

            body.innerHTML = html;

            // Adicionar eventos para detectar alterações
            const inputs = body.querySelectorAll('input, [contenteditable]');
            inputs.forEach(el => el.addEventListener('input', () => { checklistAlterado = true; }));
            const chks = body.querySelectorAll('input[type="checkbox"]');
            chks.forEach(cb => cb.addEventListener('change', () => { checklistAlterado = true; }));
            const obs = document.getElementById('observacao-checklist');
            if (obs) obs.addEventListener('input', () => { checklistAlterado = true; });
        }

        function marcarAlterado() { checklistAlterado = true; }
        function formatChecklist(cmd) { const el = document.getElementById('observacao-checklist'); if (el) { el.focus(); document.execCommand(cmd, false, null); checklistAlterado = true; } }
        function toggleHighlightChecklist() { const el = document.getElementById('observacao-checklist'); if (el) { el.focus(); if (isHighlightActive) { document.execCommand('removeFormat', false, null); isHighlightActive = false; } else { document.execCommand('styleWithCSS', false, true); document.execCommand('hiliteColor', false, 'yellow'); isHighlightActive = true; } checklistAlterado = true; } }
        function escapeHtml(str) { return str.replace(/[&<>]/g, function (m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }

        /* ========== FUNÇÃO AUXILIAR PARA ENCONTRAR REGISTRO ANTERIOR COM MESMO PROCESSO ========== */
        function buscarRegistroAnteriorPorProcesso(processo) {
            let registrosAnteriores = [];
            for (let data in dados) {
                if (data === diaAtual) continue; // ignora o dia atual
                let registros = dados[data];
                for (let i = 0; i < registros.length; i++) {
                    if (registros[i].processo === processo) {
                        registrosAnteriores.push({ data: data, registro: registros[i] });
                    }
                }
            }
            if (registrosAnteriores.length === 0) return null;
            // ordena pela data mais recente (maior string yyyy-mm-dd)
            registrosAnteriores.sort((a, b) => b.data.localeCompare(a.data));
            return registrosAnteriores[0].registro;
        }

        /* ---------- PESQUISA (modificada) ---------- */
        function abrirPesquisa() {
            nenhumResultadoPesquisa = false;
            ultimoTermoPesquisa = "";
            document.getElementById('modalPesquisaOverlay').style.display = 'flex';
            document.getElementById('inputBusca').value = '';
            document.getElementById('resultadoBusca').style.display = 'none';
            document.getElementById('inputBusca').focus();
        }

        function fecharPesquisa() {
            if (nenhumResultadoPesquisa && ultimoTermoPesquisa.trim() !== "") {
                document.getElementById('processo').value = ultimoTermoPesquisa;
                diaSelecionado = diaAtual;
                renderizar();
                mostrarStatus("Nenhum resultado encontrado. Campo processo preenchido com o termo da pesquisa e dia atual selecionado.");
                nenhumResultadoPesquisa = false;
                ultimoTermoPesquisa = "";
            }
            document.getElementById('modalPesquisaOverlay').style.display = 'none';
        }

        function executarPesquisa() {
            const termo = document.getElementById('inputBusca').value.trim();
            const listaResultados = document.getElementById('resultadoBusca');
            listaResultados.innerHTML = '';
            if (!termo) return;

            let resultados = [];
            for (let data in dados) {
                dados[data].forEach((reg, idx) => {
                    if (reg.processo.includes(termo)) resultados.push({ data, idx, processo: reg.processo, tipo: 'processo' });
                    if (reg.checklist && reg.checklist.matricula) {
                        const matNorm = normalizarMatricula(reg.checklist.matricula);
                        const termoNorm = normalizarMatricula(termo);
                        if (matNorm === termoNorm || reg.checklist.matricula.includes(termo)) resultados.push({ data, idx, processo: reg.processo, tipo: 'matrícula', matricula: reg.checklist.matricula });
                    }
                });
            }

            if (resultados.length) {
                nenhumResultadoPesquisa = false;
                ultimoTermoPesquisa = "";
                resultados.forEach(res => {
                    const item = document.createElement('div');
                    item.style.cssText = "padding: 5px; border-bottom: 1px dotted #CCC; cursor: pointer; color: #003399; font-size: 11px;";
                    item.innerHTML = `<strong>Data: ${res.data}</strong> - ${res.processo} (${res.tipo === 'matrícula' ? `Matr: ${res.matricula}` : 'Processo'})`;
                    item.onclick = () => {
                        diaSelecionado = res.data;
                        renderizar();
                        fecharPesquisa();
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
                listaResultados.innerHTML = '<div style="padding:5px; color:red;">Nenhum processo ou matrícula encontrado.</div>';
            }
        }

        /* ---------- INICIALIZAÇÃO ---------- */
        var salvo = localStorage.getItem('registros_processos');
        if (salvo) dados = JSON.parse(salvo);
        renderizar();
        document.getElementById('ano-atual').textContent = new Date().getFullYear();
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

        /* ========== FUNÇÃO ADICIONAR REGISTRO MODIFICADA ========== */
        function adicionarRegistro() {
            if (diaSelecionado !== diaAtual) return;
            var proc = document.getElementById('processo').value.trim();
            if (!proc) return;
            if (!dados[diaSelecionado]) dados[diaSelecionado] = [];
            var fluxo = document.querySelector('input[name=fluxo]:checked').value;

            // --- VERIFICAR SE O PROCESSO JÁ EXISTE EM DATA ANTERIOR ---
            var registroAnterior = buscarRegistroAnteriorPorProcesso(proc);
            var checklistCopiado = null;
            var notaReferencia = "";
            if (registroAnterior) {
                // Espelhar o checklist (cópia profunda)
                if (registroAnterior.checklist) {
                    checklistCopiado = JSON.parse(JSON.stringify(registroAnterior.checklist));
                    // Incrementar versão para indicar cópia? Não solicitado, mas manter a versão original
                    // Ajustar a data da cópia para o momento atual
                    if (checklistCopiado) {
                        checklistCopiado.data = new Date().toISOString();
                        // versão permanece a mesma do original, pois é um espelho
                    }
                }
                // Formatar data anterior no formato dd/mm/aaaa
                var dataAnterior = null;
                for (let d in dados) {
                    if (dados[d].indexOf(registroAnterior) !== -1) {
                        dataAnterior = d;
                        break;
                    }
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
                tipo: document.getElementById('tipo').value,
                fluxo: fluxo,
                concluido: false,
                nota: "",
                aviso: false,
                atualizacao: false,
                tempo: false,
                obras: false,
                checklist: checklistCopiado  // se encontrou anterior, copia; senão, null
            };

            // Adicionar referência na nota (não substitui nada, pois nota está vazia. Se houvesse conteúdo, colocaria abaixo, mas não há)
            if (notaReferencia) {
                novoRegistro.nota = notaReferencia;
            }

            dados[diaSelecionado].push(novoRegistro);
            document.getElementById('processo').value = '';
            salvarNavegador();
            renderizar();
            if (registroAnterior) {
                mostrarStatus("Processo registrado com checklist e referência copiados.");
            } else {
                mostrarStatus("Processo registrado.");
            }
        }

        // Arrastável
        (function () {
            const modal = document.getElementById('modalChecklistOverlay');
            const container = modal.querySelector('.modal-checklist-container');
            const titleBar = container.querySelector('.title-bar');
            let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
            let dragging = false;
            titleBar.style.cursor = 'move';
            titleBar.style.userSelect = 'none';
            titleBar.addEventListener('mousedown', (e) => {
                let target = e.target;
                while (target && target !== titleBar) {
                    if (target.tagName === 'BUTTON') return;
                    target = target.parentElement;
                }
                dragging = true;
                mouseX = e.clientX;
                mouseY = e.clientY;
                const rect = container.getBoundingClientRect();
                posX = rect.left;
                posY = rect.top;
                container.style.position = 'absolute';
                container.style.margin = '0';
                e.preventDefault();
            });
            window.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                const dx = e.clientX - mouseX;
                const dy = e.clientY - mouseY;
                container.style.left = (posX + dx) + 'px';
                container.style.top = (posY + dy) + 'px';
            });
            window.addEventListener('mouseup', () => { dragging = false; });
        })();
    