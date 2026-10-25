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

// Resolve expected deploy secret securely from server environment or external config outside public web root
$expectedToken = getenv('HOSTINGER_DEPLOY_KEY') ?: getenv('DEPLOY_SECRET') ?: 'chandak_deploy_secret_2026';

if (empty($expectedToken) || $expectedToken === 'chandak_deploy_secret_2026') {
    $secretFiles = [
        '/home/u859582759/.deploy_secret',
        '/home/u859582759/domains/chandakgroup.tech/hbuilds/config/deploy_secret.txt',
        dirname(__DIR__) . '/.deploy_secret',
    ];
    foreach ($secretFiles as $sFile) {
        if (file_exists($sFile) && is_readable($sFile)) {
            $content = trim(@file_get_contents($sFile));
            if (!empty($content)) {
                $expectedToken = $content;
                break;
            }
        }
    }
}

if (empty($expectedToken) || empty($token) || !hash_equals($expectedToken, $token)) {
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

// Determine Primary Node Application Roots (ALL versioned Node roots + current + public_html)
$primaryAppRoots = [
    $domainRoot . '/hbuilds/current/nodejs',
    $domainRoot . '/public_html',
];
if ($versionedDirs) {
    foreach ($versionedDirs as $vDir) {
        $primaryAppRoots[] = $vDir;
    }
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

    $psOutput = [];
    @exec('ps aux 2>/dev/null || ps -u $(whoami) -f 2>/dev/null', $psOutput);
    
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
        'processes' => array_slice($psOutput, 0, 50),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Dedicated Force Restart Action
if (isset($_GET['restart']) || isset($_GET['force_restart'])) {
    $killOut = [];
    @exec('pkill -9 -u $(whoami) -f node 2>&1', $killOut);
    @exec('killall -9 node 2>&1', $killOut);
    @exec('/usr/local/bin/passenger-config restart-app --ignore-passenger-not-running / 2>&1', $killOut);
    
    $futureTime = time() + 120;
    foreach ($primaryAppRoots as $target) {
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt', $futureTime);
        @touch($target . '/server.js', $futureTime);
        @touch($target . '/package.json', $futureTime);
    }
    @touch($domainRoot . '/public_html/.htaccess', $futureTime);

    echo json_encode([
        'success' => true,
        'action' => 'force_restart',
        'kill_output' => $killOut,
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

if ($versionedDirs) {
    foreach ($versionedDirs as $vDir) {
        $candidateZipPaths[] = $vDir . '/deploy.zip';
        $candidateZipPaths[] = $vDir . '/public/deploy.zip';
    }
}

// Collect all candidate zip files that exist and have substantive size (>500KB)
$existingZips = [];
foreach (array_unique($candidateZipPaths) as $cand) {
    if ($cand && file_exists($cand) && filesize($cand) > 500000) {
        $existingZips[] = [
            'path' => $cand,
            'mtime' => filemtime($cand),
            'size' => filesize($cand),
            'date' => date('Y-m-d H:i:s', filemtime($cand)),
        ];
    }
}

// Sort by file modification time DESCENDING so the newest zip is ALWAYS chosen
usort($existingZips, function($a, $b) {
    return $b['mtime'] - $a['mtime'];
});

$zipFile = !empty($existingZips) ? $existingZips[0]['path'] : null;

// Purge any older candidate zips so stale versions never get re-extracted
if (count($existingZips) > 1) {
    for ($i = 1; $i < count($existingZips); $i++) {
        @unlink($existingZips[$i]['path']);
    }
}

$extractionResults = [];
$killResults = [];

if ($zipFile && class_exists('ZipArchive')) {
    foreach ($primaryAppRoots as $target) {
        if (!is_dir($target)) {
            @mkdir($target, 0755, true);
        }
        
        // Clear stale Next.js cache and old server/static files to avoid collisions
        if (is_dir($target . '/.next/cache')) {
            recursiveRemove($target . '/.next/cache');
        }
        if (is_dir($target . '/.next/server')) {
            recursiveRemove($target . '/.next/server');
        }
        if (is_dir($target . '/_next')) {
            recursiveRemove($target . '/_next');
        }
        
        $zip = new ZipArchive();
        $res = $zip->open($zipFile);
        $extracted = false;
        if ($res === TRUE) {
            $zip->extractTo($target);
            $zip->close();
            $extracted = true;
        }
        
        // Signal restart with future timestamp to counter clock skew
        $futureTime = time() + 120;
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt', $futureTime);
        if (file_exists($target . '/server.js')) @touch($target . '/server.js', $futureTime);
        if (file_exists($target . '/package.json')) @touch($target . '/package.json', $futureTime);
        
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
            if ($pub . '/_next/static' !== $sourceStatic) {
                recursiveRemove($pub . '/_next/static');
            }
            if ($pub . '/.next/static' !== $sourceStatic) {
                recursiveRemove($pub . '/.next/static');
            }
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

    // Force kill old node processes so Passenger is forced to spawn a fresh worker
    @exec('pkill -9 -u $(whoami) -f node 2>&1', $killResults);
    @exec('killall -9 node 2>&1', $killResults);
    @exec('/usr/local/bin/passenger-config restart-app --ignore-passenger-not-running / 2>&1', $killResults);
}

// Base performance caching header for LiteSpeed & Apache
$htaccessHeader = "<IfModule LiteSpeed>\n    CacheLookup on\n</IfModule>\n\n<IfModule mod_headers.c>\n    <FilesMatch \"\\.(woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$\">\n        Header set Cache-Control \"public, max-age=31536000, immutable\"\n    </FilesMatch>\n    <FilesMatch \"\\.(html|htm|php|json)$\">\n        Header set Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\"\n        Header set CDN-Cache-Control \"no-store\"\n        Header set Surrogate-Control \"no-store\"\n        Header set Pragma \"no-cache\"\n        Header set Expires \"0\"\n    </FilesMatch>\n</IfModule>\n\n";

// Passenger process limits & memory bounds for Hostinger Business container limits (1.5GB RAM)
$passengerDirective = "PassengerAppType node\nPassengerNodejs /opt/alt/alt-nodejs20/root/bin/node\nPassengerStartupFile server.js\nPassengerBaseURI /\nPassengerMaxInstances 1\nPassengerMinInstances 1\nPassengerMaxPoolSize 2\nPassengerPoolIdleTime 300\nPassengerHighPerformance on\nSetEnv NODE_OPTIONS \"--max-old-space-size=400 --require /home/u859582759/domains/chandakgroup.tech/hbuilds/config/preload-timestamp.js\"\nSetEnv LSNODE_CONSOLE_LOG console.log\nSetEnv TOKIO_WORKER_THREADS 2\nRewriteRule ^\\.builds - [F,L]\n";

// 1. Write to public_html/.htaccess
$pubHtaccess = $htaccessHeader . "PassengerAppRoot /home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs\nPassengerRestartDir /home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs/tmp\n" . $passengerDirective;
@file_put_contents($domainRoot . '/public_html/.htaccess', $pubHtaccess);
@touch($domainRoot . '/public_html/.htaccess');

// 2. Write to all versioned dirs if present
if ($versionedDirs) {
    foreach ($versionedDirs as $vDir) {
        $vHtaccess = $htaccessHeader . "PassengerAppRoot " . $vDir . "\nPassengerRestartDir " . $vDir . "/tmp\n" . $passengerDirective;
        @file_put_contents($vDir . '/.htaccess', $vHtaccess);
        @touch($vDir . '/.htaccess');
        if (is_dir($vDir . '/public')) {
            @file_put_contents($vDir . '/public/.htaccess', $vHtaccess);
            @touch($vDir . '/public/.htaccess');
        }
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
