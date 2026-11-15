# ATOM GARDEN — GitHub용 전체 코드

원자·분자·이온을 배치하고 반응을 관찰하는 브라우저 샌드박스 게임입니다.
알칼리 금속 업데이트가 포함된 **v0.14**입니다.

## 빠르게 실행하기

압축을 해제한 뒤 `index.html`을 브라우저로 열면 됩니다. JavaScript 파일 8개를
`index.html`과 같은 폴더에 두세요. 실행에 npm 설치, 빌드, API 키, 별도 서버는 필요하지 않습니다.

개발할 때는 VS Code의 Live Server 또는 Python 로컬 서버를 사용할 수 있습니다.
이 폴더에서 다음 명령을 실행하고 `http://localhost:8000`을 여세요.

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Windows에서 `python` 명령을 찾지 못하지만 Python이 설치되어 있다면
`py -m http.server 8000 --bind 127.0.0.1`을 사용하세요.

## GitHub에 올리고 게임 실행하기

1. GitHub에서 새 저장소를 만드세요. 예를 들어 이름을 `atom-garden`으로 설정합니다.
   GitHub Free에서 Pages를 사용할 경우 공개 저장소를 선택합니다.
2. 이 ZIP을 압축 해제하세요. 저장소의 **Add file → Upload files**로 폴더 안의 파일들을 올립니다.
   ZIP 파일 자체나 상위 `atom-garden-v0.14-github` 폴더를 올리지 말고,
   저장소 첫 화면에서 `index.html`이 바로 보이도록 올리세요.
3. `index.html`과 모든 `.js` 파일은 반드시 함께 올리세요. README, tests, `.nojekyll`,
   `.gitignore`도 포함되어 있습니다. 숨김 파일이 보이지 않으면 파일 탐색기에서 표시를 켜세요.
   `.nojekyll`은 저장소 최상위에 같은 이름의 빈 파일로 직접 만들어도 됩니다.
4. **Settings → Pages → Build and deployment**로 이동합니다.
5. **Source: Deploy from a branch**, **Branch: main**, **Folder: / (root)**를 선택하고 **Save**를 누릅니다.
   기본 브랜치 이름이 다르면 실제 파일을 올린 브랜치를 선택하세요.
6. 배포가 끝나면 Pages 설정 화면에 표시되는 **Visit site** 링크로 게임을 엽니다.
   소스를 수정한 뒤 같은 브랜치에 커밋하면 게임도 다시 배포됩니다.

GitHub Pages에 게시한 게임은 일반적으로 인터넷에서 공개됩니다. 기존 사이트의
ChatGPT 로그인 제한은 이 정적 코드에 포함되지 않습니다.

공식 안내:
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

### Git 명령으로 올리는 경우

GitHub에서 파일이 없는 새 저장소를 만든 다음 이 폴더에서 실행하세요.
`YOUR_USERNAME`과 저장소 이름은 본인의 것으로 바꿉니다.
기존 저장소에 파일이 이미 있다면 먼저 그 저장소를 복제한 뒤 파일을 복사하세요.

```sh
git init
git add .
git commit -m "Add ATOM GARDEN v0.14"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/atom-garden.git
git push -u origin main
```

## 파일별 역할

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 구성, 스타일, 도움말, 스크립트 로드 순서 |
| `app.js` | 원소·물질 도감, 배치, 렌더링, 저장, 전체 시뮬레이션 |
| `physics.js` | 입자 운동, 열, 충돌, 핵융합 |
| `atomic.js` | 전자·전하·동위원소, 개발자 모드 |
| `phases.js` | 고체·액체·기체 판정과 응집·진동 |
| `ions.js` | 이온결합, 용액 이동, 선택된 산화·환원 반응 |
| `acid-base.js` | 산·염기, H₃O⁺·OH⁻, 해리·중화 |
| `reactive-metals.js` | 알칼리 금속과 Ca·Sr·Ba의 물 반응 |
| `buoyancy.js` | 기체 밀도와 공기·물에서의 부력 |
| `tests/physics.cjs` | 보존 법칙·반응·운동·저장 회귀 검사 |
| `.nojekyll` | GitHub Pages에서 정적 파일을 그대로 제공하는 설정 |

화면을 바꾸려면 `index.html`, 물질 도감을 바꾸려면 `app.js`,
알칼리 금속의 반응 속도·열 피드백을 바꾸려면 `reactive-metals.js`를 수정하세요.
`index.html` 끝의 스크립트 로드 순서는 유지하세요.

## 저장과 주소 이전

세계와 발견 기록은 브라우저의 `localStorage` 키 `atom-garden-v1`에 저장됩니다.
계정 서버에 저장하는 방식이 아니므로 브라우저·기기·접속 주소가 달라지면
같은 기록을 자동으로 불러오지 않습니다. 기존 사이트의 저장 데이터는 이 코드 ZIP에 들어 있지 않습니다.
기존 사이트에서 새 GitHub Pages 주소로 이동하면 별도 세계로 시작합니다.
파일을 더블 클릭해 여는 경우 저장 지원은 브라우저에 따라 다를 수 있으므로,
계속 플레이할 때는 같은 로컬 서버 주소나 배포 주소를 사용하는 편이 안정적입니다.

## 포함 기능과 한계

- 118종 원소 도감, 원자별 전자·동위원소 계산, 브러시·확대·온도/상태 보기.
- 선택된 핵융합 경로, 분자 결합, 이온·금속 반응, 산·염기와 중화.
- 기체 밀도·부력, 액체 안에서의 이온 결속과 확산.
- Li·Na·K·Rb·Cs·Fr 및 Ca·Sr·Ba의 물 반응, 수소·수산화물 생성.
- 개발자 모드에서 모든 등록 물질 배치 가능. 일반 모드에서는 발견한 물질을 다시 소환.

모든 실제 물리·화학 법칙이나 모든 물질을 구현한 것은 아닙니다. 반응 속도와
온도 문턱, 발열·부력은 게임용 근사입니다. Fr의 반응·원소 상태는 예측 모델이며
FrOH 상변화와 방사성 붕괴는 미구현입니다. 구현 범위는 게임 도움말에서 확인할 수 있습니다.

## 코드 검사

Node.js가 설치되어 있다면 다음으로 포함된 검사들을 실행할 수 있습니다.
외부 npm 패키지는 필요하지 않습니다. 이 명령은 브라우저 대신 격리된 모의 환경에서 실행되어
실제 플레이 저장 기록을 변경하지 않습니다.

```sh
node tests/physics.cjs
```

## 이 내보내기 버전

게임 파일은 배포된 v0.14 소스를 그대로 사용하며 `dist/` 안의 파일을 이 폴더 최상위로 옮겼습니다.
검사 파일은 이 구조에 맞게 읽기 경로만 조정했습니다.
원본 소스 커밋: `69ed644170341eb182a0273d41e96da2af882e66`.
Git 기록, 호스팅 계정 설정, 인증 정보는 이 패키지에 포함하지 않았습니다.
