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

// Helper: Safe command execution without crashing if exec is disabled in php.ini
function safeExec($cmd, &$out = []) {
    if (function_exists('exec')) {
        $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
        if (!in_array('exec', $disabled)) {
            try {
                return @exec($cmd, $out);
            } catch (\Throwable $t) {
                return false;
            }
        }
    }
    return false;
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

// Helper: Ensure Next.js required runtime manifests exist to prevent ENOENT crash
function ensurePreviewProps($appRoots) {
    $fallbackJson = json_encode([
        'previewModeId' => 'none',
        'previewModeSigningKey' => 'none',
        'previewModeEncryptionKey' => 'none'
    ]);
    foreach ((array)$appRoots as $target) {
        if (!$target || !is_dir($target)) continue;
        $serverDir = $target . '/.next/server';
        if (!is_dir($serverDir)) {
            @mkdir($serverDir, 0755, true);
        }
        $previewFile = $serverDir . '/preview-props.json';
        if (!file_exists($previewFile) || filesize($previewFile) === 0) {
            @file_put_contents($previewFile, $fallbackJson);
        }
    }
}

// Helper: Reap orphan node and lsnode processes using POSIX signals to prevent hitting CloudLinux LVE NPROC limits
function reapOrphanProcesses() {
    $killed = [];
    if (!function_exists('posix_kill')) {
        return $killed;
    }
    $myPid = getmypid();
    $procDirs = @glob('/proc/[0-9]*');
    if ($procDirs) {
        foreach ($procDirs as $pDir) {
            $pid = (int)basename($pDir);
            if ($pid > 1 && $pid !== $myPid) {
                $cmd = @file_get_contents($pDir . '/cmdline');
                if ($cmd && (strpos($cmd, 'node') !== false || strpos($cmd, 'lsnode') !== false || strpos($cmd, 'server.js') !== false)) {
                    if (@posix_kill($pid, 9)) {
                        $killed[] = $pid;
                    }
                }
            }
        }
    }
    return $killed;
}

// Helper: Ensure .htaccess with PassengerAppRoot is synchronized across ALL docroots to prevent LiteSpeed static fallback 403 Forbidden
function syncHtaccessToAllRoots($domainRoot, $canonicalAppRoot, $primaryAppRoots, $publicDocRoots, $htaccessHeader, $passengerDirective) {
    $pubHtaccess = $htaccessHeader . "PassengerAppRoot " . $canonicalAppRoot . "\nPassengerRestartDir " . $canonicalAppRoot . "/tmp\n" . $passengerDirective;
    
    // 1. Write authoritative .htaccess to public_html/.htaccess
    @file_put_contents($domainRoot . '/public_html/.htaccess', $pubHtaccess);
    @touch($domainRoot . '/public_html/.htaccess');
    
    // 2. Synchronize across all primary app directories and public/ folders to prevent LiteSpeed static fallback 403
    $targets = array_unique(array_filter(array_merge(
        (array)$primaryAppRoots,
        (array)$publicDocRoots,
        [
            $canonicalAppRoot,
            $canonicalAppRoot . '/public',
            $domainRoot . '/hbuilds/current/nodejs',
            $domainRoot . '/hbuilds/current/nodejs/public'
        ]
    )));
    foreach ($targets as $targetRoot) {
        if ($targetRoot && is_dir($targetRoot)) {
            @file_put_contents($targetRoot . '/.htaccess', $pubHtaccess);
            @touch($targetRoot . '/.htaccess');
            if (is_dir($targetRoot . '/public')) {
                @file_put_contents($targetRoot . '/public/.htaccess', $pubHtaccess);
                @touch($targetRoot . '/public/.htaccess');
            }
        }
    }
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

// Active version directory discovery from running script location
$activeVersionDir = null;
if (strpos(__DIR__, 'hbuilds/versions') !== false) {
    $parent = dirname(__DIR__);
    if (basename($parent) === 'nodejs') {
        $activeVersionDir = $parent;
    }
}
if (!$activeVersionDir && $versionedDirs) {
    usort($versionedDirs, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    $activeVersionDir = $versionedDirs[0];
}

// Canonical application root is always current/nodejs when present, fallback to active version
$canonicalAppRoot = (is_dir($domainRoot . '/hbuilds/current/nodejs'))
    ? ($domainRoot . '/hbuilds/current/nodejs')
    : ($activeVersionDir ?: ($domainRoot . '/hbuilds/current/nodejs'));

// All app roots that must be kept in sync so LiteSpeed finds the app regardless of vhost mapping
$primaryAppRoots = array_values(array_unique(array_filter([
    $canonicalAppRoot,
    $domainRoot . '/hbuilds/current/nodejs'
])));

// Base performance caching header for LiteSpeed & Apache
$htaccessHeader = "<IfModule LiteSpeed>\n    CacheLookup on\n    RewriteEngine On\n    RewriteRule .* - [E=verifycaptcha:off]\n    RewriteRule .* - [E=noconntimeout:1]\n    RewriteRule .* - [E=noabort:1]\n</IfModule>\n\nRewriteEngine On\nRewriteRule ^\\.builds - [F,L]\nRewriteRule ^deploy\\.zip$ - [F,L]\n\n# CRITICAL: PHP files must ALWAYS be served natively by LiteSpeed, NEVER by Passenger\nRewriteCond %{REQUEST_URI} \\.php$ [NC]\nRewriteRule .* - [L]\n\n<FilesMatch \"\\.php$\">\n    PassengerEnabled off\n</FilesMatch>\n\n<IfModule mod_headers.c>\n    <FilesMatch \"\\.(woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|css|js)$\">\n        Header set Cache-Control \"public, max-age=31536000, immutable\"\n    </FilesMatch>\n    <FilesMatch \"\\.(html|htm|php|json)$\">\n        Header set Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\"\n        Header set CDN-Cache-Control \"no-store\"\n        Header set Surrogate-Control \"no-store\"\n        Header set Pragma \"no-cache\"\n        Header set Expires \"0\"\n    </FilesMatch>\n</IfModule>\n\n# CRITICAL: Directly serve all existing static assets from LiteSpeed without waking or spawning Node.js\nRewriteCond %{REQUEST_FILENAME} -f\nRewriteRule ^ - [L]\n\n";

// Passenger process limits & memory bounds for Hostinger Business container limits (1.5GB RAM)
// STRICT: Explicit PassengerEnabled on, bound V8 and libuv thread pools so total threads per process <= 3
$passengerDirective = "PassengerEnabled on\nPassengerAppType node\nPassengerNodejs /opt/alt/alt-nodejs20/root/bin/node\nPassengerStartupFile server.js\nPassengerBaseURI /\nSetEnv NODE_OPTIONS \"--v8-pool-size=1 --max-old-space-size=512\"\nSetEnv LSNODE_CONSOLE_LOG console.log\nSetEnv TOKIO_WORKER_THREADS 1\nSetEnv UV_THREADPOOL_SIZE 1\nSetEnv DOTENV_CONFIG_QUIET true\n";

// Determine all public-facing document roots (where LiteSpeed directly serves static chunks)
$publicDocRoots = [
    $domainRoot . '/public_html',
    $canonicalAppRoot . '/public',
    $domainRoot . '/hbuilds/current/nodejs/public',
    __DIR__,
];
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
    safeExec('ps aux 2>/dev/null || ps -u $(whoami) -f 2>/dev/null', $psOutput);
    
    // Scan /proc for node processes directly
    $nodePids = [];
    $procDirs = @glob('/proc/[0-9]*');
    if ($procDirs) {
        foreach ($procDirs as $pDir) {
            $pid = (int)basename($pDir);
            if ($pid > 1 && $pid !== getmypid()) {
                $cmd = @file_get_contents($pDir . '/cmdline');
                if ($cmd && (strpos($cmd, 'node') !== false || strpos($cmd, 'server.js') !== false)) {
                    $status = @file_get_contents($pDir . '/status');
                    $threads = 0;
                    if (preg_match('/Threads:\s+(\d+)/', (string)$status, $m)) {
                        $threads = (int)$m[1];
                    }
                    $nodePids[] = [
                        'pid' => $pid,
                        'threads' => $threads,
                        'cwd' => @readlink($pDir . '/cwd'),
                        'cmd' => substr(str_replace("\0", " ", $cmd), 0, 100)
                    ];
                }
            }
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
        'processes' => array_slice($psOutput, 0, 50),
        'node_pids' => $nodePids,
        'posix_kill_exists' => function_exists('posix_kill'),
        'disabled_functions' => ini_get('disable_functions'),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Dedicated Process Reap Action: proactively kill orphan workers to free CloudLinux LVE limits
if (isset($_GET['reap']) || isset($_GET['kill_orphans'])) {
    $reaped = reapOrphanProcesses();
    echo json_encode([
        'success' => true,
        'action' => 'reap',
        'reaped_count' => count($reaped),
        'reaped_pids' => $reaped,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Dedicated Warmup Action: pre-warm Passenger worker and required runtime files
if (isset($_GET['warmup'])) {
    ensurePreviewProps($primaryAppRoots);
    foreach ($primaryAppRoots as $target) {
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt');
    }
    echo json_encode([
        'success' => true,
        'action' => 'warmup',
        'routes' => ['/api/version', '/login', '/'],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Dedicated Rollback Action
if (isset($_GET['action']) && $_GET['action'] === 'rollback') {
    $oldTarget = isset($_GET['old']) ? trim($_GET['old']) : '';
    $rollbackSuccess = false;
    if ($oldTarget && is_dir($oldTarget)) {
        $liveNodejs = $domainRoot . '/hbuilds/current/nodejs';
        if (is_link($liveNodejs)) {
            @unlink($liveNodejs);
            @symlink($oldTarget, $liveNodejs);
        } else {
            recursiveCopy($oldTarget, $liveNodejs);
        }
        @mkdir($liveNodejs . '/tmp', 0755, true);
        @touch($liveNodejs . '/tmp/restart.txt');
        $reaped = reapOrphanProcesses();
        safeExec('/usr/local/bin/passenger-config restart-app --ignore-passenger-not-running / 2>&1');
        $rollbackSuccess = true;
    }
    echo json_encode([
        'success' => $rollbackSuccess,
        'action' => 'rollback',
        'target' => $oldTarget,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Helper: Truncate single log file exceeding 50 MB to its last 10 MB
function truncateLogIfOversized($path, $maxBytes = 52428800, $keepBytes = 10485760) {
    if (!file_exists($path) || filesize($path) <= $maxBytes) return 0;
    $initialSize = filesize($path);
    $fp = @fopen($path, 'r+');
    if (!$fp) return 0;
    @fseek($fp, -$keepBytes, SEEK_END);
    $tail = @fread($fp, $keepBytes);
    @ftruncate($fp, 0);
    @rewind($fp);
    @fwrite($fp, $tail);
    @fclose($fp);
    return max(0, $initialSize - $keepBytes);
}

// Dedicated Post-Deploy Cleanup Action (C1)
if (isset($_GET['action']) && $_GET['action'] === 'post_deploy_cleanup') {
    $freedBytes = 0;
    $freedFiles = 0;

    // 1. Delete deploy.zip and any *.zip in public_html and domain root
    $zipCandidates = array_unique(array_merge(
        (array)glob($domainRoot . '/*.zip'),
        (array)glob($domainRoot . '/public_html/*.zip'),
        (array)glob($domainRoot . '/hbuilds/*.zip'),
        ['/home/u859582759/deploy.zip']
    ));
    foreach ($zipCandidates as $z) {
        if ($z && file_exists($z)) {
            $freedBytes += (int)@filesize($z);
            if (@unlink($z)) $freedFiles++;
        }
    }

    // 2. Keep only 3 newest releases in hbuilds/releases/ (never the live one), delete older
    $liveTarget = is_link($canonicalAppRoot) ? @readlink($canonicalAppRoot) : $canonicalAppRoot;
    $liveReal = $liveTarget ? @realpath($liveTarget) : '';
    $releasesBase = $domainRoot . '/hbuilds/releases';
    $releases = glob($releasesBase . '/*');
    if ($releases && count($releases) > 3) {
        usort($releases, function($a, $b) { return filemtime($b) - filemtime($a); });
        for ($i = 3; $i < count($releases); $i++) {
            $rPath = $releases[$i];
            if (is_dir($rPath) && @realpath($rPath) !== $liveReal) {
                recursiveRemove($rPath);
                $freedFiles++;
            }
        }
    }

    // 3. Delete logs older than 7 days; truncate single log above 50 MB to last 10 MB
    $sevenDaysAgo = time() - (7 * 86400);
    $allLogs = array_unique(array_merge(
        (array)glob($domainRoot . '/*.log'),
        (array)glob($canonicalAppRoot . '/*.log'),
        (array)glob($domainRoot . '/hbuilds/*/*.log')
    ));
    foreach ($allLogs as $lg) {
        if ($lg && file_exists($lg)) {
            if (filemtime($lg) < $sevenDaysAgo) {
                $freedBytes += (int)@filesize($lg);
                if (@unlink($lg)) $freedFiles++;
            } else {
                $freedBytes += truncateLogIfOversized($lg);
            }
        }
    }

    // 4. Reap orphan node/lsnode processes
    $reaped = reapOrphanProcesses();

    // 5. Gather current disk metrics
    $totalDisk = @disk_total_space($domainRoot) ?: 1;
    $freeDisk = @disk_free_space($domainRoot) ?: 0;
    $usedDisk = max(0, $totalDisk - $freeDisk);
    $usedPercent = round(($usedDisk / $totalDisk) * 100, 1);

    echo json_encode([
        'success' => true,
        'action' => 'post_deploy_cleanup',
        'disk_used_human' => round($usedDisk / (1024 * 1024 * 1024), 2) . ' GB (' . $usedPercent . '%)',
        'disk_used_percent' => $usedPercent,
        'freed_mb' => round($freedBytes / (1024 * 1024), 2),
        'freed_files' => $freedFiles,
        'reaped_workers' => count($reaped),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Dedicated Weekly Housekeeping Action (C2)
if (isset($_GET['action']) && $_GET['action'] === 'housekeeping') {
    $beforeTotal = @disk_total_space($domainRoot) ?: 1;
    $beforeFree = @disk_free_space($domainRoot) ?: 0;
    $beforeUsed = max(0, $beforeTotal - $beforeFree);
    $beforeUsedPercent = round(($beforeUsed / $beforeTotal) * 100, 1);

    $freedBytes = 0;
    $freedFiles = 0;

    // Run all C1 tasks (zips, stale releases, logs, orphan workers)
    $zipCandidates = array_unique(array_merge(
        (array)glob($domainRoot . '/*.zip'),
        (array)glob($domainRoot . '/public_html/*.zip'),
        (array)glob($domainRoot . '/hbuilds/*.zip'),
        ['/home/u859582759/deploy.zip']
    ));
    foreach ($zipCandidates as $z) {
        if ($z && file_exists($z)) {
            $freedBytes += (int)@filesize($z);
            if (@unlink($z)) $freedFiles++;
        }
    }

    $liveTarget = is_link($canonicalAppRoot) ? @readlink($canonicalAppRoot) : $canonicalAppRoot;
    $liveReal = $liveTarget ? @realpath($liveTarget) : '';
    $releases = glob($domainRoot . '/hbuilds/releases/*');
    if ($releases && count($releases) > 3) {
        usort($releases, function($a, $b) { return filemtime($b) - filemtime($a); });
        for ($i = 3; $i < count($releases); $i++) {
            $rPath = $releases[$i];
            if (is_dir($rPath) && @realpath($rPath) !== $liveReal) {
                recursiveRemove($rPath);
                $freedFiles++;
            }
        }
    }

    $sevenDaysAgo = time() - (7 * 86400);
    $allLogs = array_unique(array_merge(
        (array)glob($domainRoot . '/*.log'),
        (array)glob($canonicalAppRoot . '/*.log'),
        (array)glob($domainRoot . '/hbuilds/*/*.log')
    ));
    foreach ($allLogs as $lg) {
        if ($lg && file_exists($lg)) {
            if (filemtime($lg) < $sevenDaysAgo) {
                $freedBytes += (int)@filesize($lg);
                if (@unlink($lg)) $freedFiles++;
            } else {
                $freedBytes += truncateLogIfOversized($lg);
            }
        }
    }

    // Weekly Housekeeping: Clear ~/.npm/_cacache
    $npmCache = '/home/u859582759/.npm/_cacache';
    if (is_dir($npmCache)) {
        recursiveRemove($npmCache);
        @mkdir($npmCache, 0755, true);
    }

    // Weekly Housekeeping: Clear stale ~/.cache (preserving any active runtime cache)
    $userCache = '/home/u859582759/.cache';
    if (is_dir($userCache)) {
        $cItems = glob($userCache . '/*');
        foreach ($cItems as $ci) {
            if (is_dir($ci) && basename($ci) !== 'next-server') {
                recursiveRemove($ci);
            }
        }
    }

    // Weekly Housekeeping: Clear ~/tmp files older than 7 days
    $tmpDir = '/home/u859582759/tmp';
    if (is_dir($tmpDir)) {
        $tmpFiles = glob($tmpDir . '/*');
        foreach ($tmpFiles as $tf) {
            if (file_exists($tf) && filemtime($tf) < $sevenDaysAgo) {
                if (is_dir($tf)) recursiveRemove($tf);
                else @unlink($tf);
            }
        }
    }

    $reaped = reapOrphanProcesses();

    // After stats
    $afterTotal = @disk_total_space($domainRoot) ?: 1;
    $afterFree = @disk_free_space($domainRoot) ?: 0;
    $afterUsed = max(0, $afterTotal - $afterFree);
    $afterUsedPercent = round(($afterUsed / $afterTotal) * 100, 1);

    // Check 85% threshold
    $overThreshold = ($afterUsedPercent > 85.0);

    echo json_encode([
        'success' => true,
        'action' => 'housekeeping',
        'before_disk_used_gb' => round($beforeUsed / (1024 * 1024 * 1024), 2),
        'before_disk_percent' => $beforeUsedPercent,
        'after_disk_used_gb' => round($afterUsed / (1024 * 1024 * 1024), 2),
        'after_disk_percent' => $afterUsedPercent,
        'freed_mb' => round($freedBytes / (1024 * 1024), 2),
        'freed_files' => $freedFiles,
        'reaped_workers' => count($reaped),
        'over_threshold' => $overThreshold,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Dedicated Force Restart Action
if (isset($_GET['restart']) || isset($_GET['force_restart'])) {
    $killedViaPosix = reapOrphanProcesses();
    $killOut = [];
    safeExec('/usr/local/bin/passenger-config restart-app --ignore-passenger-not-running / 2>&1', $killOut);

    // Clean up stray server.js and package.json from public_html
    @unlink($domainRoot . '/public_html/server.js');
    @unlink($domainRoot . '/public_html/package.json');

    // Sync .htaccess with PassengerAppRoot to ALL roots so LiteSpeed routes correctly regardless of vhost docroot
    syncHtaccessToAllRoots($domainRoot, $canonicalAppRoot, $primaryAppRoots, $publicDocRoots, $htaccessHeader, $passengerDirective);

    ensurePreviewProps($primaryAppRoots);

    foreach ($primaryAppRoots as $target) {
        @mkdir($target . '/tmp', 0755, true);
        @touch($target . '/tmp/restart.txt');
        if (file_exists($target . '/server.js')) {
            @touch($target . '/server.js');
        }
        if (file_exists($target . '/package.json')) {
            @touch($target . '/package.json');
        }
    }
    @touch($domainRoot . '/public_html/.htaccess');

    echo json_encode([
        'success' => true,
        'action' => 'force_restart',
        'killed_pids' => $killedViaPosix,
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

// Dedicated Clean / Purge Zip Action
if (isset($_GET['clean']) || isset($_GET['purge_zip'])) {
    $purged = [];
    foreach (array_unique($candidateZipPaths) as $zPath) {
        if ($zPath && file_exists($zPath)) {
            @unlink($zPath);
            $purged[] = $zPath;
        }
    }
    echo json_encode([
        'success' => true,
        'action' => 'clean',
        'purged' => $purged,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
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
        
        // Clear stale Next.js cache and public chunks to avoid collisions
        // DO NOT delete .next/server beforehand: running Node workers require files in-place to avoid ENOENT crashes!
        if (is_dir($target . '/.next/cache')) {
            recursiveRemove($target . '/.next/cache');
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

    ensurePreviewProps($primaryAppRoots);

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
    foreach (array_unique($candidateZipPaths) as $zPath) {
        if ($zPath && file_exists($zPath)) {
            @unlink($zPath);
        }
    }
    @unlink(__DIR__ . '/.ftp-deploy-sync-state.json');
    @unlink($domainRoot . '/public_html/.ftp-deploy-sync-state.json');

    // Archive release directory and prune older releases (keep 3 newest)
    $requestedSha = isset($_GET['sha']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['sha']) : '';
    if (!empty($requestedSha)) {
        $releasesBase = $domainRoot . '/hbuilds/releases';
        @mkdir($releasesBase, 0755, true);
        $releaseTarget = $releasesBase . '/' . $requestedSha;
        if (!is_dir($releaseTarget)) {
            recursiveCopy($canonicalAppRoot, $releaseTarget);
        }
        $allReleases = glob($releasesBase . '/*');
        if ($allReleases && count($allReleases) > 3) {
            usort($allReleases, function($a, $b) { return filemtime($b) - filemtime($a); });
            for ($i = 3; $i < count($allReleases); $i++) {
                if (is_dir($allReleases[$i])) {
                    recursiveRemove($allReleases[$i]);
                }
            }
        }
    }

    // Prune old logs older than 7 days
    $candidateLogs = array_merge(
        (array)glob($domainRoot . '/*.log'),
        (array)glob($canonicalAppRoot . '/*.log'),
        (array)glob($domainRoot . '/hbuilds/*/*.log')
    );
    $sevenDaysAgo = time() - (7 * 86400);
    foreach ($candidateLogs as $cLog) {
        if ($cLog && file_exists($cLog) && filemtime($cLog) < $sevenDaysAgo) {
            @unlink($cLog);
        }
    }

    // Reap orphan processes and signal Passenger to reload the application smoothly
    $killResults = reapOrphanProcesses();
    safeExec('/usr/local/bin/passenger-config restart-app --ignore-passenger-not-running / 2>&1', $killResults);
}

// 1. Sync .htaccess with PassengerAppRoot to ALL roots so LiteSpeed routes correctly regardless of vhost docroot
syncHtaccessToAllRoots($domainRoot, $canonicalAppRoot, $primaryAppRoots, $publicDocRoots, $htaccessHeader, $passengerDirective);

// 3. Clean up any stray server.js in public_html
@unlink($domainRoot . '/public_html/server.js');
@unlink($domainRoot . '/public_html/package.json');

// 4. Touch restart.txt trigger
ensurePreviewProps($primaryAppRoots);
@mkdir($canonicalAppRoot . '/tmp', 0755, true);
@touch($canonicalAppRoot . '/tmp/restart.txt');
if (file_exists($canonicalAppRoot . '/server.js')) @touch($canonicalAppRoot . '/server.js');
if (file_exists($canonicalAppRoot . '/package.json')) @touch($canonicalAppRoot . '/package.json');
@touch($domainRoot . '/public_html/.htaccess');

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
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
exit;
?>
