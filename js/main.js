import { HER_AVATARS, HIS_AVATARS, GENRES, GENRE_ICONS } from './config.js';
import { db, filmsCol, cookingCol, placesCol, statusCol, avatarsCol, onSnapshot, query, orderBy, getDocs, updateDoc, doc, addDoc } from './firebase.js';
import { heartBurst, showToast, randomFromList, escapeHtml } from './utils.js';
import { 
    films, cooking, places, currentGenreFilter, herAvatar, hisAvatar, isHer, currentUser,
    setUserData, setAvatars, renderFilms, renderCooking, renderPlaces, updateCatAvatars, renderCats 
} from './ui.js';
import { setupDeleteModal, handleDelete, addItem } from './handlers.js';

// ========== ОПРЕДЕЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ==========
const urlParams = new URLSearchParams(window.location.search);
let user = urlParams.get('user');
if (!user || (user !== 'her' && user !== 'his')) {
    const savedUser = localStorage.getItem('pupunkas_user');
    if (savedUser && (savedUser === 'her' || savedUser === 'his')) {
        user = savedUser;
    } else {
        user = 'her';
    }
    localStorage.setItem('pupunkas_user', user);
}
setUserData(user, user === 'her');

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let activeTab = 'films'; // Явно устанавливаем начальное значение

// ========== ЭЛЕМЕНТЫ DOM ==========
const filmsListEl = document.getElementById('filmsList');
const cookingListEl = document.getElementById('cookingList');
const placesListEl = document.getElementById('placesList');
const globalAddForm = document.getElementById('globalAddForm');
const dynamicAddForm = document.getElementById('dynamicAddForm');
const genreSelect = document.getElementById('genreFilter');

// ========== ИНИЦИАЛИЗАЦИЯ МОДАЛКИ ==========
setupDeleteModal('deleteModal', 'modalConfirm', 'modalCancel');


// ========== ФУНКЦИЯ ДЛЯ ДОБАВЛЕНИЯ (обертка) ==========
async function addItemWrapper(collectionRef, name, extra = {}) {
    if (!name.trim()) return;
    try {
        await addDoc(collectionRef, {
            name: name.trim(),
            done: false,
            createdAt: new Date(),
            author: currentUser,
            ...extra
        });
        showToast(`✅ Добавлено!`, 'toastMessage', 'closeToastBtn');
    } catch (error) {
        console.error('Ошибка добавления:', error);
        showToast(`❌ Ошибка: ${error.message}`, 'toastMessage', 'closeToastBtn');
    }
}

// ========== ФУНКЦИЯ ОБНОВЛЕНИЯ ФОРМЫ (ИСПРАВЛЕНА) ==========
function updateAddForm() {
    console.log('updateAddForm вызван, activeTab =', activeTab); // Отладка
    
    if (activeTab === 'films') {
        dynamicAddForm.innerHTML = `
            <input type="text" id="newItemInput" placeholder="Название фильма / аниме...">
            <select id="filmGenre">
                <option value="Драма">🎭 Драма</option>
                <option value="Комедия">😂 Комедия</option>
                <option value="Ужасы">👻 Ужасы</option>
                <option value="Фэнтези">🐉 Фэнтези</option>
                <option value="Аниме">🍥 Аниме</option>
                <option value="Боевик">💥 Боевик</option>
                <option value="Романтика">💕 Романтика</option>
                <option value="Триллер">🔪 Триллер</option>
            </select>
            <button id="dynamicAddBtn" class="inline-add-btn">+ Добавить фильм</button>
        `;
    } else if (activeTab === 'cooking') {
        dynamicAddForm.innerHTML = `
            <input type="text" id="newItemInput" placeholder="Блюдо: паста, пицца, рамен...">
            <button id="dynamicAddBtn" class="inline-add-btn">+ Добавить блюдо</button>
        `;
    } else if (activeTab === 'places') {
        dynamicAddForm.innerHTML = `
            <input type="text" id="newItemInput" placeholder="Кафе, парк, квест, выставка...">
            <button id="dynamicAddBtn" class="inline-add-btn">+ Добавить место</button>
        `;
    }
    
    // Добавляем обработчик для кнопки
    const addBtn = document.getElementById('dynamicAddBtn');
    const input = document.getElementById('newItemInput');
    
    if (addBtn) {
        // Удаляем старые обработчики
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        
        newAddBtn.onclick = () => {
            const name = input?.value || '';
            if (!name.trim()) {
                showToast(`Введите название!`, 'toastMessage', 'closeToastBtn');
                return;
            }
            
            if (activeTab === 'films') {
                const genre = document.getElementById('filmGenre')?.value || 'Драма';
                addItemWrapper(filmsCol, name, { genre });
            } else if (activeTab === 'cooking') {
                addItemWrapper(cookingCol, name);
            } else if (activeTab === 'places') {
                addItemWrapper(placesCol, name);
            }
            
            if (input) input.value = '';
            globalAddForm.classList.remove('show');
        };
    }
    
    if (input) {
        input.onkeypress = (e) => { 
            if (e.key === 'Enter') {
                const btn = document.getElementById('dynamicAddBtn');
                if (btn) btn.click();
            }
        };
    }
}

