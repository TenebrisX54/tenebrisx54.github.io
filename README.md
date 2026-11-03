# 합참의장 — 한반도 통일 작전 (프런트엔드 · GitHub Pages)

이 폴더 전체를 **`<사용자명>.github.io`** 저장소에 올리면 `https://<사용자명>.github.io` 에서 게임이 실행됩니다.

## 배포
1. GitHub에서 저장소 생성: 이름을 정확히 `<사용자명>.github.io` (소문자, Public)
2. 이 폴더의 파일을 모두 올리기 (`.github/workflows/pages.yml` 포함)
3. **Settings → Pages → Source: GitHub Actions**
4. **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Name: `API_BASE` / Value: `https://<Oracle 서버 도메인>` (예: `https://jcs-game.duckdns.org`)
5. **Actions** 탭에서 `Deploy game to GitHub Pages` 를 실행(또는 main 에 push)

`API_BASE` 가 없거나 서버가 꺼져 있으면 게임은 오프라인 모드(이 브라우저에만 저장)로 계속 동작합니다.

## 구조
| 경로 | 내용 |
|---|---|
| `src/` | 게임 소스 (template.html, style.css, data.js, core.js, api.js, ui.js, menu.js) |
| `shared/` | 서버와 공용인 학습·랭킹 로직 (backend/shared 와 같은 파일) |
| `build.py` | `API_BASE` 를 주입해 `dist/index.html` 단일 파일로 빌드 |
| `.github/workflows/pages.yml` | push 시 자동 빌드·배포 |

로컬 확인: `API_BASE=https://내도메인 python3 build.py` → `dist/index.html`
테스트용으로 접속 주소 뒤에 `?api=https://다른서버` 를 붙이면 API 주소를 임시로 바꿀 수 있습니다.
