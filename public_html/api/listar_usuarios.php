<?php
require_once __DIR__ . '/auth.php';
$usuarioAutenticado = exigirPerfisAlbaLabs(['tecnico', 'coordenador']);
require_once __DIR__ . '/conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Método não permitido.']);
    exit();
}

try {
    if ($usuarioAutenticado['tipo'] === 'tecnico') {
        $stmt = $pdo->prepare("SELECT id, nome, email, tipo FROM usuarios WHERE tipo = 'professor' ORDER BY nome ASC");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("SELECT id, nome, email, tipo FROM usuarios WHERE id <> ? AND tipo IN ('professor', 'tecnico', 'coordenador') ORDER BY nome ASC");
        $stmt->execute([$usuarioAutenticado['id']]);
    }
    echo json_encode(['sucesso' => true, 'usuarios' => $stmt->fetchAll()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Não foi possível carregar os usuários.']);
}
