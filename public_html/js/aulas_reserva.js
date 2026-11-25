import { ModalView } from "./views/ModalView.js?v=20261118-lab-engenharia1";
import { ReservaModel } from "./models/ReservaModel.js?v=20261118-lab-engenharia1";
import { mostrarAviso, mostrarSucesso } from "./feedback.js?v=20261118-mensagem1";

document.addEventListener("DOMContentLoaded", async () => {
    const sessao = sessionStorage.getItem("albalabs_usuario_logado");
    if (!sessao) return;

    let usuario;
    try {
        usuario = JSON.parse(sessao);
    } catch {
        return;
    }

    const modal = new ModalView();
    const reservas = new ReservaModel();
    await Promise.all([modal.carregarProfessores(), reservas.carregarDoBanco()]);

    modal.bindEventos({
        onAbrirNovaReserva: () => {
            modal.abrir();
            modal.configurarProfessorLogado(usuario);
        },
        onSubmit: async () => {
            const dados = modal.obterDadosFormulario();
            if (dados.datas.length === 0) {
                alert("Adicione pelo menos uma data para a aula.");
                return;
            }
            if (dados.professores.some(nome => !nome)) {
                alert("Preencha o nome de todos os professores responsáveis.");
                return;
            }

            const disponibilidade = reservas.validarDisponibilidade(
                dados.datas,
                dados.periodo,
                dados.quantidade,
                dados.usarLabEngenharia
            );
            if (!disponibilidade.valido) {
                if (disponibilidade.capacidadeExcedida) {
                    mostrarAviso("Não há laboratório disponível.");
                    return;
                }
                mostrarAviso("Não há laboratório disponível.");
                return;
            }

            const resultado = await reservas.criarSolicitacaoNoBanco(dados);
            if (!resultado.sucesso) {
                if (resultado.mensagem === "Não há laboratório disponível.") mostrarAviso(resultado.mensagem);
                else alert(resultado.mensagem || "Não foi possível cadastrar a solicitação.");
                return;
            }

            modal.fechar();
            mostrarSucesso(resultado.mensagem || "Agendado com sucesso!", () => window.location.reload());
        }
    });
});
