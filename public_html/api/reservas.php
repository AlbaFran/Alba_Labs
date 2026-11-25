<?php
require_once __DIR__ . '/auth.php';
$usuarioAutenticado = exigirUsuarioAlbaLabs();
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/dias_especiais_schema.php';

$metodo = $_SERVER['REQUEST_METHOD'];

try {
    garantirTabelaDiasEspeciais($pdo);
    $stmtNomeEngenharia = $pdo->query("SELECT id FROM laboratorios WHERE nome = 'Lab de Engenharia' LIMIT 1");
    if (!$stmtNomeEngenharia->fetchColumn()) {
        $pdo->exec("UPDATE laboratorios SET nome = 'Lab de Engenharia' WHERE nome = 'Laboratório de Engenharia'");
    }
} catch (Exception $e) {
    // A atualização do nome é compatível com instalações já existentes.
}

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

// Solicitações ocupam vagas por quantidade; a sala física não é selecionada no agendamento.
// A sala física pode permanecer nula: a capacidade é controlada pela quantidade de vagas
// em cada data e período, sem exigir que o solicitante ou a equipe selecione uma sala.
$indiceLegadoReservaPresente = true;
try {
    $colunaAtiva = $pdo->prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reservas' AND column_name = 'laboratorio_ativo_id'");
    $colunaAtiva->execute();
    if (!(int)$colunaAtiva->fetchColumn()) {
        $pdo->exec("ALTER TABLE reservas ADD COLUMN laboratorio_ativo_id INT GENERATED ALWAYS AS (CASE WHEN status = 'cancelada' THEN NULL ELSE laboratorio_id END) STORED");
    }

    $indiceAtivo = $pdo->prepare("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'reservas' AND index_name = 'uq_lab_data_periodo_ativo'");
    $indiceAtivo->execute();
    if (!(int)$indiceAtivo->fetchColumn()) {
        $pdo->exec("ALTER TABLE reservas ADD UNIQUE KEY uq_lab_data_periodo_ativo (laboratorio_ativo_id, data_reserva, periodo)");
    }

    $colunaLaboratorio = $pdo->prepare("SELECT is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reservas' AND column_name = 'laboratorio_id'");
    $colunaLaboratorio->execute();
    if (strtoupper((string)$colunaLaboratorio->fetchColumn()) !== 'YES') {
        $pdo->exec("ALTER TABLE reservas MODIFY laboratorio_id INT NULL");
    }

    $indiceAntigo = $pdo->prepare("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'reservas' AND index_name = 'uq_lab_data_periodo'");
    $indiceAntigo->execute();
    if ((int)$indiceAntigo->fetchColumn()) {
        $pdo->exec("ALTER TABLE reservas DROP INDEX uq_lab_data_periodo");
    }
    $indiceAntigo->execute();
    $indiceLegadoReservaPresente = (int)$indiceAntigo->fetchColumn() > 0;
} catch (Throwable $e) {
    error_log('Falha ao atualizar a regra de disponibilidade de reservas: ' . $e->getMessage());
}

// ==========================================
// 1. GET: Retorna todas as reservas do MySQL
// ==========================================
if ($metodo === 'GET') {
    try {
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

        $sql = "
            SELECT 
                r.id AS idReserva,
                r.solicitacao_id AS idSolicitacao,
                r.data_reserva AS data,
                r.laboratorio_id AS idLaboratorio,
                l.nome AS laboratorio,
                r.periodo,
                r.professor,
                r.status,
                s.curso,
                s.turma,
                s.materia,
                s.quantidade_labs AS quantidadeLabs,
                s.solicitante_nome AS solicitante,
                s.requisicao_materiais_path,
                s.pop_aula_path,
                r.anexo_path AS anexo_path,
                ca.usuario_nome AS canceladoPor,
                ca.motivo AS motivoCancelamento,
                ca.cancelado_em AS canceladoEm
            FROM reservas r
            LEFT JOIN laboratorios l ON r.laboratorio_id = l.id
            JOIN solicitacoes s ON r.solicitacao_id = s.id
            LEFT JOIN (
                SELECT c.*
                FROM cancelamentos c
                INNER JOIN (
                    SELECT solicitacao_id, MAX(id) AS ultimo_id
                    FROM cancelamentos
                    GROUP BY solicitacao_id
                ) ult ON ult.ultimo_id = c.id
            ) ca ON ca.solicitacao_id = s.id
            ORDER BY r.data_reserva ASC, r.periodo ASC, l.nome ASC
        ";

        $stmt = $pdo->query($sql);
        $reservas = $stmt->fetchAll();

        echo json_encode([
            "sucesso" => true,
            "reservas" => $reservas
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Erro ao buscar reservas: " . $e->getMessage()
        ]);
    }
    exit();
}

