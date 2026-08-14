#!/usr/bin/env python3
# generate-gresource.py — emit src gresource XML from all .js files under src/
#
# SPDX-License-Identifier: GPL-3.0-or-later

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print(f'usage: {sys.argv[0]} <src-dir> <output.xml>', file=sys.stderr)
        return 1

    src_dir = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2])

    js_files = sorted(
        path.relative_to(src_dir).as_posix()
        for path in src_dir.rglob('*.js')
    )

    if not js_files:
        print(f'no JavaScript files found under {src_dir}', file=sys.stderr)
        return 1

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gresources>',
        '  <gresource prefix="/ir/urumlug/gnomeTutor/js">',
    ]
    lines.extend(f'    <file>{name}</file>' for name in js_files)
    lines.extend([
        '  </gresource>',
        '</gresources>',
        '',
    ])
    output.write_text('\n'.join(lines), encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
