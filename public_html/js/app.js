/**
 * APP ENTRY POINT
 * Inicializa os Models, Views e o Controller da arquitetura MVC.
 */
import { CalendarioModel } from "./models/CalendarioModel.js?v=20261118-dias-uteis1";
import { ReservaModel } from "./models/ReservaModel.js?v=20261118-eng-soft1";
import { CalendarioView } from "./views/CalendarioView.js?v=20261118-lab-engenharia1";
import { ReservaView } from "./views/ReservaView.js?v=20261118-capacidade1";
import { ModalView } from "./views/ModalView.js?v=20261118-coord-prof1";
import { AppController } from "./controllers/AppController.js?v=20261118-lab-engenharia1";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1. Instanciação dos Models
        const calendarioModel = new CalendarioModel();
        const reservaModel = new ReservaModel();

        // 2. Instanciação das Views
        const calendarioView = new CalendarioView();
        const reservaView = new ReservaView();
        const modalView = new ModalView();
        await modalView.carregarProfessores();

        // 3. Instanciação e Inicialização do Controller
        const app = new AppController(
            calendarioModel,
            reservaModel,
            calendarioView,
            reservaView,
            modalView
        );

        await app.init();
    } catch (err) {
        console.error("Erro na inicialização da aplicação Alba Labs:", err);
    }

    // 4. Verificação de Usuário Logado
    const sessaoStr = sessionStorage.getItem("albalabs_usuario_logado");
    const nomeElement = document.getElementById("nomeUsuarioLogado");
    const btnAuth = document.getElementById("btnAuth");
    const menuPerfil = document.getElementById("menuPerfilCalendario");
    const acaoPerfil = document.getElementById("acaoPerfilCalendario");

    if (sessaoStr && nomeElement && btnAuth) {
        try {
            const usuario = JSON.parse(sessaoStr);
            const ehProfessor = usuario.tipo === "professor";
            const podeGerenciar = usuario.tipo === "tecnico" || usuario.tipo === "coordenador";
            const podeConfigurar = ehProfessor || podeGerenciar;
            nomeElement.disabled = !podeConfigurar;
            nomeElement.textContent = `👤 ${usuario.nome} (${usuario.tipo})${podeConfigurar ? " ▾" : ""}`;
            btnAuth.textContent = "Sair";
            if (podeConfigurar && menuPerfil && acaoPerfil) {
                acaoPerfil.textContent = ehProfessor ? "⚙ Configuração" : "⚙ Gerenciar";
                acaoPerfil.style.display = "block";
                nomeElement.addEventListener("click", () => {
                    menuPerfil.hidden = !menuPerfil.hidden;
                    nomeElement.setAttribute("aria-expanded", String(!menuPerfil.hidden));
                });
                document.addEventListener("click", (evento) => {
                    if (!evento.target.closest(".menu-perfil-calendario")) {
                        menuPerfil.hidden = true;
                        nomeElement.setAttribute("aria-expanded", "false");
                    }
                });
                document.addEventListener("keydown", (evento) => {
                    if (evento.key === "Escape") {
                        menuPerfil.hidden = true;
                        nomeElement.setAttribute("aria-expanded", "false");
                    }
                });
            }
            const btnLinkAulas = document.getElementById("btnLinkAulas");
            if (btnLinkAulas) {
                btnLinkAulas.style.display = "inline-flex";
            }
            btnAuth.addEventListener("click", async () => {
                try {
                    await fetch("api/logout.php", { method: "POST", credentials: "same-origin" });
                } finally {
                    sessionStorage.removeItem("albalabs_usuario_logado");
                    window.location.href = "login.html";
                }
            });

            // Se for professor, já pode preencher o nome no campo de solicitação
            const inputProfessor = document.getElementById("professor");
            if (inputProfessor && usuario.tipo === "professor") {
                inputProfessor.value = usuario.nome;
            }
        } catch (e) {
            console.error("Erro na sessão", e);
        }
    } else if (btnAuth) {
        btnAuth.addEventListener("click", () => {
            window.location.href = "login.html";
        });
    }
});
