<?php

declare(strict_types=1);

$docRoot = realpath(__DIR__ . '/../../');
if (!is_string($docRoot) || $docRoot === '') {
    http_response_code(500);
    echo 'Local router failed to resolve the portal root.';
    return true;
}

$docRootNorm = rtrim(str_replace('\\', '/', $docRoot), '/');
$requestPath = parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) && $requestPath !== '' ? '/' . ltrim($requestPath, '/') : '/';

$candidate = realpath($docRoot . $requestPath);
$candidateNorm = is_string($candidate) ? str_replace('\\', '/', $candidate) : '';
if ($requestPath !== '/' && $candidateNorm !== '' && str_starts_with($candidateNorm, $docRootNorm . '/') && is_file($candidateNorm)) {
    return false;
}

if ($requestPath === '/') {
    header('Location: /portal.html', true, 302);
    return true;
}

if (str_starts_with($requestPath, '/api/')) {
    $_SERVER['PATH_INFO'] = $requestPath;
    require $docRoot . '/api/index.php';
    return true;
}

if ($requestPath === '/api.php') {
    require $docRoot . '/api.php';
    return true;
}

return false;
