<?php
require_once __DIR__ . '/auth.php';
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

function exigirPaginaAlbaLabs(array $perfisPermitidos = []): array
{
    iniciarSessaoAlbaLabs();
    $usuario = $_SESSION['albalabs_usuario'] ?? null;
    if (!is_array($usuario) || empty($usuario['id']) || empty($usuario['tipo'])) {
        header('Location: login.html', true, 302);
        exit();
    }

    if ($perfisPermitidos && !in_array($usuario['tipo'], $perfisPermitidos, true)) {
        header('Location: aulas.php', true, 302);
        exit();
    }

    return $usuario;
}
