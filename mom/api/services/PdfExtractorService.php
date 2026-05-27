<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

/**
 * PdfExtractorService — runs `pdftotext` (poppler-utils) on a PDF blob
 * or path and returns plain text.
 *
 * Why not a PHP-native parser (Smalot\PdfParser):
 *   poppler-utils is the de-facto PDF text extraction tool, handles
 *   layout, columns, embedded fonts, and weird PDF/A variants better
 *   than any pure-PHP library. The package is in every modern Debian/
 *   Ubuntu repo and adds ~3 MB. We only need text-extraction, not
 *   structure-extraction, so the simpler tool wins.
 *
 * Install (Debian / Ubuntu VPS):
 *   sudo apt update && sudo apt install -y poppler-utils
 *
 * Falls back to a clear error message if the binary is missing so the
 * admin sees what to install rather than a silent "no text extracted".
 *
 * @package MOM\Api\Services
 */
final class PdfExtractorService
{
    private const BINARY            = '/usr/bin/pdftotext';
    private const FALLBACK_BINARIES = ['/usr/local/bin/pdftotext', '/opt/homebrew/bin/pdftotext'];
    private const MAX_OUTPUT_BYTES  = 200_000;   // 200 KB cap per PDF
    private const TIMEOUT_SECONDS   = 30;

    /**
     * Extract text from a PDF given its on-disk path. Returns ['text'=>...,
     * 'chars'=>int, 'truncated'=>bool, 'binary'=>string].
     *
     * @return array{text:string, chars:int, truncated:bool, binary:string}
     */
    public function extractFromPath(string $pdfPath): array
    {
        if (!is_file($pdfPath) || !is_readable($pdfPath)) {
            throw new RuntimeException('PDF file not readable: ' . $pdfPath);
        }
        $bin = $this->resolveBinary();
        if ($bin === '') {
            throw new RuntimeException(
                'pdftotext binary not found. Install with '
                . '`sudo apt install -y poppler-utils` (Debian/Ubuntu) or '
                . '`brew install poppler` (macOS).'
            );
        }

        // pdftotext -layout -enc UTF-8 -nopgbrk <input> - (stdout)
        $cmd = sprintf(
            '%s -layout -enc UTF-8 -nopgbrk %s -',
            escapeshellcmd($bin),
            escapeshellarg($pdfPath)
        );

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proc = proc_open($cmd, $descriptors, $pipes);
        if (!is_resource($proc)) {
            throw new RuntimeException('proc_open failed for pdftotext.');
        }
        fclose($pipes[0]);

        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout   = '';
        $stderr   = '';
        $deadline = time() + self::TIMEOUT_SECONDS;

        while (true) {
            $read   = [$pipes[1], $pipes[2]];
            $write  = null;
            $except = null;
            if (stream_select($read, $write, $except, 1) === false) {
                break;
            }
            foreach ($read as $stream) {
                $chunk = fread($stream, 8192);
                if ($chunk === false || $chunk === '') {
                    continue;
                }
                if ($stream === $pipes[1]) {
                    $stdout .= $chunk;
                    if (strlen($stdout) >= self::MAX_OUTPUT_BYTES * 2) {
                        // Hard cap to avoid runaway PDFs.
                        $stdout = substr($stdout, 0, self::MAX_OUTPUT_BYTES * 2);
                    }
                } else {
                    $stderr .= $chunk;
                }
            }
            $status = proc_get_status($proc);
            if (!$status['running']) {
                // Drain any final bytes.
                while (($chunk = fread($pipes[1], 8192)) !== false && $chunk !== '') {
                    $stdout .= $chunk;
                }
                while (($chunk = fread($pipes[2], 8192)) !== false && $chunk !== '') {
                    $stderr .= $chunk;
                }
                break;
            }
            if (time() >= $deadline) {
                proc_terminate($proc, 9);
                throw new RuntimeException('pdftotext timed out after '
                    . self::TIMEOUT_SECONDS . 's on ' . basename($pdfPath));
            }
        }

        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($proc);
        if ($exitCode !== 0 && trim($stderr) !== '') {
            throw new RuntimeException("pdftotext exit=$exitCode: "
                . mb_substr($stderr, 0, 300));
        }

        $truncated = false;
        if (strlen($stdout) > self::MAX_OUTPUT_BYTES) {
            $stdout    = mb_substr($stdout, 0, self::MAX_OUTPUT_BYTES);
            $truncated = true;
        }

        // Normalize line endings + collapse trailing whitespace runs that
        // pdftotext produces around tabular layouts.
        $stdout = str_replace(["\r\n", "\r"], "\n", $stdout);
        $stdout = preg_replace('/[ \t]+\n/', "\n", $stdout) ?? $stdout;

        return [
            'text'      => $stdout,
            'chars'     => mb_strlen($stdout),
            'truncated' => $truncated,
            'binary'    => $bin,
        ];
    }

    /**
     * Convenience: write a binary blob (e.g. attachment from email) to
     * a temp file, extract, then clean up. Returns same shape as
     * extractFromPath().
     *
     * @return array{text:string, chars:int, truncated:bool, binary:string}
     */
    public function extractFromBytes(string $bytes, string $hintFilename = 'attachment.pdf'): array
    {
        if ($bytes === '' || strncmp($bytes, '%PDF-', 5) !== 0) {
            throw new RuntimeException('Not a PDF (magic bytes %PDF- missing).');
        }
        $tmp = tempnam(sys_get_temp_dir(), 'aeoi_pdf_');
        if ($tmp === false) {
            throw new RuntimeException('tempnam failed.');
        }
        // Rename to .pdf so any tool inspecting extension is happy.
        $tmpPdf = $tmp . '_' . preg_replace('/[^A-Za-z0-9._-]/', '_', $hintFilename);
        if (!rename($tmp, $tmpPdf)) {
            $tmpPdf = $tmp; // best-effort
        }
        if (file_put_contents($tmpPdf, $bytes) === false) {
            @unlink($tmpPdf);
            throw new RuntimeException('Failed to write temp PDF.');
        }
        try {
            return $this->extractFromPath($tmpPdf);
        } finally {
            @unlink($tmpPdf);
        }
    }

    /**
     * @return array{ok:bool, binary:string, message:string}
     */
    public function health(): array
    {
        $bin = $this->resolveBinary();
        if ($bin === '') {
            return [
                'ok'      => false,
                'binary'  => '',
                'message' => 'pdftotext not installed. Run: sudo apt install -y poppler-utils',
            ];
        }
        // pdftotext -v prints version on stderr and exits 0 on most builds.
        exec(escapeshellcmd($bin) . ' -v 2>&1', $lines, $code);
        return [
            'ok'      => $code === 0 || $code === 99,
            'binary'  => $bin,
            'message' => $lines[0] ?? 'pdftotext present',
        ];
    }

    private function resolveBinary(): string
    {
        if (is_executable(self::BINARY)) {
            return self::BINARY;
        }
        foreach (self::FALLBACK_BINARIES as $candidate) {
            if (is_executable($candidate)) {
                return $candidate;
            }
        }
        // Last-resort PATH lookup.
        $which = trim((string)shell_exec('command -v pdftotext 2>/dev/null'));
        return $which !== '' && is_executable($which) ? $which : '';
    }
}
