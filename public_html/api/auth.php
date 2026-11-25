<?php
header('Content-Type: application/json; charset=UTF-8');

function iniciarSessaoAlbaLabs(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_name('albalabs_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

function exigirUsuarioAlbaLabs(): array
{
    iniciarSessaoAlbaLabs();
    $usuario = $_SESSION['albalabs_usuario'] ?? null;

    if (!is_array($usuario) || empty($usuario['id']) || empty($usuario['tipo'])) {
        http_response_code(401);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Faça login para continuar.'
        ]);
        exit();
    }

    return $usuario;
}

function exigirPerfisAlbaLabs(array $perfisPermitidos): array
{
    $usuario = exigirUsuarioAlbaLabs();
    if (!in_array($usuario['tipo'], $perfisPermitidos, true)) {
        http_response_code(403);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Você não tem permissão para esta ação.'
        ]);
        exit();
    }

    return $usuario;
}
