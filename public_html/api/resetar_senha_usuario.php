<?php
require_once __DIR__ . '/auth.php';
$usuarioAutenticado = exigirPerfisAlbaLabs(['tecnico', 'coordenador']);
require_once __DIR__ . '/conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Método não permitido.']);
    exit();
}

$dados = json_decode(file_get_contents('php://input'), true);
$idUsuario = filter_var($dados['idUsuario'] ?? null, FILTER_VALIDATE_INT);
if (!$idUsuario || $idUsuario === (int)$usuarioAutenticado['id']) {
    http_response_code(400);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Selecione outro usuário válido.']);
    exit();
}

try {
    if ($usuarioAutenticado['tipo'] === 'tecnico') {
        $consulta = $pdo->prepare("SELECT id, nome FROM usuarios WHERE id = ? AND tipo = 'professor' LIMIT 1");
        $consulta->execute([$idUsuario]);
    } else {
        $consulta = $pdo->prepare("SELECT id, nome FROM usuarios WHERE id = ? AND id <> ? AND tipo IN ('professor', 'tecnico', 'coordenador') LIMIT 1");
        $consulta->execute([$idUsuario, $usuarioAutenticado['id']]);
    }
    $alvo = $consulta->fetch();
    if (!$alvo) {
        http_response_code(404);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Usuário não encontrado ou não autorizado para redefinição.']);
        exit();
    }

    $senhaTemporaria = bin2hex(random_bytes(12));
    $hash = password_hash($senhaTemporaria, PASSWORD_DEFAULT);
    $atualizar = $pdo->prepare('UPDATE usuarios SET senha = ? WHERE id = ?');
    $atualizar->execute([$hash, $alvo['id']]);

    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Senha provisória gerada com sucesso.',
        'nome' => $alvo['nome'],
        'senhaTemporaria' => $senhaTemporaria
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Não foi possível redefinir a senha.']);
}
