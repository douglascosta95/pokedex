// ==========================================
// 1. PALETA DE CORES DOS TIPOS ELEMENTAIS
// ==========================================
const POKEMON_TYPE_COLORS = {
    grass: '#78C850',
    fire: '#F08030',
    water: '#6890F0',
    bug: '#A8B820',
    normal: '#A8A878',
    poison: '#A040A0',
    electric: '#F8D030',
    ground: '#E0C068',
    fairy: '#EE99AC',
    fighting: '#C03028',
    psychic: '#F85888',
    rock: '#B8A038',
    ghost: '#705898',
    ice: '#98D8D8',
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    flying: '#A890F0'
};

// ==========================================
// 2. ESTADO DA APLICAÇÃO (STATE)
// ==========================================
const POKEMON_LIMIT = 12;
let currentOffset = 0;
let allLoadedPokemon = [];
let userFavorites = new Set();
let currentUser = null;
let currentTab = 'all';

// ==========================================
// 3. CAPTURA DOS ELEMENTOS DO DOM
// ==========================================
const pokemonListContainer = document.getElementById('pokemon-list');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchInput = document.getElementById('search-input');
const loadingText = document.getElementById('loading-text');

// Navegação e Autenticação
const btnShowAll = document.getElementById('btn-show-all');
const btnShowFavs = document.getElementById('btn-show-favs');
const btnOpenLogin = document.getElementById('btn-open-login');
const btnLogout = document.getElementById('btn-logout');
const userProfile = document.getElementById('user-profile');
const userEmailSpan = document.getElementById('user-email');
const authButtons = document.getElementById('auth-buttons');
const authModal = document.getElementById('auth-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const modalTitle = document.getElementById('modal-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const switchAuthMode = document.getElementById('switch-auth-mode');

// Modal de Detalhes do Pokémon
const pokemonModal = document.getElementById('pokemon-modal');
const modalPokemonClose = document.getElementById('modal-pokemon-close');
const modalPokemonContent = document.getElementById('modal-pokemon-content');

let isLoginMode = true;

// ==========================================
// 4. CONSUMO DA POKÉAPI (FETCH & PROMISES)
// ==========================================
async function fetchPokemonList(offset, limit) {
    try {
        setLoading(true);
        const url = `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error('Falha ao comunicar com a PokéAPI');
        const data = await res.json();

        // Faz os pedidos dos detalhes em paralelo para obter imagens e tipos
        const detailPromises = data.results.map(async (p) => {
            const detailRes = await fetch(p.url);
            return await detailRes.json();
        });

        return await Promise.all(detailPromises);
    } catch (err) {
        console.error('Erro na requisição da PokéAPI:', err);
        return [];
    } finally {
        setLoading(false);
    }
}

// ==========================================
// 5. CONSTRUÇÃO E INJEÇÃO DOS CARTÕES NO DOM
// ==========================================
function createPokemonCard(pokemon) {
    const mainType = pokemon.types[0]?.type?.name || 'normal';
    const cardBgColor = POKEMON_TYPE_COLORS[mainType] || '#fdfdfd';
    const image = pokemon.sprites.other?.['official-artwork']?.front_default 
                  || pokemon.sprites.front_default;
    const formattedId = `#${String(pokemon.id).padStart(3, '0')}`;
    const isFav = userFavorites.has(pokemon.id);

    // Constrói as etiquetas (badges) de tipo
    const badgesHTML = pokemon.types.map(t => {
        const typeName = t.type.name;
        const color = POKEMON_TYPE_COLORS[typeName] || '#777';
        return `<span class="type-badge" style="background-color: ${color};">${typeName}</span>`;
    }).join('');

    // Cria o nó principal do cartão
    const card = document.createElement('div');
    card.classList.add('cards');
    card.style.backgroundColor = cardBgColor + '18'; // Fundo suave correspondente ao tipo
    card.setAttribute('data-id', pokemon.id);

    card.innerHTML = `
        <div class="card-header">
            <button class="fav-btn ${isFav ? 'active' : ''}" title="Favoritar">★</button>
        </div>
        <img src="${image}" alt="${pokemon.name}" loading="lazy">
        <div class="card-info">
            <span class="id">${formattedId}</span>
            <p class="nome">${pokemon.name}</p>
            <div class="types-container">${badgesHTML}</div>
        </div>
    `;

    // Evento da Estrela (stopPropagation para evitar abrir o modal ao favoritar)
    const favBtn = card.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(pokemon);
    });

    // Clique no cartão abre os detalhes completos
    card.addEventListener('click', () => {
        openPokemonModal(pokemon);
    });

    return card;
}

