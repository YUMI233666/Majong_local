import { startQuiz, submitQuiz } from './api.js'
import { state, save, load } from './state.js'

load()

const app = document.getElementById('app')

// Global dark theme
try { document.body.classList.add('dark') } catch (e) {}

function ensureDynamicBackdrop() {
  if (document.getElementById('floatingEmojiBg')) return
  const layer = document.createElement('div')
  layer.id = 'floatingEmojiBg'
  layer.className = 'floating-emoji-bg'
  layer.setAttribute('aria-hidden', 'true')

  const emojis = ['🀄', '🀇', '🀈', '🀉', '✨', '🎴']
  for (let i = 0; i < 14; i++) {
    const dot = document.createElement('span')
    dot.textContent = emojis[i % emojis.length]
    dot.style.left = `${(i * 7 + 6) % 100}%`
    dot.style.animationDelay = `${(i % 7) * 1.2}s`
    dot.style.animationDuration = `${14 + (i % 5) * 3}s`
    dot.style.fontSize = `${14 + (i % 4) * 8}px`
    layer.appendChild(dot)
  }

  document.body.appendChild(layer)
}

ensureDynamicBackdrop()

function el(html) {
  const d = document.createElement('div')
  d.innerHTML = html.trim()
  return d.firstChild
}

function safePath(p) {
  if (!p) return ''
  return '/' + encodeURI(String(p).replace(/^\//, ''))
}

function barGradientByPct(pct) {
  if (pct >= 66) return 'linear-gradient(90deg,#f4d995,#e0bd72)'
  if (pct >= 33) return 'linear-gradient(90deg,var(--accent),var(--accent-2))'
  return 'linear-gradient(90deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))'
}

function normalizeTopTags(topTags) {
  return (topTags || [])
    .map((t) => {
      if (!t) return { name: '未知', score: 0 }
      if (Array.isArray(t)) return { name: String(t[0] || '未知'), score: Number(t[1] || 0) }
      return { name: String(t.name || t[0] || '未知'), score: Number(t.score || t[1] || 0) }
    })
    .filter((x) => x.name.trim() !== '每项' && x.score > 0)
}

function cleanTagName(name) {
  return String(name || '')
    .replace(/（仅展示非零标签）|\(仅展示非零标签\)/g, '')
    .trim()
}

function shouldSkipTagName(name) {
  const n = String(name || '').trim()
  return !n || /其他/.test(n) || /仅展示非零标签/.test(n) || n === '每项'
}

function parseRoleTagScoresFromText(rawText) {
  const map = new Map()
  const text = String(rawText || '').replace(/\r/g, '\n')
  const pairRe = /([^：:\n]+?)\s*[：:]\s*([0-9]{1,3})\s*[%％]/g
  let m
  while ((m = pairRe.exec(text)) !== null) {
    const name = cleanTagName(m[1]).replace(/[，,、。；;]+$/g, '').trim()
    if (shouldSkipTagName(name)) continue
    const score = Number(m[2])
    if (!Number.isFinite(score) || score <= 0) continue
    map.set(name, Math.max(score, map.get(name) || 0))
  }
  return map
}

function buildComparedTags(userTopTags, matchedTags, roleTagMap = null) {
  const map = new Map()

  ;(userTopTags || []).forEach((t) => {
    const name = cleanTagName(t.name)
    if (shouldSkipTagName(name)) return
    map.set(name, {
      name,
      userScore: Number(t.score) || 0,
      roleScore: 0
    })
  })

  ;(matchedTags || []).forEach((t) => {
    const name = cleanTagName(t && t.name)
    if (shouldSkipTagName(name)) return
    const cur = map.get(name) || { name, userScore: 0, roleScore: 0 }
    const u = Number(t && t.userScore)
    const r = Number(t && t.characterWeight)
    if (Number.isFinite(u)) cur.userScore = Math.max(cur.userScore, u)
    if (Number.isFinite(r)) cur.roleScore = Math.max(cur.roleScore, r)
    map.set(name, cur)
  })

  if (roleTagMap && roleTagMap.size) {
    roleTagMap.forEach((score, rawName) => {
      const name = cleanTagName(rawName)
      if (shouldSkipTagName(name)) return
      const cur = map.get(name) || { name, userScore: 0, roleScore: 0 }
      cur.roleScore = Math.max(cur.roleScore, Number(score) || 0)
      map.set(name, cur)
    })
  }

  return [...map.values()]
    // Only keep traits the user actually has.
    .filter((x) => x.userScore > 0)
    .sort((a, b) => Math.max(b.userScore, b.roleScore) - Math.max(a.userScore, a.roleScore))
    .slice(0, 12)
}

function renderCompareSection(container, titleText, items, options = {}) {
  if (!items || !items.length) return
  const roleLabel = String(options.roleLabel || '角色').trim() || '角色'

  const box = document.createElement('div')
  box.className = 'compare-section info-panel'

  const h4 = document.createElement('h4')
  h4.textContent = titleText
  box.appendChild(h4)

  const legend = document.createElement('div')
  legend.className = 'compare-legend'
  legend.innerHTML = `<span class="legend-item"><i class="dot user"></i>你</span><span class="legend-item"><i class="dot role"></i>${roleLabel}</span>`
  box.appendChild(legend)

  items.forEach((it) => {
    const row = document.createElement('div')
    row.className = 'compare-row'

    const name = document.createElement('div')
    name.className = 'compare-name'
    name.textContent = it.name

    const bars = document.createElement('div')
    bars.className = 'compare-bars'

    const uWidth = Math.min(100, Math.max(0, Math.round(Number(it.userScore) || 0)))
    const rWidth = Math.min(100, Math.max(0, Math.round(Number(it.roleScore) || 0)))

    const userLine = document.createElement('div')
    userLine.className = 'compare-line user'
    userLine.innerHTML = `<span class="who">你</span><div class="track"><i style="width:${uWidth}%"></i></div><span class="num">${Math.round(Number(it.userScore) || 0)}</span>`

    const roleLine = document.createElement('div')
    roleLine.className = 'compare-line role'
    roleLine.innerHTML = `<span class="who">${roleLabel}</span><div class="track"><i style="width:${rWidth}%"></i></div><span class="num">${Math.round(Number(it.roleScore) || 0)}</span>`

    bars.appendChild(userLine)
    bars.appendChild(roleLine)
    row.appendChild(name)
    row.appendChild(bars)
    box.appendChild(row)
  })

  container.appendChild(box)
}

function extractComprehensiveIntro(rawText) {
  const text = String(rawText || '').replace(/\r/g, '').trim()
  if (!text) return ''

  const patterns = [
    /(?:^|\n)\s*[七7]\s*[、.．)]?\s*角色?综合介绍[：:\s]*([\s\S]*)$/,
    /(?:^|\n)\s*角色?综合介绍[：:\s]*([\s\S]*)$/,
    /(?:^|\n)\s*角色综合介绍[：:\s]*([\s\S]*)$/
  ]

  for (const p of patterns) {
    const m = text.match(p)
    if (m && m[1] && m[1].trim()) return m[1].trim()
  }
  return ''
}

function renderTagSection(container, titleText, items, options = {}) {
  if (!items || !items.length) return
  const { valueSuffix = '' } = options
  const box = document.createElement('div')
  box.className = 'tag-section info-panel'

  const h4 = document.createElement('h4')
  h4.textContent = titleText
  box.appendChild(h4)

  const maxScore = items.reduce((m, x) => Math.max(m, Number(x.score) || 0), 1)
  items.forEach((it) => {
    const scoreNum = Number(it.score) || 0
    const pct = Math.round((scoreNum / maxScore) * 100)
    const valueText = it.valueText || `${Math.round(scoreNum)}${valueSuffix}`

    const row = document.createElement('div')
    row.className = 'tag-row'

    const label = document.createElement('div')
    label.className = 'tag-name'
    label.textContent = it.name

    const barWrap = document.createElement('div')
    barWrap.className = 'tag-bar-wrap'

    const bar = document.createElement('div')
    bar.className = 'tag-bar'
    bar.style.width = pct + '%'
    bar.style.background = barGradientByPct(pct)
    bar.setAttribute('aria-label', `${it.name} ${valueText}`)

    const value = document.createElement('div')
    value.className = 'tag-value'
    value.textContent = valueText

    barWrap.appendChild(bar)
    row.appendChild(label)
    row.appendChild(barWrap)
    row.appendChild(value)
    box.appendChild(row)
  })

  container.appendChild(box)
}

function renderStart() {
  app.innerHTML = ''
  const node = el(`
    <div class="card start-hero center">
      <div class="start-icons" aria-hidden="true">🀇  🀄  🀅</div>
      <div class="title">雀魂人格测试</div>
      <div class="subtitle muted">测测你最像哪位雀魂角色？</div>
      <div class="start-note muted">随机抽取 15 题 · 仅供娱乐</div>
      <div style="height:12px"></div>
      <button class="btn" id="startBtn">开始测试</button>
    </div>
  `)
  app.appendChild(node)

  node.querySelector('#startBtn').onclick = async () => {
    const data = await startQuiz()

    if (data && data.questions && data.questions.length) {
      state.sessionId = data.sessionId || Date.now().toString()
      state.questions = data.questions
      state.answers = {}
    } else {
      alert('无法连接后端，前端使用内置 mock。')
      const sample = []
      for (let i = 0; i < 15; i++) {
        sample.push({
          id: i + 1,
          prompt: '（离线）第 ' + (i + 1) + ' 题：请选择',
          options: [
            { key: 'A', text: '选项A' },
            { key: 'B', text: '选项B' },
            { key: 'C', text: '选项C' },
            { key: 'D', text: '选项D' }
          ]
        })
      }
      state.sessionId = Date.now().toString()
      state.questions = sample
      state.answers = {}
    }

    save()
    renderQuiz()
  }
}

function renderQuiz() {
  app.innerHTML = ''

  const qcount = state.questions.length
  if (!qcount) {
    renderStart()
    return
  }

  let idx = 0
  const card = document.createElement('div')
  card.className = 'card'
  app.appendChild(card)

  const progress = document.createElement('div')
  progress.className = 'progress'
  progress.innerHTML = '<i></i>'
  card.appendChild(progress)

  const qbox = document.createElement('div')
  card.appendChild(qbox)

  const nav = document.createElement('div')
  nav.className = 'row'
  nav.style.marginTop = '12px'

  const prev = document.createElement('button')
  prev.className = 'btn secondary'
  prev.textContent = '上一题'
  prev.onclick = () => {
    if (idx > 0) {
      idx--
      show()
    }
  }

  const next = document.createElement('button')
  next.className = 'btn secondary'
  next.textContent = '下一题'
  next.onclick = () => {
    if (idx < qcount - 1) {
      idx++
      show()
    }
  }

  const submit = document.createElement('button')
  submit.className = 'btn'
  submit.textContent = '提交并查看结果'
  submit.onclick = async () => {
    const answered = Object.keys(state.answers).length
    if (answered < qcount && !confirm('还有题目未答完，仍然提交？')) return

    const answers = Object.entries(state.answers).map(([k, v]) => ({
      questionIndex: parseInt(k, 10),
      optionIndex: v
    }))

    const payload = { sessionId: state.sessionId, answers }
    const data = await submitQuiz(payload)
    if (!data) {
      alert('提交失败：后端与本地均不可用。')
      return
    }

    localStorage.setItem('maj_quiz_result', JSON.stringify(data))
    renderResult(data)
  }

  nav.appendChild(prev)
  nav.appendChild(next)
  nav.appendChild(submit)
  card.appendChild(nav)

  function updateNav() {
    const answered = Object.keys(state.answers).length
    const allAnswered = answered >= qcount

    prev.disabled = idx === 0

    if (idx === qcount - 1) {
      submit.style.display = allAnswered ? '' : 'none'
      next.style.display = allAnswered ? 'none' : ''
    } else {
      submit.style.display = 'none'
      next.style.display = ''
    }
  }

  function show() {
    const q = state.questions[idx]
    const prompt = q.prompt || '（题干不可用）'
    qbox.innerHTML = `<div class="question">${idx + 1} / ${qcount} · ${prompt}</div><div class="options" id="opts"></div>`

    const optsEl = qbox.querySelector('#opts')
    ;(q.options || []).forEach((o, i) => {
      const b = document.createElement('div')
      b.className = 'option'

      const k = document.createElement('div')
      k.className = 'opt-key'
      k.textContent = o.key || String.fromCharCode(65 + i)

      const t = document.createElement('div')
      t.className = 'opt-text'
      t.textContent = o.text || ''

      b.appendChild(k)
      b.appendChild(t)

      if (state.answers[idx] === i) b.classList.add('selected')
      b.onclick = () => {
        state.answers[idx] = i
        save()
        Array.from(optsEl.children).forEach((c) => c.classList.remove('selected'))
        b.classList.add('selected')
        updateNav()
      }

      optsEl.appendChild(b)
    })

    progress.querySelector('i').style.width = Math.round((idx / qcount) * 100) + '%'
    updateNav()
  }

  show()
}

function renderResult(data) {
  app.innerHTML = ''

  const bm = data.bestMatch || data
  const card = document.createElement('div')
  card.className = 'card result-card'
  app.appendChild(card)

  // One-column result layout to prevent overflow and keep reading order clear.
  const stack = document.createElement('div')
  stack.className = 'result-stack'
  card.appendChild(stack)

  const hero = document.createElement('div')
  hero.className = 'result-hero info-panel'

  const kicker = document.createElement('div')
  kicker.className = 'result-kicker'
  kicker.textContent = '🀄 雀魂角色匹配完成'

  const name = document.createElement('div')
  name.className = 'result-name'
  name.textContent = bm.name || '未知角色'

  const rate = document.createElement('div')
  rate.className = 'result-rate'
  rate.innerHTML = `${Number(bm.similarity || 0).toFixed(2)}<span>%</span>`

  hero.appendChild(kicker)
  hero.appendChild(name)
  hero.appendChild(rate)
  stack.appendChild(hero)

  const visualPanel = document.createElement('div')
  visualPanel.className = 'visual-panel info-panel'
  stack.appendChild(visualPanel)

  const portraitPath = bm.portrait || bm.portraitUrl || ''

  if (portraitPath) {
    const img = document.createElement('img')
    img.src = safePath(portraitPath)
    img.className = 'result-portrait'
    img.alt = bm.name || '角色立绘'
    visualPanel.appendChild(img)
  }

  if (bm.stickers && bm.stickers.length) {
    const st = document.createElement('div')
    st.className = 'sticker-row'
    bm.stickers.forEach((s) => {
      if (!s) return
      const img = document.createElement('img')
      img.src = safePath(s)
      img.className = 'sticker-img'
      img.alt = '角色表情'
      st.appendChild(img)
    })
    visualPanel.appendChild(st)
  }

  const up = data.userProfile || {}
  const topTags = normalizeTopTags(up.topTags)
  const roleLabel = (bm.name && String(bm.name).trim()) ? String(bm.name).trim() : '角色'
  const compareMount = document.createElement('div')
  stack.appendChild(compareMount)

  function renderCompared(tags) {
    compareMount.innerHTML = ''
    renderCompareSection(compareMount, `🧠 人格标签对比图（你 vs ${roleLabel}）`, tags, { roleLabel })
  }

  const comparedTags = buildComparedTags(topTags, bm.matchedTags)
  renderCompared(comparedTags)

  // Role introduction shown after personality analysis.
  const introPanel = document.createElement('div')
  introPanel.className = 'intro-panel info-panel'
  introPanel.innerHTML = '<h4>📖 角色综合介绍</h4>'
  const introText = document.createElement('div')
  introText.className = 'role-intro'
  introText.textContent = '正在读取角色介绍...'
  introPanel.appendChild(introText)
  stack.appendChild(introPanel)

  const summaryFallback = (bm.summary && String(bm.summary).trim()) ? String(bm.summary).trim() : ''
  const introCandidates = []
  if (portraitPath) introCandidates.push(String(portraitPath).replace(/\.[^/.]+$/, '.txt'))
  if (bm.characterId) introCandidates.push(`${bm.characterId}/${bm.characterId}.txt`)
  if (bm.name) introCandidates.push(`${bm.name}/${bm.name}.txt`)
  const uniqueIntroCandidates = [...new Set(introCandidates.filter(Boolean))]

  ;(async () => {
    for (const relPath of uniqueIntroCandidates) {
      try {
        const res = await fetch(safePath(relPath), { cache: 'no-store' })
        if (!res.ok) continue
        const txt = (await res.text()).trim()
        if (!txt) continue

        const roleTagMap = parseRoleTagScoresFromText(txt)
        if (roleTagMap.size) {
          const comparedFromRole = buildComparedTags(topTags, bm.matchedTags, roleTagMap)
          if (comparedFromRole.length) renderCompared(comparedFromRole)
        }

        const onlyComprehensive = extractComprehensiveIntro(txt)
        if (onlyComprehensive) {
          introText.textContent = onlyComprehensive
          return
        }

        // If text file exists but has no comprehensive section, stop searching and use summary fallback.
        break
      } catch (e) {
        // try next candidate
      }
    }
    introText.textContent = summaryFallback || '暂无角色介绍。'
  })()

  if (data.ranking && data.ranking.length) {
    const rbox = document.createElement('div')
    rbox.className = 'ranking-box info-panel'
    rbox.innerHTML = '<h4>🏆 Top3</h4>'

    const row = document.createElement('div')
    row.className = 'top3-row'

    data.ranking.slice(0, 3).forEach((r, i) => {
      const item = document.createElement('div')
      item.className = 'top3-item'

      const rank = document.createElement('div')
      rank.className = 'rank-badge'
      rank.textContent = `#${i + 1}`

      const thumb = document.createElement('img')
      const p = r.portrait || (r.characterId ? `${r.characterId}/${r.characterId}.png` : '')
      thumb.src = p ? safePath(p) : ''
      thumb.className = 'top3-thumb'
      thumb.alt = `${r.name || '角色'}缩略图`

      const label = document.createElement('div')
      label.className = 'top3-label'
      const n = document.createElement('div')
      n.className = 'top3-name'
      n.textContent = r.name || '未知'
      const s = document.createElement('div')
      s.className = 'top3-score'
      s.textContent = `${Number(r.similarity || 0).toFixed(2)}%`
      label.appendChild(n)
      label.appendChild(s)

      item.appendChild(rank)
      item.appendChild(thumb)
      item.appendChild(label)
      row.appendChild(item)
    })

    rbox.appendChild(row)
    stack.appendChild(rbox)
  }

  const again = document.createElement('button')
  again.className = 'btn secondary'
  again.textContent = '重新测试'
  again.onclick = () => {
    state.questions = []
    state.answers = {}
    state.sessionId = null
    save()
    renderStart()
  }

  const actionWrap = document.createElement('div')
  actionWrap.style.marginTop = '18px'
  actionWrap.style.textAlign = 'center'
  actionWrap.appendChild(again)
  stack.appendChild(actionWrap)
}

renderStart()
