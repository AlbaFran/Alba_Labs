/**
 * Login e cadastro usam exclusivamente a API do servidor.
 * O navegador não autentica usuários localmente nem concede perfis.
 */
const formLogin = document.getElementById("formLogin");
const msgAlerta = document.getElementById("msgAlerta");

function exibirMensagem(texto, tipo = "erro") {
    msgAlerta.textContent = texto;
    msgAlerta.className = `alerta alerta-${tipo}`;
    msgAlerta.style.display = "block";
}

function limparMensagem() {
    msgAlerta.style.display = "none";
    msgAlerta.textContent = "";
}

formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparMensagem();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const senha = document.getElementById("loginSenha").value;

    try {
        const resposta = await fetch("api/login.php", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            exibirMensagem(resultado.mensagem || "Não foi possível entrar.", "erro");
            return;
        }

        sessionStorage.setItem("albalabs_usuario_logado", JSON.stringify(resultado.usuario));
        exibirMensagem(`Bem-vindo(a), ${resultado.usuario.nome}! Redirecionando...`, "sucesso");
        setTimeout(() => { window.location.href = "index.php"; }, 700);
    } catch (err) {
        console.error("Falha ao comunicar com o servidor de login.", err);
        exibirMensagem("Servidor indisponível. Tente novamente mais tarde.", "erro");
    }
});
