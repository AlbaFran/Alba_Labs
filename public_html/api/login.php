<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/conexao.php';
iniciarSessaoAlbaLabs();

$corpoRequisicao = file_get_contents("php://input");
$dados = json_decode($corpoRequisicao, true);

if (!$dados) {
    echo json_encode(["sucesso" => false, "mensagem" => "Dados inválidos."]);
    exit();
}

$email = trim(strtolower($dados['email'] ?? ''));
$senha = $dados['senha'] ?? '';

if (empty($email) || empty($senha)) {
    echo json_encode(["sucesso" => false, "mensagem" => "Informe e-mail e senha."]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT id, nome, email, senha, tipo FROM usuarios WHERE LOWER(TRIM(email)) = ? ORDER BY id ASC");
    $stmt->execute([$email]);
    $usuariosCorrespondentes = $stmt->fetchAll();

    foreach ($usuariosCorrespondentes as $usuario) {
        $senhaValida = false;
        // 1. Tenta validar com hash bcrypt
        if (password_verify($senha, $usuario['senha'])) {
            $senhaValida = true;
        } 
        // Compatibilidade temporária com contas antigas em texto puro.
        // Nunca aceite um hash como senha: isso permitiria transformar o hash
        // salvo em uma nova senha e invalidaria a senha original.
        else if ((password_get_info($usuario['senha'])['algo'] ?? null) === null
            && hash_equals($usuario['senha'], $senha)) {
            $senhaValida = true;
            // Atualiza para hash seguro
            try {
                $novoHash = password_hash($senha, PASSWORD_DEFAULT);
                $up = $pdo->prepare("UPDATE usuarios SET senha = ? WHERE id = ?");
                $up->execute([$novoHash, $usuario['id']]);
            } catch (Exception $eIgnored) {}
        }

        if ($senhaValida) {
            session_regenerate_id(true);
            unset($usuario['senha']);
            $_SESSION['albalabs_usuario'] = $usuario;
            echo json_encode([
                "sucesso" => true,
                "mensagem" => "Login realizado com sucesso!",
                "usuario" => $usuario
            ]);
            exit();
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível validar o login no banco."]);
    exit();
}

echo json_encode(["sucesso" => false, "mensagem" => "E-mail ou senha incorretos."]);
