<?php
/**
 * Conexão com o Banco de Dados MySQL via PDO
 */
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$hostRequisicao = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
$requisicaoLocal = PHP_SAPI === 'cli' || in_array($hostRequisicao, ['localhost', '127.0.0.1', '::1'], true);
$hostPadrao = $requisicaoLocal ? '127.0.0.1' : 'albalabs-mysql-2026.mysql.database.azure.com';
$host = getenv('DB_HOST') ?: $hostPadrao;
$port = getenv('DB_PORT') ?: "3306";
$dbname = getenv('DB_NAME') ?: "albalabs_db";
$user = getenv('DB_USER') ?: "root";
$password = getenv('DB_PASSWORD') ?: "";
$conexaoLocal = in_array(strtolower($host), ['localhost', '127.0.0.1', '::1'], true);

if ($password === '' && !$conexaoLocal) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Banco não configurado: defina DB_PASSWORD nas variáveis de ambiente do servidor."
    ]);
    exit();
}

try {
    // PHP 8.5 moveu o atributo SSL para Pdo\\Mysql; nas versões anteriores,
    // o nome PDO::MYSQL_ATTR_SSL_CA continua disponível.
    $sslCaAttribute = defined('Pdo\\Mysql::ATTR_SSL_CA')
        ? constant('Pdo\\Mysql::ATTR_SSL_CA')
        : PDO::MYSQL_ATTR_SSL_CA;

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ];
    if (!$conexaoLocal) {
        $caBundle = realpath(__DIR__ . '/../database/azure-mysql-ca-bundle.pem')
            ?: realpath(__DIR__ . '/../../database/azure-mysql-ca-bundle.pem');
        if ($caBundle) {
            $options[$sslCaAttribute] = $caBundle;
        }
    }
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4", $user, $password, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Não foi possível conectar ao banco. Confira as variáveis de ambiente do App Service."
    ]);
    exit();
}