function renderPokemonList(list, append = false) {
    if (!append) {
        pokemonListContainer.innerHTML = '';
    } else {
        const emptyMsg = pokemonListContainer.querySelector('.mensagem-vazia');
        if (emptyMsg) emptyMsg.remove();
    }

    if (list.length === 0) {
        pokemonListContainer.innerHTML = '<p class="mensagem-vazia">Nenhum Pokémon encontrado.</p>';
        return;
    }

    // Injeta todos os cartões via DocumentFragment para otimizar a renderização
    const fragment = document.createDocumentFragment();
    list.forEach(pokemon => {
        fragment.appendChild(createPokemonCard(pokemon));
    });
    pokemonListContainer.appendChild(fragment);
}

function renderCurrentView() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    let baseList = allLoadedPokemon;

    if (currentTab === 'favs') {
        baseList = allLoadedPokemon.filter(p => userFavorites.has(p.id));
    }

    if (searchTerm) {
        baseList = baseList.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || String(p.id) === searchTerm
        );
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = currentTab === 'all' ? 'inline-block' : 'none';
    }

    renderPokemonList(baseList, false);
}

async function loadMorePokemon() {
    const newItems = await fetchPokemonList(currentOffset, POKEMON_LIMIT);
    if (newItems.length > 0) {
        allLoadedPokemon = [...allLoadedPokemon, ...newItems];
        currentOffset += POKEMON_LIMIT;

        const emptyMsg = pokemonListContainer.querySelector('.mensagem-vazia');
        if (emptyMsg) emptyMsg.remove();

        const fragment = document.createDocumentFragment();
        newItems.forEach(p => fragment.appendChild(createPokemonCard(p)));
        pokemonListContainer.appendChild(fragment);
    }
}

function setLoading(isLoading) {
    if (loadingText) loadingText.style.display = isLoading ? 'block' : 'none';
    if (loadMoreBtn) loadMoreBtn.disabled = isLoading;
}

// ==========================================
// 6. MODAL DE DETALHES COM BASE STATS
// ==========================================
function openPokemonModal(pokemon) {
    const formattedId = `#${String(pokemon.id).padStart(3, '0')}`;
    const image = pokemon.sprites.other?.['official-artwork']?.front_default 
                  || pokemon.sprites.front_default;
    const heightInMeters = pokemon.height / 10;
    const weightInKg = pokemon.weight / 10;
    const abilities = pokemon.abilities.map(a => a.ability.name).join(', ');

    const statsHTML = pokemon.stats.map(s => {
        const statName = s.stat.name;
        const baseStat = s.base_stat;
        const percentage = Math.min((baseStat / 150) * 100, 100);

        return `
            <div class="stat-row">
                <span class="stat-name">${statName}</span>
                <span class="stat-val">${baseStat}</span>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${percentage}%;"></div>
                </div>
            </div>
        `;
    }).join('');

    modalPokemonContent.innerHTML = `
        <div class="modal-header-info">
            <span class="modal-id">${formattedId}</span>
        </div>
        <img class="modal-pokemon-img" src="${image}" alt="${pokemon.name}">
        <h2 class="modal-pokemon-name">${pokemon.name}</h2>
        
        <div class="modal-specs">
            <div><strong>Altura:</strong> ${heightInMeters} m</div>
            <div><strong>Peso:</strong> ${weightInKg} kg</div>
        </div>

        <div class="modal-specs" style="margin-top: -5px;">
            <div><strong>Habilidades:</strong> ${abilities}</div>
        </div>

        <div class="stats-container">
            <h4>Atributos Base</h4>
            ${statsHTML}
        </div>
    `;

    pokemonModal.style.display = 'flex';
}

