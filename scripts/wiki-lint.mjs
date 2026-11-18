// spec 009 FR-007: 프로젝트 위키 점검. 고치지 않고 표로만 보고한다(평가항목 P3-20).
// 수업 교안 P2-S10a 참고본 tools/lint.mjs를 우리 원본 위치(docs/, interviews/)에 맞게 옮겼다.
//
// 실행 (저장소 맨 위에서):
//   node scripts/wiki-lint.mjs               점검 표를 찍는다
//   node scripts/wiki-lint.mjs --record      사람이 넣기를 승인한 뒤 원본 지문을 wiki/raw-hashes.json에 기록한다
//   node scripts/wiki-lint.mjs --root 폴더    다른 폴더(연습용 사본)를 점검한다
// 종료 코드: 문제가 없으면 0, 있으면 1. node 기본 기능만 쓴다.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_DIRS = ['docs', 'interviews']
// 저장소 맨 위에 있는 원본(spec 009 Q2, 사용자 결정 2026-11-18)
const SOURCE_ROOT_FILES = ['GLOSSARY.md']
const HASH_FILE = 'wiki/raw-hashes.json'
const SPECIAL = new Set(['index', 'log', '연결지도'])
// 위키 규칙 파일은 쪽이 아니다
const NOT_PAGES = new Set(['CLAUDE'])
const REQUIRED = ['## 내용', '## 충돌', '## 확인 필요', '## 연결']
const LINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g
const CITE = /근거:\s*((?:docs\/|interviews\/|GLOSSARY\.md)[^\s·,)]*)/g
const FENCE = /```[\s\S]*?```/g
const INLINE_CODE = /`[^`\n]*`/g

const argValue = (args, name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

// git autocrlf 때문에 컴퓨터마다 줄바꿈이 달라도 같은 글로 본다
export const readText = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
const sha = (path) => createHash('sha256').update(readText(path)).digest('hex')
const stem = (name) => name.replace(/\.md$/, '')
const withoutCode = (text) => text.replace(FENCE, '').replace(INLINE_CODE, '')

/** 폴더 아래 .md 파일을 하위 폴더까지 찾아 "폴더/…/파일.md" 모양으로 돌려준다 */
export function mdFilesDeep(root, folder) {
  const dir = join(root, folder)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? mdFilesDeep(root, `${folder}/${e.name}`) : e.name.endsWith('.md') ? [`${folder}/${e.name}`] : []))
    .sort()
}

export const sourceFiles = (root) => [
  ...SOURCE_DIRS.flatMap((d) => mdFilesDeep(root, d)),
  ...SOURCE_ROOT_FILES.filter((f) => existsSync(join(root, f))),
]

export function wikiPages(root) {
  const dir = join(root, 'wiki')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((n) => n.endsWith('.md') && !NOT_PAGES.has(stem(n))).sort()
    .map((n) => [stem(n), readText(join(dir, n))])
}

// 앞머리(--- ... ---)의 sources 목록만 읽는다. "sources: []"는 빈 목록이다.
export function readSources(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return []
  const lines = m[1].split('\n')
  const start = lines.findIndex((l) => /^sources:/.test(l))
  if (start < 0) return []
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => !/^\s+-\s/.test(l))
  return (end < 0 ? rest : rest.slice(0, end)).map((l) => l.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''))
}

const readHashes = (root) => {
  const p = join(root, HASH_FILE)
  return existsSync(p) ? JSON.parse(readText(p)) : {}
}

export const currentHashes = (root) => Object.fromEntries(sourceFiles(root).map((p) => [p, sha(join(root, p))]))

function pageProblems(root, names, page, text) {
  const body = withoutCode(text)
  const broken = [...body.matchAll(LINK)].map((m) => m[1].trim()).filter((t) => !names.has(t)).map((t) => ({
    kind: '깨진 링크', page, problem: `[[${t}]] 쪽이 없다`, fix: '이름을 고치거나 쪽을 만든다(사람이 고른다)',
  }))
  if (SPECIAL.has(page)) return broken
  const sources = readSources(text)
  const noSource = sources.length === 0
    ? [{ kind: '출처 없음', page, problem: '앞머리 sources가 비어 있다', fix: '근거가 된 원본을 sources에 적는다' }]
    : []
  const cited = [...body.matchAll(CITE)].map((m) => m[1])
  const missing = [...new Set([...sources, ...cited])].filter((s) => !existsSync(join(root, s))).map((s) => ({
    kind: '출처 경로 없음', page, problem: `${s} 파일이 없다`, fix: '경로를 원본 이름과 맞춘다',
  }))
  const sections = REQUIRED.filter((h) => !text.includes(`\n${h}\n`)).map((h) => ({
    kind: '필수 절 빠짐', page, problem: `${h} 절이 없다`, fix: '절을 만들고 비면 "없음"이라고 쓴다',
  }))
  return [...broken, ...noSource, ...missing, ...sections]
}

function rawProblems(root, cites) {
  const recorded = readHashes(root)
  const now = currentHashes(root)
  const changed = Object.keys(now).filter((p) => recorded[p] && recorded[p] !== now[p]).map((p) => ({
    kind: '원본 바뀜', page: p, problem: '기록한 지문과 다르다', fix: '바뀐 부분을 넣을지 위키 담당이 정한다(wiki-ingest)',
  }))
  const fresh = Object.keys(now).filter((p) => !recorded[p]).map((p) => ({
    kind: '새 원본', page: p, problem: '지문 기록이 없다', fix: '넣기를 승인한 뒤 node scripts/wiki-lint.mjs --record',
  }))
  const gone = Object.keys(recorded).filter((p) => !now[p]).map((p) => ({
    kind: '원본 사라짐', page: p, problem: '기록에는 있는데 파일이 없다', fix: '지운 사람과 이유를 확인한다',
  }))
  const unused = Object.keys(now).filter((p) => !cites.has(p)).map((p) => ({
    kind: '정리 안 된 원본', page: p, problem: '어느 쪽의 sources에도 없다', fix: '넣기로 쪽에 반영한다',
  }))
  return [...changed, ...fresh, ...gone, ...unused]
}

export function lint(root) {
  const texts = wikiPages(root)
  const names = new Set(texts.map(([p]) => p))
  const index = texts.find(([p]) => p === 'index')?.[1] ?? ''
  const inIndex = new Set([...withoutCode(index).matchAll(LINK)].map((m) => m[1].trim()))
  const pages = texts.flatMap(([page, text]) => pageProblems(root, names, page, text))
  const notInIndex = texts.filter(([p]) => !SPECIAL.has(p) && !inIndex.has(p)).map(([page]) => ({
    kind: '목차 누락', page, problem: 'index.md에 링크가 없다', fix: '목차에 한 줄 더한다',
  }))
  const cites = new Set(texts.flatMap(([, text]) => readSources(text)))
  return [...pages, ...notInIndex, ...rawProblems(root, cites)]
}

export function table(problems) {
  const head = ['| # | 종류 | 쪽 | 문제 | 제안 |', '| --- | --- | --- | --- | --- |']
  const rows = problems.map((p, i) => `| ${i + 1} | ${p.kind} | ${p.page} | ${p.problem} | ${p.fix} |`)
  return [...head, ...rows, '', `문제 ${problems.length}건. 고치지 않았다. 고칠 번호는 사람이 고른다.`].join('\n')
}

function main(args) {
  const here = dirname(fileURLToPath(import.meta.url))
  const root = resolve(argValue(args, '--root') ?? join(here, '..'))
  if (!existsSync(join(root, 'wiki'))) {
    process.stdout.write(`위키 폴더가 없다: ${root} (wiki/가 있어야 한다)\n`)
    return 2
  }
  if (args.includes('--record')) {
    const hashes = currentHashes(root)
    writeFileSync(join(root, HASH_FILE), `${JSON.stringify(hashes, null, 2)}\n`)
    process.stdout.write(`원본 지문 ${Object.keys(hashes).length}개를 ${HASH_FILE}에 기록했다.\n`)
    return 0
  }
  const problems = lint(root)
  process.stdout.write(`${table(problems)}\n`)
  return problems.length === 0 ? 0 : 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