// ==========================================
// 2. POST: Cadastra nova solicitação no MySQL
// ==========================================
if ($metodo === 'POST') {
    $perfisComSolicitacao = ['professor', 'tecnico', 'coordenador', 'administrador'];
    if (!in_array($usuarioAutenticado['tipo'], $perfisComSolicitacao, true)) {
        http_response_code(403);
        echo json_encode(["sucesso" => false, "mensagem" => "Seu perfil não pode criar solicitações."]);
        exit();
    }

    $dados = [];
    if (!empty($_POST)) {
        $dados = $_POST;
        if (isset($dados['datas']) && is_string($dados['datas'])) {
            $dados['datas'] = json_decode($dados['datas'], true) ?? [];
        }
        if (isset($dados['professores']) && is_string($dados['professores'])) {
            $dados['professores'] = json_decode($dados['professores'], true) ?? [];
        }
    } else {
        $corpo = file_get_contents("php://input");
        $dados = json_decode($corpo, true) ?? [];
    }

    if (empty($dados)) {
        echo json_encode(["sucesso" => false, "mensagem" => "Dados inválidos."]);
        exit();
    }

    $nomeSolicitante = trim($usuarioAutenticado['nome']);
    $professorResponsavel = trim((string)($dados['professor'] ?? ''));
    $curso = trim($dados['curso'] ?? '');
    $turma = trim($dados['turma'] ?? '');
    $materia = trim($dados['materia'] ?? '');
    $quantidade = intval($dados['quantidade'] ?? 1);
    $usarLabEngenharia = filter_var($dados['usarLabEngenharia'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $periodo = $dados['periodo'] ?? 'manha';
    $professores = $dados['professores'] ?? [$professorResponsavel];
    $datas = $dados['datas'] ?? [];

    if (!is_array($datas) || array_filter($datas, static fn($data) => !is_string($data))) {
        http_response_code(400);
        echo json_encode(["sucesso" => false, "mensagem" => "Informe datas válidas para a solicitação."]);
        exit();
    }
    if (empty($nomeSolicitante) || empty($professorResponsavel) || empty($curso) || empty($turma) || empty($materia) || empty($datas)) {
        echo json_encode(["sucesso" => false, "mensagem" => "Preencha todos os campos obrigatórios e adicione pelo menos uma data."]);
        exit();
    }
    if (!is_array($professores)) {
        http_response_code(400);
        echo json_encode(["sucesso" => false, "mensagem" => "Informe um professor responsável para cada laboratório."]);
        exit();
    }
    $professores = array_values(array_map(static fn($nome) => trim((string)$nome), $professores));
    if ($quantidade < 1 || $quantidade > 5) {
        echo json_encode(["sucesso" => false, "mensagem" => "Informe a quantidade de laboratórios necessária."]);
        exit();
    }
    try {
        $stmtLabs = $pdo->query("SELECT id, nome FROM laboratorios WHERE ativo = 1 ORDER BY id ASC");
        $todosLabs = $stmtLabs->fetchAll();
    } catch (Exception $e) {
        echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível verificar os laboratórios disponíveis."]);
        exit();
    }
    $labEngenharia = null;
    foreach ($todosLabs as $lab) {
        if (in_array($lab['nome'], ['Lab de Engenharia', 'Laboratório de Engenharia'], true)) {
            $labEngenharia = $lab;
            break;
        }
    }
    if ($usarLabEngenharia && !$labEngenharia) {
        http_response_code(409);
        echo json_encode(["sucesso" => false, "mensagem" => "Não há laboratório disponível."]);
        exit();
    }
    $quantidadeTotalLabs = $quantidade;
    $quantidadeLabsComuns = $quantidadeTotalLabs - ($usarLabEngenharia ? 1 : 0);
    $capacidadeComum = count($todosLabs) - ($labEngenharia ? 1 : 0);
    if ($quantidadeLabsComuns < 0 || $quantidadeLabsComuns > $capacidadeComum) {
        http_response_code(400);
        echo json_encode(["sucesso" => false, "mensagem" => "Não há laboratório disponível."]);
        exit();
    }
    if (count($professores) !== $quantidadeTotalLabs || in_array('', $professores, true)) {
        http_response_code(400);
        echo json_encode(["sucesso" => false, "mensagem" => "Informe o professor responsável por cada laboratório solicitado."]);
        exit();
    }
    $professores[0] = $professorResponsavel;

    $datas = array_values(array_unique($datas));
    foreach ($datas as $data) {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $data, $partes) || !checkdate((int)$partes[2], (int)$partes[3], (int)$partes[1])) {
            http_response_code(400);
            echo json_encode(["sucesso" => false, "mensagem" => "Uma das datas informadas é inválida."]);
            exit();
        }
        $diaSemana = (int)date('w', strtotime($data));
        if ($diaSemana === 0 || $diaSemana === 6) {
            http_response_code(400);
            echo json_encode(["sucesso" => false, "mensagem" => "Não é possível agendar aulas aos sábados ou domingos."]);
            exit();
        }
    }

        $salvarUpload = function($campo) {
            if (!isset($_FILES[$campo]) || $_FILES[$campo]['error'] === UPLOAD_ERR_NO_FILE) return ['path' => null];
            if ($_FILES[$campo]['error'] !== UPLOAD_ERR_OK) return ['erro' => 'Falha ao enviar um dos arquivos.'];
            $permitidas = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
            $ext = strtolower(pathinfo($_FILES[$campo]['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $permitidas, true) || $_FILES[$campo]['size'] > 5 * 1024 * 1024) {
                return ['erro' => 'Cada anexo deve ser PDF, DOC, DOCX, XLS ou XLSX e ter até 5 MB.'];
            }
            $dir = __DIR__ . '/../uploads';
            if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) return ['erro' => 'Não foi possível preparar a pasta de anexos.'];
            $nome = uniqid('anexo_') . '.' . $ext;
            if (!move_uploaded_file($_FILES[$campo]['tmp_name'], $dir . '/' . $nome)) return ['erro' => 'Não foi possível salvar um dos arquivos.'];
            return ['path' => 'uploads/' . $nome];
        };
        $uploadMateriais = $salvarUpload('anexo_materiais');
        $uploadPop = $salvarUpload('anexo_pop');
        foreach ([$uploadMateriais, $uploadPop] as $upload) {
            if (isset($upload['erro'])) {
                echo json_encode(["sucesso" => false, "mensagem" => $upload['erro']]);
                exit();
            }
        }
        $anexoPath = null;
        if (isset($_FILES['anexo']) && $_FILES['anexo']['error'] === UPLOAD_ERR_OK) {
            $uploadLegado = $salvarUpload('anexo');
            if (isset($uploadLegado['erro'])) {
                echo json_encode(["sucesso" => false, "mensagem" => $uploadLegado['erro']]);
                exit();
            }
            $anexoPath = $uploadLegado['path'];
        }
        $materiaisPath = $uploadMateriais['path'];
        $popPath = $uploadPop['path'];

    try {
        // Garante que a coluna anexo_path existe na tabela reservas ANTES da transação
        try {
            $pdo->exec("ALTER TABLE reservas ADD COLUMN anexo_path VARCHAR(255) NULL");
        } catch (Exception $colEx) {
            // Coluna já existe ou sem privilégio DDL
        }

        // 1. Serializa solicitações concorrentes e valida capacidade por quantidade.
        $pdo->beginTransaction();
        $labsBloqueados = $pdo->query('SELECT id FROM laboratorios WHERE ativo = 1 ORDER BY id FOR UPDATE')->fetchAll(PDO::FETCH_COLUMN);
        $stmtEngAtivo = $pdo->query("SELECT id FROM laboratorios WHERE ativo = 1 AND nome IN ('Lab de Engenharia', 'Laboratório de Engenharia') LIMIT 1");
        $idLabEngenharia = $stmtEngAtivo->fetchColumn();
        $capacidadeComum = count($labsBloqueados) - ($idLabEngenharia ? 1 : 0);
        $stmtDiaEspecial = $pdo->prepare('SELECT COUNT(*) FROM dias_especiais WHERE data = ?');
        foreach ($datas as $data) {
            $stmtDiaEspecial->execute([$data]);
            if ((int)$stmtDiaEspecial->fetchColumn() > 0) {
                $pdo->rollBack();
                http_response_code(409);
                echo json_encode(["sucesso" => false, "mensagem" => "Uma das datas está marcada como feriado, recesso ou emenda. Escolha outra data."]);
                exit();
            }
        }
        if ($usarLabEngenharia && !$idLabEngenharia) {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode(["sucesso" => false, "mensagem" => "Não há laboratório disponível."]);
            exit();
        }
        if ($quantidadeLabsComuns > $capacidadeComum) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(["sucesso" => false, "mensagem" => "Não há laboratório disponível."]);
            exit();
        }
        $stmtOcupadosComuns = $idLabEngenharia
            ? $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE data_reserva = ? AND periodo = ? AND status <> 'cancelada' AND (laboratorio_id IS NULL OR laboratorio_id <> ?)")
            : $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE data_reserva = ? AND periodo = ? AND status <> 'cancelada'");
        $stmtEngOcupado = $idLabEngenharia
            ? $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE laboratorio_id = ? AND data_reserva = ? AND periodo = ? AND status <> 'cancelada'")
            : null;
        foreach ($datas as $data) {
            $stmtOcupadosComuns->execute($idLabEngenharia ? [$data, $periodo, $idLabEngenharia] : [$data, $periodo]);
            $ocupadosComuns = (int)$stmtOcupadosComuns->fetchColumn();
            $ocupadoEngenharia = false;
            if ($usarLabEngenharia && $stmtEngOcupado) {
                $stmtEngOcupado->execute([$idLabEngenharia, $data, $periodo]);
                $ocupadoEngenharia = (int)$stmtEngOcupado->fetchColumn() > 0;
            }
            if ($ocupadoEngenharia || $ocupadosComuns + $quantidadeLabsComuns > $capacidadeComum) {
                $pdo->rollBack();
                echo json_encode([
                    "sucesso" => false,
                    "mensagem" => "Não há laboratório disponível."
                ]);
                exit();
            }
        }

        // 2. Registra as vagas comuns sem sala física; a vaga de Engenharia só é marcada quando solicitada.

        $stmtSolicitacao = $pdo->prepare("
            INSERT INTO solicitacoes (usuario_id, solicitante_nome, curso, turma, materia, quantidade_labs, requisicao_materiais_path, pop_aula_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmtSolicitacao->execute([$usuarioAutenticado['id'], $nomeSolicitante, $curso, $turma, $materia, $quantidadeTotalLabs, $materiaisPath, $popPath]);
        $solicitacaoId = $pdo->lastInsertId();

        $stmtReserva = $pdo->prepare("INSERT INTO reservas (solicitacao_id, laboratorio_id, data_reserva, periodo, professor, status, anexo_path) VALUES (?, ?, ?, ?, ?, 'pendente', ?)");

        foreach ($datas as $data) {
            for ($i = 0; $i < $quantidadeTotalLabs; $i++) {
                $profResponsavel = $professores[$i];
                $labIdReserva = $usarLabEngenharia && $i === 0 ? $idLabEngenharia : null;

                $stmtReserva->execute([
                    $solicitacaoId,
                    $labIdReserva,
                    $data,
                    $periodo,
                    $profResponsavel,
                    $anexoPath
                ]);
            }
        }

        $pdo->commit();

        echo json_encode([
            "sucesso" => true,
            "mensagem" => "Agendado com sucesso!",
            "solicitacao_id" => $solicitacaoId
        ]);

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode([
                "sucesso" => false,
                "mensagem" => "Não há laboratório disponível."
            ]);
            exit();
        }
        error_log('Erro ao salvar solicitação: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Não foi possível salvar a solicitação. Tente novamente."
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Erro ao salvar solicitação: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Não foi possível salvar a solicitação. Tente novamente."
        ]);
    }
    exit();
}