// ========== ЗАГРУЗКА АВАТАРОВ ==========
async function loadAvatars() {
    const snap = await getDocs(avatarsCol);
    let her = HER_AVATARS[0].url;
    let his = HIS_AVATARS[0].url;
    snap.forEach(doc => {
        const data = doc.data();
        if (data.owner === 'her') her = data.avatar;
        if (data.owner === 'his') his = data.avatar;
    });
    setAvatars(her, his);
    updateCatAvatars();
}

// ========== СЛУШАТЕЛИ FIREBASE ==========
onSnapshot(query(filmsCol, orderBy("createdAt", "desc")), (snap) => { 
    films.length = 0;
    films.push(...snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    renderFilms(filmsListEl); 
});

onSnapshot(query(cookingCol, orderBy("createdAt", "desc")), (snap) => { 
    cooking.length = 0;
    cooking.push(...snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    renderCooking(cookingListEl); 
});

onSnapshot(query(placesCol, orderBy("createdAt", "desc")), (snap) => { 
    places.length = 0;
    places.push(...snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    renderPlaces(placesListEl); 
});

onSnapshot(statusCol, (snap) => {
    snap.forEach(doc => {
        const data = doc.data();
        const leftStatus = document.getElementById('leftStatusText');
        const rightStatus = document.getElementById('rightStatusText');
        if (data.owner === 'her') {
            if (isHer && leftStatus) leftStatus.textContent = data.text;
            if (!isHer && rightStatus) rightStatus.textContent = data.text;
        }
        if (data.owner === 'his') {
            if (!isHer && leftStatus) leftStatus.textContent = data.text;
            if (isHer && rightStatus) rightStatus.textContent = data.text;
        }
    });
});

// ========== ФИЛЬТРЫ ==========
GENRES.forEach(g => { 
    const opt = document.createElement('option'); 
    opt.value = g; 
    opt.textContent = `${GENRE_ICONS[g] || '🎬'} ${g}`; 
    genreSelect.appendChild(opt); 
});

genreSelect.addEventListener('change', (e) => { 
    window.currentGenreFilter = e.target.value; 
    renderFilms(filmsListEl); 
});

// Убираем кнопку сброса (закомментировано)
// document.getElementById('resetFilterBtn')?.addEventListener('click', () => { 
//     genreSelect.value = 'all'; 
//     window.currentGenreFilter = 'all'; 
//     renderFilms(filmsListEl); 
// });

document.getElementById('randomFilmBtn')?.addEventListener('click', () => 
    randomFromList(films, 'Фильм/аниме', { her: 'Влада', his: 'Никита' })
);

// ========== ТАБЫ (ИСПРАВЛЕНО) ==========
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Меняем активный таб
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Меняем видимую панель
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const tabId = tab.dataset.tab;
        document.getElementById(`${tabId}Panel`).classList.add('active');
        
        // Обновляем activeTab
        activeTab = tabId;
        
        // Если форма открыта - обновляем её содержимое
        if (globalAddForm.classList.contains('show')) {
            updateAddForm();
        }
        
        console.log('Переключено на вкладку:', activeTab);
    });
});

// ========== КНОПКА ДОБАВЛЕНИЯ (ИСПРАВЛЕНО) ==========
document.getElementById('globalAddBtn').addEventListener('click', () => {
    console.log('Кнопка добавления нажата, activeTab =', activeTab);
    
    if (globalAddForm.classList.contains('show')) {
        globalAddForm.classList.remove('show');
    } else {
        // Сначала обновляем форму под текущую вкладку
        updateAddForm();
        // Потом открываем
        globalAddForm.classList.add('show');
        
        setTimeout(() => {
            const input = document.getElementById('newItemInput');
            if (input) input.focus();
        }, 100);
    }
});

