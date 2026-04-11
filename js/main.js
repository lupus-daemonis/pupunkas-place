import { HER_AVATARS, HIS_AVATARS, GENRES, GENRE_ICONS } from './config.js';
import { db, filmsCol, cookingCol, placesCol, statusCol, avatarsCol, onSnapshot, query, orderBy, getDocs, updateDoc, doc, addDoc } from './firebase.js';
import { heartBurst, showToast, randomFromList, escapeHtml } from './utils.js';
import { 
    films, cooking, places, currentGenreFilter, herAvatar, hisAvatar, isHer, currentUser,
    setUserData, setAvatars, renderFilms, renderCooking, renderPlaces, updateCatAvatars, renderCats 
} from './ui.js';
import { setupDeleteModal, handleDelete, addItem } from './handlers.js';

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

let activeTab = 'films'; 

const filmsListEl = document.getElementById('filmsList');
const cookingListEl = document.getElementById('cookingList');
const placesListEl = document.getElementById('placesList');
const globalAddForm = document.getElementById('globalAddForm');
const dynamicAddForm = document.getElementById('dynamicAddForm');
const genreSelect = document.getElementById('genreFilter');

setupDeleteModal('deleteModal', 'modalConfirm', 'modalCancel');

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
    
    const addBtn = document.getElementById('dynamicAddBtn');
    const input = document.getElementById('newItemInput');
    
    if (addBtn) {
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

// document.getElementById('resetFilterBtn')?.addEventListener('click', () => { 
//     genreSelect.value = 'all'; 
//     window.currentGenreFilter = 'all'; 
//     renderFilms(filmsListEl); 
// });

document.getElementById('randomFilmBtn')?.addEventListener('click', () => 
    randomFromList(films, 'Фильм/аниме', { her: 'Влада', his: 'Никита' })
);

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

document.getElementById('closeToastBtn').addEventListener('click', (e) => {
    const rect = document.getElementById('closeToastBtn').getBoundingClientRect();
    heartBurst(rect.left + rect.width/2, rect.top + rect.height/2);
    document.getElementById('toastMessage').classList.remove('show');
});

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

renderCats(isHer, herAvatar, hisAvatar);
loadAvatars();
loadUserSettings();

setTimeout(() => {
    const leftStatus = document.getElementById('leftStatusText');
    const rightStatus = document.getElementById('rightStatusText');
    if (leftStatus) leftStatus.addEventListener('click', () => window.makeEditable(leftStatus, isHer ? 'her' : 'his'));
    if (rightStatus) rightStatus.style.cursor = 'default';
}, 100);
