<?php
// Enhanced secure deployment extractor & process restarter for Hostinger
header('Content-Type: application/json');

$token = isset($_GET['key']) ? $_GET['key'] : '';
$expectedToken = 'chandak_deploy_secret_2026_matrix';

if ($token !== $expectedToken) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$dirsToCheck = [
    __DIR__,
    dirname(__DIR__),
    __DIR__ . '/workspace'
];

if (isset($_GET['info'])) {
    $processes = [];
    if (function_exists('exec')) {
        @exec('ps aux | grep node 2>&1', $processes);
    }
    $buildId = file_exists(__DIR__ . '/.next/BUILD_ID') ? file_get_contents(__DIR__ . '/.next/BUILD_ID') : null;
    $htaccess = file_exists(__DIR__ . '/.htaccess') ? file_get_contents(__DIR__ . '/.htaccess') : null;
    $serverJsMtime = file_exists(__DIR__ . '/server.js') ? date('Y-m-d H:i:s', filemtime(__DIR__ . '/server.js')) : null;
    
    echo json_encode([
        'current_dir' => __DIR__,
        'parent_dir' => dirname(__DIR__),
        'build_id' => trim((string)$buildId),
        'server_js_mtime' => $serverJsMtime,
        'htaccess' => $htaccess,
        'php_version' => phpversion(),
        'disk_free' => disk_free_space(__DIR__),
        'node_processes' => $processes,
        'has_zip' => file_exists(__DIR__ . '/deploy.zip') || file_exists(dirname(__DIR__) . '/deploy.zip')
    ]);
    exit;
}

// Find deploy.zip
$zipFile = null;
$targetDir = __DIR__;

if (file_exists(__DIR__ . '/deploy.zip')) {
    $zipFile = __DIR__ . '/deploy.zip';
    $targetDir = __DIR__;
} elseif (file_exists(dirname(__DIR__) . '/deploy.zip')) {
    $zipFile = dirname(__DIR__) . '/deploy.zip';
    $targetDir = dirname(__DIR__);
}

if (!$zipFile) {
    echo json_encode([
        'success' => false, 
        'error' => 'deploy.zip not found',
        'searched_dirs' => $dirsToCheck,
        'files_in_current' => scandir(__DIR__)
    ]);
    exit;
}

// Kill running node process before extracting so files aren't locked
if (function_exists('exec')) {
    @exec('pkill -f node 2>&1');
    @exec('killall node 2>&1');
}

$extracted = false;
$method = '';
$logs = [];

// Method 1: System unzip with full overwrite flag (-o)
if (function_exists('exec')) {
    $output = [];
    $ret = 0;
    @exec("cd " . escapeshellarg($targetDir) . " && unzip -o " . escapeshellarg($zipFile) . " 2>&1", $output, $ret);
    $logs['exec_unzip'] = [
        'return_code' => $ret,
        'output_lines' => count($output),
        'sample' => array_slice($output, 0, 10)
    ];
    if ($ret === 0) {
        $extracted = true;
        $method = 'exec_unzip';
    }
}

// Method 2: PHP ZipArchive fallback
if (!$extracted && class_exists('ZipArchive')) {
    $zip = new ZipArchive;
    if ($zip->open($zipFile) === TRUE) {
        $zip->extractTo($targetDir);
        $zip->close();
        $extracted = true;
        $method = 'ZipArchive';
    }
}

if ($extracted) {
    @unlink($zipFile);
    @unlink($targetDir . '/.ftp-deploy-sync-state.json');
    
    // Clear Next.js cache
    if (is_dir($targetDir . '/.next/cache')) {
        @exec('rm -rf ' . escapeshellarg($targetDir . '/.next/cache') . ' 2>&1');
    }
    
    // Trigger Node.js Passenger restart across all potential root directories
    foreach ($dirsToCheck as $d) {
        if (is_dir($d)) {
            @mkdir($d . '/tmp', 0755, true);
            @touch($d . '/tmp/restart.txt');
            if (file_exists($d . '/server.js')) {
                @touch($d . '/server.js');
            }
        }
    }
    
    // Also try passenger reload command if available
    if (function_exists('exec')) {
        @exec('passenger-config restart-app --ignore-passenger-not-running / 2>&1');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'deploy.zip extracted and Node.js server restart signaled',
        'method' => $method,
        'target_dir' => $targetDir,
        'logs' => $logs,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to extract deploy.zip',
        'logs' => $logs
    ]);
}
?>