// ========== УДАЛЕНИЕ И TOGGLE ==========
document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const li = btn.closest('li');
    if (!li) return;
    const id = li.dataset.id;
    const type = li.dataset.type;
    const action = btn.dataset.action;
    
    let item = null;
    let col = null;
    
    if (type === 'films') {
        col = filmsCol;
        item = films.find(i => i.id === id);
    } else if (type === 'cooking') {
        col = cookingCol;
        item = cooking.find(i => i.id === id);
    } else if (type === 'places') {
        col = placesCol;
        item = places.find(i => i.id === id);
    }
    
    if (!item || !col) return;
    
    if (action === 'toggle') {
        await updateDoc(doc(col, id), { done: !item.done });
    } else if (action === 'delete') {
        await handleDelete(col, id, item.author, currentUser);
    }
});

// ========== РЕДАКТИРОВАНИЕ СТАТУСА ==========
window.makeEditable = function(element, owner) {
    if ((owner === 'her' && !isHer) || (owner === 'his' && isHer)) {
        showToast(`💭 Ты можешь менять только свой статус!`, 'toastMessage', 'closeToastBtn');
        return;
    }
    if (element.parentElement.querySelector('.status-input')) return;
    const original = element.textContent;
    element.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = original;
    input.className = 'status-input';
    const btnDiv = document.createElement('div');
    btnDiv.className = 'edit-buttons';
    const saveBtn = document.createElement('button'); saveBtn.innerHTML = '✅';
    const cancelBtn = document.createElement('button'); cancelBtn.innerHTML = '❌';
    btnDiv.append(saveBtn, cancelBtn);
    element.parentElement.insertBefore(input, element.nextSibling);
    element.parentElement.insertBefore(btnDiv, input.nextSibling);
    input.focus();
    const cleanup = () => { input.remove(); btnDiv.remove(); element.style.display = ''; };
    const save = async () => {
        const newText = input.value.trim();
        if (newText && newText !== original) {
            element.textContent = newText;
            const snap = await getDocs(statusCol);
            let existing = null;
            snap.forEach(d => { if (d.data().owner === owner) existing = d; });
            if (existing) await updateDoc(doc(db, "status_v2", existing.id), { text: newText });
            else await addDoc(statusCol, { owner, text: newText });
            showToast(`💬 Статус обновлён!`, 'toastMessage', 'closeToastBtn');
        }
        cleanup();
    };
    saveBtn.onclick = save;
    cancelBtn.onclick = cleanup;
    input.onkeypress = (e) => { if (e.key === 'Enter') save(); };
    input.onkeydown = (e) => { if (e.key === 'Escape') cleanup(); };
};

// ========== ТОСТ ==========
document.getElementById('closeToastBtn').addEventListener('click', (e) => {
    const rect = document.getElementById('closeToastBtn').getBoundingClientRect();
    heartBurst(rect.left + rect.width/2, rect.top + rect.height/2);
    document.getElementById('toastMessage').classList.remove('show');
});

// ========== ТЕМА И ФОНЫ ==========
function loadUserSettings() {
    const savedTheme = localStorage.getItem(`theme_${currentUser}`);
    if (savedTheme === 'dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    document.getElementById('themeToggle').textContent = document.body.classList.contains('dark') ? '🌙' : '☀️';
    const savedBg = localStorage.getItem(`bg_${currentUser}`) || 'room';
    document.body.classList.forEach(c => { if (c.startsWith('bg-')) document.body.classList.remove(c); });
    document.body.classList.add(`bg-${savedBg}`);
}

function saveUserTheme() { localStorage.setItem(`theme_${currentUser}`, document.body.classList.contains('dark') ? 'dark' : 'light'); }
function saveUserBg(bgId) { localStorage.setItem(`bg_${currentUser}`, bgId); }

document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    saveUserTheme();
    document.getElementById('themeToggle').textContent = document.body.classList.contains('dark') ? '🌙' : '☀️';
});

const bgList = [
    { id: 'room', name: 'Уютная комната', img: 'background/pexels-asumaani-17279643.jpg' },
    { id: 'room2', name: 'Комната 2', img: 'background/pexels-cottonbro-6156879.jpg' },
    { id: 'cats', name: 'Котики', img: 'background/qujrvux9fssg1.jpeg' },
    { id: 'gradient', name: 'Нежный градиент', img: null }
];

