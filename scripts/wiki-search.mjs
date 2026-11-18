// spec 010: 프로젝트 위키 찾기. 답하기·넣기 전에 근거 줄을 찾는다(위키 먼저, 그다음 원본).
// 수업 교안 P2-S10a 참고본 tools/search.mjs를 우리 원본 위치(docs/, interviews/)에 맞게 옮겼다.
//
// 실행 (저장소 맨 위에서):
//   node scripts/wiki-search.mjs 승인 규칙
//   node scripts/wiki-search.mjs 결로 기준 --top 5
// 출력: [위키] 또는 [원본] | 맞은 낱말 수 | 경로:줄 | 그 줄. 위키 결과가 늘 먼저 나온다.
// 종료 코드: 찾으면 0, 못 찾으면 1. node 기본 기능만 쓴다.
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readText, sourceFiles, wikiPages } from './wiki-lint.mjs'

const DEFAULT_TOP = 8
const OPTIONS = new Set(['--top', '--root'])

const argValue = (args, name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

const terms = (args) => args.filter((a, i) => !OPTIONS.has(a) && !OPTIONS.has(args[i - 1])).map((t) => t.toLowerCase())

// 문서마다 줄별로 맞은 낱말 수를 세고, 많이 맞은 줄부터 돌려준다
function hits(docs, words) {
  return docs
    .flatMap(([path, text]) => text.split('\n').map((line, i) => ({
      path, line: i + 1, text: line.trim(), score: words.filter((w) => line.toLowerCase().includes(w)).length,
    })))
    .filter((h) => h.score > 0 && h.text)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path) || a.line - b.line)
}

export function search(root, words, top = DEFAULT_TOP) {
  const wikiDocs = wikiPages(root).map(([page, text]) => [`wiki/${page}.md`, text])
  const rawDocs = sourceFiles(root).map((p) => [p, readText(join(root, p))])
  const wiki = hits(wikiDocs, words).slice(0, top).map((h) => ({ ...h, layer: '위키' }))
  const raw = hits(rawDocs, words).slice(0, top).map((h) => ({ ...h, layer: '원본' }))
  return [...wiki, ...raw]
}

function main(args) {
  const here = dirname(fileURLToPath(import.meta.url))
  const root = resolve(argValue(args, '--root') ?? join(here, '..'))
  const top = Number(argValue(args, '--top') ?? DEFAULT_TOP)
  const words = terms(args)
  if (words.length === 0) {
    process.stdout.write('검색어를 하나 이상 주세요. 예: node scripts/wiki-search.mjs 승인 규칙\n')
    return 2
  }
  const found = search(root, words, top)
  if (found.length === 0) {
    process.stdout.write(`"${words.join(' ')}"를 위키와 원본에서 못 찾았다. 답은 "위키에 없습니다, 확인 필요"로 한다.\n`)
    return 1
  }
  process.stdout.write(`${found.map((h) => `[${h.layer}] ${h.score} | ${h.path}:${h.line} | ${h.text}`).join('\n')}\n`)
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
