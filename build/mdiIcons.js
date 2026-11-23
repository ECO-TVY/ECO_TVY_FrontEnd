/**
 * Vite 플러그인: 코드에 쓰인 'mdi-xxx' 아이콘 이름을 찾아 @mdi/js SVG 경로 표를 만든다.
 *
 * 왜: @mdi/font는 7천 개 아이콘 폰트(woff2 ~325KB + CSS ~400KB)를 통째로 내려받는다.
 *     실제로 쓰는 아이콘만 SVG로 넣으면 수 KB면 된다.
 * 어떻게: 화면 코드는 지금처럼 icon="mdi-recycle"로 쓰고, 이 플러그인이
 *     src를 훑어 src/plugins/icons.generated.js를 만든다 (dev 중 파일이 바뀌면 다시 생성).
 *     없는 아이콘 이름을 쓰면 빌드가 실패하고 dev에서는 경고한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import * as mdi from '@mdi/js'

const NAME_RE = /\bmdi-[a-z0-9]+(?:-[a-z0-9]+)*\b/g
const SCAN_EXT = new Set(['.vue', '.js', '.ts'])

const toExport = (name) =>
  'mdi' +
  name
    .slice(4)
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (SCAN_EXT.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

export default function mdiIcons({ srcDir, outFile }) {
  const outAbs = path.resolve(outFile)

  function collect() {
    const names = new Set()
    for (const file of walk(path.resolve(srcDir))) {
      if (path.resolve(file) === outAbs) continue
      for (const m of fs.readFileSync(file, 'utf8').matchAll(NAME_RE)) names.add(m[0])
    }
    const found = []
    const missing = []
    for (const name of [...names].sort()) {
      ;(mdi[toExport(name)] ? found : missing).push(name)
    }
    return { found, missing }
  }

  function generate() {
    const { found, missing } = collect()
    const lines = [
      '// 자동 생성 파일 (build/mdiIcons.js) — 직접 수정하지 마세요.',
      '// 코드에 쓰인 mdi-* 아이콘만 @mdi/js에서 가져온다.',
      `import { ${found.map(toExport).join(', ')} } from '@mdi/js'`,
      '',
      'export default {',
      ...found.map((n) => `  '${n}': ${toExport(n)},`),
      '}',
      ''
    ]
    const content = lines.join('\n')
    // 내용이 같으면 쓰지 않는다 (HMR 무한 반복 방지)
    const prev = fs.existsSync(outAbs) ? fs.readFileSync(outAbs, 'utf8') : ''
    if (prev !== content) fs.writeFileSync(outAbs, content)
    return { found, missing }
  }

  return {
    name: 'mdi-icons',
    buildStart() {
      const { found, missing } = generate()
      if (missing.length) {
        const msg = `@mdi/js에 없는 아이콘: ${missing.join(', ')} (https://pictogrammers.com/library/mdi/ 에서 이름 확인)`
        if (this.meta?.watchMode) this.warn(msg)
        else this.error(msg)
      }
      this.info?.(`mdi 아이콘 ${found.length}개`)
    },
    configureServer(server) {
      const onChange = (file) => {
        if (!file.startsWith(path.resolve(srcDir)) || path.resolve(file) === outAbs) return
        if (!SCAN_EXT.has(path.extname(file))) return
        const { missing } = generate()
        if (missing.length) server.config.logger.warn(`[mdi-icons] @mdi/js에 없는 아이콘: ${missing.join(', ')}`)
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
    }
  }
}
