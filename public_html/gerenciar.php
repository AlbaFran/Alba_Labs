<?php
require_once __DIR__ . '/api/page_auth.php';
$usuarioPagina = exigirPaginaAlbaLabs(['professor', 'tecnico', 'coordenador']);
?>
<!DOCTYPE html>
<html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alba Labs - Gerenciar conta</title>
        <link rel="icon" type="image/svg+xml" href="atom.svg">
        <link rel="stylesheet" href="css/style.css">
        <style>
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
            }
            .nav-link-btn:hover {
                background: rgba(255,255,255,0.15);
                color: white;
            }
            .gerenciar-cabecalho-pagina {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
                flex-wrap: wrap;
            }
            .gerenciar-cabecalho-pagina h2,
            .gerenciar-secao h3,
            .gerenciar-secao p {
                margin-top: 0;
            }
            .gerenciar-secao + .gerenciar-secao {
                margin-top: 20px;
            }
            .gerenciar-secao p {
                color: #52657b;
                font-size: 13px;
            }
        </style>
    </head>
    <body>
        <script>sessionStorage.setItem("albalabs_usuario_logado", JSON.stringify(<?= json_encode($usuarioPagina, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>));</script>
        <header style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:18px;">
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
                <span style="color:#cbdcf0; font-weight:600; font-size:16px;">Gerenciar conta</span>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <a href="aulas.php" class="nav-link-btn">← Voltar ao painel</a>
                <span id="usuarioGerenciarNome" style="color:#cbdcf0; font-size:14px;"></span>
                <button type="button" id="btnSairGerenciar" style="color:white; background:transparent; border:1px solid rgba(255,255,255,0.3); padding:6px 14px; border-radius:6px; font-size:13px;">Sair</button>
            </div>
        </header>

        <main>
            <div class="gerenciar-cabecalho-pagina">
                <div>
                    <h2 id="tituloGerenciarPagina">Gerenciar</h2>
                    <p id="descricaoGerenciarPagina">Cadastros e segurança da conta.</p>
                </div>
            </div>

            <section id="areaCadastroUsuarios" class="cartao" style="display:none;">
                <h3 id="tituloCadastroUsuarios">Cadastro de usuários</h3>
                <p id="descricaoCadastroUsuarios">Cadastre pessoas autorizadas a acessar o sistema.</p>
                <form id="formCadastroUsuario" class="cadastro-usuarios-form">
                    <div class="form-grupo">
                        <label for="novoUsuarioNome">Nome completo</label>
                        <input id="novoUsuarioNome" type="text" required autocomplete="name">
                    </div>
                    <div class="form-grupo">
                        <label for="novoUsuarioEmail">E-mail institucional</label>
                        <input id="novoUsuarioEmail" type="email" required autocomplete="email">
                    </div>
                    <div class="form-grupo">
                        <label for="novoUsuarioSenha">Senha inicial</label>
                        <input id="novoUsuarioSenha" type="password" required minlength="6" autocomplete="new-password">
                    </div>
                    <div class="form-grupo" id="grupoTipoNovoUsuario">
                        <label for="novoUsuarioTipo">Perfil</label>
                        <select id="novoUsuarioTipo" required>
                            <option value="">Selecione o perfil</option>
                            <option value="professor">Professor</option>
                            <option value="tecnico">Técnico</option>
                            <option value="coordenador">Coordenador</option>
                        </select>
                    </div>
                    <div class="acoes-form">
                        <button type="submit" class="primario">Cadastrar usuário</button>
                    </div>
                </form>
                <div id="mensagemCadastroUsuario" class="alerta" role="status" aria-live="polite"></div>
            </section>

            <section id="areaRedefinirSenha" class="cartao gerenciar-secao" hidden>
                <h3>Redefinir senha de usuário</h3>
                <p>Gere uma senha provisória para entregar diretamente ao usuário. Oriente a pessoa a alterá-la após entrar no sistema.</p>
                <form id="formRedefinirSenha" class="cadastro-usuarios-form">
                    <div class="form-grupo">
                        <label for="usuarioRedefinirSenha">Usuário</label>
                        <select id="usuarioRedefinirSenha" required>
                            <option value="">Carregando usuários...</option>
                        </select>
                    </div>
                    <div class="acoes-form">
                        <button type="submit" class="primario">Gerar senha provisória</button>
                    </div>
                </form>
                <div id="mensagemRedefinirSenha" class="alerta" role="status" aria-live="polite"></div>
                <div id="senhaProvisoriaResultado" hidden>
                    <label for="senhaProvisoriaValor">Senha provisória (mostrada somente agora)</label>
                    <div class="controles">
                        <input id="senhaProvisoriaValor" type="text" readonly autocomplete="off" aria-label="Senha provisória gerada">
                        <button type="button" id="btnCopiarSenhaProvisoria">Copiar senha</button>
                    </div>
                </div>
            </section>

            <section class="cartao gerenciar-secao">
                <h3>Alterar minha senha</h3>
                <form id="formAlterarSenha" class="cadastro-usuarios-form">
                    <div class="form-grupo">
                        <label for="senhaAtual">Senha atual</label>
                        <input id="senhaAtual" type="password" required autocomplete="current-password">
                    </div>
                    <div class="form-grupo">
                        <label for="senhaNova">Nova senha</label>
                        <input id="senhaNova" type="password" required minlength="6" autocomplete="new-password">
                    </div>
                    <div class="form-grupo">
                        <label for="senhaNovaConfirmacao">Confirme a nova senha</label>
                        <input id="senhaNovaConfirmacao" type="password" required minlength="6" autocomplete="new-password">
                    </div>
                    <div class="acoes-form">
                        <button type="submit" class="primario">Alterar senha</button>
                    </div>
                </form>
                <div id="mensagemAlterarSenha" class="alerta" role="status" aria-live="polite"></div>
            </section>
        </main>

        <script src="js/gerenciar.js?v=20261118-reset-tecnico1"></script>
    </body>
</html>
