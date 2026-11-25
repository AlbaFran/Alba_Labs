<?php
function garantirTabelaDiasEspeciais(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS dias_especiais (
        data DATE PRIMARY KEY,
        tipo ENUM('feriado', 'recesso', 'emenda') NOT NULL,
        descricao VARCHAR(180) NULL,
        usuario_id INT NULL,
        usuario_nome VARCHAR(120) NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_dias_especiais_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
