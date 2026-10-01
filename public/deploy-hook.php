<?php
// Bulletproof High-Performance Deployment Extractor & Passenger Synchronizer for Hostinger
@ini_set('max_execution_time', 300);
@set_time_limit(300);
@ini_set('memory_limit', '512M');
@ignore_user_abort(true);
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

// Helper: Fast recursive directory copy
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

// Helper: Fast recursive remove
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

// Domain root discovery
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

$versionedDirs = glob($domainRoot . '/hbuilds/versions/*/nodejs');
$activeVersionDir = ($versionedDirs && count($versionedDirs) > 0) ? $versionedDirs[0] : null;

// Determine Primary Node Application Roots (ONLY the true Node app roots)
$primaryAppRoots = [
    $domainRoot . '/hbuilds/current/nodejs',
    $domainRoot . '/public_html',
];
if ($activeVersionDir) {
    $primaryAppRoots[] = $activeVersionDir;
}
if (dirname(__DIR__) !== $domainRoot && is_dir(dirname(__DIR__))) {
    $primaryAppRoots[] = dirname(__DIR__);
}

$primaryAppRoots = array_values(array_unique(array_filter($primaryAppRoots, 'is_dir')));

// Determine all public-facing document roots (where LiteSpeed directly serves static chunks)
$publicDocRoots = [
    $domainRoot . '/public_html',
    $domainRoot . '/hbuilds/current/nodejs/public',
    __DIR__,
];
if ($activeVersionDir) {
    $publicDocRoots[] = $activeVersionDir . '/public';
}
if ($versionedDirs) {
    foreach ($versionedDirs as $vDir) {
        $publicDocRoots[] = $vDir . '/public';
    }
}
$publicDocRoots = array_values(array_unique(array_filter($publicDocRoots, 'is_dir')));

