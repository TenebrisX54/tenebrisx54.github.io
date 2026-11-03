#!/usr/bin/env python3
"""게임을 단일 index.html 로 빌드합니다.
사용법:  API_BASE=https://내도메인.duckdns.org python3 build.py   →  dist/index.html
(API_BASE 를 비우면 서버 없이 이 브라우저에만 저장하는 오프라인 모드로 동작)
"""
import os, json, pathlib
root = pathlib.Path(__file__).parent
api = os.environ.get('API_BASE', '').strip().rstrip('/')
if api and not api.startswith('https://') and not api.startswith('http://localhost') and not api.startswith('http://127.0.0.1'):
    raise SystemExit('API_BASE 는 https:// 로 시작해야 합니다. (GitHub Pages 는 https 이므로 http API 는 브라우저가 차단합니다)')
t = (root / 'src/template.html').read_text(encoding='utf-8')
t = t.replace('/*API_BASE*/', json.dumps(api)[1:-1], 1)
for k, f in [('CSS', 'src/style.css'), ('BRAIN', 'shared/brain.js'), ('RANK', 'shared/rank.js'), ('DATA', 'src/data.js'),
             ('CORE', 'src/core.js'), ('API', 'src/api.js'), ('UI', 'src/ui.js'), ('MENU', 'src/menu.js')]:
    t = t.replace('/*%s*/' % k, (root / f).read_text(encoding='utf-8'), 1)
out = root / 'dist'; out.mkdir(exist_ok=True)
(out / 'index.html').write_text(t, encoding='utf-8')
(out / '.nojekyll').write_text('')
(out / '404.html').write_text('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/">', encoding='utf-8')
print(f'dist/index.html ({len(t):,} bytes)  API_BASE={api or "(없음: 오프라인 모드)"}')
