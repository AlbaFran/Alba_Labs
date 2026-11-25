/**
 * CONTROLLER: AppController
 * Conecta o Model e a View, gerenciando o fluxo de dados e as respostas aos eventos do usuário.
 */
import { solicitarMotivoCancelamento } from "../cancelamento.js?v=20261117-cancelamento4";
import { mostrarAviso, mostrarSucesso } from "../feedback.js?v=20261118-mensagem1";

export class AppController {
    constructor(calendarioModel, reservaModel, calendarioView, reservaView, modalView) {
        this.calendarioModel = calendarioModel;
        this.reservaModel = reservaModel;
        this.calendarioView = calendarioView;
        this.reservaView = reservaView;
        this.modalView = modalView;

        // Estado dos filtros do painel inferior
        this.escopoTabela = "mes"; // "mes" ou "dia"
        this.professorBusca = "";
        this.detalhesDiaAberto = false;
        this.diasEspeciais = new Map();
    }

    obterUsuarioLogado() {
        const sessao = sessionStorage.getItem("albalabs_usuario_logado");
        if (sessao) {
            try {
                return JSON.parse(sessao);
            } catch {
                return null;
            }
        }
        return null;
    }

    async init() {
        // Vincula os eventos do Calendário
        this.calendarioView.bindNavegacaoMes(direcao => this.tratarNavegacaoMes(direcao));
        this.calendarioView.bindFiltroPeriodo(periodo => this.tratarFiltroPeriodo(periodo));
        this.calendarioView.bindFecharDetalhesDia(() => {
            this.detalhesDiaAberto = false;
            this.atualizarInterface();
        });
        
        // Vincula eventos do Modal
        this.modalView.bindEventos({
            onSubmit: () => this.tratarSubmissaoReserva(),
            onAbrirNovaReserva: () => this.tratarAbrirModal()
        });

        // Vincula os novos filtros da Tabela de Reservas
        this.reservaView.bindFiltros({
            onMudarEscopo: (escopo) => this.tratarMudarEscopo(escopo),
            onMudarPeriodo: (periodo) => this.tratarFiltroPeriodo(periodo),
            onBuscarProfessor: (termo) => this.tratarBuscarProfessor(termo)
        });

        // 1. Renderiza tela inicial imediatamente
        try {
            this.atualizarInterface();
        } catch (e) {
            console.error("Erro ao atualizar interface inicial:", e);
        }

        // 2. Carrega dados atualizados do MySQL
        try {
            await Promise.all([this.reservaModel.carregarDoBanco(), this.carregarDiasEspeciais()]);
            this.atualizarInterface();
        } catch (e) {
            console.error("Erro ao carregar dados do banco:", e);
        }
    }

