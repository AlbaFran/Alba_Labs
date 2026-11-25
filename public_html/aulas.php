<?php
require_once __DIR__ . '/api/page_auth.php';
$usuarioPagina = exigirPaginaAlbaLabs();
?>
<!DOCTYPE html>
<html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alba Labs - Gestão de Aulas</title>
        <link rel="icon" type="image/svg+xml" href="atom.svg">
        <link rel="stylesheet" href="css/style.css?v=20261118-eng-soft1">
        <style>
            .badge-papel {
                background: rgba(255, 255, 255, 0.15);
                color: #e2e8f0;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 500;
            }
            .nav-link-btn {
                background: transparent;
                border: 1px solid rgba(255,255,255,0.4);
                color: white;
                padding: 6px 14px;
                border-radius: 6px;
                text-decoration: none;
                font-size: 13px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: background 0.15s ease;
            }
            .nav-link-btn:hover {
                background: rgba(255,255,255,0.15);
                color: white;
            }
            .menu-usuario {
                position: relative;
            }
            .menu-usuario-toggle {
                border: 1px solid rgba(255,255,255,0.4);
                cursor: pointer;
            }
            .menu-usuario-toggle:hover {
                background: rgba(255,255,255,0.22);
            }
            .menu-usuario-toggle:disabled {
                cursor: default;
                opacity: 1;
            }
            .menu-usuario-dropdown {
                position: absolute;
                z-index: 1100;
                top: calc(100% + 8px);
                right: 0;
                min-width: 170px;
                padding: 6px;
                background: #fff;
                border: 1px solid #dce4ee;
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(16, 39, 68, 0.18);
            }
            .menu-usuario-dropdown[hidden] {
                display: none;
            }
            .menu-usuario-dropdown button {
                width: 100%;
                border: 0;
                text-align: left;
                color: #102744;
            }
            .modal-editar {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(16, 39, 68, 0.6);
                z-index: 1000;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }
            .modal-editar.aberto {
                display: flex;
            }
        </style>
    </head>

    <body>
        <script>sessionStorage.setItem("albalabs_usuario_logado", JSON.stringify(<?= json_encode($usuarioPagina, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>));</script>
        <header style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 18px;">
                <h1 class="logo-marca">
                    <svg class="logo-icone" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="24" cy="24" r="3.2" fill="currentColor" stroke="none" />
                        <ellipse cx="24" cy="24" rx="20" ry="7" />
                        <ellipse cx="24" cy="24" rx="20" ry="7" transform="rotate(60 24 24)" />
                        <ellipse cx="24" cy="24" rx="20" ry="7" transform="rotate(120 24 24)" />
                    </svg>
                    <span>Alba Labs</span>
                </h1>
                <span style="color:#94a3b8; font-size:18px;">|</span>
                <span style="color:#cbdcf0; font-weight:600; font-size:16px;">Painel de Aulas</span>
            </div>

            <div style="display: flex; align-items: center; gap: 12px;">
                <a href="index.php" class="nav-link-btn">
                    📅 Ver Calendário
                </a>
                <div class="menu-usuario">
                    <button type="button" id="usuarioLogadoNome" class="badge-papel menu-usuario-toggle" aria-expanded="false" aria-haspopup="true"></button>
                    <div id="menuUsuario" class="menu-usuario-dropdown" hidden>
                        <button type="button" id="btnGerenciar" style="display:none;">⚙ Gerenciar</button>
                    </div>
                </div>
                <button type="button" id="btnSair" style="color: white; background: transparent; border: 1px solid rgba(255,255,255,0.3); padding: 6px 14px; border-radius: 6px; font-size: 13px;">Sair</button>
            </div>
        </header>

        <main>
            <div class="topo">
                <div>
                    <h2 id="tituloPainel">Gestão de Aulas</h2>
                    <p id="subtituloPainel">Consulte, aprove, edite ou cancele solicitações de laboratório.</p>
                </div>

                <button type="button" id="btnNovaReserva" class="primario">+ Nova Solicitação</button>
            </div>

            <section class="cartao">
                <div class="topo">
                    <div>
                        <h3 id="tituloLista" style="margin: 0;">Lista de Aulas</h3>
                        <div id="resumoFiltro" class="contagem-filtro"></div>
                    </div>

                    <div class="filtros">
                        <button type="button" class="ativo" data-filtro-status="todos">Todas</button>
                        <button type="button" data-filtro-status="pendente">🟡 Pendentes</button>
                        <button type="button" data-filtro-status="confirmada">🟢 Confirmadas</button>
                    </div>
                </div>

                <!-- Barra de Busca -->
                <div class="controles" style="margin-top: 16px; gap: 12px;">
                    <div style="flex: 1; min-width: 260px;">
                        <input type="text" id="campoBusca" placeholder="🔍 Buscar por professor, matéria, curso ou turma..." style="width: 100%;">
                    </div>
                    <div style="flex: 1; min-width: 260px;">
                        <input type="text" id="campoBuscaProfessorPrincipal" placeholder="🔍 Filtrar pelo professor principal..." aria-label="Filtrar aulas pelo professor principal" style="width: 100%;">
                    </div>

                    <div class="filtros">
                        <button type="button" class="ativo" data-filtro-periodo="todos">Todos Períodos</button>
                        <button type="button" data-filtro-periodo="manha">Manhã</button>
                        <button type="button" data-filtro-periodo="noite">Noite</button>
                    </div>
                </div>

                <!-- Tabela de Aulas -->
                <div id="containerTabela" style="margin-top: 16px;"></div>
            </section>
        </main>

        <?php include __DIR__ . '/modal_reserva.php'; ?>

        <!-- Modal de Edição de Aula -->
        <div id="modalEditar" class="modal-editar">
            <div class="modal-conteudo">
                <h2>Editar Detalhes da Aula</h2>
                <form id="formEditar">
                    <input type="hidden" id="editIdReserva">

                    <div class="form-grupo">
                        <label for="editProfessor">Professor Principal</label>
                        <input id="editProfessor" type="text" required readonly>
                    </div>
                    <div class="form-grupo" id="editProfessorAuxGroup">
                        <label for="editProfessorAux">Professor Auxiliar (opcional)</label>
                        <select id="editProfessorAux">
                            <option value="">Selecione o professor auxiliar</option>
                        </select>
                    </div>

                    <div class="form-grupo">
                        <label for="editAnexoMateriais">Requisição de materiais e reagentes</label>
                        <input id="editAnexoMateriais" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx">
                        <small id="editAnexoMateriaisAtual" style="color:#64748b;"></small>
                    </div>
                    <div class="form-grupo">
                        <label for="editAnexoPop">POP da aula</label>
                        <input id="editAnexoPop" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx">
                        <small id="editAnexoPopAtual" style="color:#64748b;"></small>
                    </div>

                    <div class="form-grupo">
                        <label for="editCurso">Curso</label>
                        <select id="editCurso" required>
                            <option value="Engenharia Química">Engenharia Química</option>
                            <option value="Engenharia Civil">Engenharia Civil</option>
                            <option value="Engenharia Mecânica">Engenharia Mecânica</option>
                            <option value="Engenharia Elétrica">Engenharia Elétrica</option>
                            <option value="Engenharia de Produção">Engenharia de Produção</option>
                            <option value="Biomedicina">Biomedicina</option>
                            <option value="Farmácia">Farmácia</option>
                            <option value="Medicina Veterinária">Medicina Veterinária</option>
                            <option value="Nutrição">Nutrição</option>
                            <option value="Eventos">Eventos</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>

                    <div class="form-grupo">
                        <label for="editTurma">Turma</label>
                        <input id="editTurma" type="text" required placeholder="Ex: 3º Semestre - Turma A">
                    </div>

                    <div class="form-grupo">
                        <label for="editMateria">Disciplina</label>
                        <select id="editMateria" required>
                            <option value="Química Ambiental">Química Ambiental</option>
                            <option value="Química Analítica">Química Analítica</option>
                            <option value="Fundamentos da Química">Fundamentos da Química</option>
                            <option value="Química Orgânica">Química Orgânica</option>
                            <option value="Química Geral">Química Geral</option>
                            <option value="Métodos Analíticos">Métodos Analíticos</option>
                            <option value="Química Inorgânica">Química Inorgânica</option>
                            <option value="Análise Instrumental">Análise Instrumental</option>
                            <option value="Diagnóstico Ambiental">Diagnóstico Ambiental</option>
                            <option value="Propriedade físico-química dos materiais">Propriedade físico-química dos materiais</option>
                            <option value="Tecnologia dos alimentos">Tecnologia dos alimentos</option>
                            <option value="Biotecnologia da fermentação">Biotecnologia da fermentação</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>

                    <div class="form-grupo">
                        <label for="editData">Data da aula</label>
                        <input id="editData" type="date" required>
                    </div>
                    <div class="form-grupo">
                        <label for="editPeriodo">Período</label>
                        <select id="editPeriodo" required>
                            <option value="manha">Manhã</option>
                            <option value="noite">Noite</option>
                        </select>
                    </div>
                    <div class="form-grupo">
                        <label class="opcao-lab-engenharia">
                            <input id="editUsarLabEngenharia" type="checkbox" style="width:auto;">
                            <span>Incluir o Lab de Engenharia <small>(equipamentos industriais)</small></span>
                        </label>
                    </div>

                    <div class="acoes-form">
                        <button type="submit" class="primario">Salvar Alterações</button>
                        <button type="button" id="btnCancelarEdicao">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>

        <script type="module" src="js/aulas.js?v=20261118-prof-principal1"></script>
        <script type="module" src="js/aulas_reserva.js?v=20261118-lab-engenharia1"></script>
    </body>
</html>
