/**
 * MODEL: ReservaModel
 * Responsável pelos dados de reservas e regras de negócio:
 * - Conecta-se diretamente ao MySQL via API PHP (api/reservas.php)
 * - Validação de capacidade dos laboratórios
 * - Agendamento em lote (múltiplas datas e múltiplos laboratórios/professores)
 * - Suporta múltiplos professores por laboratório reservado
 */
export class ReservaModel {
    constructor() {
        this.laboratorios = [
            "Laboratório 1",
            "Laboratório 2",
            "Laboratório 3",
            "Laboratório 4",
            "Laboratório 5"
        ];

        this.reservas = [];
    }

    /**
     * Busca as reservas diretamente do banco de dados MySQL via PHP.
     */
    async carregarDoBanco() {
        try {
            const resposta = await fetch("api/reservas.php");
            const dados = await resposta.json();

            if (resposta.ok && dados && dados.sucesso && Array.isArray(dados.reservas)) {
                this.reservas = dados.reservas;
                return this.reservas;
            }
        } catch (erro) {
            console.warn("Não foi possível carregar reservas do servidor.", erro);
        }
        this.reservas = [];
        return this.reservas;
    }

    obterReservasPorDataEPeriodo(data, periodo = "todos") {
        return this.reservas.filter(reserva => {
            return reserva.data === data && 
                   reserva.status !== "cancelada" && 
                   (periodo === "todos" || reserva.periodo === periodo);
        });
    }

    /**
     * Filtra reservas de forma avançada por escopo (dia/mês), período e busca por professor.
     */
    filtrarReservas({ escopo = "mes", dataSelecionada = "", mesAtual = "", periodo = "todos", professorBusca = "" }) {
        const termo = (professorBusca || "").trim().toLowerCase();

        return this.reservas.filter(reserva => {
            // 1. Filtro por Escopo
            if (escopo === "dia") {
                if (reserva.data !== dataSelecionada) return false;
            } else if (escopo === "mes" && mesAtual) {
                if (!reserva.data.startsWith(mesAtual)) return false;
            }

            // 2. Filtro por Período
            if (periodo !== "todos" && reserva.periodo !== periodo) {
                return false;
            }

            // 3. Filtro por Nome do Professor (responsável ou solicitante)
            if (termo) {
                const prof = (reserva.professor || "").toLowerCase();
                const solicitante = (reserva.solicitante || "").toLowerCase();
                if (!prof.includes(termo) && !solicitante.includes(termo)) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (a.data !== b.data) return a.data.localeCompare(b.data);
            if (a.periodo !== b.periodo) return a.periodo.localeCompare(b.periodo);
            return (a.laboratorio || "").localeCompare(b.laboratorio || "");
        });
    }

    /**
     * Valida no cliente a capacidade total por data e período.
     */
    validarDisponibilidade(datas, periodo, quantidade, usarLabEngenharia = false) {
        const limite = this.laboratorios.length;
        const maximo = limite;
        if (quantidade < 1 || quantidade > maximo) {
            return {
                valido: false,
                capacidadeExcedida: true,
                maximo
            };
        }

        for (const data of datas) {
            const reservasAtivas = this.reservas.filter(reserva =>
                reserva.data === data && reserva.periodo === periodo && reserva.status !== "cancelada"
            );
            const vagasComunsEmUso = reservasAtivas.filter(reserva => !/engenharia/i.test(reserva.laboratorio || "")).length;
            const laboratorioEngenhariaEmUso = reservasAtivas.some(reserva => /engenharia/i.test(reserva.laboratorio || ""));
            const quantidadeComum = quantidade - (usarLabEngenharia ? 1 : 0);
            if (usarLabEngenharia && laboratorioEngenhariaEmUso) {
                return { valido: false, dataConflito: data, laboratorioEspecial: true };
            }
            if (quantidadeComum > 0 && limite - vagasComunsEmUso < quantidadeComum) {
                return {
                    valido: false,
                    dataConflito: data,
                    disponiveis: Math.max(0, limite - vagasComunsEmUso)
                };
            }
        }
        return { valido: true };
    }

    /**
     * Cria a solicitação gravando no MySQL via API PHP (suporta anexo multipart).
     */
    async criarSolicitacaoNoBanco(dados) {
        try {
            let resposta;
            if (dados.anexoMateriais || dados.anexoPop) {
                const formData = new FormData();
                formData.append("professor", dados.professor);
                formData.append("curso", dados.curso);
                formData.append("turma", dados.turma);
                formData.append("materia", dados.materia);
                formData.append("quantidade", dados.quantidade);
                formData.append("usarLabEngenharia", String(Boolean(dados.usarLabEngenharia)));
                formData.append("periodo", dados.periodo);
                formData.append("professores", JSON.stringify(dados.professores));
                formData.append("datas", JSON.stringify(dados.datas));
                if (dados.anexoMateriais) formData.append("anexo_materiais", dados.anexoMateriais);
                if (dados.anexoPop) formData.append("anexo_pop", dados.anexoPop);

                resposta = await fetch("api/reservas.php", {
                    method: "POST",
                    body: formData
                });
            } else {
                resposta = await fetch("api/reservas.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dados)
                });
            }

            const resultado = await resposta.json();

            if (resultado.sucesso) {
                // Atualiza a lista interna puxando direto do MySQL
                await this.carregarDoBanco();
                return resultado;
            } else {
                return resultado;
            }
        } catch (erro) {
            console.error("Não foi possível salvar a solicitação no servidor.", erro);
            return { sucesso: false, mensagem: "Não foi possível salvar no servidor. Tente novamente." };
        }
    }

    /**
     * Atualiza o status da reserva no MySQL (Aprovar / Recusar / Cancelar)
     */
    async atualizarStatusReserva(idReserva, novoStatus, motivo = "") {
        try {
            const resposta = await fetch("api/atualizar_status_reserva.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idReserva: idReserva,
                    status: novoStatus,
                    motivo
                })
            });

            const resultado = await resposta.json();
            if (resultado.sucesso) {
                await this.carregarDoBanco();
                return resultado;
            } else {
                return resultado;
            }
        } catch (erro) {
            console.error("Não foi possível atualizar a reserva no servidor.", erro);
            return { sucesso: false, mensagem: "Não foi possível atualizar no servidor. Tente novamente." };
        }
    }

    gerarCorEvento(chave) {
        const cores = [
            "#DBEAFE",
            "#BFDBFE",
            "#93C5FD",
            "#E0F2FE",
            "#BAE6FD"
        ];
        const str = String(chave || "");
        let codigo = 0;
        for (let i = 0; i < str.length; i++) {
            codigo += str.charCodeAt(i);
        }
        return cores[codigo % cores.length];
    }
}
