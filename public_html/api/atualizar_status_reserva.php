<?php
require_once __DIR__ . '/auth.php';
$usuarioAutenticado = exigirUsuarioAlbaLabs();
require_once __DIR__ . '/conexao.php';

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo !== 'POST') {
    echo json_encode(["sucesso" => false, "mensagem" => "Método não permitido."]);
    exit();
}

$corpo = file_get_contents("php://input");
$dados = json_decode($corpo, true);

if (!$dados) {
    echo json_encode(["sucesso" => false, "mensagem" => "Dados inválidos."]);
    exit();
}

$idReserva = intval($dados['idReserva'] ?? 0);
$novoStatus = trim($dados['status'] ?? '');
$usuarioTipo = $usuarioAutenticado['tipo'];
$usuarioNome = $usuarioAutenticado['nome'];

// 1. Verificação de Permissão:
// Coordenador, Técnico e Administrador podem aprovar, recusar e cancelar qualquer uma.
// O Professor pode CANCELAR a sua própria solicitação.
$perfisSuper = ['coordenador', 'tecnico', 'administrador'];
$ehSuper = in_array($usuarioTipo, $perfisSuper);

if (!$ehSuper && !($usuarioTipo === 'professor' && $novoStatus === 'cancelada')) {
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Acesso negado: você não tem permissão para esta ação."
    ]);
    exit();
}

if ($idReserva <= 0 || !in_array($novoStatus, ['confirmada', 'cancelada', 'pendente'])) {
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Parâmetros inválidos para atualização de status."
    ]);
    exit();
}

$motivoCancelamento = trim((string)($dados['motivo'] ?? ''));
if ($novoStatus === 'cancelada' && (strlen($motivoCancelamento) < 3 || strlen($motivoCancelamento) > 1000)) {
    http_response_code(400);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Informe o motivo do cancelamento (de 3 a 1.000 caracteres).'
    ]);
    exit();
}

try {
    // 2. Busca a solicitação e verifica se o professor é dono da reserva
    $stmtBusca = $pdo->prepare("
        SELECT r.solicitacao_id, r.professor, s.solicitante_nome, s.usuario_id
        FROM reservas r 
        LEFT JOIN solicitacoes s ON r.solicitacao_id = s.id 
        WHERE r.id = ?
    ");
    $stmtBusca->execute([$idReserva]);
    $reservaInfo = $stmtBusca->fetch();

    if (!$reservaInfo) {
        echo json_encode(["sucesso" => false, "mensagem" => "Reserva não encontrada."]);
        exit();
    }

    if (!$ehSuper) {
        // Se for professor, precisa ser o solicitante ou professor responsável
        $nomeProf = strtolower($usuarioNome);
        $solicitante = strtolower($reservaInfo['solicitante_nome'] ?? '');
        $profResp = strtolower($reservaInfo['professor'] ?? '');

        $donoSolicitacao = (int)($reservaInfo['usuario_id'] ?? 0) === (int)$usuarioAutenticado['id'];
        $registroLegadoProprio = empty($reservaInfo['usuario_id']) && $nomeProf === $solicitante;
        if (!$donoSolicitacao && !$registroLegadoProprio && $nomeProf !== $profResp) {
            echo json_encode([
                "sucesso" => false,
                "mensagem" => "Você só pode cancelar solicitações feitas por você mesmo(a)."
            ]);
            exit();
        }
    }

    $solicitacaoId = $reservaInfo['solicitacao_id'];

    if ($novoStatus === 'cancelada') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS cancelamentos (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            solicitacao_id INT NOT NULL,
            reserva_id INT NULL,
            usuario_id INT NULL,
            usuario_nome VARCHAR(120) NOT NULL,
            motivo TEXT NOT NULL,
            cancelado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cancelamentos_solicitacao (solicitacao_id),
            FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
        ) ENGINE=InnoDB");
    }

    $pdo->beginTransaction();
    if ($solicitacaoId) {
        $stmt = $pdo->prepare("UPDATE reservas SET status = ? WHERE solicitacao_id = ?");
        $stmt->execute([$novoStatus, $solicitacaoId]);
        $qtdAtualizada = $stmt->rowCount();

        $mensagem = $novoStatus === 'confirmada' 
            ? "Solicitação aprovada! Todos os {$qtdAtualizada} laboratório(s) e professores vinculados foram confirmados." 
            : "Solicitação recusada/cancelada para todos os laboratórios vinculados.";
    } else {
        $stmt = $pdo->prepare("UPDATE reservas SET status = ? WHERE id = ?");
        $stmt->execute([$novoStatus, $idReserva]);
        $mensagem = $novoStatus === 'confirmada' ? "Reserva aprovada com sucesso!" : "Reserva cancelada/recusada com sucesso!";
    }

    if ($novoStatus === 'cancelada') {
        $stmtCancelamento = $pdo->prepare('INSERT INTO cancelamentos (solicitacao_id, reserva_id, usuario_id, usuario_nome, motivo, cancelado_em) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())');
        $stmtCancelamento->execute([
            $solicitacaoId ?: $idReserva,
            $idReserva,
            $usuarioAutenticado['id'],
            $usuarioNome,
            $motivoCancelamento
        ]);
    }
    $pdo->commit();

    echo json_encode([
        "sucesso" => true,
        "mensagem" => $mensagem,
        "idReserva" => $idReserva,
        "novoStatus" => $novoStatus
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível atualizar o status e registrar o cancelamento.'
    ]);
}
