-- ===================================================
-- Esquema do Banco de Dados MySQL: AlbaLabs
-- ===================================================

CREATE DATABASE IF NOT EXISTS albalabs_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE albalabs_db;

-- 1. Tabela de Usuários (Login e Senha)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL, -- Senha armazenada de forma segura (hash)
    tipo ENUM('professor', 'coordenador', 'tecnico', 'administrador') DEFAULT 'professor',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabela de Laboratórios
CREATE TABLE IF NOT EXISTS laboratorios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    capacidade INT DEFAULT 40,
    ativo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- Popula os laboratórios padrão
INSERT INTO laboratorios (nome) VALUES 
('Laboratório 1'),
('Laboratório 2'),
('Laboratório 3'),
('Laboratório 4'),
('Laboratório 5'),
('Lab de Engenharia')
ON DUPLICATE KEY UPDATE nome = nome;

-- 3. Tabela de Solicitações (agrupa reservas de uma mesma requisição de aulas)
CREATE TABLE IF NOT EXISTS solicitacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    solicitante_nome VARCHAR(150) NOT NULL,
    curso VARCHAR(150) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    materia VARCHAR(150) NOT NULL,
    quantidade_labs INT NOT NULL DEFAULT 1,
    requisicao_materiais_path VARCHAR(255) NULL,
    pop_aula_path VARCHAR(255) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Vagas por solicitação e data. A capacidade é validada pela quantidade de vagas no período;
-- a sala física é opcional e não é escolhida durante o agendamento.
CREATE TABLE IF NOT EXISTS reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitacao_id INT NOT NULL,
    laboratorio_id INT NULL,
    data_reserva DATE NOT NULL,
    periodo ENUM('manha', 'noite') NOT NULL,
    professor VARCHAR(150) NOT NULL,
    status ENUM('pendente', 'confirmada', 'cancelada') DEFAULT 'pendente',
    laboratorio_ativo_id INT GENERATED ALWAYS AS (
        CASE WHEN status = 'cancelada' OR laboratorio_id IS NULL THEN NULL ELSE laboratorio_id END
    ) STORED,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE,
    FOREIGN KEY (laboratorio_id) REFERENCES laboratorios(id) ON DELETE RESTRICT,
    
    -- Slots ainda sem laboratório físico não bloqueiam uma sala específica.
    -- Mantém histórico cancelado e impede choque entre salas já atribuídas.
    UNIQUE KEY uq_lab_data_periodo_ativo (laboratorio_ativo_id, data_reserva, periodo),
    INDEX idx_data_periodo (data_reserva, periodo)
) ENGINE=InnoDB;

-- 5. Histórico de cancelamentos e recusas
CREATE TABLE IF NOT EXISTS cancelamentos (
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
) ENGINE=InnoDB;

-- 6. Feriados, recessos e emendas marcados pela equipe no calendário
CREATE TABLE IF NOT EXISTS dias_especiais (
    data DATE PRIMARY KEY,
    tipo ENUM('feriado', 'recesso', 'emenda') NOT NULL,
    descricao VARCHAR(180) NULL,
    usuario_id INT NULL,
    usuario_nome VARCHAR(120) NOT NULL,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuário inicial de exemplo para você testar (senha: 123456)
-- Em produção usamos hash criptografado, mas vamos deixar um inicial para facilitar
INSERT INTO usuarios (nome, email, senha, tipo) VALUES
('Professora Mariana', 'mariana@albalabs.com', '123456', 'professor'),
('Administrador', 'admin@albalabs.com', 'admin123', 'administrador')
ON DUPLICATE KEY UPDATE email = email;