// Diagnostic / Info Mode
if (isset($_GET['info']) || isset($_GET['scan']) || isset($_GET['diag']) || isset($_GET['logs'])) {
    $foundBuildIds = [];
    $foundFiles = [];
    $foundLogs = [];
    $foundHts = [];
    
    foreach ($primaryAppRoots as $tDir) {
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
        'app_roots' => $primaryAppRoots,
        'public_doc_roots' => $publicDocRoots,
        'build_ids' => $foundBuildIds,
        'files' => $foundFiles,
        'logs' => $foundLogs,
        'htaccess' => $foundHts,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Find deploy.zip in candidate locations
$candidateZipPaths = [
    $domainRoot . '/public_html/deploy.zip',
    $domainRoot . '/deploy.zip',
    __DIR__ . '/deploy.zip',
    dirname(__DIR__) . '/deploy.zip',
    '/home/u859582759/deploy.zip',
    '/home/u859582759/public_html/deploy.zip',
];

if ($activeVersionDir) {
    $candidateZipPaths[] = $activeVersionDir . '/deploy.zip';
    $candidateZipPaths[] = $activeVersionDir . '/public/deploy.zip';
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
    foreach ($primaryAppRoots as $target) {
        if (!is_dir($target)) {
            @mkdir($target, 0755, true);
        }
        
        // Clear stale Next.js cache to avoid memory corruptions
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
        
        // Signal restart
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt');
        if (file_exists($target . '/server.js')) @touch($target . '/server.js');
        if (file_exists($target . '/package.json')) @touch($target . '/package.json');
        
        $extractionResults[$target] = [
            'extracted' => $extracted,
            'build_id' => file_exists($target . '/.next/BUILD_ID') ? trim(@file_get_contents($target . '/.next/BUILD_ID')) : null
        ];
    }

    // Locate freshly extracted static chunk assets
    $sourceStatic = null;
    foreach ($primaryAppRoots as $root) {
        if (is_dir($root . '/.next/static')) {
            $sourceStatic = $root . '/.next/static';
            break;
        }
    }

    // CRITICAL: Mirror static chunks into ALL public-facing document roots so LiteSpeed never serves stale chunks
    if ($sourceStatic) {
        foreach ($publicDocRoots as $pub) {
            @mkdir($pub . '/_next', 0755, true);
            @mkdir($pub . '/.next', 0755, true);
            recursiveCopy($sourceStatic, $pub . '/_next/static');
            recursiveCopy($sourceStatic, $pub . '/.next/static');
            if (is_dir($pub . '/public')) {
                recursiveCopy($sourceStatic, $pub . '/public/_next/static');
            }
        }
    }
    
    // Clean up zip file and sync states
    @unlink($zipFile);
    @unlink(__DIR__ . '/.ftp-deploy-sync-state.json');
    @unlink($domainRoot . '/public_html/.ftp-deploy-sync-state.json');
}

// Base anti-caching header for LiteSpeed & Apache
$htaccessHeader = "<IfModule LiteSpeed>\n    CacheLookup off\n    SetEnv no-lscache 1\n</IfModule>\n\n<IfModule mod_headers.c>\n    <FilesMatch \"\\.(html|htm|php|json|js|css)$\">\n        Header set Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\"\n        Header set CDN-Cache-Control \"no-store\"\n        Header set Surrogate-Control \"no-store\"\n        Header set Pragma \"no-cache\"\n        Header set Expires \"0\"\n    </FilesMatch>\n    <FilesMatch \"\\.(woff|woff2|svg|png|jpg|jpeg|gif|webp|ico)$\">\n        Header set Cache-Control \"public, max-age=3600, must-revalidate\"\n    </FilesMatch>\n</IfModule>\n\n";

// Rewrite rules & Passenger configurations
$passengerDirective = "PassengerAppType node\nPassengerNodejs /opt/alt/alt-nodejs20/root/bin/node\nPassengerStartupFile server.js\nPassengerBaseURI /\nSetEnv NODE_OPTIONS \"--require /home/u859582759/domains/chandakgroup.tech/hbuilds/config/preload-timestamp.js\"\nSetEnv LSNODE_CONSOLE_LOG console.log\nSetEnv TOKIO_WORKER_THREADS 2\nRewriteRule ^\\.builds - [F,L]\n";

// 1. Write to public_html/.htaccess
$pubHtaccess = $htaccessHeader . "PassengerAppRoot /home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs\nPassengerRestartDir /home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs/tmp\n" . $passengerDirective;
@file_put_contents($domainRoot . '/public_html/.htaccess', $pubHtaccess);
@touch($domainRoot . '/public_html/.htaccess');

// 2. Write to active versioned dir if present
if ($activeVersionDir) {
    $vHtaccess = $htaccessHeader . "PassengerAppRoot " . $activeVersionDir . "\nPassengerRestartDir " . $activeVersionDir . "/tmp\n" . $passengerDirective;
    @file_put_contents($activeVersionDir . '/.htaccess', $vHtaccess);
    @touch($activeVersionDir . '/.htaccess');
    if (is_dir($activeVersionDir . '/public')) {
        @file_put_contents($activeVersionDir . '/public/.htaccess', $vHtaccess);
        @touch($activeVersionDir . '/public/.htaccess');
    }
}

// 3. Write to current nodejs dir
$currNode = $domainRoot . '/hbuilds/current/nodejs';
if (is_dir($currNode)) {
    $cHtaccess = $htaccessHeader . "PassengerAppRoot " . $currNode . "\nPassengerRestartDir " . $currNode . "/tmp\n" . $passengerDirective;
    @file_put_contents($currNode . '/.htaccess', $cHtaccess);
    @touch($currNode . '/.htaccess');
}

// 4. Touch all restart.txt triggers to force Passenger worker respawn
foreach ($primaryAppRoots as $root) {
    @mkdir($root . '/tmp', 0755, true);
    @touch($root . '/tmp/restart.txt');
    if (file_exists($root . '/server.js')) @touch($root . '/server.js');
}

// 5. Ensure deploy-hook is preserved in public_html and versioned public
$selfCode = @file_get_contents(__FILE__);
if ($selfCode) {
    @file_put_contents($domainRoot . '/public_html/deploy-hook.php', $selfCode);
    if ($activeVersionDir && is_dir($activeVersionDir . '/public')) {
        @file_put_contents($activeVersionDir . '/public/deploy-hook.php', $selfCode);
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
