<?php
// Bulletproof Deployment Extractor & Static Sync for Hostinger (Zero exec dependency)
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');

$token = isset($_GET['key']) ? $_GET['key'] : '';
$expectedToken = 'chandak_deploy_secret_2026_matrix';

if ($token !== $expectedToken) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Helper: recursive directory copy in pure PHP
function recursiveCopy($src, $dst) {
    if (!is_dir($src)) return false;
    @mkdir($dst, 0755, true);
    $dir = @opendir($src);
    if (!$dir) return false;
    while (($file = readdir($dir)) !== false) {
        if ($file === '.' || $file === '..') continue;
        $srcPath = $src . '/' . $file;
        $dstPath = $dst . '/' . $file;
        if (is_dir($srcPath)) {
            recursiveCopy($srcPath, $dstPath);
        } else {
            @copy($srcPath, $dstPath);
        }
    }
    closedir($dir);
    return true;
}

// Helper: recursive remove
function recursiveRemove($dir) {
    if (!is_dir($dir)) return;
    $files = @scandir($dir);
    if (!$files) return;
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        $path = $dir . '/' . $file;
        if (is_dir($path)) {
            recursiveRemove($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($dir);
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
$htaccessContent = file_exists(__DIR__ . '/.htaccess') ? @file_get_contents(__DIR__ . '/.htaccess') : '';
$passengerAppRoot = null;
if (preg_match('/PassengerAppRoot\s+([^\s\r\n]+)/', $htaccessContent, $m)) {
    $passengerAppRoot = trim($m[1]);
}

// Collect all target directories
$targetDirs = [
    dirname(__DIR__),
    __DIR__,
    $domainRoot . '/public_html',
    $domainRoot . '/hbuilds/current/nodejs',
    $passengerAppRoot,
];

$versionedDirs = glob($domainRoot . '/hbuilds/versions/*/nodejs');
if ($versionedDirs && is_array($versionedDirs)) {
    foreach ($versionedDirs as $vDir) {
        $targetDirs[] = $vDir;
    }
}

$allTargetDirs = array_values(array_unique(array_filter($targetDirs)));

// Diagnostic / Info Mode
if (isset($_GET['info']) || isset($_GET['scan']) || isset($_GET['diag'])) {
    $foundBuildIds = [];
    $foundPricingChunks = [];
    
    foreach ($allTargetDirs as $tDir) {
        $buildFile = $tDir . '/.next/BUILD_ID';
        if (file_exists($buildFile)) {
            $foundBuildIds[$tDir] = trim(@file_get_contents($buildFile) ?: '');
        }
        
        $chunkDir = $tDir . '/.next/static/chunks';
        if (!is_dir($chunkDir)) {
            $chunkDir = $tDir . '/_next/static/chunks';
        }
        if (is_dir($chunkDir)) {
            $files = @scandir($chunkDir);
            if ($files) {
                foreach ($files as $f) {
                    if (substr($f, -3) === '.js') {
                        $p = $chunkDir . '/' . $f;
                        $c = @file_get_contents($p, false, null, 0, 50000);
                        if ($c && strpos($c, 'Vehicle Pricing') !== false) {
                            $foundPricingChunks[] = [
                                'file' => $f,
                                'dir' => $tDir,
                                'has_new' => (strpos($c, 'Vehicle Pricing & On-Road Cost Breakdown') !== false || strpos($c, 'Vehicle Pricing &amp; On-Road Cost Breakdown') !== false),
                                'has_old_sections' => (strpos($c, '1. EX-FACTORY BASE') !== false)
                            ];
                        }
                    }
                }
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'domain_root' => $domainRoot,
        'current_dir' => __DIR__,
        'target_dirs' => $allTargetDirs,
        'build_ids' => $foundBuildIds,
        'pricing_chunks' => $foundPricingChunks,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Find deploy.zip
$candidateZipPaths = [
    __DIR__ . '/deploy.zip',
    dirname(__DIR__) . '/deploy.zip',
    '/home/u859582759/domains/chandakgroup.tech/hbuilds/versions/01a0e75f-5f5d-715a-9479-733f79592f9f/nodejs/public/deploy.zip',
    '/home/u859582759/domains/chandakgroup.tech/hbuilds/versions/01a0e75f-5f5d-715a-9479-733f79592f9f/nodejs/deploy.zip',
    $domainRoot . '/public_html/deploy.zip',
    $domainRoot . '/deploy.zip',
    '/home/u859582759/deploy.zip',
    '/home/u859582759/public_html/deploy.zip',
];

if ($versionedDirs && is_array($versionedDirs)) {
    foreach ($versionedDirs as $vDir) {
        $candidateZipPaths[] = $vDir . '/deploy.zip';
        $candidateZipPaths[] = $vDir . '/public/deploy.zip';
    }
}

$zipFile = null;
foreach (array_unique($candidateZipPaths) as $cand) {
    if ($cand && file_exists($cand) && filesize($cand) > 1000) {
        $zipFile = $cand;
        break;
    }
}

$extractionResults = [];

if ($zipFile && class_exists('ZipArchive')) {
    foreach ($allTargetDirs as $target) {
        if (!is_dir($target)) {
            @mkdir($target, 0755, true);
        }
        
        // Clean stale cache
        if (is_dir($target . '/.next/cache')) {
            recursiveRemove($target . '/.next/cache');
        }
        
        $zip = new ZipArchive();
        $res = $zip->open($zipFile);
        $extracted = false;
        if ($res === TRUE) {
            $zip->extractTo($target);
            $zip->close();
            $extracted = true;
        }
        
        // Mirror static chunks to all public accessible paths
        if (is_dir($target . '/.next/static')) {
            recursiveCopy($target . '/.next/static', $target . '/_next/static');
            recursiveCopy($target . '/.next/static', $target . '/public/_next/static');
            recursiveCopy($target . '/.next/static', $domainRoot . '/public_html/_next/static');
            recursiveCopy($target . '/.next/static', __DIR__ . '/_next/static');
        }
        
        // Signal restart for Passenger
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt');
        if (file_exists($target . '/server.js')) @touch($target . '/server.js');
        if (file_exists($target . '/package.json')) @touch($target . '/package.json');
        
        $extractionResults[$target] = [
            'extracted' => $extracted,
            'build_id' => file_exists($target . '/.next/BUILD_ID') ? trim(@file_get_contents($target . '/.next/BUILD_ID')) : null
        ];
    }
    
    // Remove the zip file after successful extraction
    @unlink($zipFile);
} else {
    // If no zip found, touch restart.txt on all targets
    foreach ($allTargetDirs as $target) {
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt');
        if (file_exists($target . '/server.js')) @touch($target . '/server.js');
    }
}

// Copy self to public directories to ensure persistence
$selfCode = @file_get_contents(__FILE__);
if ($selfCode) {
    @file_put_contents($domainRoot . '/public_html/deploy-hook.php', $selfCode);
    if ($versionedDirs) {
        foreach ($versionedDirs as $vDir) {
            @file_put_contents($vDir . '/public/deploy-hook.php', $selfCode);
        }
    }
}

echo json_encode([
    'success' => true,
    'zip_found' => ($zipFile !== null),
    'zip_path' => $zipFile,
    'results' => $extractionResults,
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
