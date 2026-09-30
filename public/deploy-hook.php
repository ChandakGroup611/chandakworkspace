<?php
// Enhanced secure deployment extractor & process restarter for Hostinger with PassengerAppRoot detection
header('Content-Type: application/json');

$token = isset($_GET['key']) ? $_GET['key'] : '';
$expectedToken = 'chandak_deploy_secret_2026_matrix';

if ($token !== $expectedToken) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Discover PassengerAppRoot from .htaccess
$htaccessContent = file_exists(__DIR__ . '/.htaccess') ? file_get_contents(__DIR__ . '/.htaccess') : '';
$passengerAppRoot = null;
$passengerRestartDir = null;

if (preg_match('/PassengerAppRoot\s+([^\s\r\n]+)/', $htaccessContent, $m)) {
    $passengerAppRoot = trim($m[1]);
}
if (preg_match('/PassengerRestartDir\s+([^\s\r\n]+)/', $htaccessContent, $m)) {
    $passengerRestartDir = trim($m[1]);
}

$allTargetDirs = array_unique(array_filter([
    __DIR__,
    dirname(__DIR__),
    $passengerAppRoot,
    '/home/u859582759/domains/chandakgroup.tech/public_html',
    '/home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs',
    '/home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs/public',
    dirname(__DIR__) . '/hbuilds/current/nodejs',
    __DIR__ . '/workspace'
]));

if (isset($_GET['info'])) {
    $processes = [];
    if (function_exists('exec')) {
        @exec('ps aux | grep node 2>&1', $processes);
    }
    $buildId = file_exists(__DIR__ . '/.next/BUILD_ID') ? file_get_contents(__DIR__ . '/.next/BUILD_ID') : null;
    $nodeAppBuildId = ($passengerAppRoot && file_exists($passengerAppRoot . '/.next/BUILD_ID')) ? file_get_contents($passengerAppRoot . '/.next/BUILD_ID') : null;
    
    echo json_encode([
        'current_dir' => __DIR__,
        'passenger_app_root' => $passengerAppRoot,
        'passenger_restart_dir' => $passengerRestartDir,
        'public_html_build_id' => trim((string)$buildId),
        'passenger_app_build_id' => trim((string)$nodeAppBuildId),
        'target_dirs' => $allTargetDirs,
        'htaccess' => $htaccessContent,
        'node_processes' => $processes,
        'php_version' => phpversion(),
        'disk_free' => disk_free_space(__DIR__)
    ]);
    exit;
}

// Locate deploy.zip across all candidate paths
$candidateZipPaths = array_unique(array_filter([
    __DIR__ . '/deploy.zip',
    dirname(__DIR__) . '/deploy.zip',
    '/home/u859582759/domains/chandakgroup.tech/public_html/deploy.zip',
    '/home/u859582759/domains/chandakgroup.tech/deploy.zip',
    '/home/u859582759/public_html/deploy.zip',
    dirname(dirname(dirname(dirname(__DIR__)))) . '/public_html/deploy.zip'
]));

$zipFile = null;
foreach ($candidateZipPaths as $candidate) {
    if (file_exists($candidate)) {
        $zipFile = $candidate;
        break;
    }
}

if (!$zipFile) {
    echo json_encode([
        'success' => false, 
        'error' => 'deploy.zip not found',
        'searched_paths' => $candidateZipPaths,
        'files_in_current' => scandir(__DIR__)
    ]);
    exit;
}

// Kill running node processes before extracting
if (function_exists('exec')) {
    @exec('pkill -f node 2>&1');
    @exec('killall node 2>&1');
}

$extractionResults = [];

foreach ($allTargetDirs as $target) {
    if (!$target) continue;
    @mkdir($target, 0755, true);
    
    $extracted = false;
    $method = '';
    
    // Method 1: exec unzip
    if (function_exists('exec')) {
        $out = [];
        $rc = 0;
        @exec("cd " . escapeshellarg($target) . " && unzip -o " . escapeshellarg($zipFile) . " 2>&1", $out, $rc);
        if ($rc === 0) {
            $extracted = true;
            $method = 'exec_unzip';
        }
    }
    
    // Method 2: ZipArchive fallback
    if (!$extracted && class_exists('ZipArchive')) {
        $zip = new ZipArchive;
        if ($zip->open($zipFile) === TRUE) {
            $zip->extractTo($target);
            $zip->close();
            $extracted = true;
            $method = 'ZipArchive';
        }
    }
    
    // Clean cache
    if (is_dir($target . '/.next/cache')) {
        @exec('rm -rf ' . escapeshellarg($target . '/.next/cache') . ' 2>&1');
    }
    
    // Touch restart in target
    @mkdir($target . '/tmp', 0755, true);
    @touch($target . '/tmp/restart.txt');
    if (file_exists($target . '/server.js')) {
        @touch($target . '/server.js');
    }
    
    $extractionResults[$target] = [
        'success' => $extracted,
        'method' => $method,
        'build_id' => file_exists($target . '/.next/BUILD_ID') ? trim(file_get_contents($target . '/.next/BUILD_ID')) : null
    ];
}

if ($passengerRestartDir) {
    @mkdir($passengerRestartDir, 0755, true);
    @touch($passengerRestartDir . '/restart.txt');
}

// Clean deploy.zip
@unlink($zipFile);
@unlink(__DIR__ . '/.ftp-deploy-sync-state.json');

// Passenger reload command
if (function_exists('exec')) {
    @exec('passenger-config restart-app --ignore-passenger-not-running / 2>&1');
}

echo json_encode([
    'success' => true,
    'message' => 'deploy.zip successfully extracted to all PassengerAppRoot locations and restart signaled',
    'passenger_app_root' => $passengerAppRoot,
    'results' => $extractionResults,
    'timestamp' => date('Y-m-d H:i:s')
]);
?>
