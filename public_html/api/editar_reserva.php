<?php
require_once __DIR__ . '/auth.php';
$usuarioAutenticado = exigirUsuarioAlbaLabs();
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/dias_especiais_schema.php';

$metodo = $_SERVER['REQUEST_METHOD'];

foreach ([
    'requisicao_materiais_path' => 'VARCHAR(255) NULL',
    'pop_aula_path' => 'VARCHAR(255) NULL'
] as $coluna => $tipo) {
    try {
        $pdo->exec("ALTER TABLE solicitacoes ADD COLUMN {$coluna} {$tipo}");
    } catch (Exception $e) {
        // A coluna já existe ou o usuário do banco não tem permissão para DDL.
    }
}

if ($metodo !== 'POST') {
    echo json_encode(["sucesso" => false, "mensagem" => "Método não permitido."]);
    exit();
}

$dados = $_POST;
if (empty($dados)) {
    $corpo = file_get_contents("php://input");
    $dados = json_decode($corpo, true);
}

if (!$dados) {
    echo json_encode(["sucesso" => false, "mensagem" => "Dados inválidos."]);
    exit();
}

$idReserva = intval($dados['idReserva'] ?? 0);
$curso = trim($dados['curso'] ?? '');
$turma = trim($dados['turma'] ?? '');
$materia = trim($dados['materia'] ?? '');
$professor = trim($dados['professor'] ?? '');
$professorAux = trim($dados['professorAux'] ?? '');
$professorAuxOriginal = trim($dados['professorAuxOriginal'] ?? '');
$data = trim($dados['data'] ?? '');
$periodo = trim($dados['periodo'] ?? '');
$usarLabEngenharia = filter_var($dados['usarLabEngenharia'] ?? false, FILTER_VALIDATE_BOOLEAN);
$usuarioTipo = $usuarioAutenticado['tipo'];
$usuarioNome = $usuarioAutenticado['nome'];

$perfisSuper = ['coordenador', 'tecnico', 'administrador'];
$ehSuper = in_array($usuarioTipo, $perfisSuper);

if ($idReserva <= 0 || empty($curso) || empty($turma) || empty($materia) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $data) || !in_array($periodo, ['manha', 'noite'], true)) {
    echo json_encode(["sucesso" => false, "mensagem" => "Preencha os campos obrigatórios."]);
    exit();
}

