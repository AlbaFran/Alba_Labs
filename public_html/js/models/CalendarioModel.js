/**
 * MODEL: CalendarioModel
 * Responsável pelo estado do calendário (data atual visualizada, data selecionada e filtros de período).
 */
export class CalendarioModel {
    constructor() {
        this.meses = [
            "Janeiro", "Fevereiro", "Março", "Abril",
            "Maio", "Junho", "Julho", "Agosto",
            "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        this.diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex"];

        const hoje = new Date();
        this.dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        this.dataSelecionada = this.formatarData(this.proximoDiaUtil(hoje));
        this.periodoAtual = "todos";
    }

    formatarData(data) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
    }

    proximoDiaUtil(data) {
        const resultado = new Date(data);
        if (resultado.getDay() === 6) resultado.setDate(resultado.getDate() + 2);
        else if (resultado.getDay() === 0) resultado.setDate(resultado.getDate() + 1);
        return resultado;
    }

    mudarMes(direcao) {
        this.dataAtual = new Date(
            this.dataAtual.getFullYear(),
            this.dataAtual.getMonth() + direcao,
            1
        );
    }

    irParaHoje() {
        const hoje = new Date();
        this.dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        this.dataSelecionada = this.formatarData(this.proximoDiaUtil(hoje));
    }

    setDataSelecionada(identificador) {
        this.dataSelecionada = identificador;
    }

    setPeriodo(periodo) {
        this.periodoAtual = periodo;
    }

    obterNomeMesAno() {
        return `${this.meses[this.dataAtual.getMonth()]} ${this.dataAtual.getFullYear()}`;
    }

    obterAnoMesAtual() {
        const ano = this.dataAtual.getFullYear();
        const mes = String(this.dataAtual.getMonth() + 1).padStart(2, "0");
        return `${ano}-${mes}`;
    }

    /**
     * Calcula até 30 células úteis (6 semanas x 5 dias), sem sábado e domingo.
     */
    gerarDiasCalendario() {
        const primeiroDia = new Date(
            this.dataAtual.getFullYear(),
            this.dataAtual.getMonth(),
            1
        );

        const deslocamentoSegunda = (primeiroDia.getDay() + 6) % 7;
        const inicio = new Date(primeiroDia);
        inicio.setDate(1 - deslocamentoSegunda);

        const dias = [];
        const semanas = Math.ceil((deslocamentoSegunda + new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() + 1, 0).getDate()) / 7);
        for (let semana = 0; semana < semanas; semana++) {
            for (let diaUtil = 0; diaUtil < 5; diaUtil++) {
                const data = new Date(inicio);
                data.setDate(inicio.getDate() + semana * 7 + diaUtil);
                const identificador = this.formatarData(data);
                dias.push({
                    dataObj: data,
                    identificador,
                    numero: data.getDate(),
                    ehMesAtual: data.getMonth() === this.dataAtual.getMonth(),
                    ehSelecionado: identificador === this.dataSelecionada
                });
            }
        }
        return dias;
    }
}
