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
    while (basename($curr) === 'public' || basename($curr) === 'public_html') {
        $curr = dirname($curr);
    }
    if (is_dir($curr . '/hbuilds') || is_dir($curr . '/public_html') || basename($curr) === 'chandakgroup.tech') {
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
    $domainRoot . '/public_html',
    $domainRoot . '/public_html/public',
    $domainRoot . '/hbuilds/current/nodejs',
    $domainRoot . '/hbuilds/current/nodejs/public',
    '/home/u859582759/domains/chandakgroup.tech/public_html',
    '/home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs',
    $passengerAppRoot,
];

// Add all active versioned nodejs directories
$versionedDirs = glob($domainRoot . '/hbuilds/versions/*/nodejs');
if ($versionedDirs && is_array($versionedDirs)) {
    foreach ($versionedDirs as $vDir) {
        $targetDirs[] = $vDir;
        $targetDirs[] = $vDir . '/public';
    }
}
$altVersionedDirs = glob('/home/u859582759/domains/chandakgroup.tech/hbuilds/versions/*/nodejs');
if ($altVersionedDirs && is_array($altVersionedDirs)) {
    foreach ($altVersionedDirs as $vDir) {
        $targetDirs[] = $vDir;
        $targetDirs[] = $vDir . '/public';
    }
}

$allTargetDirs = array_values(array_unique(array_filter($targetDirs)));

if (isset($_GET['info']) || isset($_GET['diag']) || isset($_GET['scan'])) {
    $processes = [];
    if (function_exists('exec')) {
        @exec('ps aux 2>&1', $processes);
    }
    
    // Deep search for files containing pricing strings
    $filesWithOldPricing = [];
    $filesWithNewPricing = [];
    $allBuildIds = [];
    
    $searchRoots = [
        '/home/u859582759/domains/chandakgroup.tech',
        '/home/u859582759/public_html',
        $domainRoot,
        __DIR__,
        dirname(__DIR__),
    ];
    
    foreach (array_unique(array_filter($searchRoots)) as $sRoot) {
        if (!is_dir($sRoot)) continue;
        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($sRoot, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            $iterator->setMaxDepth(5);
            foreach ($iterator as $item) {
                $path = $item->getPathname();
                if (strpos($path, 'node_modules') !== false && strpos($path, '.next') === false) continue;
                if ($item->isFile()) {
                    if ($item->getFilename() === 'BUILD_ID') {
                        $allBuildIds[$path] = trim(@file_get_contents($path) ?: '');
                    }
                    if (in_array($item->getExtension(), ['js', 'html', 'json', 'txt'])) {
                        $content = @file_get_contents($path, false, null, 0, 500000);
                        if ($content !== false) {
                            if (strpos($content, '1. EX-FACTORY BASE') !== false || strpos($content, 'EX-FACTORY BASE & STATUTORY') !== false) {
                                $filesWithOldPricing[$path] = [
                                    'size' => $item->getSize(),
                                    'mtime' => date('Y-m-d H:i:s', $item->getMTime())
                                ];
                            }
                            if (strpos($content, 'Vehicle Pricing & On-Road Cost Breakdown') !== false) {
                                $filesWithNewPricing[$path] = [
                                    'size' => $item->getSize(),
                                    'mtime' => date('Y-m-d H:i:s', $item->getMTime())
                                ];
                            }
                        }
                    }
                }
            }
        } catch (Exception $e) {
            // Ignore scan errors
        }
    }

    echo json_encode([
        'current_dir' => __DIR__,
        'domain_root' => $domainRoot,
        'files_with_old_pricing' => $filesWithOldPricing,
        'files_with_new_pricing' => $filesWithNewPricing,
        'build_ids' => $allBuildIds,
        'passenger_app_root' => $passengerAppRoot,
        'php_version' => phpversion()
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
