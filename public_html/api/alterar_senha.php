<?php
require_once __DIR__ . '/auth.php';
$usuario = exigirPerfisAlbaLabs(['professor', 'tecnico', 'coordenador']);
require_once __DIR__ . '/conexao.php';

$dados = json_decode(file_get_contents('php://input'), true);
if (!is_array($dados)) {
    http_response_code(400);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Dados inválidos.']);
    exit();
}

$senhaAtual = $dados['senhaAtual'] ?? '';
$senhaNova = $dados['senhaNova'] ?? '';
$senhaNovaConfirmacao = $dados['senhaNovaConfirmacao'] ?? '';

if ($senhaAtual === '' || $senhaNova === '' || $senhaNovaConfirmacao === '') {
    http_response_code(400);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Preencha todos os campos de senha.']);
    exit();
}
if (strlen($senhaNova) < 6) {
    http_response_code(400);
    echo json_encode(['sucesso' => false, 'mensagem' => 'A nova senha precisa ter pelo menos 6 caracteres.']);
    exit();
}
if (!hash_equals($senhaNova, $senhaNovaConfirmacao)) {
    http_response_code(400);
    echo json_encode(['sucesso' => false, 'mensagem' => 'A confirmação não corresponde à nova senha.']);
    exit();
}

try {
    $consulta = $pdo->prepare('SELECT senha FROM usuarios WHERE id = ? LIMIT 1');
    $consulta->execute([$usuario['id']]);
    $senhaArmazenada = $consulta->fetchColumn();
    if (!is_string($senhaArmazenada)) {
        http_response_code(404);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Usuário não encontrado.']);
        exit();
    }

    $senhaAtualValida = password_verify($senhaAtual, $senhaArmazenada)
        || ((password_get_info($senhaArmazenada)['algo'] ?? null) === null
            && hash_equals($senhaArmazenada, $senhaAtual));
    if (!$senhaAtualValida) {
        http_response_code(400);
        echo json_encode(['sucesso' => false, 'mensagem' => 'A senha atual está incorreta.']);
        exit();
    }

    $hash = password_hash($senhaNova, PASSWORD_DEFAULT);
    $atualizar = $pdo->prepare('UPDATE usuarios SET senha = ? WHERE id = ?');
    $atualizar->execute([$hash, $usuario['id']]);
    session_regenerate_id(true);

    echo json_encode(['sucesso' => true, 'mensagem' => 'Senha alterada com sucesso.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Não foi possível alterar a senha.']);
}
