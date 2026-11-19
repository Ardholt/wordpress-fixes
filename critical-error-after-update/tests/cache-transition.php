<?php
// Exercise Apache's opcode cache, not the separate CLI process's cache.
$target = '/var/www/html/__case_cache_transition.php';
$source = '<?php header("Content-Type: application/json"); echo json_encode(["value" => "old", "sapi" => PHP_SAPI, "opcache_enabled" => ini_get("opcache.enable"), "revalidate_freq" => ini_get("opcache.revalidate_freq")]);';
$stamp = time() - 60;
$context = stream_context_create(['http' => ['timeout' => 10]]);
try {
    file_put_contents($target, $source);
    chmod($target, 0644);
    touch($target, $stamp);
    $before = json_decode(file_get_contents('http://127.0.0.1/__case_cache_transition.php', false, $context), true, 512, JSON_THROW_ON_ERROR);
    file_put_contents($target, str_replace('"old"', '"new"', $source));
    touch($target, $stamp); // Same size and timestamp: no dependency on clock granularity.
    $after = json_decode(file_get_contents('http://127.0.0.1/__case_cache_transition.php', false, $context), true, 512, JSON_THROW_ON_ERROR);
    $passed = $before['value'] === 'old' && $after['value'] === 'new'
        && $after['sapi'] === 'apache2handler' && $after['opcache_enabled'] === '0';
    echo json_encode(['method' => 'Warm a PHP endpoint, replace its literal without changing file size or mtime, then immediately request it again through Apache.', 'before' => $before, 'after' => $after, 'passed' => $passed], JSON_PRETTY_PRINT), "\n";
} finally {
    unlink($target);
}
exit($passed ? 0 : 1);
