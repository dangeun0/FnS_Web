#!/usr/bin/env python3
"""
Project directory tree printer.
- Ubuntu/Windows/macOS 공용
- 디렉토리 우선 정렬 후 파일 정렬
- 흔한 불필요 폴더/파일 제외
- 깊이 제한 가능 (--max-depth)
- 결과를 파일로 저장 (--output)

사용 예시:
  python3 tree_scan.py --max-depth 6 --output project_tree.txt
"""
from __future__ import annotations
import argparse
from pathlib import Path
from typing import Iterable

# 제외 대상 (폴더/파일 이름 기준)
EXCLUDE_DIRS = {
    '.git', '.hg', '.svn', '__pycache__', '.mypy_cache', '.pytest_cache',
    '.idea', '.vscode', 'node_modules', 'dist', 'build', '.venv', 'venv'
}
EXCLUDE_FILES = {'.DS_Store'}
EXCLUDE_SUFFIXES = {'.pyc', '.pyo', '.log', '.tmp'}


def should_skip(p: Path) -> bool:
    name = p.name
    if name in EXCLUDE_FILES:
        return True
    if p.is_dir() and name in EXCLUDE_DIRS:
        return True
    if p.is_file() and p.suffix in EXCLUDE_SUFFIXES:
        return True
    return False


def sort_key(p: Path):
    # 디렉토리 먼저, 그 다음 이름 사전순
    return (0 if p.is_dir() else 1, p.name.lower())


def iter_children(d: Path) -> Iterable[Path]:
    try:
        entries = list(d.iterdir())
    except PermissionError:
        return []
    except FileNotFoundError:
        return []
    entries = [e for e in entries if not should_skip(e)]
    entries.sort(key=sort_key)
    return entries


def draw_tree(root: Path, max_depth: int) -> str:
    lines = []

    def walk(dir_path: Path, prefix: str, depth: int):
        if depth < 0:
            return
        children = list(iter_children(dir_path))
        count = len(children)
        for idx, entry in enumerate(children):
            connector = '└── ' if idx == count - 1 else '├── '
            lines.append(f"{prefix}{connector}{entry.name}")
            if entry.is_dir():
                new_prefix = f"{prefix}{'    ' if idx == count - 1 else '│   '}"
                if depth > 0:
                    walk(entry, new_prefix, depth - 1)

    lines.append(root.resolve().name)
    walk(root, '', max_depth)
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--path', default='.', help='스캔 시작 경로 (기본: 현재 폴더)')
    parser.add_argument('--max-depth', type=int, default=8, help='트리 최대 깊이 (기본: 8)')
    parser.add_argument('--output', default='project_tree.txt', help='결과 저장 파일 경로')
    args = parser.parse_args()

    root = Path(args.path).resolve()
    text = draw_tree(root, args.max_depth)
    out = Path(args.output)
    out.write_text(text, encoding='utf-8')
    print(f"saved: {out}  (root={root})")


if __name__ == '__main__':
    main()