const bgSwitcher = document.getElementById('bgSwitcher');
bgSwitcher.innerHTML = '';
bgList.forEach(bg => {
    const btn = document.createElement('div');
    btn.className = 'bg-btn';
    btn.title = bg.name;
    if (bg.img) {
        btn.style.backgroundImage = `url('${bg.img}')`;
        btn.style.backgroundSize = 'cover';
    } else {
        btn.style.background = 'linear-gradient(135deg, #f5a5a5, #e07a5a)';
    }
    if (localStorage.getItem(`bg_${currentUser}`) === bg.id) btn.classList.add('active');
    else if (!localStorage.getItem(`bg_${currentUser}`) && bg.id === 'room') btn.classList.add('active');
    btn.addEventListener('click', () => {
        bgList.forEach(b => document.body.classList.remove(`bg-${b.id}`));
        document.body.classList.add(`bg-${bg.id}`);
        saveUserBg(bg.id);
        document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
    bgSwitcher.appendChild(btn);
});

// ========== ЗАПУСК ==========
renderCats(isHer, herAvatar, hisAvatar);
loadAvatars();
loadUserSettings();

setTimeout(() => {
    const leftStatus = document.getElementById('leftStatusText');
    const rightStatus = document.getElementById('rightStatusText');
    if (leftStatus) leftStatus.addEventListener('click', () => window.makeEditable(leftStatus, isHer ? 'her' : 'his'));
    if (rightStatus) rightStatus.style.cursor = 'default';
}, 100);

// ========== МОБИЛЬНЫЙ СВАЙП (только для узких экранов) ==========
if (window.innerWidth <= 768) {
    // Ждем, пока загрузятся котики
    setTimeout(() => {
        // Создаем структуру для свайпа
        const contentWrapper = document.querySelector('.content-wrapper');
        if (!contentWrapper) return;
        
        // Сохраняем оригинальный контент
        const originalContent = contentWrapper.innerHTML;
        
        // Получаем текущие статусы и аватары
        const leftStatusText = document.getElementById('leftStatusText')?.textContent || '✨ Хочу обнимашек ✨';
        const rightStatusText = document.getElementById('rightStatusText')?.textContent || '🍜 Готовлю ужин 🍜';
        const leftAvatar = document.getElementById('leftCatImg')?.src || '';
        const rightAvatar = document.getElementById('rightCatImg')?.src || '';
        const leftName = document.querySelector('.cat-left .cat-name')?.textContent || 'Влада';
        const rightName = document.querySelector('.cat-right .cat-name')?.textContent || 'Никита';
        
        // Оборачиваем контент в свайп-контейнер
        contentWrapper.innerHTML = `
            <div class="swipe-container" style="display: flex; width: 300%; height: 100%; transition: transform 0.3s ease-out;">
                <!-- Страница 0: список -->
                <div class="swipe-page" style="width: 33.33%; height: 100%; overflow-y: auto;">
                    ${originalContent}
                </div>
                <!-- Страница 1: котик 1 -->
                <div class="swipe-page" style="width: 33.33%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                    <div style="text-align: center; background: var(--card-bg); border-radius: 40px; padding: 30px; margin: 20px;">
                        <div style="width: 160px; height: 160px; margin: 0 auto;">
                            <img src="${leftAvatar}" style="width: 100%; height: 100%; object-fit: contain;">
                        </div>
                        <div style="font-size: 1.4rem; font-weight: 700; margin: 15px 0; color: var(--tab-active-color);">${leftName}</div>
                        <div class="bubble" style="position: relative; bottom: auto; left: auto; transform: none; margin: 15px auto;">
                            <span class="bubble-text" id="mobileLeftStatus">${leftStatusText}</span>
                        </div>
                    </div>
                </div>
                <!-- Страница 2: котик 2 -->
                <div class="swipe-page" style="width: 33.33%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                    <div style="text-align: center; background: var(--card-bg); border-radius: 40px; padding: 30px; margin: 20px;">
                        <div style="width: 160px; height: 160px; margin: 0 auto;">
                            <img src="${rightAvatar}" style="width: 100%; height: 100%; object-fit: contain;">
                        </div>
                        <div style="font-size: 1.4rem; font-weight: 700; margin: 15px 0; color: var(--tab-active-color);">${rightName}</div>
                        <div class="bubble" style="position: relative; bottom: auto; left: auto; transform: none; margin: 15px auto;">
                            <span class="bubble-text" id="mobileRightStatus">${rightStatusText}</span>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Индикатор -->
            <div style="display: flex; justify-content: center; gap: 12px; padding: 12px 0;">
                <div class="swipe-dot active" data-page="0" style="width: 8px; height: 8px; border-radius: 50%; background: var(--tab-active-color); transition: all 0.2s;"></div>
                <div class="swipe-dot" data-page="1" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(224,122,90,0.4); transition: all 0.2s;"></div>
                <div class="swipe-dot" data-page="2" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(224,122,90,0.4); transition: all 0.2s;"></div>
            </div>
        `;
        
        // Скрываем старых котиков
        document.querySelectorAll('.cat-fixed').forEach(el => el.style.display = 'none');
        
        // Инициализируем свайп
        let startX = 0;
        let currentPage = 0;
        const container = document.querySelector('.swipe-container');
        const dots = document.querySelectorAll('.swipe-dot');
        
        function updateDots(page) {
            dots.forEach((dot, i) => {
                if (i === page) {
                    dot.style.width = '20px';
                    dot.style.background = 'var(--tab-active-color)';
                } else {
                    dot.style.width = '8px';
                    dot.style.background = 'rgba(224,122,90,0.4)';
                }
            });
        }
        
        function goToPage(page) {
            if (page < 0) page = 0;
            if (page > 2) page = 2;
            currentPage = page;
            container.style.transform = `translateX(-${page * 33.33}%)`;
            updateDots(page);
        }
        
        // Свайп
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
        
        container.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentPage < 2) goToPage(currentPage + 1);
                if (diff < 0 && currentPage > 0) goToPage(currentPage - 1);
            }
        });
        
        // Клик по точкам
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => goToPage(i));
        });
        
        // Синхронизация статусов
        function syncStatuses() {
            const leftOriginal = document.getElementById('leftStatusText');
            const rightOriginal = document.getElementById('rightStatusText');
            const mobileLeft = document.getElementById('mobileLeftStatus');
            const mobileRight = document.getElementById('mobileRightStatus');
            
            if (leftOriginal && mobileLeft) mobileLeft.textContent = leftOriginal.textContent;
            if (rightOriginal && mobileRight) mobileRight.textContent = rightOriginal.textContent;
        }
        
        setInterval(syncStatuses, 500);
        
        // Редактирование статуса на мобилке
        document.addEventListener('click', async (e) => {
            const statusSpan = e.target.closest('.bubble-text');
            if (!statusSpan) return;
            if (statusSpan.id !== 'mobileLeftStatus' && statusSpan.id !== 'mobileRightStatus') return;
            
            const owner = statusSpan.id === 'mobileLeftStatus' ? (isHer ? 'her' : 'his') : (isHer ? 'his' : 'her');
            
            if ((owner === 'her' && !isHer) || (owner === 'his' && isHer)) {
                showToast('💭 Ты можешь менять только свой статус!', 'toastMessage', 'closeToastBtn');
                return;
            }
            
            const newText = prompt('Новый статус:', statusSpan.textContent);
            if (newText && newText.trim()) {
                // Сохраняем в Firebase
                const snap = await getDocs(statusCol);
                let existing = null;
                snap.forEach(d => { if (d.data().owner === owner) existing = d; });
                
                if (existing) {
                    await updateDoc(doc(db, "status_v2", existing.id), { text: newText });
                } else {
                    await addDoc(statusCol, { owner, text: newText });
                }
                
                // Обновляем везде
                statusSpan.textContent = newText;
                const targetOriginal = owner === 'her' ? document.getElementById('leftStatusText') : document.getElementById('rightStatusText');
                if (targetOriginal) targetOriginal.textContent = newText;
                showToast('💬 Статус обновлён!', 'toastMessage', 'closeToastBtn');
            }
        });
        
        // Обновление аватаров
        function updateMobileAvatars() {
            const leftImg = document.getElementById('leftCatImg');
            const rightImg = document.getElementById('rightCatImg');
            const mobileLeftImg = document.querySelector('#mobileLeftStatus')?.closest('.swipe-page')?.querySelector('img');
            const mobileRightImg = document.querySelector('#mobileRightStatus')?.closest('.swipe-page')?.querySelector('img');
            
            if (leftImg && mobileLeftImg) mobileLeftImg.src = leftImg.src;
            if (rightImg && mobileRightImg) mobileRightImg.src = rightImg.src;
        }
        
        setInterval(updateMobileAvatars, 1000);
        
    }, 500);
}