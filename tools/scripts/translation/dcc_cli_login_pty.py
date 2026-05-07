#!/usr/bin/env python3
"""
PTY wrapper for `claude setup-token` login flow.

Spawned by CliLoginService.php as a background process. Args:
    SESSION_DIR  BINARY  AUTH_HOME

Spawns BINARY setup-token inside a PTY so it produces terminal output,
extracts the auth URL, and appends a [PTY_URL] marker to SESSION_DIR/stdout
so CliLoginService.php's URL-poll loop can find it.

Then polls SESSION_DIR/stdin for the authorization code (written by PHP after
the admin pastes it in the browser), sends it to claude, and waits for
credentials to be written to AUTH_HOME/.claude/.credentials.json.
"""
from __future__ import annotations

import fcntl
import os
import re
import select
import struct
import sys
import termios
import time


def main() -> int:
    if len(sys.argv) < 4:
        return 1

    session_dir = sys.argv[1]
    binary      = sys.argv[2]
    auth_home   = sys.argv[3]

    stdout_file = session_dir + '/stdout'
    stdin_file  = session_dir + '/stdin'

    env = dict(os.environ)
    env['HOME']    = auth_home
    env['TERM']    = 'xterm-256color'
    env['COLUMNS'] = '500'
    env['LINES']   = '50'
    for var in (
        'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY',
        'CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST',
        'CLAUDE_CODE_ENABLE_ASK_USER_QUESTION_TOOL',
        'CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH',
        'CLAUDE_CODE_ENTRYPOINT', 'CLAUDECODE',
        'CLAUDE_CODE_EXECPATH',
    ):
        env.pop(var, None)

    master_fd, slave_fd = os.openpty()
    winsz = struct.pack('HHHH', 50, 500, 0, 0)
    fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, winsz)
    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsz)

    child_pid = os.fork()
    if child_pid == 0:
        os.close(master_fd)
        os.setsid()
        fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
        os.dup2(slave_fd, 0)
        os.dup2(slave_fd, 1)
        os.dup2(slave_fd, 2)
        os.close(slave_fd)
        try:
            os.chdir(auth_home)
        except OSError:
            pass
        os.execve(binary, [binary, 'setup-token'], env)
        os._exit(1)

    os.close(slave_fd)

    def append_stdout(text: str) -> None:
        try:
            with open(stdout_file, 'a', encoding='utf-8', errors='replace') as fh:
                fh.write(text)
        except OSError:
            pass

    def child_alive() -> bool:
        try:
            return os.waitpid(child_pid, os.WNOHANG)[0] == 0
        except ChildProcessError:
            return False

    def drain(timeout: float) -> bytes:
        try:
            r, _, _ = select.select([master_fd], [], [], timeout)
            if r:
                return os.read(master_fd, 4096)
        except OSError:
            pass
        return b''

    def extract_url(text: str) -> str:
        # PTY is 500 cols wide so the URL fits on one line.
        # Work line-by-line to avoid joining "Paste code here …" into the URL.
        lines = text.splitlines()
        # First pass: require both state= and code_challenge= on the same line.
        for line in lines:
            for prefix in ('https://claude.ai/', 'https://claude.com/'):
                if prefix not in line:
                    continue
                idx = line.find(prefix)
                m = re.match(r'(https://\S+)', line[idx:])
                if not m:
                    continue
                candidate = m.group(1).rstrip('.,;:"\'')
                if 'state=' in candidate and 'code_challenge=' in candidate:
                    return candidate
        # Second pass: any URL with state= on its own line.
        for line in lines:
            for prefix in ('https://claude.ai/', 'https://claude.com/'):
                if prefix not in line:
                    continue
                idx = line.find(prefix)
                m = re.match(r'(https://\S+)', line[idx:])
                if not m:
                    continue
                candidate = m.group(1).rstrip('.,;:"\'')
                if 'state=' in candidate:
                    return candidate
        return ''

    accumulated = b''
    url_written = False
    code_sent   = False

    # ── Phase 1: wait for auth URL (up to 30 s) ─────────────────────────────
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        chunk = drain(0.2)
        if chunk:
            accumulated += chunk
            text  = accumulated.decode('utf-8', errors='replace')
            clean = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', text)
            append_stdout(chunk.decode('utf-8', errors='replace'))
            if not url_written:
                url = extract_url(clean)
                if url:
                    append_stdout(f'\n[PTY_URL] {url}\n')
                    url_written = True
        if not child_alive():
            break

    if not url_written:
        append_stdout('\n[PTY_ERROR] URL not found within 30s\n')
        try:
            os.kill(child_pid, 9)
        except OSError:
            pass
        try:
            os.close(master_fd)
        except OSError:
            pass
        return 1

    # ── Phase 2: wait for code in stdin file (up to 300 s) ──────────────────
    deadline = time.monotonic() + 300
    while time.monotonic() < deadline and not code_sent:
        chunk = drain(0.3)
        if chunk:
            accumulated += chunk
            append_stdout(chunk.decode('utf-8', errors='replace'))

        try:
            code = open(stdin_file).read().strip()
        except OSError:
            code = ''

        if code:
            try:
                os.write(master_fd, (code + '\n').encode())
                code_sent = True
            except OSError:
                pass

        if not child_alive():
            break

    # ── Phase 3: drain until credentials appear or process exits (60 s) ─────
    cred_path = auth_home.rstrip('/') + '/.claude/.credentials.json'
    deadline  = time.monotonic() + 60
    while time.monotonic() < deadline:
        chunk = drain(0.3)
        if chunk:
            accumulated += chunk
            append_stdout(chunk.decode('utf-8', errors='replace'))
        if os.path.isfile(cred_path):
            break
        if not child_alive():
            break

    for _ in range(10):
        chunk = drain(0.1)
        if not chunk:
            break
        accumulated += chunk
        append_stdout(chunk.decode('utf-8', errors='replace'))

    try:
        os.close(master_fd)
    except OSError:
        pass
    try:
        os.waitpid(child_pid, 0)
    except ChildProcessError:
        pass

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
