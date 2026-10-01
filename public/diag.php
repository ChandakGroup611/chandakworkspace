<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

$token = isset($_GET['key']) ? $_GET['key'] : '';
if ($token !== 'chandak_deploy_secret_2026_matrix') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$domainRoot = '/home/u859582759/domains/chandakgroup.tech';

// Inspect all .htaccess files
$htaccessFiles = [
    $domainRoot . '/public_html/.htaccess',
    $domainRoot . '/.htaccess',
    $domainRoot . '/hbuilds/current/nodejs/.htaccess',
];
foreach (glob($domainRoot . '/hbuilds/versions/*/nodejs/.htaccess') as $f) {
    $htaccessFiles[] = $f;
}
foreach (glob($domainRoot . '/hbuilds/versions/*/nodejs/public/.htaccess') as $f) {
    $htaccessFiles[] = $f;
}

$htContents = [];
foreach (array_unique($htaccessFiles) as $ht) {
    if (file_exists($ht)) {
        $htContents[$ht] = file_get_contents($ht);
    }
}

// Check BUILD_ID in all folders
$buildIds = [];
$candidateDirs = [
    $domainRoot . '/public_html',
    $domainRoot . '/hbuilds/current/nodejs',
    $domainRoot . '/hbuilds/current/nodejs/public',
];
foreach (glob($domainRoot . '/hbuilds/versions/*/nodejs') as $d) {
    $candidateDirs[] = $d;
    $candidateDirs[] = $d . '/public';
}
foreach ($candidateDirs as $dir) {
    if (is_dir($dir)) {
        $bFile = $dir . '/.next/BUILD_ID';
        $buildIds[$dir] = file_exists($bFile) ? trim(file_get_contents($bFile)) : 'NO_BUILD_ID';
    }
}

// Check server.js and node process if possible
$serverFiles = [];
foreach ($candidateDirs as $dir) {
    $sFile = $dir . '/server.js';
    if (file_exists($sFile)) {
        $serverFiles[$dir] = [
            'size' => filesize($sFile),
            'mtime' => date('Y-m-d H:i:s', filemtime($sFile))
        ];
    }
}

echo json_encode([
    'current_script' => __FILE__,
    'htaccess' => $htContents,
    'build_ids' => $buildIds,
    'server_files' => $serverFiles,
    'env_port' => getenv('PORT'),
    'env_node_env' => getenv('NODE_ENV'),
    'php_uname' => php_uname(),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
