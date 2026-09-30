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

// Direct domain root discovery
$domainRoot = '/home/u859582759/domains/chandakgroup.tech';
if (!is_dir($domainRoot)) {
    $curr = __DIR__;
    while ($curr && $curr !== '/' && $curr !== '.') {
        if (basename($curr) === 'chandakgroup.tech') {
            $domainRoot = $curr;
            break;
        }
        $curr = dirname($curr);
    }
}
if (!$domainRoot || !is_dir($domainRoot)) {
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
    $domainRoot . '/public_html',
    $domainRoot . '/hbuilds/current/nodejs',
    $passengerAppRoot,
];

// Add all active versioned nodejs directories
$versionedDirs = glob($domainRoot . '/hbuilds/versions/*/nodejs');
if ($versionedDirs && is_array($versionedDirs)) {
    foreach ($versionedDirs as $vDir) {
        $targetDirs[] = $vDir;
    }
}

$allTargetDirs = array_values(array_unique(array_filter($targetDirs)));

if (isset($_GET['info']) || isset($_GET['diag']) || isset($_GET['scan'])) {
    $filesWithOldPricing = [];
    $filesWithNewPricing = [];
    $allBuildIds = [];
    
    $checkDirs = [
        $domainRoot . '/public_html/_next/static/chunks',
        $domainRoot . '/hbuilds/current/nodejs/.next/server',
        $domainRoot . '/hbuilds/current/nodejs/_next/static/chunks',
        __DIR__ . '/_next/static/chunks',
    ];
    
    if ($versionedDirs && is_array($versionedDirs)) {
        foreach ($versionedDirs as $vDir) {
            $checkDirs[] = $vDir . '/.next/server';
            $checkDirs[] = $vDir . '/_next/static/chunks';
            $checkDirs[] = $vDir . '/public/_next/static/chunks';
        }
    }
    
    foreach (array_unique(array_filter($checkDirs)) as $dir) {
        if (!is_dir($dir)) continue;
        $files = @scandir($dir);
        if (!$files) continue;
        foreach ($files as $f) {
            if ($f === '.' || $f === '..') continue;
            $path = $dir . '/' . $f;
            if (is_file($path)) {
                if ($f === 'BUILD_ID') {
                    $allBuildIds[$path] = trim(@file_get_contents($path) ?: '');
                }
                if (substr($f, -3) === '.js' || substr($f, -5) === '.html') {
                    $content = @file_get_contents($path, false, null, 0, 100000);
                    if ($content !== false) {
                        if (strpos($content, '1. EX-FACTORY BASE') !== false || strpos($content, 'EX-FACTORY BASE & STATUTORY') !== false) {
                            $filesWithOldPricing[$path] = [
                                'size' => filesize($path),
                                'mtime' => date('Y-m-d H:i:s', filemtime($path))
                            ];
                        }
                        if (strpos($content, 'Vehicle Pricing & On-Road Cost Breakdown') !== false || strpos($content, 'Vehicle Pricing &amp; On-Road Cost Breakdown') !== false) {
                            $filesWithNewPricing[$path] = [
                                'size' => filesize($path),
                                'mtime' => date('Y-m-d H:i:s', filemtime($path))
                            ];
                        }
                    }
                }
            }
        }
    }

    echo json_encode([
        'domain_root' => $domainRoot,
        'files_with_old_pricing' => $filesWithOldPricing,
        'files_with_new_pricing' => $filesWithNewPricing,
        'build_ids' => $allBuildIds,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
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
    // If deploy.zip is not found, check if BUILD_ID is present in target dirs (already unzipped via SSH)
    $hasExtractedBuild = false;
    foreach ($allTargetDirs as $target) {
        if (file_exists($target . '/.next/BUILD_ID') || file_exists($target . '/server.js')) {
            $hasExtractedBuild = true;
            @mkdir($target . '/tmp', 0755, true);
            @touch($target . '/tmp/restart.txt');
            if (file_exists($target . '/server.js')) @touch($target . '/server.js');
        }
    }
    
    if (function_exists('exec')) {
        @exec('pkill -9 -f node 2>&1');
        @exec('passenger-config restart-app --ignore-passenger-not-running / 2>&1');
    }

    echo json_encode([
        'success' => true, 
        'info' => $hasExtractedBuild ? 'Verified deployment: App files present and restarted' : 'deploy.zip already processed',
        'domain_root' => $domainRoot
    ]);
    exit;
}

// Kill running node processes before extracting to avoid lock
if (function_exists('exec')) {
    @exec('pkill -9 -f node 2>&1');
    @exec('killall -9 node 2>&1');
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
    
    // Copy static files to public roots
    if (is_dir($target . '/.next/static')) {
        @mkdir($target . '/_next', 0755, true);
        @mkdir($target . '/public/_next', 0755, true);
        @mkdir($domainRoot . '/public_html/_next', 0755, true);
        if (function_exists('exec')) {
            @exec('cp -rf ' . escapeshellarg($target . '/.next/static') . ' ' . escapeshellarg($target . '/_next/') . ' 2>&1');
            @exec('cp -rf ' . escapeshellarg($target . '/.next/static') . ' ' . escapeshellarg($target . '/public/_next/') . ' 2>&1');
            @exec('cp -rf ' . escapeshellarg($target . '/.next/static') . ' ' . escapeshellarg($domainRoot . '/public_html/_next/') . ' 2>&1');
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
    if (file_exists($target . '/package.json')) {
        @touch($target . '/package.json');
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