    atualizarInterface() {
        const usuario = this.obterUsuarioLogado();
        // Coordenador, técnico ou administrador podem aprovar/recusar
        const podeAprovar = Boolean(
            usuario && (
                usuario.tipo === "coordenador" || 
                usuario.tipo === "tecnico" || 
                usuario.tipo === "administrador"
            )
        );
        const ehProfessor = Boolean(usuario && usuario.tipo === "professor");

        // 1. Renderiza a Grade do Calendário
        const dias = this.calendarioModel.gerarDiasCalendario();
        this.calendarioView.renderizar({
            tituloMesAno: this.calendarioModel.obterNomeMesAno(),
            diasSemana: this.calendarioModel.diasSemana,
            dias: dias,
            diaEspecialPorDataCallback: data => this.diasEspeciais.get(data),
            reservasPorDiaCallback: (data) => {
                return this.reservaModel.obterReservasPorDataEPeriodo(data, this.calendarioModel.periodoAtual);
            },
            obterCorCallback: (chave) => this.reservaModel.gerarCorEvento(chave),
            onSelecionarDia: (data) => this.tratarSelecaoDia(data)
        });

        this.calendarioView.renderizarDetalhesDia({
            mostrar: this.detalhesDiaAberto && Boolean(usuario && ["tecnico", "coordenador", "administrador"].includes(usuario.tipo)),
            data: this.calendarioModel.dataSelecionada,
            reservas: this.reservaModel.obterReservasPorDataEPeriodo(this.calendarioModel.dataSelecionada, "todos"),
            diaEspecial: this.diasEspeciais.get(this.calendarioModel.dataSelecionada) || null,
            podeEditarDias: Boolean(usuario && ["tecnico", "coordenador"].includes(usuario.tipo)),
            onSalvarDiaEspecial: dados => this.salvarDiaEspecial(dados),
            onRemoverDiaEspecial: data => this.removerDiaEspecial(data)
        });

        this.calendarioView.atualizarFiltroAtivo(this.calendarioModel.periodoAtual);

        // 2. Renderiza a Tabela de Consulta de Reservas com os filtros combinados e ações
        const reservasFiltradas = this.reservaModel.filtrarReservas({
            escopo: this.escopoTabela,
            dataSelecionada: this.calendarioModel.dataSelecionada,
            mesAtual: this.calendarioModel.obterAnoMesAtual(),
            periodo: this.calendarioModel.periodoAtual,
            professorBusca: this.professorBusca
        });

        this.reservaView.renderizar({
            escopo: this.escopoTabela,
            dataSelecionada: this.calendarioModel.dataSelecionada,
            mesAnoTexto: this.calendarioModel.obterNomeMesAno(),
            periodo: this.calendarioModel.periodoAtual,
            professorBusca: this.professorBusca,
            reservas: reservasFiltradas,
            podeAprovar: podeAprovar,
            usuarioLogado: usuario,
            onAlterarStatus: (id, novoStatus) => this.tratarAlterarStatusReserva(id, novoStatus)
        });
    }

    tratarNavegacaoMes(direcao) {
        if (direcao === 0) {
            this.calendarioModel.irParaHoje();
        } else {
            this.calendarioModel.mudarMes(direcao);
        }
        this.atualizarInterface();
    }

    tratarFiltroPeriodo(periodo) {
        this.calendarioModel.setPeriodo(periodo);
        this.atualizarInterface();
    }

    tratarSelecaoDia(dataIdentificador) {
        this.calendarioModel.setDataSelecionada(dataIdentificador);
        const usuario = this.obterUsuarioLogado();
        this.detalhesDiaAberto = Boolean(usuario && ["tecnico", "coordenador", "administrador"].includes(usuario.tipo));
        this.escopoTabela = "dia";
        this.atualizarInterface();
    }

    tratarMudarEscopo(escopo) {
        this.escopoTabela = escopo;
        this.atualizarInterface();
    }

    tratarBuscarProfessor(termo) {
        this.professorBusca = termo;
        this.atualizarInterface();
    }

    tratarAbrirModal() {
        const usuario = this.obterUsuarioLogado();
        if (this.diasEspeciais.has(this.calendarioModel.dataSelecionada)) {
            alert("Essa data está marcada como feriado, recesso ou emenda e não aceita novas aulas.");
            return;
        }
        this.modalView.abrir(this.calendarioModel.dataSelecionada);
        this.modalView.configurarProfessorLogado(usuario);
    }

    async tratarAlterarStatusReserva(idReserva, novoStatus) {
        const usuario = this.obterUsuarioLogado();
        if (!usuario) {
            alert("Acesso negado: faça login para realizar esta ação.");
            return;
        }

        const ehSuper = (usuario.tipo === "coordenador" || usuario.tipo === "tecnico" || usuario.tipo === "administrador");
        const ehProfCancelando = (usuario.tipo === "professor" && novoStatus === "cancelada");

        if (!ehSuper && !ehProfCancelando) {
            alert("Acesso negado: você não tem permissão para alterar o status.");
            return;
        }

        let motivo = "";
        if (novoStatus === "cancelada") {
            motivo = await solicitarMotivoCancelamento();
            if (motivo === null) return;
        } else if (!confirm("Deseja realmente APROVAR esta solicitação de aula?")) {
            return;
        }

        const resultado = await this.reservaModel.atualizarStatusReserva(idReserva, novoStatus, motivo);
        if (resultado.sucesso) {
            this.atualizarInterface();
            alert(resultado.mensagem);
        } else {
            alert(resultado.mensagem);
        }
    }

