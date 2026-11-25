document.addEventListener("DOMContentLoaded", async () => {
    const sessaoStr = sessionStorage.getItem("albalabs_usuario_logado");
    if (!sessaoStr) {
        window.location.href = "login.html";
        return;
    }

    let usuario;
    try {
        usuario = JSON.parse(sessaoStr);
    } catch (erro) {
        sessionStorage.removeItem("albalabs_usuario_logado");
        window.location.href = "login.html";
        return;
    }

    const ehTecnico = usuario.tipo === "tecnico";
    const ehCoordenador = usuario.tipo === "coordenador";
    const ehProfessor = usuario.tipo === "professor";
    if (!ehTecnico && !ehCoordenador && !ehProfessor) {
        window.location.href = "aulas.php";
        return;
    }

    const podeGerenciarUsuarios = ehTecnico || ehCoordenador;
    document.getElementById("usuarioGerenciarNome").textContent = `👤 ${usuario.nome} (${usuario.tipo.toUpperCase()})`;
    document.getElementById("btnSairGerenciar").addEventListener("click", async () => {
        try {
            await fetch("api/logout.php", { method: "POST", credentials: "same-origin" });
        } finally {
            sessionStorage.removeItem("albalabs_usuario_logado");
            window.location.href = "login.html";
        }
    });

    if (ehProfessor) {
        document.getElementById("tituloGerenciarPagina").textContent = "Configuração";
        document.getElementById("descricaoGerenciarPagina").textContent = "Altere a senha da sua conta.";
    } else {
        document.getElementById("areaCadastroUsuarios").style.display = "block";
        if (ehTecnico) {
            document.getElementById("tituloCadastroUsuarios").textContent = "Cadastro de professor";
            document.getElementById("descricaoCadastroUsuarios").textContent = "Cadastre professores para que possam acessar o sistema.";
            document.getElementById("grupoTipoNovoUsuario").style.display = "none";
            document.getElementById("novoUsuarioTipo").value = "professor";
        }
    }

    if (podeGerenciarUsuarios) {
        const areaReset = document.getElementById("areaRedefinirSenha");
        const seletorUsuario = document.getElementById("usuarioRedefinirSenha");
        const formReset = document.getElementById("formRedefinirSenha");
        const mensagemReset = document.getElementById("mensagemRedefinirSenha");
        const resultadoReset = document.getElementById("senhaProvisoriaResultado");
        const campoSenhaProvisoria = document.getElementById("senhaProvisoriaValor");
        areaReset.hidden = false;
        if (ehTecnico) {
            areaReset.querySelector("h3").textContent = "Redefinir senha de professor";
            areaReset.querySelector("p").textContent = "Gere uma senha provisória para um professor. Oriente a pessoa a alterá-la após entrar no sistema.";
        }

        try {
            const resposta = await fetch("api/listar_usuarios.php", { credentials: "same-origin" });
            const resultado = await resposta.json();
            if (!resposta.ok || !resultado.sucesso) {
                throw new Error(resultado.mensagem || "Não foi possível carregar os usuários.");
            }
            seletorUsuario.replaceChildren(new Option("Selecione um usuário", ""));
            resultado.usuarios.forEach(alvo => {
                seletorUsuario.appendChild(new Option(`${alvo.nome} — ${alvo.email} (${alvo.tipo})`, alvo.id));
            });
            if (resultado.usuarios.length === 0) {
                seletorUsuario.replaceChildren(new Option("Não há outros usuários cadastrados", ""));
                seletorUsuario.disabled = true;
                formReset.querySelector("button[type=submit]").disabled = true;
            }
        } catch (erro) {
            seletorUsuario.replaceChildren(new Option("Falha ao carregar usuários", ""));
            seletorUsuario.disabled = true;
            formReset.querySelector("button[type=submit]").disabled = true;
            mensagemReset.textContent = erro.message || "Não foi possível carregar os usuários.";
            mensagemReset.className = "alerta alerta-erro";
            mensagemReset.style.display = "block";
        }

        formReset.addEventListener("submit", async evento => {
            evento.preventDefault();
            const idUsuario = seletorUsuario.value;
            if (!idUsuario) return;
            const nomeAlvo = seletorUsuario.selectedOptions[0]?.textContent || "este usuário";
            if (!confirm(`Gerar uma senha provisória para ${nomeAlvo}?`)) return;

            resultadoReset.hidden = true;
            campoSenhaProvisoria.value = "";
            mensagemReset.style.display = "none";
            const botao = formReset.querySelector("button[type=submit]");
            botao.disabled = true;
            try {
                const resposta = await fetch("api/resetar_senha_usuario.php", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idUsuario })
                });
                const resultado = await resposta.json();
                if (!resposta.ok || !resultado.sucesso) {
                    throw new Error(resultado.mensagem || "Não foi possível redefinir a senha.");
                }
                campoSenhaProvisoria.value = resultado.senhaTemporaria;
                resultadoReset.hidden = false;
                mensagemReset.textContent = `Senha provisória gerada para ${resultado.nome}. Entregue-a diretamente ao usuário.`;
                mensagemReset.className = "alerta alerta-sucesso";
            } catch (erro) {
                mensagemReset.textContent = erro.message || "Não foi possível redefinir a senha.";
                mensagemReset.className = "alerta alerta-erro";
            } finally {
                mensagemReset.style.display = "block";
                botao.disabled = false;
            }
        });

        document.getElementById("btnCopiarSenhaProvisoria").addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(campoSenhaProvisoria.value);
                document.getElementById("btnCopiarSenhaProvisoria").textContent = "Copiada";
            } catch {
                campoSenhaProvisoria.select();
                document.execCommand("copy");
            }
        });
    }

    const formCadastro = document.getElementById("formCadastroUsuario");
    if (podeGerenciarUsuarios) {
        formCadastro.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            const mensagem = document.getElementById("mensagemCadastroUsuario");
            mensagem.style.display = "none";
            const dados = {
                nome: document.getElementById("novoUsuarioNome").value.trim(),
                email: document.getElementById("novoUsuarioEmail").value.trim().toLowerCase(),
                senha: document.getElementById("novoUsuarioSenha").value,
                tipo: document.getElementById("novoUsuarioTipo").value
            };

            try {
                const resposta = await fetch("api/cadastrar.php", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dados)
                });
                const resultado = await resposta.json();
                mensagem.textContent = resultado.mensagem || "Não foi possível cadastrar o usuário.";
                mensagem.className = `alerta ${resposta.ok && resultado.sucesso ? "alerta-sucesso" : "alerta-erro"}`;
                mensagem.style.display = "block";
                if (resposta.ok && resultado.sucesso) {
                    formCadastro.reset();
                    if (ehTecnico) document.getElementById("novoUsuarioTipo").value = "professor";
                }
            } catch (erro) {
                mensagem.textContent = "Não foi possível conectar ao servidor.";
                mensagem.className = "alerta alerta-erro";
                mensagem.style.display = "block";
            }
        });
    }

    document.getElementById("formAlterarSenha").addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const mensagem = document.getElementById("mensagemAlterarSenha");
        mensagem.style.display = "none";
        const senhaAtual = document.getElementById("senhaAtual").value;
        const senhaNova = document.getElementById("senhaNova").value;
        const senhaNovaConfirmacao = document.getElementById("senhaNovaConfirmacao").value;

        if (senhaNova !== senhaNovaConfirmacao) {
            mensagem.textContent = "A confirmação não corresponde à nova senha.";
            mensagem.className = "alerta alerta-erro";
            mensagem.style.display = "block";
            return;
        }

        try {
            const resposta = await fetch("api/alterar_senha.php", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ senhaAtual, senhaNova, senhaNovaConfirmacao })
            });
            const resultado = await resposta.json();
            mensagem.textContent = resultado.mensagem || "Não foi possível alterar a senha.";
            mensagem.className = `alerta ${resposta.ok && resultado.sucesso ? "alerta-sucesso" : "alerta-erro"}`;
            mensagem.style.display = "block";
            if (resposta.ok && resultado.sucesso) document.getElementById("formAlterarSenha").reset();
        } catch (erro) {
            mensagem.textContent = "Não foi possível conectar ao servidor.";
            mensagem.className = "alerta alerta-erro";
            mensagem.style.display = "block";
        }
    });
});
