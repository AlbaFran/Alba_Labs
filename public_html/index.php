<?php
require_once __DIR__ . '/api/page_auth.php';
$usuarioPagina = exigirPaginaAlbaLabs();
?>
<!DOCTYPE html>
<html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AlbaLabs - Calendário</title>
        <link rel="icon" type="image/svg+xml" href="atom.svg">
        <link rel="stylesheet" href="css/style.css?v=20261118-eng-soft1">
    </head>

    <body>
        <script>sessionStorage.setItem("albalabs_usuario_logado", JSON.stringify(<?= json_encode($usuarioPagina, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>));</script>
        <header style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
                <h1 class="logo-marca">
                    <svg class="logo-icone" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="24" cy="24" r="3.2" fill="none" stroke="currentColor"/>
                        <ellipse cx="24" cy="24" rx="20" ry="7"/>
                        <ellipse cx="24" cy="24" rx="20" ry="7" transform="rotate(60 24 24)"/>
                        <ellipse cx="24" cy="24" rx="20" ry="7" transform="rotate(120 24 24)"/>
                    </svg>
                    <span>Alba Labs</span>
                </h1>
                <p>Gestão e agendamento de laboratórios acadêmicos</p>
            </div>
            <div id="usuarioSessao" style="display: flex; align-items: center; gap: 12px;">
                <a href="aulas.php" id="btnLinkAulas" style="display: none; background: #2563eb; color: white; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; align-items: center; gap: 6px;">
                    📋 Aulas
                </a>
                <div class="menu-perfil-calendario">
                    <button type="button" id="nomeUsuarioLogado" class="nome-perfil-calendario" aria-expanded="false" aria-haspopup="true" disabled></button>
                    <div id="menuPerfilCalendario" class="dropdown-perfil-calendario" hidden>
                        <a href="gerenciar.php" id="acaoPerfilCalendario" style="display:none;">⚙ Gerenciar</a>
                    </div>
                </div>
                <button type="button" id="btnAuth" style="color: white; background: transparent; border: 1px solid rgba(255,255,255,0.3); padding: 6px 14px; border-radius: 6px; font-size: 13px;">Entrar</button>
            </div>
        </header>

        <main>
            <div class="topo">
                <div>
                    <h2>Calendário de laboratórios</h2>
                    <p>Consulte as reservas por dia e período.</p>
                </div>

                <button class="primario" id="btnNovaReserva">
                    + Nova solicitação
                </button>
            </div>

            <!-- Seção do Calendário Principal -->
            <section class="cartao">
                <div class="topo">
                    <h2 id="mesAno">Carregando...</h2>

                    <div>
                        <button type="button" id="btnMesAnterior">‹ Anterior</button>
                        <button type="button" id="btnHoje">Hoje</button>
                        <button type="button" id="btnMesProximo">Próximo ›</button>
                    </div>
                </div>

                <div class="controles">
                    <div class="filtros">
                        <button type="button" class="ativo" data-periodo="todos">Todos</button>
                        <button type="button" data-periodo="manha">Manhã</button>
                        <button type="button" data-periodo="noite">Noite</button>
                    </div>

                </div>

                <div class="calendario" id="calendario"></div>
            </section>
        </main>

        <div id="detalhesDiaCalendario" class="modal-overlay" hidden>
            <div class="modal-conteudo detalhes-dia-modal" role="dialog" aria-modal="true" aria-labelledby="tituloDetalhesDia">
                <div class="detalhes-dia-cabecalho">
                    <h2 id="tituloDetalhesDia">Aulas do dia</h2>
                    <button type="button" id="fecharDetalhesDia" aria-label="Fechar">✕</button>
                </div>
                <div id="estadoDiaEspecial"></div>
                <div id="conteudoDetalhesDia" aria-live="polite"></div>
            </div>
        </div>

        <?php include __DIR__ . '/modal_reserva.php'; ?>
        <!-- Módulo Principal MVC -->
        <script type="module" src="js/app.js?v=20261118-coord-prof1"></script>
    </body>
</html>