try {
    garantirTabelaDiasEspeciais($pdo);
    $stmtBusca = $pdo->prepare("
        SELECT r.solicitacao_id, r.professor, r.data_reserva, r.periodo, r.status, r.laboratorio_id, s.solicitante_nome, s.usuario_id
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

    if ($data !== (string)$reservaInfo['data_reserva']) {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $data, $partes) || !checkdate((int)$partes[2], (int)$partes[3], (int)$partes[1])) {
            http_response_code(400);
            echo json_encode(["sucesso" => false, "mensagem" => "Informe uma data válida."]);
            exit();
        }
        $diaSemana = (int)date('w', strtotime($data));
        if ($diaSemana === 0 || $diaSemana === 6) {
            http_response_code(400);
            echo json_encode(["sucesso" => false, "mensagem" => "Aulas só podem ser marcadas de segunda a sexta."]);
            exit();
        }
        $stmtDiaEspecial = $pdo->prepare('SELECT COUNT(*) FROM dias_especiais WHERE data = ?');
        $stmtDiaEspecial->execute([$data]);
        if ((int)$stmtDiaEspecial->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(["sucesso" => false, "mensagem" => "A nova data está marcada como feriado, recesso ou emenda. Escolha outro dia."]);
            exit();
        }
    }

    if (!$ehSuper) {
        $nomeProf = strtolower($usuarioNome);
        $solicitante = strtolower($reservaInfo['solicitante_nome'] ?? '');
        $profResp = strtolower($reservaInfo['professor'] ?? '');

        $donoSolicitacao = (int)($reservaInfo['usuario_id'] ?? 0) === (int)$usuarioAutenticado['id'];
        $registroLegadoProprio = empty($reservaInfo['usuario_id']) && $nomeProf === $solicitante;
        if (!$donoSolicitacao && !$registroLegadoProprio && $nomeProf !== $profResp) {
            echo json_encode(["sucesso" => false, "mensagem" => "Você só pode editar aulas que você solicitou."]);
            exit();
        }
    }

    $salvarUpload = function($campo) {
        if (!isset($_FILES[$campo]) || $_FILES[$campo]['error'] === UPLOAD_ERR_NO_FILE) return null;
        if ($_FILES[$campo]['error'] !== UPLOAD_ERR_OK) throw new RuntimeException("Não foi possível receber um dos arquivos.");
        $extensoesPermitidas = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
        $extensao = strtolower(pathinfo($_FILES[$campo]['name'], PATHINFO_EXTENSION));
        if (!in_array($extensao, $extensoesPermitidas, true) || $_FILES[$campo]['size'] > 5 * 1024 * 1024) {
            throw new RuntimeException("Cada anexo deve ser PDF, DOC, DOCX, XLS ou XLSX e ter até 5 MB.");
        }
        $pastaUploads = __DIR__ . '/../uploads';
        if (!is_dir($pastaUploads) && !mkdir($pastaUploads, 0755, true) && !is_dir($pastaUploads)) {
            throw new RuntimeException("Não foi possível preparar a pasta de anexos.");
        }
        $nomeSeguro = uniqid('anexo_') . '.' . $extensao;
        if (!move_uploaded_file($_FILES[$campo]['tmp_name'], $pastaUploads . '/' . $nomeSeguro)) {
            throw new RuntimeException("Não foi possível salvar um dos arquivos.");
        }
        return 'uploads/' . $nomeSeguro;
    };
    $materiaisPath = $salvarUpload('anexo_materiais');
    $popPath = $salvarUpload('anexo_pop');

    $solicitacaoId = $reservaInfo['solicitacao_id'];

    $pdo->beginTransaction();
    if ($solicitacaoId) {
        $stmtGrupo = $pdo->prepare("SELECT id, laboratorio_id, status FROM reservas WHERE solicitacao_id = ? AND data_reserva = ? ORDER BY id FOR UPDATE");
        $stmtGrupo->execute([$solicitacaoId, $reservaInfo['data_reserva']]);
        $reservasGrupo = $stmtGrupo->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $stmtGrupo = $pdo->prepare("SELECT id, laboratorio_id, status FROM reservas WHERE id = ? FOR UPDATE");
        $stmtGrupo->execute([$idReserva]);
        $reservasGrupo = $stmtGrupo->fetchAll(PDO::FETCH_ASSOC);
    }
    if (!$reservasGrupo) {
        throw new RuntimeException('Aula não encontrada para edição. Atualize a página e tente novamente.');
    }

    // Serializa alterações e novas solicitações enquanto as capacidades separadas são conferidas.
    $labsBloqueados = $pdo->query('SELECT id FROM laboratorios WHERE ativo = 1 ORDER BY id FOR UPDATE')->fetchAll(PDO::FETCH_COLUMN);
    $stmtEngAtivo = $pdo->query("SELECT id FROM laboratorios WHERE ativo = 1 AND nome IN ('Lab de Engenharia', 'Laboratório de Engenharia') LIMIT 1");
    $idLabEngenharia = $stmtEngAtivo->fetchColumn();
    if ($usarLabEngenharia && !$idLabEngenharia) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["sucesso" => false, "mensagem" => "Não há laboratório disponível."]);
        exit();
    }
    $capacidadeComum = count($labsBloqueados) - ($idLabEngenharia ? 1 : 0);
    $idsGrupo = array_map(static fn($linha) => (int)$linha['id'], $reservasGrupo);
    $marcadores = implode(',', array_fill(0, count($idsGrupo), '?'));
    $reservasAtivas = array_values(array_filter($reservasGrupo, static fn($linha) => $linha['status'] !== 'cancelada'));
    if ($reservasAtivas) {
        $stmtOcupadasComuns = $idLabEngenharia
            ? $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE data_reserva = ? AND periodo = ? AND status <> 'cancelada' AND id NOT IN ({$marcadores}) AND (laboratorio_id IS NULL OR laboratorio_id <> ?)")
            : $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE data_reserva = ? AND periodo = ? AND status <> 'cancelada' AND id NOT IN ({$marcadores})");
        $paramsComuns = [$data, $periodo, ...$idsGrupo];
        if ($idLabEngenharia) $paramsComuns[] = $idLabEngenharia;
        $stmtOcupadasComuns->execute($paramsComuns);
        $ocupadasComuns = (int)$stmtOcupadasComuns->fetchColumn();
        $quantidadeComumSolicitada = count($reservasAtivas) - ($usarLabEngenharia ? 1 : 0);
        $engOcupado = false;
        if ($usarLabEngenharia && $idLabEngenharia) {
            $stmtEngOcupado = $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE laboratorio_id = ? AND data_reserva = ? AND periodo = ? AND status <> 'cancelada' AND id NOT IN ({$marcadores})");
            $stmtEngOcupado->execute(array_merge([$idLabEngenharia, $data, $periodo], $idsGrupo));
            $engOcupado = (int)$stmtEngOcupado->fetchColumn() > 0;
        }
        if ($quantidadeComumSolicitada < 0 || $quantidadeComumSolicitada > $capacidadeComum || $engOcupado || ($quantidadeComumSolicitada > 0 && $ocupadasComuns + $quantidadeComumSolicitada > $capacidadeComum)) {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode(["sucesso" => false, "mensagem" => "Não há laboratório disponível."]);
            exit();
        }
    }
    if ($solicitacaoId) {
        $sqlUpdSol = "UPDATE solicitacoes SET curso = ?, turma = ?, materia = ?";
        $paramsSol = [$curso, $turma, $materia];
        if ($materiaisPath !== null) {
            $sqlUpdSol .= ", requisicao_materiais_path = ?";
            $paramsSol[] = $materiaisPath;
        }
        if ($popPath !== null) {
            $sqlUpdSol .= ", pop_aula_path = ?";
            $paramsSol[] = $popPath;
        }
        $sqlUpdSol .= " WHERE id = ?";
        $paramsSol[] = $solicitacaoId;
        $stmtUpdSol = $pdo->prepare($sqlUpdSol);
        $stmtUpdSol->execute($paramsSol);

        // Só registra vínculo físico para o Lab de Engenharia quando a opção foi marcada.
        $sqlRes = "UPDATE reservas SET laboratorio_id = NULL, data_reserva = ?, periodo = ? WHERE solicitacao_id = ? AND data_reserva = ?";
        $stmtUpdRes = $pdo->prepare($sqlRes);
        $stmtUpdRes->execute([$data, $periodo, $solicitacaoId, $reservaInfo['data_reserva']]);
        if ($usarLabEngenharia && $reservasAtivas) {
            $stmtUsarEngenharia = $pdo->prepare('UPDATE reservas SET laboratorio_id = ? WHERE id = ?');
            $stmtUsarEngenharia->execute([$idLabEngenharia, $reservasAtivas[0]['id']]);
        }


        if ($professorAuxOriginal !== '') {
            $novoProfessorReserva = $professorAux !== '' ? $professorAux : $professor;
            $stmtAux = $pdo->prepare("UPDATE reservas SET professor = ? WHERE solicitacao_id = ? AND professor = ?");
            $stmtAux->execute([$novoProfessorReserva, $solicitacaoId, $professorAuxOriginal]);
        } elseif ($professorAux !== '') {
            $stmtAux = $pdo->prepare("UPDATE reservas SET professor = ? WHERE id = ? AND professor = ?");
            $stmtAux->execute([$professorAux, $idReserva, $professor]);
        }
    } else {
        $stmtUpdRes = $pdo->prepare("UPDATE reservas SET laboratorio_id = NULL, data_reserva = ?, periodo = ? WHERE id = ?");
        $stmtUpdRes->execute([$data, $periodo, $idReserva]);
        if ($usarLabEngenharia && $reservasAtivas) {
            $stmtUsarEngenharia = $pdo->prepare('UPDATE reservas SET laboratorio_id = ? WHERE id = ?');
            $stmtUsarEngenharia->execute([$idLabEngenharia, $idReserva]);
        }
    }

    $pdo->commit();

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Aula atualizada com sucesso!"
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($e instanceof PDOException && $e->getCode() === '23000') {
        http_response_code(409);
            echo json_encode(["sucesso" => false, "mensagem" => "Não há laboratório disponível."]);
        exit();
    }
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro ao salvar alterações: " . $e->getMessage()
    ]);
}
