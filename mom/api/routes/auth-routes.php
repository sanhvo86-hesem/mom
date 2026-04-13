<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    // Auth
    $router->actions([
        'status'              => [AuthController::class, 'status'],
        'auth_login'          => [AuthController::class, 'login'],
        'auth_mfa_verify'     => [AuthController::class, 'mfaVerify'],
        'auth_enroll_verify'  => [AuthController::class, 'enrollVerify'],
        'auth_logout'         => [AuthController::class, 'logout'],
    ]);
    
    // API Key Management & JWT (Phase 1.1)
    $router->actions([
        'auth_create_api_key' => [ApiKeyController::class, 'create'],
        'auth_list_api_keys'  => [ApiKeyController::class, 'list'],
        'auth_revoke_api_key' => [ApiKeyController::class, 'revoke'],
        'auth_generate_jwt'   => [ApiKeyController::class, 'generateJwt'],
    ]);
    
    // RESTful routes for API keys
    $router->post('/api/auth/api-keys', ApiKeyController::class, 'create');
    $router->get('/api/auth/api-keys', ApiKeyController::class, 'list');
    $router->delete('/api/auth/api-keys/{keyId}', ApiKeyController::class, 'revoke');
    $router->post('/api/auth/jwt', ApiKeyController::class, 'generateJwt');
    
    // Server-Sent Events stream (Phase 1.2)
    $router->get('/api/events/stream', EventStreamController::class, 'stream');
    
    // Health checks (Kubernetes-ready)
    $router->get('/api/health/live', HealthController::class, 'live');
    $router->get('/api/health/ready', HealthController::class, 'ready');
    $router->get('/api/health/status', HealthController::class, 'status');
};
