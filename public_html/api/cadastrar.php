<?php
require_once __DIR__ . '/auth.php';
$usuarioAutenticado = exigirUsuarioAlbaLabs();
$perfisPermitidos = [
    'tecnico' => ['professor'],
    'coordenador' => ['tecnico', 'professor', 'coordenador']
];
$tiposPermitidos = $perfisPermitidos[$usuarioAutenticado['tipo']] ?? null;
if ($tiposPermitidos === null) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Seu perfil não pode cadastrar usuários."]);
    exit();
}

require_once __DIR__ . '/conexao.php';

$corpoRequisicao = file_get_contents("php://input");
$dados = json_decode($corpoRequisicao, true);

if (!$dados) {
    echo json_encode(["sucesso" => false, "mensagem" => "Dados inválidos."]);
    exit();
}

$nome = trim($dados['nome'] ?? '');
$email = trim(strtolower($dados['email'] ?? ''));
$senha = $dados['senha'] ?? '';
$tipo = trim($dados['tipo'] ?? '');

if (empty($nome) || empty($email) || empty($senha)) {
    echo json_encode(["sucesso" => false, "mensagem" => "Todos os campos são obrigatórios."]);
    exit();
}
if (!in_array($tipo, $tiposPermitidos, true)) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Seu perfil não pode cadastrar esse tipo de usuário."]);
    exit();
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($senha) < 6) {
    http_response_code(400);
    echo json_encode(["sucesso" => false, "mensagem" => "Informe um e-mail válido e uma senha com pelo menos 6 caracteres."]);
    exit();
}

try {
    // 1. Verifica se o email já existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE LOWER(email) = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(["sucesso" => false, "mensagem" => "Este e-mail já está cadastrado no banco."]);
        exit();
    }

    // 2. Insere o novo usuário
    $insert = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)");
    $hash = password_hash($senha, PASSWORD_DEFAULT);
    $insert->execute([$nome, $email, $hash, $tipo]);

    echo json_encode(["sucesso" => true, "mensagem" => "Usuário cadastrado com sucesso."]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível salvar o usuário."]);
}
