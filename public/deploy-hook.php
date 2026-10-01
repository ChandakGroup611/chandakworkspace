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
    $domainRoot . '/hbuilds/current/nodejs/public',
    $passengerAppRoot,
];

$versionedDirs = glob($domainRoot . '/hbuilds/versions/*/nodejs');
if ($versionedDirs && is_array($versionedDirs)) {
    foreach ($versionedDirs as $vDir) {
        $targetDirs[] = $vDir;
        $targetDirs[] = $vDir . '/public';
    }
}

$allTargetDirs = array_values(array_unique(array_filter($targetDirs)));

// Diagnostic / Info Mode
if (isset($_GET['info']) || isset($_GET['scan']) || isset($_GET['diag']) || isset($_GET['logs'])) {
    $foundBuildIds = [];
    $foundFiles = [];
    $foundLogs = [];
    $foundHts = [];
    
    foreach ($allTargetDirs as $tDir) {
        if (!is_dir($tDir)) continue;
        $buildFile = $tDir . '/.next/BUILD_ID';
        if (file_exists($buildFile)) {
            $foundBuildIds[$tDir] = trim(@file_get_contents($buildFile) ?: '');
        }
        $sc = @scandir($tDir);
        if ($sc) {
            $foundFiles[$tDir] = array_values(array_diff($sc, ['.', '..']));
        }
        if (file_exists($tDir . '/stderr.log')) {
            $foundLogs[$tDir . '/stderr.log'] = substr(@file_get_contents($tDir . '/stderr.log'), -2000);
        }
        if (file_exists($tDir . '/console.log')) {
            $foundLogs[$tDir . '/console.log'] = substr(@file_get_contents($tDir . '/console.log'), -2000);
        }
        if (file_exists($tDir . '/.htaccess')) {
            $foundHts[$tDir . '/.htaccess'] = @file_get_contents($tDir . '/.htaccess');
        }
    }
    
    echo json_encode([
        'success' => true,
        'domain_root' => $domainRoot,
        'current_dir' => __DIR__,
        'target_dirs' => $allTargetDirs,
        'build_ids' => $foundBuildIds,
        'files' => $foundFiles,
        'logs' => $foundLogs,
        'htaccess' => $foundHts,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Find deploy.zip in all candidate locations
$candidateZipPaths = [
    __DIR__ . '/deploy.zip',
    dirname(__DIR__) . '/deploy.zip',
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
            recursiveCopy($target . '/.next/static', $domainRoot . '/public_html/.next/static');
            recursiveCopy($target . '/.next/static', __DIR__ . '/_next/static');
        }
        
        // Signal restart for Passenger & LiteSpeed
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt');
        if (file_exists($target . '/server.js')) @touch($target . '/server.js');
        if (file_exists($target . '/package.json')) @touch($target . '/package.json');
        
        $extractionResults[$target] = [
            'extracted' => $extracted,
            'build_id' => file_exists($target . '/.next/BUILD_ID') ? trim(@file_get_contents($target . '/.next/BUILD_ID')) : null
        ];
    }

    // Force synchronization from primary nodejs to public_html and versioned public
    $primaryNode = $domainRoot . '/hbuilds/current/nodejs';
    $pubHtml = $domainRoot . '/public_html';
    if (is_dir($primaryNode) && is_dir($pubHtml)) {
        recursiveCopy($primaryNode . '/.next', $pubHtml . '/.next');
        if (is_dir($primaryNode . '/.next/static')) {
            recursiveCopy($primaryNode . '/.next/static', $pubHtml . '/_next/static');
            recursiveCopy($primaryNode . '/.next/static', $pubHtml . '/.next/static');
        }
        @copy($primaryNode . '/server.js', $pubHtml . '/server.js');
        @copy($primaryNode . '/package.json', $pubHtml . '/package.json');
        if (file_exists($primaryNode . '/.next/BUILD_ID')) {
            @copy($primaryNode . '/.next/BUILD_ID', $pubHtml . '/.next/BUILD_ID');
        }
    }
    
    // Remove the zip file and any sync state file
    @unlink($zipFile);
    @unlink(__DIR__ . '/.ftp-deploy-sync-state.json');
    @unlink($domainRoot . '/public_html/.ftp-deploy-sync-state.json');
} else {
    // If no zip found, touch restart and .htaccess on all targets anyway
    foreach ($allTargetDirs as $target) {
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt');
        if (file_exists($target . '/server.js')) @touch($target . '/server.js');
    }
}

// Restart Passenger explicitly
@mkdir($domainRoot . '/hbuilds/current/nodejs/tmp', 0755, true);
@touch($domainRoot . '/hbuilds/current/nodejs/tmp/restart.txt');
if ($versionedDirs) {
    foreach ($versionedDirs as $vDir) {
        @mkdir($vDir . '/tmp', 0755, true);
        @touch($vDir . '/tmp/restart.txt');
    }
}

// Find the active version directory
$activeVersionDir = null;
if ($versionedDirs && count($versionedDirs) > 0) {
    $activeVersionDir = $versionedDirs[0];
}

$htaccessHeader = "<IfModule LiteSpeed>\n    CacheLookup off\n    SetEnv no-lscache 1\n</IfModule>\n\n<IfModule mod_headers.c>\n    <FilesMatch \"\\.(html|htm|php|json|js|css)$\">\n        Header set Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\"\n        Header set CDN-Cache-Control \"no-store\"\n        Header set Surrogate-Control \"no-store\"\n        Header set Pragma \"no-cache\"\n        Header set Expires \"0\"\n    </FilesMatch>\n    <FilesMatch \"\\.(woff|woff2|svg|png|jpg|jpeg|gif|webp|ico)$\">\n        Header set Cache-Control \"public, max-age=3600, must-revalidate\"\n    </FilesMatch>\n</IfModule>\n\n";

// Write to public_html
$pubHtaccess = $htaccessHeader . "PassengerAppRoot /home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs\nPassengerAppType node\nPassengerNodejs /opt/alt/alt-nodejs20/root/bin/node\nPassengerStartupFile server.js\nPassengerBaseURI /\nPassengerRestartDir /home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs/tmp\nSetEnv NODE_OPTIONS \"--require /home/u859582759/domains/chandakgroup.tech/hbuilds/config/preload-timestamp.js\"\nSetEnv LSNODE_CONSOLE_LOG console.log\nSetEnv TOKIO_WORKER_THREADS 2\nRewriteRule ^\\.builds - [F,L]\n";
@file_put_contents($domainRoot . '/public_html/.htaccess', $pubHtaccess);
@touch($domainRoot . '/public_html/.htaccess');

// Write to active versioned public and nodejs
if ($activeVersionDir) {
    $vHtaccess = $htaccessHeader . "PassengerAppRoot " . $activeVersionDir . "\nPassengerAppType node\nPassengerNodejs /opt/alt/alt-nodejs20/root/bin/node\nPassengerStartupFile server.js\nPassengerBaseURI /\nPassengerRestartDir " . $activeVersionDir . "/tmp\nSetEnv NODE_OPTIONS \"--require /home/u859582759/domains/chandakgroup.tech/hbuilds/config/preload-timestamp.js\"\nSetEnv LSNODE_CONSOLE_LOG console.log\nSetEnv TOKIO_WORKER_THREADS 2\nRewriteRule ^\\.builds - [F,L]\n";
    @file_put_contents($activeVersionDir . '/.htaccess', $vHtaccess);
    @file_put_contents($activeVersionDir . '/public/.htaccess', $vHtaccess);
    @touch($activeVersionDir . '/.htaccess');
    @touch($activeVersionDir . '/public/.htaccess');
}

// Write to __DIR__/.htaccess (which is where deploy-hook.php is running)
if (__DIR__ !== $domainRoot . '/public_html') {
    $currParent = dirname(__DIR__);
    $currHtaccess = $htaccessHeader . "PassengerAppRoot " . $currParent . "\nPassengerAppType node\nPassengerNodejs /opt/alt/alt-nodejs20/root/bin/node\nPassengerStartupFile server.js\nPassengerBaseURI /\nPassengerRestartDir " . $currParent . "/tmp\nSetEnv NODE_OPTIONS \"--require /home/u859582759/domains/chandakgroup.tech/hbuilds/config/preload-timestamp.js\"\nSetEnv LSNODE_CONSOLE_LOG console.log\nSetEnv TOKIO_WORKER_THREADS 2\nRewriteRule ^\\.builds - [F,L]\n";
    @file_put_contents(__DIR__ . '/.htaccess', $currHtaccess);
    @touch(__DIR__ . '/.htaccess');
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
exit;
?>
