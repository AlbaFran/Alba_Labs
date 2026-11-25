/**
 * VIEW: CalendarioView
 * Responsável por renderizar a grade do calendário, cabeçalhos dos dias e eventos.
 */
function agruparPorSolicitacao(reservas) {
    const grupos = new Map();
    reservas.forEach(reserva => {
        const chave = reserva.idSolicitacao || `${reserva.data}|${reserva.materia}|${reserva.curso}|${reserva.turma}|${reserva.periodo}`;
        if (!grupos.has(chave)) grupos.set(chave, []);
        grupos.get(chave).push(reserva);
    });
    return [...grupos.values()].map(itens => {
        const primeiro = itens[0];
        const laboratorios = [...new Set(itens.map(item => item.laboratorio).filter(Boolean))];
        const professores = [...new Set(itens.map(item => (item.professor || "").trim()).filter(Boolean))];
        return { primeiro, itens, laboratorios, professores };
    });
}

const rotulosDiasEspeciais = { feriado: "Feriado", recesso: "Recesso", emenda: "Emenda" };

export class CalendarioView {
    constructor() {
        this.mesAnoElement = document.getElementById("mesAno");
        this.calendarioElement = document.getElementById("calendario");
        this.detalhesDiaElement = document.getElementById("detalhesDiaCalendario");
        this.conteudoDetalhesDia = document.getElementById("conteudoDetalhesDia");
        this.estadoDiaEspecial = document.getElementById("estadoDiaEspecial");
        this.botoesFiltro = document.querySelectorAll("[data-periodo]");
        this.onFecharDetalhesDia = null;

        document.getElementById("fecharDetalhesDia")?.addEventListener("click", () => this.onFecharDetalhesDia?.());
        this.detalhesDiaElement?.addEventListener("click", event => {
            if (event.target === this.detalhesDiaElement) this.onFecharDetalhesDia?.();
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && this.detalhesDiaElement?.classList.contains("aberto")) {
                this.onFecharDetalhesDia?.();
            }
        });
    }

    bindFecharDetalhesDia(callback) {
        this.onFecharDetalhesDia = callback;
    }

    renderizarDetalhesDia({ mostrar, data, reservas = [], diaEspecial = null, podeEditarDias = false, onSalvarDiaEspecial, onRemoverDiaEspecial }) {
        if (!this.detalhesDiaElement || !this.conteudoDetalhesDia) return;
        this.conteudoDetalhesDia.replaceChildren();
        this.estadoDiaEspecial?.replaceChildren();
        this.detalhesDiaElement.hidden = !mostrar;
        this.detalhesDiaElement.classList.toggle("aberto", mostrar);
        if (!mostrar) return;

        const [ano, mes, dia] = data.split("-");
        document.getElementById("tituloDetalhesDia").textContent = `Aulas de ${dia}/${mes}/${ano}`;

        if (this.estadoDiaEspecial) {
            if (diaEspecial) {
                const aviso = document.createElement("div");
                aviso.className = "dia-especial-aviso";
                const nome = document.createElement("strong");
                nome.textContent = rotulosDiasEspeciais[diaEspecial.tipo] || "Dia sem aulas";
                aviso.appendChild(nome);
                if (diaEspecial.descricao) {
                    const descricao = document.createElement("div");
                    descricao.textContent = diaEspecial.descricao;
                    aviso.appendChild(descricao);
                }
                const orientacaoMarcacao = document.createElement("small");
                orientacaoMarcacao.textContent = "Novas solicitações não são permitidas nessa data.";
                aviso.appendChild(orientacaoMarcacao);
                this.estadoDiaEspecial.appendChild(aviso);
            }

            if (podeEditarDias) {
                const form = document.createElement("form");
                form.className = "form-dia-especial";
                const campoTipo = document.createElement("label");
                campoTipo.append("Tipo de data");
                const selectTipo = document.createElement("select");
                selectTipo.name = "tipo";
                Object.entries(rotulosDiasEspeciais).forEach(([valor, rotulo]) => selectTipo.add(new Option(rotulo, valor)));
                if (diaEspecial?.tipo) selectTipo.value = diaEspecial.tipo;
                campoTipo.appendChild(selectTipo);

                const campoDescricao = document.createElement("label");
                campoDescricao.append("Observação (opcional)");
                const inputDescricao = document.createElement("input");
                inputDescricao.name = "descricao";
                inputDescricao.maxLength = 180;
                inputDescricao.value = diaEspecial?.descricao || "";
                inputDescricao.placeholder = "Ex.: recesso acadêmico";
                campoDescricao.appendChild(inputDescricao);

                const acoes = document.createElement("div");
                acoes.className = "form-dia-especial-acoes";
                const salvar = document.createElement("button");
                salvar.type = "submit";
                salvar.className = "primario";
                salvar.textContent = diaEspecial ? "Atualizar marcação" : "Marcar data";
                acoes.appendChild(salvar);
                if (diaEspecial) {
                    const remover = document.createElement("button");
                    remover.type = "button";
                    remover.textContent = "Remover marcação";
                    remover.addEventListener("click", () => onRemoverDiaEspecial?.(data));
                    acoes.appendChild(remover);
                }
                form.append(campoTipo, campoDescricao, acoes);
                form.addEventListener("submit", evento => {
                    evento.preventDefault();
                    onSalvarDiaEspecial?.({ data, tipo: selectTipo.value, descricao: inputDescricao.value.trim() });
                });
                this.estadoDiaEspecial.appendChild(form);
            }
        }

        if (reservas.length === 0) {
            const vazio = document.createElement("p");
            vazio.className = "livre";
            vazio.textContent = "Não há aulas cadastradas para este dia.";
            this.conteudoDetalhesDia.appendChild(vazio);
            return;
        }

        const lista = document.createElement("div");
        lista.className = "aulas-dia-lista";
        agruparPorSolicitacao(reservas).forEach(grupo => {
            const reserva = grupo.primeiro;
            const card = document.createElement("article");
            card.className = "aula-dia-card";
            const tituloAula = document.createElement("strong");
            tituloAula.textContent = reserva.materia || "Aula";
            card.appendChild(tituloAula);

            const periodo = reserva.periodo === "manha" ? "Manhã" : "Noite";
            const quantidadeLabs = Number(reserva.quantidadeLabs) || grupo.itens.length || 1;
            const textoLaboratorios = `${quantidadeLabs} Lab${quantidadeLabs === 1 ? "" : "s"}`;

            const professor = document.createElement("p");
            professor.className = "aula-dia-professor";
            professor.textContent = `${grupo.professores.join(" e ") || "Professor não informado"} · ${textoLaboratorios} · ${periodo}`;
            card.appendChild(professor);

            const cursoTurma = document.createElement("p");
            cursoTurma.className = "aula-dia-curso";
            cursoTurma.textContent = `${reserva.curso || "Curso não informado"}${reserva.turma ? ` · Turma ${reserva.turma}` : ""}`;
            card.appendChild(cursoTurma);

            const anexos = document.createElement("div");
            anexos.className = "aula-dia-anexos";
            const obterAnexo = campo => grupo.itens.map(item => item[campo]).find(Boolean);
            const arquivos = [
                ["Requisição de materiais e reagentes", obterAnexo("requisicao_materiais_path")],
                ["POP da aula", obterAnexo("pop_aula_path")],
                ["Anexo", obterAnexo("anexo_path")]
            ].filter(([, caminho]) => caminho);
            arquivos.forEach(([rotulo, caminho]) => {
                const link = document.createElement("a");
                link.textContent = `📎 ${rotulo}`;
                if (caminho.startsWith("uploads/") || caminho.startsWith("http")) {
                    link.href = caminho;
                    link.target = "_blank";
                    link.rel = "noopener";
                } else {
                    link.removeAttribute("href");
                    link.title = caminho;
                }
                anexos.appendChild(link);
            });
            if (arquivos.length === 0) {
                const semAnexo = document.createElement("span");
                semAnexo.textContent = "Sem anexos";
                semAnexo.className = "livre";
                anexos.appendChild(semAnexo);
            }
            card.appendChild(anexos);
            lista.appendChild(card);
        });
        this.conteudoDetalhesDia.appendChild(lista);
    }

    renderizar({ tituloMesAno, diasSemana, dias, reservasPorDiaCallback, obterCorCallback, diaEspecialPorDataCallback, onSelecionarDia }) {
        this.mesAnoElement.textContent = tituloMesAno;
        this.calendarioElement.innerHTML = "";

        // Renderiza cabeçalho dos dias da semana
        diasSemana.forEach(dia => {
            const celula = document.createElement("div");
            celula.className = "dia-semana";
            celula.textContent = dia;
            this.calendarioElement.appendChild(celula);
        });

        // Renderiza as 42 células de dias
        dias.forEach(diaInfo => {
            const celula = document.createElement("div");
            celula.className = "dia";

            if (!diaInfo.ehMesAtual) {
                celula.classList.add("fora");
            }
            if (diaInfo.ehSelecionado) {
                celula.classList.add("selecionado");
            }
            const diaEspecial = diaEspecialPorDataCallback?.(diaInfo.identificador);
            if (diaEspecial) {
                celula.classList.add("dia-especial");
                celula.title = `${rotulosDiasEspeciais[diaEspecial.tipo] || "Dia sem aulas"}${diaEspecial.descricao ? `: ${diaEspecial.descricao}` : ""}`;
            }

            const numero = document.createElement("div");
            numero.className = "numero";
            numero.textContent = diaInfo.numero;
            celula.appendChild(numero);

            if (diaEspecial) {
                const etiqueta = document.createElement("span");
                etiqueta.className = "dia-especial-etiqueta";
                etiqueta.textContent = rotulosDiasEspeciais[diaEspecial.tipo] || "Sem aulas";
                celula.appendChild(etiqueta);
            }

            // Obtém as reservas deste dia através do callback
            const reservasDoDia = reservasPorDiaCallback(diaInfo.identificador);

            agruparPorSolicitacao(reservasDoDia).slice(0, 6).forEach(grupo => {
                const reserva = grupo.primeiro;
                const evento = document.createElement("div");
                evento.className = "reserva";

                const chave = reserva.idSolicitacao || reserva.professor;
                evento.style.backgroundColor = obterCorCallback(chave);
                evento.style.color = "#102744";

                const periodo = reserva.periodo === "manha" ? "Manhã" : "Noite";
                const quantidadeLabs = Number(reserva.quantidadeLabs) || grupo.itens.length || 1;
                const textoLaboratorios = `${quantidadeLabs} Lab${quantidadeLabs === 1 ? "" : "s"}`;
                const professores = grupo.professores.length
                    ? grupo.professores.map(nome => nome.trim().split(/\s+/)[0]).filter(Boolean).join(" e ")
                    : (reserva.professor || "Professor").trim().split(/\s+/)[0];

                const primeiraLinha = document.createElement("div");
                const nomesProfessores = document.createElement("strong");
                nomesProfessores.className = "reserva-professores";
                nomesProfessores.textContent = professores;
                primeiraLinha.appendChild(nomesProfessores);
                evento.appendChild(primeiraLinha);

                const dadosAula = document.createElement("span");
                dadosAula.className = "reserva-dados";
                dadosAula.textContent = `${textoLaboratorios} · ${periodo}`;
                evento.appendChild(dadosAula);

                const cursoTurma = document.createElement("div");
                cursoTurma.className = "reserva-dados reserva-curso-turma";
                cursoTurma.textContent = `${reserva.turma ? `${reserva.turma} ` : ""}${reserva.curso || ""}`.trim();
                if (cursoTurma.textContent) evento.appendChild(cursoTurma);
                celula.appendChild(evento);
            });

            celula.addEventListener("click", () => {
                onSelecionarDia(diaInfo.identificador);
            });

            this.calendarioElement.appendChild(celula);
        });
    }

    atualizarFiltroAtivo(periodoAtivo) {
        this.botoesFiltro.forEach(botao => {
            botao.classList.toggle("ativo", botao.dataset.periodo === periodoAtivo);
        });
    }

    bindNavegacaoMes(onMudarMes) {
        document.getElementById("btnMesAnterior").addEventListener("click", () => onMudarMes(-1));
        document.getElementById("btnMesProximo").addEventListener("click", () => onMudarMes(1));
        document.getElementById("btnHoje").addEventListener("click", () => onMudarMes(0));
    }

    bindFiltroPeriodo(onFiltrar) {
        this.botoesFiltro.forEach(botao => {
            botao.addEventListener("click", () => {
                onFiltrar(botao.dataset.periodo);
            });
        });
    }
}