// ==========================================
// 7. SUPABASE (AUTH & FAVORITOS COM VERIFICAÇÃO)
// ==========================================
if (typeof db !== 'undefined' && db?.auth) {
    db.auth.onAuthStateChange(async (event, session) => {
        currentUser = session?.user || null;
        updateAuthUI();

        if (currentUser) {
            await loadUserFavorites();
        } else {
            userFavorites.clear();
        }
        renderCurrentView();
    });
}

function updateAuthUI() {
    if (!userProfile || !authButtons) return;
    if (currentUser) {
        authButtons.style.display = 'none';
        userProfile.style.display = 'flex';
        userEmailSpan.textContent = currentUser.email;
        authModal.style.display = 'none';
    } else {
        authButtons.style.display = 'block';
        userProfile.style.display = 'none';
        userEmailSpan.textContent = '';
    }
}

async function loadUserFavorites() {
    try {
        const { data, error } = await db.from('favorites').select('pokemon_id');
        if (error) throw error;
        userFavorites = new Set(data.map(item => item.pokemon_id));
    } catch (err) {
        console.error('Erro ao buscar favoritos no Supabase:', err.message);
    }
}

async function toggleFavorite(pokemon) {
    if (!currentUser) {
        alert('Crie ou aceda à sua conta para guardar os seus favoritos!');
        if (authModal) authModal.style.display = 'flex';
        return;
    }

    const isFav = userFavorites.has(pokemon.id);

    try {
        if (isFav) {
            const { error } = await db.from('favorites').delete().eq('pokemon_id', pokemon.id);
            if (error) throw error;
            userFavorites.delete(pokemon.id);
        } else {
            const { error } = await db.from('favorites').insert([
                { user_id: currentUser.id, pokemon_id: pokemon.id, pokemon_name: pokemon.name }
            ]);
            if (error) throw error;
            userFavorites.add(pokemon.id);
        }
        renderCurrentView();
    } catch (err) {
        console.error('Erro ao atualizar favorito:', err.message);
    }
}

// ==========================================
// 8. EVENTOS DE INTERFACE E FORMULÁRIOS
// ==========================================
if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMorePokemon);

if (searchInput) {
    searchInput.addEventListener('input', () => {
        renderCurrentView();
    });
}

if (btnShowAll) {
    btnShowAll.addEventListener('click', () => {
        currentTab = 'all';
        btnShowAll.classList.add('active');
        btnShowFavs?.classList.remove('active');
        if (searchInput) searchInput.value = '';
        renderCurrentView();
    });
}

if (btnShowFavs) {
    btnShowFavs.addEventListener('click', () => {
        if (!currentUser) {
            alert('Aceda com a sua conta para visualizar a lista de favoritos!');
            if (authModal) authModal.style.display = 'flex';
            return;
        }
        currentTab = 'favs';
        btnShowFavs.classList.add('active');
        btnShowAll?.classList.remove('active');
        if (searchInput) searchInput.value = '';
        renderCurrentView();
    });
}

// Fecho dos Modais
if (modalPokemonClose) modalPokemonClose.addEventListener('click', () => pokemonModal.style.display = 'none');
if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => authModal.style.display = 'flex');
if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => authModal.style.display = 'none');

window.addEventListener('click', (e) => {
    if (e.target === pokemonModal) pokemonModal.style.display = 'none';
    if (e.target === authModal) authModal.style.display = 'none';
});

if (switchAuthMode) {
    switchAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        modalTitle.textContent = isLoginMode ? 'Entrar na Conta' : 'Criar Nova Conta';
        authSubmitBtn.textContent = isLoginMode ? 'Entrar' : 'Cadastrar';
        switchAuthMode.textContent = isLoginMode ? 'Cadastre-se' : 'Já tem conta? Faça login';
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value;

        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'A processar...';

        try {
            if (isLoginMode) {
                const { error } = await db.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await db.auth.signUp({ email, password });
                if (error) throw error;
                alert('Registo efetuado com sucesso!');
            }
            authForm.reset();
            authModal.style.display = 'none';
        } catch (err) {
            alert(`Erro: ${err.message}`);
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Entrar' : 'Cadastrar';
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await db.auth.signOut();
        btnShowAll?.click();
    });
}

// ==========================================
// 9. INICIALIZAÇÃO
// ==========================================
loadMorePokemon();