<?php
require_once __DIR__ . '/auth.php';
$usuario = exigirUsuarioAlbaLabs();
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/dias_especiais_schema.php';

$perfisGestores = ['tecnico', 'coordenador'];
$podeEditar = in_array($usuario['tipo'], $perfisGestores, true);
$metodo = $_SERVER['REQUEST_METHOD'];

try {
    garantirTabelaDiasEspeciais($pdo);

    if ($metodo === 'GET') {
        $stmt = $pdo->query("SELECT DATE_FORMAT(data, '%Y-%m-%d') AS data, tipo, descricao FROM dias_especiais ORDER BY data");
        echo json_encode(['sucesso' => true, 'dias' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit();
    }

    if (!$podeEditar) {
        http_response_code(403);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Somente a equipe técnica ou a coordenação pode marcar essas datas.']);
        exit();
    }

    if (!in_array($metodo, ['POST', 'DELETE'], true)) {
        http_response_code(405);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Método não permitido.']);
        exit();
    }

    $dados = json_decode(file_get_contents('php://input'), true) ?? [];
    $data = (string)($dados['data'] ?? '');
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $data, $partes) || !checkdate((int)$partes[2], (int)$partes[3], (int)$partes[1])) {
        http_response_code(400);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Informe uma data válida.']);
        exit();
    }
    $diaSemana = (int)date('w', strtotime($data));
    if ($diaSemana === 0 || $diaSemana === 6) {
        http_response_code(400);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Marque feriados, recessos ou emendas apenas em dias úteis.']);
        exit();
    }

    if ($metodo === 'DELETE') {
        $stmt = $pdo->prepare('DELETE FROM dias_especiais WHERE data = ?');
        $stmt->execute([$data]);
        echo json_encode(['sucesso' => true, 'mensagem' => 'Marcação removida.']);
        exit();
    }

    $tipo = (string)($dados['tipo'] ?? '');
    $descricao = trim((string)($dados['descricao'] ?? ''));
    $quantidadeCaracteres = preg_match_all('/./us', $descricao);
    if (!in_array($tipo, ['feriado', 'recesso', 'emenda'], true) || $quantidadeCaracteres === false || $quantidadeCaracteres > 180) {
        http_response_code(400);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Confira o tipo e a observação da data.']);
        exit();
    }
    $descricao = $descricao === '' ? null : $descricao;
    $stmt = $pdo->prepare("INSERT INTO dias_especiais (data, tipo, descricao, usuario_id, usuario_nome)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), descricao = VALUES(descricao), usuario_id = VALUES(usuario_id), usuario_nome = VALUES(usuario_nome)");
    $stmt->execute([$data, $tipo, $descricao, $usuario['id'], $usuario['nome']]);
    echo json_encode(['sucesso' => true, 'mensagem' => 'Data marcada no calendário.']);
} catch (Throwable $e) {
    error_log('Erro ao atualizar dia especial: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Não foi possível atualizar a marcação do calendário.']);
}
