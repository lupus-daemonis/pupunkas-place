import { HER_AVATARS, HIS_AVATARS, GENRES, GENRE_ICONS } from './config.js';
import { db, filmsCol, cookingCol, placesCol, statusCol, avatarsCol, onSnapshot, query, orderBy, getDocs, updateDoc, doc } from './firebase.js';
import { heartBurst, showToast, randomFromList, escapeHtml } from './utils.js';
import { 
    films, cooking, places, currentGenreFilter, activeTab, herAvatar, hisAvatar, isHer, currentUser,
    setUserData, setAvatars, renderFilms, renderCooking, renderPlaces, updateCatAvatars, renderCats 
} from './ui.js';
import { setupDeleteModal, handleDelete, addItem, updateAddForm } from './handlers.js';

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

const filmsListEl = document.getElementById('filmsList');
const cookingListEl = document.getElementById('cookingList');
const placesListEl = document.getElementById('placesList');
const globalAddForm = document.getElementById('globalAddForm');
const dynamicAddForm = document.getElementById('dynamicAddForm');
const genreSelect = document.getElementById('genreFilter');
const toastMessage = document.getElementById('toastMessage');

setupDeleteModal('deleteModal', 'modalConfirm', 'modalCancel');

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

document.getElementById('resetFilterBtn')?.addEventListener('click', () => { 
    genreSelect.value = 'all'; 
    window.currentGenreFilter = 'all'; 
    renderFilms(filmsListEl); 
});

document.getElementById('randomFilmBtn')?.addEventListener('click', () => 
    randomFromList(films, 'Фильм/аниме', { her: 'Влада', his: 'Никита' })
);

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const tabId = tab.dataset.tab;
        document.getElementById(`${tabId}Panel`).classList.add('active');
        window.activeTab = tabId;
        if (globalAddForm.classList.contains('show')) 
            updateAddForm(window.activeTab, filmsCol, cookingCol, placesCol, currentUser, globalAddForm, dynamicAddForm, addItem);
    });
});

document.getElementById('globalAddBtn').addEventListener('click', () => {
    updateAddForm(activeTab, filmsCol, cookingCol, placesCol, currentUser, globalAddForm, dynamicAddForm, addItem);
    globalAddForm.classList.toggle('show');
    if (globalAddForm.classList.contains('show')) {
        const input = dynamicAddForm.querySelector('input');
        if (input) setTimeout(() => input.focus(), 100);
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
    if (type === 'films') item = films.find(i => i.id === id);
    else if (type === 'cooking') item = cooking.find(i => i.id === id);
    else if (type === 'places') item = places.find(i => i.id === id);
    if (!item) return;
    
    if (action === 'toggle') {
        let col = type === 'films' ? 'films' : type === 'cooking' ? 'cooking' : 'places';
        await updateDoc(doc(db, col, id), { done: !item.done });
    } else if (action === 'delete') {
        let col = type === 'films' ? 'films' : type === 'cooking' ? 'cooking' : 'places';
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