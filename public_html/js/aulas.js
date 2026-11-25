/**
 * CONTROLE DA PÁGINA DE GESTÃO DE AULAS (aulas.php)
 * - Professor: visualiza somente suas aulas, pode editar e cancelar.
 * - Técnico / Coordenador / Admin: visualizam todas as aulas, podem aprovar, recusar, editar e cancelar.
 */
import { solicitarMotivoCancelamento } from "./cancelamento.js?v=20261117-cancelamento4";
import { mostrarAviso } from "./feedback.js?v=20261118-mensagem1";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verifica autenticação
    const sessaoStr = sessionStorage.getItem("albalabs_usuario_logado");
    if (!sessaoStr) {
        alert("Por favor, faça login para acessar a área de Aulas.");
        window.location.href = "login.html";
        return;
    }

    const usuario = JSON.parse(sessaoStr);
    const usuarioLogadoNome = document.getElementById("usuarioLogadoNome");
    const btnSair = document.getElementById("btnSair");
    const tituloPainel = document.getElementById("tituloPainel");
    const subtituloPainel = document.getElementById("subtituloPainel");
    const containerTabela = document.getElementById("containerTabela");
    const resumoFiltro = document.getElementById("resumoFiltro");
    const campoBusca = document.getElementById("campoBusca");
    const campoBuscaProfessorPrincipal = document.getElementById("campoBuscaProfessorPrincipal");
    const escaparHtml = valor => String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[caractere]);
    const formatarDataHoraCancelamento = valor => {
        if (!valor) return "";
        const data = new Date(`${String(valor).replace(" ", "T")}Z`);
        return Number.isNaN(data.getTime())
            ? String(valor)
            : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
    };

    // Gerenciamento e configurações ficam em uma página própria.
    const btnGerenciar = document.getElementById("btnGerenciar");
    const menuUsuario = document.getElementById("menuUsuario");
    const podeCadastrarProfessores = usuario.tipo === "tecnico";
    const podeCadastrarEquipe = usuario.tipo === "coordenador";
    const podeGerenciar = podeCadastrarProfessores || podeCadastrarEquipe;
    const podeAlterarSenha = podeGerenciar || usuario.tipo === "professor";
    usuarioLogadoNome.disabled = !podeAlterarSenha;

    if (podeAlterarSenha) {
        btnGerenciar.textContent = podeGerenciar ? "⚙ Gerenciar" : "⚙ Configuração";
        btnGerenciar.style.display = "block";
        usuarioLogadoNome.addEventListener("click", () => {
            menuUsuario.hidden = !menuUsuario.hidden;
            usuarioLogadoNome.setAttribute("aria-expanded", String(!menuUsuario.hidden));
        });
        document.addEventListener("click", (evento) => {
            if (!evento.target.closest(".menu-usuario")) {
                menuUsuario.hidden = true;
                usuarioLogadoNome.setAttribute("aria-expanded", "false");
            }
        });
        btnGerenciar.addEventListener("click", () => {
            menuUsuario.hidden = true;
            usuarioLogadoNome.setAttribute("aria-expanded", "false");
            window.location.href = "gerenciar.php";
        });
        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape") {
                menuUsuario.hidden = true;
                usuarioLogadoNome.setAttribute("aria-expanded", "false");
            }
        });
    }

    const ehSuper = (usuario.tipo === "coordenador" || usuario.tipo === "tecnico" || usuario.tipo === "administrador");
    const ehProf = (usuario.tipo === "professor");
    let nomesProfessores = [];
    try {
        const respProfessores = await fetch("api/professores.php");
        const dadosProfessores = await respProfessores.json();
        if (dadosProfessores.sucesso && Array.isArray(dadosProfessores.professores)) {
            nomesProfessores = dadosProfessores.professores;
        }
    } catch (e) {
        console.warn("Não foi possível carregar a lista de professores.", e);
    }

    usuarioLogadoNome.textContent = `👤 ${usuario.nome} (${usuario.tipo.toUpperCase()})${podeAlterarSenha ? " ▾" : ""}`;

    if (ehProf) {
        tituloPainel.textContent = "Minhas Aulas Agendadas";
        subtituloPainel.textContent = `Visualizando apenas as aulas solicitadas por ${usuario.nome}. Você pode editar ou cancelar seus agendamentos.`;
    } else {
        tituloPainel.textContent = "Gestão Geral de Aulas e Laboratórios";
        subtituloPainel.textContent = `Visão completa para ${usuario.tipo}. Você pode aprovar solicitações, editar detalhes técnicos e gerenciar status.`;
    }

    btnSair.addEventListener("click", async () => {
        try {
            await fetch("api/logout.php", { method: "POST", credentials: "same-origin" });
        } finally {
            sessionStorage.removeItem("albalabs_usuario_logado");
            window.location.href = "login.html";
        }
    });

    let todasReservas = [];
    let statusFiltro = "todos";
    let periodoFiltro = "todos";
    let buscaTexto = "";
    let buscaProfessorPrincipal = "";

    // 2. Carrega reservas
    async function carregarReservas() {
        try {
            const resp = await fetch("api/reservas.php");
            const dados = await resp.json();
            if (resp.ok && dados.sucesso && Array.isArray(dados.reservas)) {
                todasReservas = dados.reservas;
            } else {
                todasReservas = [];
            }
        } catch (e) {
            console.error("Não foi possível carregar reservas do servidor.", e);
            todasReservas = [];
        }

        renderizar();
    }

    // 3. Filtros
    document.querySelectorAll("[data-filtro-status]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-filtro-status]").forEach(b => b.classList.remove("ativo"));
            btn.classList.add("ativo");
            statusFiltro = btn.dataset.filtroStatus;
            renderizar();
        });
    });

    document.querySelectorAll("[data-filtro-periodo]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-filtro-periodo]").forEach(b => b.classList.remove("ativo"));
            btn.classList.add("ativo");
            periodoFiltro = btn.dataset.filtroPeriodo;
            renderizar();
        });
    });

    campoBusca.addEventListener("input", (e) => {
        buscaTexto = e.target.value.toLowerCase().trim();
        renderizar();
    });

    campoBuscaProfessorPrincipal.addEventListener("input", (e) => {
        buscaProfessorPrincipal = e.target.value.trim();
        renderizar();
    });

    // 4. Renderiza tabela
    function renderizar() {
        const nomeLogado = (usuario.nome || "").toLowerCase().trim();
        const normalizarBusca = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const chaveGrupo = r => `${r.idSolicitacao || r.idReserva}|${r.data}`;
        const gruposPorSolicitacao = new Map();
        todasReservas.forEach(r => {
            const chave = chaveGrupo(r);
            if (!gruposPorSolicitacao.has(chave)) gruposPorSolicitacao.set(chave, []);
            gruposPorSolicitacao.get(chave).push(r);
        });
        const professorPrincipalPorGrupo = new Map([...gruposPorSolicitacao].map(([chave, reservas]) => {
            const principal = reservas.reduce((maisAntiga, reserva) =>
                Number(reserva.idReserva) < Number(maisAntiga.idReserva) ? reserva : maisAntiga
            );
            return [chave, principal.professor || ""];
        }));

        const listaFiltrada = todasReservas.filter(r => {
            // Se for professor, garante estritamente as aulas dele
            if (ehProf) {
                const solicitante = (r.solicitante || "").toLowerCase();
                const prof = (r.professor || "").toLowerCase();
                const nomeUser = (nomeLogado || "").toLowerCase();

                // Função auxiliar para remover acentos e caracteres extras
                const normalizar = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

                const nProf = normalizar(prof);
                const nSol = normalizar(solicitante);
                const nUser = normalizar(nomeUser);

                const bateDono = (nSol && (nSol === nUser || nSol.includes(nUser) || nUser.includes(nSol))) ||
                                 (nProf && (nProf === nUser || nProf.includes(nUser) || nUser.includes(nProf)));

                if (!bateDono) {
                    return false;
                }
            }

            // Filtro de status
            if (statusFiltro !== "todos" && r.status !== statusFiltro) {
                return false;
            }

            // Filtro de período
            if (periodoFiltro !== "todos" && r.periodo !== periodoFiltro) {
                return false;
            }

            // Busca por texto
            if (buscaTexto) {
                const combined = `${r.professor} ${r.materia} ${r.curso} ${r.turma} ${r.laboratorio} ${r.data}`.toLowerCase();
                if (!combined.includes(buscaTexto)) return false;
            }

            if (buscaProfessorPrincipal && !normalizarBusca(professorPrincipalPorGrupo.get(chaveGrupo(r))).includes(normalizarBusca(buscaProfessorPrincipal))) {
                return false;
            }

            return true;
        });

        const chavesFiltradas = new Set(listaFiltrada.map(chaveGrupo));
        const aulasAgrupadas = [...gruposPorSolicitacao.entries()]
            .filter(([chave]) => chavesFiltradas.has(chave))
            .map(([, reservas]) => {
                const principal = reservas[0];
                const professores = [...new Set(reservas.map(r => (r.professor || "").trim()).filter(Boolean))];
                const professorPrincipal = professores[0] || (principal.professor || "").trim();
                const professorAuxiliar = professores.find(nome => nome.toLowerCase() !== professorPrincipal.toLowerCase()) || "";
                const professorEdicao = {
                    ...principal,
                    solicitante: professorPrincipal,
                    professor: professorAuxiliar || professorPrincipal,
                    usarLabEngenharia: reservas.some(item => /engenharia/i.test(item.laboratorio || ""))
                };
                const laboratorios = [...new Set(reservas.map(r => r.laboratorio).filter(Boolean))];
                return { principal, professorEdicao, professores, laboratorios, reservas };
            });

        resumoFiltro.textContent = `Total: ${aulasAgrupadas.length} aula(s) encontrada(s)`;

        if (aulasAgrupadas.length === 0) {
            containerTabela.innerHTML = '<p class="livre" style="padding: 24px 0; font-size:15px;">Nenhuma aula encontrada para os filtros selecionados.</p>';
            return;
        }

        let html = `
            <div class="tabela-reservas-container">
                <table class="tabela-reservas">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Período</th>
                            <th>Laboratório</th>
                            <th>Professor</th>
                            <th>Disciplina / Turma</th>
                            <th>Curso</th>
                            <th>Anexo</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        aulasAgrupadas.forEach(grupo => {
            const r = grupo.principal;
            const partes = (r.data || "").split("-");
            const dataFmt = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : r.data;
            const badgePeriodo = r.periodo === "manha"
                ? '<span class="badge-periodo badge-manha">Manhã</span>'
                : '<span class="badge-periodo badge-noite">Noite</span>';

            let statusBadge = '<span style="color:#805b00; font-weight:600;">🟡 Pendente</span>';
            if (r.status === "confirmada") {
                statusBadge = '<span style="color:#166534; font-weight:600;">🟢 Confirmada</span>';
            } else if (r.status === "cancelada") {
                const auditoria = r.motivoCancelamento
                    ? `<small class="detalhes-cancelamento">Motivo: ${escaparHtml(r.motivoCancelamento)}<br>Por: ${escaparHtml(r.canceladoPor || "Usuário registrado")}<br>Em: ${escaparHtml(formatarDataHoraCancelamento(r.canceladoEm))}</small>`
                    : '<small class="detalhes-cancelamento">Dados de auditoria indisponíveis para este cancelamento antigo.</small>';
                statusBadge = `<span style="color:#991b1b; font-weight:600;">🔴 Cancelada/recusada</span><br>${auditoria}`;
            }

            const obterAnexo = campo => grupo.reservas.map(item => item[campo]).find(Boolean);
            const linksAnexos = [
                ["Materiais e reagentes", obterAnexo("requisicao_materiais_path")],
                ["POP da aula", obterAnexo("pop_aula_path")],
                ["Anexo", obterAnexo("anexo_path")]
            ].filter(([, caminho]) => caminho).map(([rotulo, caminho]) => {
                const link = caminho.startsWith('uploads/') || caminho.startsWith('http') ? caminho : null;
                return link
                    ? `<a href="${link}" target="_blank" rel="noopener" style="display:block;color:#2563eb;font-weight:600;text-decoration:none;">📎 ${rotulo}</a>`
                    : `<span style="display:block;color:#2563eb;font-weight:600;">📎 ${rotulo}: ${caminho}</span>`;
            });
            const anexoHtml = linksAnexos.length ? linksAnexos.join("") : '<span style="color:#94a3b8;">—</span>';

            let botoesAcao = '';

            // Ações de Técnico e Coordenador
            if (ehSuper) {
                if (r.status === "pendente") {
                    botoesAcao += `<button type="button" class="btn-acao btn-aprovar" data-aprovar="${r.idReserva}">✔ Aprovar</button>`;
                    botoesAcao += `<button type="button" class="btn-acao btn-recusar" data-cancelar="${r.idReserva}">✖ Recusar</button>`;
                } else if (r.status === "confirmada") {
                    botoesAcao += `<button type="button" class="btn-acao btn-recusar" data-cancelar="${r.idReserva}">Cancelar</button>`;
                }
                botoesAcao += `<button type="button" class="btn-acao" style="background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe;" data-editar='${JSON.stringify(grupo.professorEdicao)}'>✏️ Editar</button>`;
            } 
            // Ações do Professor
            else if (ehProf) {
                if (r.status !== "cancelada") {
                    botoesAcao += `<button type="button" class="btn-acao" style="background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe;" data-editar='${JSON.stringify(grupo.professorEdicao)}'>✏️ Editar</button>`;
                    botoesAcao += `<button type="button" class="btn-acao btn-recusar" data-cancelar="${r.idReserva}">🗑 Cancelar</button>`;
                } else {
                    botoesAcao = '<span style="color:#94a3b8; font-size:12px;">Cancelada</span>';
                }
            }

            const infoProfHtml = `<strong>${escaparHtml(grupo.professores.join(" e ") || r.professor)}</strong>${r.solicitante ? `<small class="solicitante-reserva">Agendado por: ${escaparHtml(r.solicitante)}</small>` : ""}`;
            const quantidadeLabs = grupo.reservas.length || Number(r.quantidadeLabs) || 1;
            const infoLaboratorio = `<strong>${quantidadeLabs} Lab${quantidadeLabs === 1 ? "" : "s"}</strong>`;

            html += `
                <tr>
                    <td data-label="Data"><strong>${dataFmt}</strong></td>
                    <td data-label="Período">${badgePeriodo}</td>
                    <td data-label="Laboratório">${infoLaboratorio}</td>
                    <td data-label="Professor">${infoProfHtml}</td>
                    <td data-label="Disciplina / Turma"><strong>${r.materia}</strong><br><small style="color:#64748b;">${r.turma || ''}</small></td>
                    <td data-label="Curso">${r.curso || '—'}</td>
                    <td data-label="Anexo">${anexoHtml}</td>
                    <td data-label="Status">${statusBadge}</td>
                    <td data-label="Ações">${botoesAcao}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        containerTabela.innerHTML = html;

        // Vínculo dos botões de ação
        containerTabela.querySelectorAll("[data-aprovar]").forEach(btn => {
            btn.addEventListener("click", () => alterarStatus(btn.dataset.aprovar, "confirmada"));
        });

        containerTabela.querySelectorAll("[data-cancelar]").forEach(btn => {
            btn.addEventListener("click", () => alterarStatus(btn.dataset.cancelar, "cancelada"));
        });

        containerTabela.querySelectorAll("[data-editar]").forEach(btn => {
            btn.addEventListener("click", () => abrirModalEdicao(JSON.parse(btn.dataset.editar)));
        });

    }

    // 5. Alteração de Status (Aprovar / Cancelar)
    async function alterarStatus(idReserva, novoStatus) {
        let motivo = "";
        if (novoStatus === "cancelada") {
            motivo = await solicitarMotivoCancelamento();
            if (motivo === null) return;
        } else if (!confirm("Deseja realmente APROVAR esta solicitação?")) {
            return;
        }

        try {
            const resp = await fetch("api/atualizar_status_reserva.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idReserva: idReserva,
                    status: novoStatus,
                    motivo
                })
            });
            const res = await resp.json();
            alert(res.mensagem || "Status atualizado!");
            await carregarReservas();
        } catch (e) {
            console.error(e);
            alert("Erro ao conectar com o servidor.");
        }
    }

    // 6. Modal de Edição
    const modalEditar = document.getElementById("modalEditar");
    const formEditar = document.getElementById("formEditar");
    const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

    function abrirModalEdicao(reserva) {
        document.getElementById("editIdReserva").value = reserva.idReserva;
        const solicitante = (reserva.solicitante || "").trim();
        const professorDaReserva = (reserva.professor || "").trim();
        const temAuxiliar = solicitante && professorDaReserva.toLowerCase() !== solicitante.toLowerCase();
        document.getElementById("editProfessor").value = solicitante || professorDaReserva;
        const selectAuxiliar = document.getElementById("editProfessorAux");
        selectAuxiliar.innerHTML = '<option value="">Selecione o professor auxiliar</option>';
        nomesProfessores.forEach(nome => selectAuxiliar.appendChild(new Option(nome, nome)));
        if (temAuxiliar && !nomesProfessores.includes(professorDaReserva)) {
            selectAuxiliar.appendChild(new Option(professorDaReserva, professorDaReserva));
        }
        selectAuxiliar.value = temAuxiliar ? professorDaReserva : "";
        document.getElementById("editProfessor").dataset.auxiliarOriginal = temAuxiliar ? professorDaReserva : "";
        document.getElementById("editProfessorAuxGroup").style.display = temAuxiliar ? "" : "none";
        document.getElementById("editAnexoMateriais").value = "";
        document.getElementById("editAnexoPop").value = "";
        document.getElementById("editAnexoMateriaisAtual").textContent = reserva.requisicao_materiais_path
            ? `Arquivo atual: ${reserva.requisicao_materiais_path.split("/").pop()}`
            : "Nenhum arquivo anexado ainda.";
        document.getElementById("editAnexoPopAtual").textContent = reserva.pop_aula_path
            ? `Arquivo atual: ${reserva.pop_aula_path.split("/").pop()}`
            : "Nenhum arquivo anexado ainda.";
        document.getElementById("editCurso").value = reserva.curso || "Engenharia Química";
        document.getElementById("editTurma").value = reserva.turma || "";
        document.getElementById("editMateria").value = reserva.materia || "Química Ambiental";
        document.getElementById("editData").value = reserva.data || "";
        document.getElementById("editPeriodo").value = reserva.periodo || "manha";
        document.getElementById("editUsarLabEngenharia").checked = Boolean(reserva.usarLabEngenharia);
        modalEditar.classList.add("aberto");
    }

    btnCancelarEdicao.addEventListener("click", () => {
        modalEditar.classList.remove("aberto");
    });

    formEditar.addEventListener("submit", async (e) => {
        e.preventDefault();
        const idReserva = document.getElementById("editIdReserva").value;
        const professor = document.getElementById("editProfessor").value.trim();
        const professorAux = document.getElementById("editProfessorAux").value.trim();
        const professorAuxOriginal = document.getElementById("editProfessor").dataset.auxiliarOriginal || "";
        const curso = document.getElementById("editCurso").value;
        const turma = document.getElementById("editTurma").value.trim();
        const materia = document.getElementById("editMateria").value;
        const data = document.getElementById("editData").value;
        const periodo = document.getElementById("editPeriodo").value;
        const usarLabEngenharia = document.getElementById("editUsarLabEngenharia").checked;
        const arquivoMateriais = document.getElementById("editAnexoMateriais").files[0];
        const arquivoPop = document.getElementById("editAnexoPop").files[0];

        try {
            const formData = new FormData();
            formData.append("idReserva", idReserva);
            formData.append("professor", professor);
            formData.append("professorAux", professorAux);
            formData.append("professorAuxOriginal", professorAuxOriginal);
            formData.append("curso", curso);
            formData.append("turma", turma);
            formData.append("materia", materia);
            formData.append("data", data);
            formData.append("periodo", periodo);
            formData.append("usarLabEngenharia", String(usarLabEngenharia));
            if (arquivoMateriais) formData.append("anexo_materiais", arquivoMateriais);
            if (arquivoPop) formData.append("anexo_pop", arquivoPop);

            const resp = await fetch("api/editar_reserva.php", {
                method: "POST",
                body: formData
            });
            const res = await resp.json();
            if (res.sucesso) {
                alert("Alterações salvas com sucesso!");
                modalEditar.classList.remove("aberto");
                await carregarReservas();
            } else {
                if (res.mensagem === "Não há laboratório disponível.") mostrarAviso(res.mensagem);
                else alert(res.mensagem || "Não foi possível salvar.");
            }
        } catch (err) {
            alert("Erro de conexão ao salvar alterações.");
        }
    });

    await carregarReservas();
});
