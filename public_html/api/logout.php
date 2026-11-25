<?php
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/auth.php';

iniciarSessaoAlbaLabs();
$cookieParams = session_get_cookie_params();
$cookieName = session_name();
$_SESSION = [];
session_destroy();
setcookie($cookieName, '', [
    'expires' => time() - 3600,
    'path' => $cookieParams['path'],
    'secure' => $cookieParams['secure'],
    'httponly' => true,
    'samesite' => 'Lax'
]);

echo json_encode(["sucesso" => true, "mensagem" => "Sessão encerrada."]);
