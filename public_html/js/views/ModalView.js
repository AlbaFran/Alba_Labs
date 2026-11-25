/**
 * VIEW: ModalView
 * Responsável pelo modal de solicitação de reservas, formulário dinâmico e controle de datas extras.
 */
export class ModalView {
    constructor() {
        this.modalElement = document.getElementById("modalReserva");
        this.formElement = document.getElementById("formReserva");
        this.inputProfessor = document.getElementById("professor");
        this.inputCurso = document.getElementById("curso");
        this.inputTurma = document.getElementById("turma");
        this.inputMateria = document.getElementById("materia");
        this.selectQuantidade = document.getElementById("quantidadeLabs");
        this.inputUsarLabEngenharia = document.getElementById("usarLabEngenharia");
        this.selectPeriodo = document.getElementById("periodoReserva");
        this.inputData = document.getElementById("dataReserva");
        this.containerProfessoresExtras = document.getElementById("professoresExtras");
        this.listaDatasElement = document.getElementById("listaDatas");
        this.nomesProfessores = [];

        this.datasReserva = [];
    }

    async carregarProfessores() {
        try {
            const resposta = await fetch("api/professores.php");
            const dados = await resposta.json();
            if (dados.sucesso && Array.isArray(dados.professores)) {
                this.nomesProfessores = dados.professores;
                this.inputProfessor.replaceChildren(new Option("Selecione o professor", ""));
                this.nomesProfessores.forEach(nome => this.inputProfessor.add(new Option(nome, nome)));
                return;
            }
        } catch (erro) {
            console.warn("Não foi possível carregar professores cadastrados.", erro);
        }
        this.nomesProfessores = [];
    }

    configurarProfessorLogado(usuario) {
        this.inputProfessor.disabled = false;
        if (usuario?.tipo !== "professor") return;

        const nome = (usuario.nome || "").trim();
        if (nome && !this.nomesProfessores.includes(nome)) {
            this.inputProfessor.add(new Option(nome, nome));
        }
        this.inputProfessor.value = nome;
        this.inputProfessor.disabled = true;
    }

    abrir(dataPadrao) {
        this.datasReserva = [];
        this.formElement.reset();
        this.inputProfessor.disabled = false;
        this.selectQuantidade.disabled = false;
        this.containerProfessoresExtras.style.display = "";
        this.listaDatasElement.innerHTML = "";
        this.inputData.value = dataPadrao || "";
        this.inputUsarLabEngenharia.checked = false;
        this.atualizarProfessoresExtras();
        this.modalElement.classList.add("aberto");
    }

    fechar() {
        this.modalElement.classList.remove("aberto");
        this.datasReserva = [];
    }

    atualizarProfessoresExtras() {
        const quantidadeTotal = Number(this.selectQuantidade.value);
        this.containerProfessoresExtras.innerHTML = "";

        for (let i = 2; i <= quantidadeTotal; i++) {
            const grupo = document.createElement("div");
            grupo.className = "form-grupo";

            const label = document.createElement("label");
            label.textContent = `Professor responsável pela vaga ${i}`;

            const input = document.createElement("select");
            input.required = true;
            input.appendChild(new Option("Selecione o professor", ""));
            this.nomesProfessores.forEach(nome => input.appendChild(new Option(nome, nome)));

            grupo.appendChild(label);
            grupo.appendChild(input);
            this.containerProfessoresExtras.appendChild(grupo);
        }
    }

    adicionarData(data) {
        if (!data) {
            alert("Escolha uma data primeiro.");
            return;
        }

        const [ano, mes, dia] = data.split("-").map(Number);
        const diaSemana = new Date(ano, mes - 1, dia).getDay();
        if (diaSemana === 0 || diaSemana === 6) {
            alert("Não é possível agendar aulas aos sábados ou domingos.");
            return;
        }

        if (this.datasReserva.includes(data)) {
            alert("Essa data já foi adicionada à solicitação.");
            return;
        }

        this.datasReserva.push(data);
        this.datasReserva.sort();
        this.renderizarListaDatas();
        this.inputData.value = "";
    }

    removerData(data) {
        this.datasReserva = this.datasReserva.filter(d => d !== data);
        this.renderizarListaDatas();
    }

    renderizarListaDatas() {
        this.listaDatasElement.innerHTML = "";

        this.datasReserva.forEach(data => {
            const item = document.createElement("li");
            const partes = data.split("-");
            const spanTexto = document.createElement("span");
            spanTexto.textContent = `${partes[2]}/${partes[1]}/${partes[0]}`;

            const btnRemover = document.createElement("button");
            btnRemover.type = "button";
            btnRemover.textContent = "Remover";
            btnRemover.addEventListener("click", () => this.removerData(data));

            item.appendChild(spanTexto);
            item.appendChild(btnRemover);
            this.listaDatasElement.appendChild(item);
        });
    }

    obterDadosFormulario() {
        const professor = this.inputProfessor.value.trim();
        const curso = this.inputCurso.value.trim();
        const turma = this.inputTurma.value.trim();
        const materia = this.inputMateria.value.trim();
        const quantidade = Number(this.selectQuantidade.value);
        const periodo = this.selectPeriodo.value;
        const usarLabEngenharia = this.inputUsarLabEngenharia.checked;

        const camposExtras = this.containerProfessoresExtras.querySelectorAll("select");
        const professores = [professor];
        camposExtras.forEach(campo => {
            professores.push(campo.value.trim());
        });

        const anexoMateriaisInput = document.getElementById("anexoMateriais");
        const anexoPopInput = document.getElementById("anexoPop");
        const anexoMateriais = anexoMateriaisInput?.files?.[0] || null;
        const anexoPop = anexoPopInput?.files?.[0] || null;

        return {
            professor,
            curso,
            turma,
            materia,
            quantidade,
            usarLabEngenharia,
            periodo,
            professores,
            anexoMateriais,
            anexoPop,
            datas: [...this.datasReserva]
        };
    }

    bindEventos({ onSubmit, onAbrirNovaReserva }) {
        document.getElementById("btnNovaReserva").addEventListener("click", onAbrirNovaReserva);
        document.getElementById("btnCancelarModal").addEventListener("click", () => this.fechar());
        document.getElementById("btnAdicionarData").addEventListener("click", () => {
            this.adicionarData(this.inputData.value);
        });

        this.selectQuantidade.addEventListener("change", () => this.atualizarProfessoresExtras());



        this.formElement.addEventListener("submit", event => {
            event.preventDefault();
            onSubmit();
        });

        // Fechar ao clicar fora do modal
        this.modalElement.addEventListener("click", event => {
            if (event.target === this.modalElement) {
                this.fechar();
            }
        });
    }

}
