export function solicitarMotivoCancelamento() {
    return new Promise(resolve => {
        const dialog = document.createElement("dialog");
        dialog.className = "dialog-motivo-cancelamento";
        dialog.setAttribute("aria-labelledby", "tituloMotivoCancelamento");
        dialog.innerHTML = `
            <form class="form-motivo-cancelamento">
                <h2 id="tituloMotivoCancelamento">Motivo do cancelamento</h2>
                <label for="textoMotivoCancelamento">Motivo <span aria-hidden="true">*</span></label>
                <textarea id="textoMotivoCancelamento" required minlength="3" maxlength="1000" rows="4" placeholder="Descreva por que esta aula está sendo cancelada."></textarea>
                <div class="acoes-form">
                    <button type="button" data-cancelar-dialog>Voltar</button>
                    <button type="submit" class="primario">Confirmar cancelamento</button>
                </div>
            </form>
        `;

        const form = dialog.querySelector("form");
        const textarea = dialog.querySelector("textarea");
        let concluido = false;
        const fechar = motivo => {
            if (concluido) return;
            concluido = true;
            if (dialog.open) dialog.close();
            dialog.remove();
            resolve(motivo);
        };

        form.addEventListener("submit", evento => {
            evento.preventDefault();
            const motivo = textarea.value.trim();
            if (motivo.length < 3) {
                textarea.setCustomValidity("Informe um motivo com pelo menos 3 caracteres.");
                textarea.reportValidity();
                return;
            }
            textarea.setCustomValidity("");
            fechar(motivo);
        });
        textarea.addEventListener("input", () => textarea.setCustomValidity(""));
        dialog.querySelector("[data-cancelar-dialog]").addEventListener("click", () => fechar(null));
        dialog.addEventListener("cancel", evento => {
            evento.preventDefault();
            fechar(null);
        });
        dialog.addEventListener("click", evento => {
            if (evento.target === dialog) fechar(null);
        });

        document.body.appendChild(dialog);
        dialog.showModal();
        textarea.focus();
    });
}
