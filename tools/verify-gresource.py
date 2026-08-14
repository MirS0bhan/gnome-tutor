#!/usr/bin/env python3
# verify-gresource.py — fail if any src .js file is missing from gresource XML
#
# SPDX-License-Identifier: GPL-3.0-or-later

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print(f'usage: {sys.argv[0]} <src-dir> <gresource.xml>', file=sys.stderr)
        return 1

    src_dir = Path(sys.argv[1]).resolve()
    xml_path = Path(sys.argv[2]).resolve()

    js_files = {
        path.relative_to(src_dir).as_posix()
        for path in src_dir.rglob('*.js')
    }

    tree = ET.parse(xml_path)
    listed = {
        node.text.strip()
        for node in tree.findall('.//file')
        if node.text and node.text.strip()
    }

    missing = sorted(js_files - listed)
    extra = sorted(listed - js_files)

    if missing:
        print('Missing from gresource:', file=sys.stderr)
        for name in missing:
            print(f'  {name}', file=sys.stderr)

    if extra:
        print('Unexpected gresource entries:', file=sys.stderr)
        for name in extra:
            print(f'  {name}', file=sys.stderr)

    if missing or extra:
        return 1

    print(f'gresource lists all {len(js_files)} JavaScript file(s).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
