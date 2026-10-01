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
$sourceDir = $domainRoot . '/hbuilds/current/nodejs';
$pubHtml = $domainRoot . '/public_html';

// Copy everything from hbuilds/current/nodejs into public_html
function syncDirs($src, $dst) {
    if (!is_dir($src)) return;
    @mkdir($dst, 0755, true);
    $dir = opendir($src);
    while (($file = readdir($dir)) !== false) {
        if ($file === '.' || $file === '..') continue;
        $s = $src . '/' . $file;
        $d = $dst . '/' . $file;
        if (is_dir($s)) {
            syncDirs($s, $d);
        } else {
            @copy($s, $d);
        }
    }
    closedir($dir);
}

// Perform full sync
syncDirs($sourceDir, $pubHtml);
if (is_dir($sourceDir . '/.next')) {
    syncDirs($sourceDir . '/.next', $pubHtml . '/.next');
}
if (is_dir($sourceDir . '/.next/static')) {
    syncDirs($sourceDir . '/.next/static', $pubHtml . '/_next/static');
    syncDirs($sourceDir . '/.next/static', $pubHtml . '/public/_next/static');
}

// Touch restart signals
@mkdir($sourceDir . '/tmp', 0755, true);
@touch($sourceDir . '/tmp/restart.txt');
@touch($pubHtml . '/tmp/restart.txt');
@touch($pubHtml . '/.htaccess');
@touch($sourceDir . '/.htaccess');

// Check build IDs after sync
$pubBuildId = file_exists($pubHtml . '/.next/BUILD_ID') ? trim(file_get_contents($pubHtml . '/.next/BUILD_ID')) : 'none';
$srcBuildId = file_exists($sourceDir . '/.next/BUILD_ID') ? trim(file_get_contents($sourceDir . '/.next/BUILD_ID')) : 'none';

echo json_encode([
    'success' => true,
    'src_build_id' => $srcBuildId,
    'pub_build_id' => $pubBuildId,
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
