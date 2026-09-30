<?php
// Secure deployment extractor hook for Hostinger
header('Content-Type: application/json');

$token = isset($_GET['key']) ? $_GET['key'] : '';
$expectedToken = 'chandak_deploy_secret_2026_matrix';

if ($token !== $expectedToken) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$zipFile = __DIR__ . '/deploy.zip';
$targetDir = __DIR__;

// Check parent dir as fallback
if (!file_exists($zipFile) && file_exists(dirname(__DIR__) . '/deploy.zip')) {
    $zipFile = dirname(__DIR__) . '/deploy.zip';
    $targetDir = dirname(__DIR__);
}

if (!file_exists($zipFile)) {
    echo json_encode([
        'success' => false, 
        'error' => 'deploy.zip not found',
        'current_dir' => __DIR__,
        'files' => scandir(__DIR__)
    ]);
    exit;
}

$extracted = false;
$method = '';

// Method 1: PHP ZipArchive
if (class_exists('ZipArchive')) {
    $zip = new ZipArchive;
    if ($zip->open($zipFile) === TRUE) {
        $zip->extractTo($targetDir);
        $zip->close();
        $extracted = true;
        $method = 'ZipArchive';
    }
}

// Method 2: System exec fallback
if (!$extracted && function_exists('exec')) {
    @exec("cd " . escapeshellarg($targetDir) . " && unzip -o deploy.zip 2>&1", $output, $returnCode);
    if ($returnCode === 0) {
        $extracted = true;
        $method = 'exec_unzip';
    }
}

if ($extracted) {
    @unlink($zipFile);
    @unlink($targetDir . '/.ftp-deploy-sync-state.json');
    
    // Trigger Node.js Passenger restart
    @mkdir($targetDir . '/tmp', 0755, true);
    @touch($targetDir . '/tmp/restart.txt');
    
    echo json_encode([
        'success' => true,
        'message' => 'deploy.zip extracted successfully and Node.js server restarted',
        'method' => $method,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to extract deploy.zip with both ZipArchive and exec'
    ]);
}
?>
