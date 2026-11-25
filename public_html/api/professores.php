<?php
require_once __DIR__ . '/auth.php';
exigirUsuarioAlbaLabs();
require_once __DIR__ . '/conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["sucesso" => false, "mensagem" => "Método não permitido."]);
    exit();
}

try {
    $stmt = $pdo->query("SELECT DISTINCT nome FROM usuarios WHERE tipo IN ('professor', 'coordenador') ORDER BY nome ASC");
    echo json_encode(["sucesso" => true, "professores" => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível carregar os professores."]);
}
