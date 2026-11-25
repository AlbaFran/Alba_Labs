/**
 * VIEW: ReservaView
 * Responsável por renderizar a tabela detalhada de reservas e gerenciar os filtros por professor,
 * período, escopo e ações de Aprovação/Recusa (para Coordenador e Técnico).
 */
function escaparHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function formatarDataHoraCancelamento(valor) {
    if (!valor) return "";
    const data = new Date(`${String(valor).replace(" ", "T")}Z`);
    return Number.isNaN(data.getTime())
        ? String(valor)
        : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

export class ReservaView {
    constructor() {
        this.tituloElement = document.getElementById("tituloReservas");
        this.resumoFiltroElement = document.getElementById("resumoFiltro");
        this.listaElement = document.getElementById("listaReservas");
        this.btnEscopoMes = document.getElementById("btnEscopoMes");
        this.btnEscopoDia = document.getElementById("btnEscopoDia");
        this.filtroProfessorInput = document.getElementById("filtroProfessor");
        this.botoesPeriodoTabela = document.querySelectorAll("[data-periodo-tabela]");
    }

    renderizar({ escopo, dataSelecionada, mesAnoTexto, periodo, professorBusca, reservas, podeAprovar, usuarioLogado: usuarioLogadoParam, onAlterarStatus }) {
        if (!this.listaElement) {
            return;
        }
        const usuarioLogado = usuarioLogadoParam || (() => {
            try {
                const s = sessionStorage.getItem("albalabs_usuario_logado");
                return s ? JSON.parse(s) : null;
            } catch { return null; }
        })();
        // 1. Atualiza Título
        if (escopo === "dia") {
            const partes = dataSelecionada.split("-");
            const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
            this.tituloElement.textContent = `Reservas do dia ${dataFormatada}`;
        } else {
            this.tituloElement.textContent = `Todas as reservas de ${mesAnoTexto}`;
        }

        // 2. Atualiza resumo do filtro
        let textoResumo = `Total: ${reservas.length} reserva(s) encontrada(s)`;
        if (professorBusca) {
            textoResumo += ` para o(a) professor(a) "${professorBusca}"`;
        }
        if (periodo !== "todos") {
            textoResumo += ` no período da ${periodo === "manha" ? "Manhã" : "Noite"}`;
        }
        if (podeAprovar) {
            textoResumo += ` • 👑 Modo de Gerenciamento Ativo (Você pode Aprovar/Recusar)`;
        }
        if (this.resumoFiltroElement) {
            this.resumoFiltroElement.textContent = textoResumo;
        }

        // 3. Atualiza estado ativo dos botões de escopo e período
        if (this.btnEscopoMes && this.btnEscopoDia) {
            this.btnEscopoMes.classList.toggle("ativo", escopo === "mes");
            this.btnEscopoDia.classList.toggle("ativo", escopo === "dia");
        }

        this.botoesPeriodoTabela.forEach(btn => {
            btn.classList.toggle("ativo", btn.dataset.periodoTabela === periodo);
        });

        // 4. Renderiza tabela ou mensagem de vazio
        this.listaElement.innerHTML = "";

        if (reservas.length === 0) {
            this.listaElement.innerHTML = '<p class="livre" style="padding: 16px 0;">Nenhuma reserva encontrada para os filtros selecionados.</p>';
            return;
        }

        const container = document.createElement("div");
        container.className = "tabela-reservas-container";

        const tabela = document.createElement("table");
        tabela.className = "tabela-reservas";

        const ehProf = Boolean(usuarioLogado && usuarioLogado.tipo === "professor");
        const thAcoes = (podeAprovar || ehProf) ? '<th>Ações</th>' : '';

        tabela.innerHTML = `
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Período</th>
                    <th>Laboratório</th>
                    <th>Professor Responsável</th>
                    <th>Matéria / Turma</th>
                    <th>Curso</th>
                    <th>Anexo</th>
                    <th>Status</th>
                    ${thAcoes}
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = tabela.querySelector("tbody");

        reservas.forEach(reserva => {
            const tr = document.createElement("tr");

            const partes = (reserva.data || "").split("-");
            const dataFmt = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : reserva.data;

            const badgePeriodo = reserva.periodo === "manha" 
                ? '<span class="badge-periodo badge-manha">Manhã</span>'
                : '<span class="badge-periodo badge-noite">Noite</span>';

            let statusTexto = '<span style="color:#805b00; font-weight:600;">🟡 Pendente</span>';
            if (reserva.status === "confirmada") {
                statusTexto = '<span style="color:#166534; font-weight:600;">🟢 Confirmada</span>';
            } else if (reserva.status === "cancelada") {
                const auditoria = reserva.motivoCancelamento
                    ? `<small class="detalhes-cancelamento">Motivo: ${escaparHtml(reserva.motivoCancelamento)}<br>Por: ${escaparHtml(reserva.canceladoPor || "Usuário registrado")}<br>Em: ${escaparHtml(formatarDataHoraCancelamento(reserva.canceladoEm))}</small>`
                    : '<small class="detalhes-cancelamento">Dados de auditoria indisponíveis para este cancelamento antigo.</small>';
                statusTexto = `<span style="color:#991b1b; font-weight:600;">🔴 Cancelada/recusada</span><br>${auditoria}`;
            }

            const infoMateria = reserva.materia 
                ? `<strong>${reserva.materia}</strong>${reserva.turma ? ` (${reserva.turma})` : ''}`
                : "—";

            let tdAcoes = '';
            if (podeAprovar) {
                if (reserva.status === "pendente") {
                    tdAcoes = `
                        <td data-label="Ações">
                            <button type="button" class="btn-acao btn-aprovar" data-id="${reserva.idReserva}">✔ Aprovar</button>
                            <button type="button" class="btn-acao btn-recusar" data-id="${reserva.idReserva}">✖ Recusar</button>
                        </td>
                    `;
                } else if (reserva.status === "confirmada") {
                    tdAcoes = `
                        <td data-label="Ações">
                            <button type="button" class="btn-acao btn-recusar" data-id="${reserva.idReserva}">Cancelar</button>
                        </td>
                    `;
                } else {
                    tdAcoes = `
                        <td data-label="Ações">
                            <button type="button" class="btn-acao btn-aprovar" data-id="${reserva.idReserva}">Reaprovar</button>
                        </td>
                    `;
                }
            } else if (ehProf && usuarioLogado) {
                // Professor pode cancelar se for o dono da solicitação e ela não estiver cancelada
                const nomeLogado = (usuarioLogado.nome || "").toLowerCase();
                const ehDono = (reserva.solicitante && reserva.solicitante.toLowerCase() === nomeLogado) ||
                               (reserva.professor && reserva.professor.toLowerCase() === nomeLogado);

                if (ehDono && reserva.status !== "cancelada") {
                    tdAcoes = `
                        <td data-label="Ações">
                            <button type="button" class="btn-acao btn-recusar" data-id="${reserva.idReserva}" title="Cancelar minha solicitação">
                                🗑 Cancelar Solicitação
                            </button>
                        </td>
                    `;
                } else {
                    tdAcoes = '<td data-label="Ações">—</td>';
                }
            }

            const qtdLabs = Number(reserva.quantidadeLabs || 1);
            const infoLab = `<strong>${qtdLabs} Lab${qtdLabs === 1 ? "" : "s"}</strong>`;

            let infoProf = `<strong>${reserva.professor}</strong>`;
            if (qtdLabs > 1) {
                infoProf += '<br><small style="color:#64748b;">Professor responsável</small>';
            }

            const linksAnexos = [
                ["Materiais e reagentes", reserva.requisicao_materiais_path],
                ["POP da aula", reserva.pop_aula_path],
                ["Anexo", reserva.anexo_path]
            ].filter(([, caminho]) => caminho).map(([rotulo, caminho]) => {
                const link = caminho.startsWith('uploads/') || caminho.startsWith('http') ? caminho : null;
                return link
                    ? `<a href="${link}" target="_blank" rel="noopener" style="display:block;color:#2563eb;font-weight:600;text-decoration:none;">📎 ${rotulo}</a>`
                    : `<span style="display:block;color:#2563eb;font-weight:600;">📎 ${rotulo}: ${caminho}</span>`;
            });
            const anexoHtml = linksAnexos.length ? linksAnexos.join("") : '<span style="color:#94a3b8;">—</span>';

            tr.innerHTML = `
                <td data-label="Data"><strong>${dataFmt}</strong></td>
                <td data-label="Período">${badgePeriodo}</td>
                <td data-label="Laboratório">${infoLab}</td>
                <td data-label="Professor Responsável">${infoProf}</td>
                <td data-label="Matéria / Turma">${infoMateria}</td>
                <td data-label="Curso">${reserva.curso || '—'}</td>
                <td data-label="Anexo">${anexoHtml}</td>
                <td data-label="Status">${statusTexto}</td>
                ${tdAcoes}
            `;

            tbody.appendChild(tr);
        });

        // Eventos dos botões de ação (Aprovar / Recusar / Cancelar pelo Professor)
        if (onAlterarStatus) {
            tbody.querySelectorAll(".btn-aprovar").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.id;
                    onAlterarStatus(id, "confirmada");
                });
            });

            tbody.querySelectorAll(".btn-recusar").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.id;
                    onAlterarStatus(id, "cancelada");
                });
            });
        }

        container.appendChild(tabela);
        this.listaElement.appendChild(container);
    }

    bindFiltros({ onMudarEscopo, onMudarPeriodo, onBuscarProfessor }) {
        if (!this.listaElement) {
            return;
        }
        if (this.btnEscopoMes) {
            this.btnEscopoMes.addEventListener("click", () => onMudarEscopo("mes"));
        }
        if (this.btnEscopoDia) {
            this.btnEscopoDia.addEventListener("click", () => onMudarEscopo("dia"));
        }

        this.botoesPeriodoTabela.forEach(btn => {
            btn.addEventListener("click", () => {
                onMudarPeriodo(btn.dataset.periodoTabela);
            });
        });

        if (this.filtroProfessorInput) {
            this.filtroProfessorInput.addEventListener("input", (e) => {
                onBuscarProfessor(e.target.value);
            });
        }
    }
}
