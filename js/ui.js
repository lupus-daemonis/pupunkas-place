import { escapeHtml, showToast } from './utils.js';
import { GENRE_ICONS, HER_AVATARS, HIS_AVATARS } from './config.js';

export let films = [], cooking = [], places = [];
export let currentGenreFilter = "all";
export let activeTab = "films";
export let herAvatar, hisAvatar, isHer, currentUser;

export function setUserData(user, herFlag) {
    currentUser = user;
    isHer = herFlag;
}

export function setAvatars(her, his) {
    herAvatar = her;
    hisAvatar = his;
}

export function renderFilms(filmsListEl) {
    let filtered = currentGenreFilter === 'all' ? films : films.filter(f => f.genre === currentGenreFilter);
    if (!filtered.length) { 
        filmsListEl.innerHTML = '<div class="empty-msg">✨ Нет фильмов по выбранному жанру</div>'; 
        return; 
    }
    filmsListEl.innerHTML = filtered.map(f => `
        <li data-id="${f.id}" data-type="films" class="${f.done ? 'done' : ''}">
            <div class="item-info">
                <span class="item-name">${escapeHtml(f.name)}</span>
                <span class="item-genre">${GENRE_ICONS[f.genre] || '🎬'} ${escapeHtml(f.genre || 'Без жанра')}</span>
                <span class="author-badge ${f.author === 'her' ? 'author-her' : 'author-his'}">${f.author === 'her' ? 'Влада' : 'Никита'}</span>
            </div>
            <div class="actions"><button class="done-btn" data-action="toggle">✓</button><button class="delete-btn" data-action="delete">✗</button></div>
        </li>
    `).join('');
}

export function renderCooking(cookingListEl) {
    if (!cooking.length) { 
        cookingListEl.innerHTML = '<div class="empty-msg">🍳 Добавьте блюда, которые хотите приготовить</div>'; 
        return; 
    }
    cookingListEl.innerHTML = cooking.map(c => `
        <li data-id="${c.id}" data-type="cooking" class="${c.done ? 'done' : ''}">
            <div class="item-info">
                <span class="item-name">${escapeHtml(c.name)}</span>
                <span class="author-badge ${c.author === 'her' ? 'author-her' : 'author-his'}">${c.author === 'her' ? 'Влада' : 'Никита'}</span>
            </div>
            <div class="actions"><button class="done-btn" data-action="toggle">✓</button><button class="delete-btn" data-action="delete">✗</button></div>
        </li>
    `).join('');
}

export function renderPlaces(placesListEl) {
    if (!places.length) { 
        placesListEl.innerHTML = '<div class="empty-msg">🌳 Добавьте места, куда хотите сходить</div>'; 
        return; 
    }
    placesListEl.innerHTML = places.map(p => `
        <li data-id="${p.id}" data-type="places" class="${p.done ? 'done' : ''}">
            <div class="item-info">
                <span class="item-name">${escapeHtml(p.name)}</span>
                <span class="author-badge ${p.author === 'her' ? 'author-her' : 'author-his'}">${p.author === 'her' ? 'Влада' : 'Никита'}</span>
            </div>
            <div class="actions"><button class="done-btn" data-action="toggle">✓</button><button class="delete-btn" data-action="delete">✗</button></div>
        </li>
    `).join('');
}

export function updateCatAvatars() {
    const leftImg = document.getElementById('leftCatImg');
    const rightImg = document.getElementById('rightCatImg');
    if (leftImg) leftImg.src = isHer ? herAvatar : hisAvatar;
    if (rightImg) rightImg.src = isHer ? hisAvatar : herAvatar;
}

export function renderCats(isHer, herAvatar, hisAvatar) {
    const leftContainer = document.getElementById('catLeftContainer');
    const rightContainer = document.getElementById('catRightContainer');
    
    const leftCatContent = `
        <div class="bubble">
            <span class="bubble-text" id="leftStatusText">${isHer ? '✨ Хочу обнимашек ✨' : '🍜 Готовлю ужин 🍜'}</span>
        </div>
        <div class="cat-avatar" id="leftCatAvatar">
            <img id="leftCatImg" src="${isHer ? herAvatar : hisAvatar}" alt="${isHer ? 'Влада' : 'Никита'}">
        </div>
        <div class="cat-name">${isHer ? 'Влада' : 'Никита'}</div>
    `;
    
    const rightCatContent = `
        <div class="bubble">
            <span class="bubble-text" id="rightStatusText">${isHer ? '🍜 Готовлю ужин 🍜' : '✨ Хочу обнимашек ✨'}</span>
        </div>
        <div class="cat-avatar" id="rightCatAvatar">
            <img id="rightCatImg" src="${isHer ? hisAvatar : herAvatar}" alt="${isHer ? 'Никита' : 'Влада'}">
        </div>
        <div class="cat-name">${isHer ? 'Никита' : 'Влада'}</div>
    `;
    
    leftContainer.innerHTML = leftCatContent;
    rightContainer.innerHTML = rightCatContent;
}
