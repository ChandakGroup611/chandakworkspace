<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'online',
    'php' => PHP_VERSION,
    'time' => date('Y-m-d H:i:s')
]);
