const API = 'https://pokeapi.co/api/v2'

const heroEl = document.getElementById('hero')
const tabContentEl = document.getElementById('tabContent')
const backButton = document.getElementById('backButton')

backButton.addEventListener('click', () => history.back())

const params = new URLSearchParams(window.location.search)
const pokemonId = params.get('id')

function pad3(n) {
    return String(n).padStart(3, '0')
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}

function prettyName(name) {
    return name.replaceAll('-', ' ')
}

function dmToMeters(dm) {
    return (dm / 10).toFixed(2)
}

function hgToKg(hg) {
    return (hg / 10).toFixed(1)
}

async function fetchJSON(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`)
    return res.json()
}

function getBestSprite(poke) {
    return (
        poke.sprites?.other?.dream_world?.front_default ||
        poke.sprites?.other?.['official-artwork']?.front_default ||
        poke.sprites?.front_default ||
        ''
    )
}

function renderHero(poke) {
    const types = poke.types.map(t => t.type.name)
    const mainType = types[0]

    const root = document.getElementById('pokemonDetails')
    if (root) root.className = `pokemon-details ${mainType}`

    // reaproveita classes de cor do pokedex.css
    heroEl.className = 'details-hero'

    heroEl.innerHTML = `
        <div class="details-hero-header">
            <div>
                <h1 class="details-name">${prettyName(poke.name)}</h1>
                <ol class="details-types">
                    ${types.map(t => `<li class="type ${t}">${t}</li>`).join('')}
                </ol>
            </div>
            <div class="details-number">#${pad3(poke.id)}</div>
        </div>

        <div class="details-sprite-wrap">
            <img class="details-sprite" src="${getBestSprite(poke)}" alt="${poke.name}">
        </div>
    `
}

function genderFromRate(rate) {
    // rate: 0-8 (femea), -1 genderless
    if (rate === -1) return { male: null, female: null, label: 'Genderless' }
    const female = (rate / 8) * 100
    const male = 100 - female
    return {
        male: Math.round(male * 10) / 10,
        female: Math.round(female * 10) / 10,
        label: null
    }
}

function renderAbout(poke, species) {
    const abilities = poke.abilities.map(a => prettyName(a.ability.name)).join(', ')
    const genusEn = species.genera?.find(g => g.language.name === 'en')
    const genus = genusEn?.genus ? genusEn.genus.replace(' Pokémon', '') : '—'

    const gender = genderFromRate(species.gender_rate)
    const eggGroups = species.egg_groups.map(g => prettyName(g.name)).join(', ') || '—'

    const habitat = species.habitat?.name ? prettyName(species.habitat.name) : '—'
    const growth = species.growth_rate?.name ? prettyName(species.growth_rate.name) : '—'

    tabContentEl.innerHTML = `
        <div class="details-section-title">About</div>
        <div class="details-grid">
            <div class="details-label">Species</div><div>${genus}</div>
            <div class="details-label">Height</div><div>${dmToMeters(poke.height)} m</div>
            <div class="details-label">Weight</div><div>${hgToKg(poke.weight)} kg</div>
            <div class="details-label">Abilities</div><div>${abilities}</div>
        </div>

        <div class="details-section-title">Breeding</div>
        <div class="details-grid">
            <div class="details-label">Gender</div>
            <div>
                ${gender.label ? gender.label : `♂ ${gender.male}% &nbsp;&nbsp; ♀ ${gender.female}%`}
            </div>
            <div class="details-label">Egg Groups</div><div>${eggGroups}</div>
            <div class="details-label">Habitat</div><div>${habitat}</div>
            <div class="details-label">Growth Rate</div><div>${growth}</div>
        </div>
    `
}

function renderStats(poke) {
    const statMap = {
        hp: 'HP',
        attack: 'ATK',
        defense: 'DEF',
        'special-attack': 'SATK',
        'special-defense': 'SDEF',
        speed: 'SPD'
    }

    const rows = poke.stats.map(s => {
        const name = statMap[s.stat.name] || s.stat.name
        const val = s.base_stat
        const pct = Math.min(100, Math.round((val / 200) * 100))
        return `
            <div class="stat-row">
                <div class="stat-name">${name}</div>
                <div class="stat-value">${val}</div>
                <div class="stat-bar"><div style="width:${pct}%"></div></div>
            </div>
        `
    }).join('')

    tabContentEl.innerHTML = `
        <div class="details-section-title">Base Stats</div>
        ${rows}
    `
}

async function buildEvolutionChain(species) {
    const evoUrl = species.evolution_chain?.url
    if (!evoUrl) return []

    const evo = await fetchJSON(evoUrl)

    const chain = []
    let node = evo.chain

    // pega o caminho "principal" (primeira opcao) pra manter simples
    while (node) {
        chain.push(node.species.name)
        node = node.evolves_to && node.evolves_to.length ? node.evolves_to[0] : null
    }

    return chain
}

async function spriteByName(name) {
    const poke = await fetchJSON(`${API}/pokemon/${name}`)
    return getBestSprite(poke)
}

async function renderEvolution(species) {
    const names = await buildEvolutionChain(species)

    if (!names.length) {
        tabContentEl.innerHTML = `<p>Sem dados de evolução.</p>`
        return
    }

    const nodes = []
    for (const n of names) {
        const img = await spriteByName(n)
        nodes.push({ name: n, img })
    }

    tabContentEl.innerHTML = `
        <div class="details-section-title">Evolution</div>
        <div class="evo-chain">
            ${nodes.map((n, idx) => `
                <div class="evo-node">
                    <img src="${n.img}" alt="${n.name}">
                    <div class="move-name">${prettyName(n.name)}</div>
                </div>
                ${idx < nodes.length - 1 ? `<div class="evo-arrow">→</div>` : ``}
            `).join('')}
        </div>
    `
}

function renderMoves(poke) {
    // mostra os primeiros 25 moves (pra nao ficar gigante)
    const moves = poke.moves.slice(0, 25)

    const html = moves.map(m => {
        const details = m.version_group_details?.[0]
        const level = details?.level_learned_at ?? 0
        const method = details?.move_learn_method?.name ? prettyName(details.move_learn_method.name) : '—'
        return `
            <li class="move-item">
                <div class="move-name">${prettyName(m.move.name)}</div>
                <div class="move-meta">Method: ${method} • Level: ${level}</div>
            </li>
        `
    }).join('')

    tabContentEl.innerHTML = `
        <div class="details-section-title">Moves</div>
        <ul class="moves-list">${html}</ul>
    `
}

function setupTabs(state) {
    const tabs = Array.from(document.querySelectorAll('.details-tab'))

    function activate(key) {
        tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === key))

        if (key === 'about') renderAbout(state.poke, state.species)
        if (key === 'stats') renderStats(state.poke)
        if (key === 'evolution') renderEvolution(state.species)
        if (key === 'moves') renderMoves(state.poke)
    }

    tabs.forEach(t => {
        t.addEventListener('click', () => activate(t.dataset.tab))
    })

    activate('about')
}

async function init() {
    if (!pokemonId) {
        tabContentEl.innerHTML = '<p>Pokemon nao informado.</p>'
        return
    }

    try {
        const poke = await fetchJSON(`${API}/pokemon/${pokemonId}`)
        const species = await fetchJSON(poke.species.url)

        renderHero(poke)
        setupTabs({ poke, species })
    } catch (err) {
        console.error(err)
        tabContentEl.innerHTML = '<p>Erro ao carregar os dados do Pokemon.</p>'
    }
}

init()