    async tratarSubmissaoReserva() {
        const dados = this.modalView.obterDadosFormulario();

        if (dados.datas.length === 0) {
            alert("Adicione pelo menos uma data para a aula.");
            return;
        }

        if (dados.professores.some(nome => nome === "")) {
            alert("Preencha o nome de todos os professores responsáveis.");
            return;
        }

        const dataEspecial = dados.datas.find(data => this.diasEspeciais.has(data));
        if (dataEspecial) {
            alert(`A data ${dataEspecial.split("-").reverse().join("/")} está marcada como feriado, recesso ou emenda.`);
            return;
        }
        const fimDeSemana = dados.datas.find(data => {
            const [ano, mes, dia] = data.split("-").map(Number);
            const diaSemana = new Date(ano, mes - 1, dia).getDay();
            return diaSemana === 0 || diaSemana === 6;
        });
        if (fimDeSemana) {
            alert("Não é possível agendar aulas aos sábados ou domingos.");
            return;
        }

        // Validação no cliente
        const validacao = this.reservaModel.validarDisponibilidade(
            dados.datas,
            dados.periodo,
            dados.quantidade,
            dados.usarLabEngenharia
        );

        if (!validacao.valido) {
            if (validacao.capacidadeExcedida) {
                mostrarAviso("Não há laboratório disponível.");
                return;
            }
            mostrarAviso("Não há laboratório disponível.");
            return;
        }

        // Envia para o MySQL via API PHP
        const resultado = await this.reservaModel.criarSolicitacaoNoBanco(dados);

        if (!resultado.sucesso) {
            if (resultado.mensagem === "Não há laboratório disponível.") mostrarAviso(resultado.mensagem);
            else alert(resultado.mensagem || "Erro ao salvar reserva.");
            return;
        }

        // Ajusta foco para a primeira data reservada
        this.calendarioModel.setDataSelecionada(dados.datas[0]);
        const partes = dados.datas[0].split("-");
        this.calendarioModel.dataAtual = new Date(Number(partes[0]), Number(partes[1]) - 1, 1);

        this.modalView.fechar();
        await this.reservaModel.carregarDoBanco();
        this.atualizarInterface();

        mostrarSucesso(resultado.mensagem || "Agendado com sucesso!");
    }

    async carregarDiasEspeciais() {
        try {
            const resposta = await fetch("api/dias_especiais.php", { credentials: "same-origin" });
            const resultado = await resposta.json();
            if (resposta.ok && resultado.sucesso && Array.isArray(resultado.dias)) {
                this.diasEspeciais = new Map(resultado.dias.map(dia => [dia.data, dia]));
            }
        } catch (erro) {
            console.warn("Não foi possível carregar feriados e recessos.", erro);
        }
    }

    async salvarDiaEspecial(dados) {
        const resultado = await this.atualizarDiaEspecial("POST", dados);
        if (resultado?.sucesso) {
            await this.carregarDiasEspeciais();
            this.atualizarInterface();
            alert("Data especial marcada no calendário.");
        } else if (resultado) {
            alert(resultado.mensagem || "Não foi possível marcar essa data.");
        }
    }

    async removerDiaEspecial(data) {
        const resultado = await this.atualizarDiaEspecial("DELETE", { data });
        if (resultado?.sucesso) {
            await this.carregarDiasEspeciais();
            this.atualizarInterface();
        } else if (resultado) {
            alert(resultado.mensagem || "Não foi possível remover a marcação.");
        }
    }

    async atualizarDiaEspecial(metodo, dados) {
        try {
            const resposta = await fetch("api/dias_especiais.php", {
                method: metodo,
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });
            return await resposta.json();
        } catch (erro) {
            alert("Não foi possível conectar para atualizar a marcação do calendário.");
            return null;
        }
    }
}
