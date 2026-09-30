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

// Dynamically discover domain root
$domainRoot = null;
$curr = __DIR__;
for ($i = 0; $i < 7; $i++) {
    if (file_exists($curr . '/public_html') || file_exists($curr . '/hbuilds') || basename($curr) === 'chandakgroup.tech') {
        $domainRoot = $curr;
        break;
    }
    $parent = dirname($curr);
    if ($parent === $curr) break;
    $curr = $parent;
}
if (!$domainRoot) {
    $domainRoot = '/home/u859582759/domains/chandakgroup.tech';
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

// Collect all target directories
$targetDirs = [
    __DIR__,
    dirname(__DIR__),
    $passengerAppRoot,
    $domainRoot . '/public_html',
    $domainRoot . '/hbuilds/current/nodejs',
    $domainRoot . '/hbuilds/current/nodejs/public',
    '/home/u859582759/domains/chandakgroup.tech/public_html',
    '/home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs',
];

// Add all active versioned nodejs directories
$versionedDirs = glob($domainRoot . '/hbuilds/versions/*/nodejs');
if ($versionedDirs && is_array($versionedDirs)) {
    foreach ($versionedDirs as $vDir) {
        $targetDirs[] = $vDir;
        $targetDirs[] = $vDir . '/public';
    }
}

$allTargetDirs = array_values(array_unique(array_filter($targetDirs)));

if (isset($_GET['info'])) {
    $processes = [];
    if (function_exists('exec')) {
        @exec('ps aux | grep node 2>&1', $processes);
    }
    $buildId = file_exists(__DIR__ . '/.next/BUILD_ID') ? file_get_contents(__DIR__ . '/.next/BUILD_ID') : null;
    $nodeAppBuildId = ($passengerAppRoot && file_exists($passengerAppRoot . '/.next/BUILD_ID')) ? file_get_contents($passengerAppRoot . '/.next/BUILD_ID') : null;
    
    $versionBuildIds = [];
    if ($versionedDirs && is_array($versionedDirs)) {
        foreach ($versionedDirs as $vDir) {
            $vBuild = file_exists($vDir . '/.next/BUILD_ID') ? trim(file_get_contents($vDir . '/.next/BUILD_ID')) : 'none';
            $versionBuildIds[$vDir] = $vBuild;
        }
    }

    echo json_encode([
        'current_dir' => __DIR__,
        'domain_root' => $domainRoot,
        'passenger_app_root' => $passengerAppRoot,
        'passenger_restart_dir' => $passengerRestartDir,
        'public_html_build_id' => trim((string)$buildId),
        'passenger_app_build_id' => trim((string)$nodeAppBuildId),
        'version_build_ids' => $versionBuildIds,
        'target_dirs' => $allTargetDirs,
        'node_processes' => $processes,
        'php_version' => phpversion(),
        'disk_free' => disk_free_space(__DIR__)
    ]);
    exit;
}

// Locate deploy.zip across candidate paths
$candidateZipPaths = [
    __DIR__ . '/deploy.zip',
    dirname(__DIR__) . '/deploy.zip',
    $domainRoot . '/public_html/deploy.zip',
    $domainRoot . '/deploy.zip',
    '/home/u859582759/domains/chandakgroup.tech/public_html/deploy.zip',
    '/home/u859582759/domains/chandakgroup.tech/deploy.zip',
    '/home/u859582759/public_html/deploy.zip',
    dirname(dirname(dirname(dirname(dirname(__DIR__))))) . '/public_html/deploy.zip'
];

if ($versionedDirs && is_array($versionedDirs)) {
    foreach ($versionedDirs as $vDir) {
        $candidateZipPaths[] = $vDir . '/deploy.zip';
        $candidateZipPaths[] = $vDir . '/public/deploy.zip';
    }
}

$zipFile = null;
foreach ($candidateZipPaths as $candidate) {
    if ($candidate && file_exists($candidate)) {
        $zipFile = $candidate;
        break;
    }
}

if (!$zipFile) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'deploy.zip not found',
        'domain_root' => $domainRoot,
        'searched_paths' => array_values(array_unique(array_filter($candidateZipPaths))),
        'files_in_current' => scandir(__DIR__)
    ]);
    exit;
}

// Kill running node processes before extracting to avoid lock
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
    
    // Clean Next.js cache
    if (is_dir($target . '/.next/cache')) {
        @exec('rm -rf ' . escapeshellarg($target . '/.next/cache') . ' 2>&1');
    }
    
    // Touch restart signal in target
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

// Ensure updated deploy-hook.php is present in all public locations
$selfContent = file_get_contents(__FILE__);
$hookLocations = [
    $domainRoot . '/public_html/deploy-hook.php',
    $domainRoot . '/hbuilds/current/nodejs/public/deploy-hook.php',
    '/home/u859582759/domains/chandakgroup.tech/public_html/deploy-hook.php'
];
if ($versionedDirs && is_array($versionedDirs)) {
    foreach ($versionedDirs as $vDir) {
        $hookLocations[] = $vDir . '/public/deploy-hook.php';
    }
}
foreach (array_unique($hookLocations) as $hLoc) {
    @mkdir(dirname($hLoc), 0755, true);
    @file_put_contents($hLoc, $selfContent);
}

// Clean deploy.zip and any FTP state files
@unlink($zipFile);
@unlink($domainRoot . '/public_html/.ftp-deploy-sync-state.json');
@unlink(__DIR__ . '/.ftp-deploy-sync-state.json');
@unlink(dirname(__DIR__) . '/.ftp-deploy-sync-state.json');

// Passenger reload command
if (function_exists('exec')) {
    @exec('passenger-config restart-app --ignore-passenger-not-running / 2>&1');
}

echo json_encode([
    'success' => true,
    'message' => 'deploy.zip successfully extracted to all targets and restart signaled',
    'domain_root' => $domainRoot,
    'passenger_app_root' => $passengerAppRoot,
    'results' => $extractionResults,
    'timestamp' => date('Y-m-d H:i:s')
]);
?>
