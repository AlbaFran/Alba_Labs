export function mostrarSucesso(mensagem, aoFechar = null) {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog-sucesso";
    dialog.setAttribute("aria-labelledby", "tituloDialogSucesso");

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo-dialog-sucesso";

    const icone = document.createElement("div");
    icone.className = "icone-dialog-sucesso";
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = "✓";

    const titulo = document.createElement("h2");
    titulo.id = "tituloDialogSucesso";
    titulo.textContent = "Sucesso!";

    const texto = document.createElement("p");
    texto.textContent = mensagem;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "primario";
    botao.textContent = "OK";

    conteudo.append(icone, titulo, texto, botao);
    dialog.appendChild(conteudo);
    document.body.appendChild(dialog);

    let finalizado = false;
    const fechar = () => {
        if (finalizado) return;
        finalizado = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        aoFechar?.();
    };

    botao.addEventListener("click", fechar);
    dialog.addEventListener("cancel", evento => {
        evento.preventDefault();
        fechar();
    });
    dialog.showModal();
    botao.focus();
}

export function mostrarAviso(mensagem) {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog-aviso";
    dialog.setAttribute("aria-label", "Aviso");

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo-dialog-aviso";
    const texto = document.createElement("p");
    texto.textContent = mensagem;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "primario";
    botao.textContent = "OK";
    conteudo.append(texto, botao);
    dialog.appendChild(conteudo);
    document.body.appendChild(dialog);

    const fechar = () => {
        if (dialog.open) dialog.close();
        dialog.remove();
    };
    botao.addEventListener("click", fechar);
    dialog.addEventListener("cancel", evento => {
        evento.preventDefault();
        fechar();
    });
    dialog.showModal();
    botao.focus();
}
