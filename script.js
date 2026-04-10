const firebaseConfig = {
    apiKey: "AIzaSyDJI5DkbEs8_ojQHOTZ6NfXor8ZH4Rioao",
    authDomain: "pupunkas-place.firebaseapp.com",
    projectId: "pupunkas-place",
    storageBucket: "pupunkas-place.firebasestorage.app",
    messagingSenderId: "979886120410",
    appId: "1:979886120410:web:8ee8ed0096414e791634e3"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const filmsCollection = collection(db, "films");
const cookingCollection = collection(db, "cooking");
const placesCollection = collection(db, "places");
const statusCollection = collection(db, "status_v2");

let films = [], cooking = [], places = [];
let herStatus = "✨ Хочу обнимашек ✨";
let hisStatus = "🍜 Готовлю ужин 🍜";

const filmsListEl = document.getElementById('filmsList');
const cookingListEl = document.getElementById('cookingList');
const placesListEl = document.getElementById('placesList');
const herStatusEl = document.getElementById('herStatusText');
const hisStatusEl = document.getElementById('hisStatusText');

// Статусы
function loadStatuses() {
    onSnapshot(statusCollection, (snapshot) => {
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.owner === 'her') {
                herStatus = data.text;
                if (herStatusEl) herStatusEl.textContent = herStatus;
            } else if (data.owner === 'his') {
                hisStatus = data.text;
                if (hisStatusEl) hisStatusEl.textContent = hisStatus;
            }
        });
    });
}

async function updateStatus(owner, newText) {
    const snapshot = await statusCollection.get();
    let existingDoc = null;
    snapshot.forEach(doc => {
        if (doc.data().owner === owner) existingDoc = doc;
    });
    
    if (existingDoc) {
        await updateDoc(doc(db, "status_v2", existingDoc.id), { text: newText });
    } else {
        await addDoc(statusCollection, { owner: owner, text: newText });
    }
}

document.querySelectorAll('.edit-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const owner = btn.dataset.status;
        const currentText = owner === 'her' ? herStatus : hisStatus;
        const newText = prompt(`Что у ${owner === 'her' ? 'Пупуни' : 'Пупунь'} на уме?`, currentText);
        if (newText && newText.trim()) {
            updateStatus(owner, newText.trim());
        }
    });
});

// Рендер
function renderList(list, containerEl, type) {
    if (!containerEl) return;
    if (list.length === 0) {
        const messages = {
            films: '✨ Добавьте фильм или аниме',
            cooking: '🍳 Что хотите приготовить вместе?',
            places: '🌳 Куда хотите сходить?'
        };
        containerEl.innerHTML = `<div class="empty-msg">${messages[type]}</div>`;
        return;
    }
    containerEl.innerHTML = list.map(item => `
        <li class="${item.done ? 'done' : ''}" data-id="${item.id}" data-type="${type}">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <div class="actions">
                <button class="done-btn" data-action="toggle">✓</button>
                <button class="delete-btn" data-action="delete">✗</button>
            </div>
        </li>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Подписки
onSnapshot(query(filmsCollection, orderBy("createdAt", "desc")), (snap) => {
    films = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList(films, filmsListEl, 'films');
});
onSnapshot(query(cookingCollection, orderBy("createdAt", "desc")), (snap) => {
    cooking = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList(cooking, cookingListEl, 'cooking');
});
onSnapshot(query(placesCollection, orderBy("createdAt", "desc")), (snap) => {
    places = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList(places, placesListEl, 'places');
});
loadStatuses();

// Добавление
async function addItem(collectionRef, inputEl) {
    const name = inputEl.value.trim();
    if (!name) return;
    await addDoc(collectionRef, { name, done: false, createdAt: new Date() });
    inputEl.value = '';
}

document.getElementById('addFilmBtn')?.addEventListener('click', () => addItem(filmsCollection, document.getElementById('newFilmInput')));
document.getElementById('addCookingBtn')?.addEventListener('click', () => addItem(cookingCollection, document.getElementById('newCookingInput')));
document.getElementById('addPlaceBtn')?.addEventListener('click', () => addItem(placesCollection, document.getElementById('newPlaceInput')));

// Удаление и done
document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const li = btn.closest('li');
    if (!li) return;
    const id = li.dataset.id;
    const type = li.dataset.type;
    const action = btn.dataset.action;
    
    let collectionName = '', list = [];
    if (type === 'films') { collectionName = 'films'; list = films; }
    else if (type === 'cooking') { collectionName = 'cooking'; list = cooking; }
    else if (type === 'places') { collectionName = 'places'; list = places; }
    
    if (action === 'toggle') {
        const item = list.find(i => i.id === id);
        if (item) await updateDoc(doc(db, collectionName, id), { done: !item.done });
    } else if (action === 'delete') {
        if (confirm('Удалить?')) await deleteDoc(doc(db, collectionName, id));
    }
});

// Случайный выбор
function randomFromList(list, typeName) {
    const active = list.filter(item => !item.done);
    if (active.length === 0) {
        alert(`✨ Добавьте что-то в "${typeName}"`);
        return;
    }
    const random = active[Math.floor(Math.random() * active.length)];
    alert(`🎉 Сегодня: ${random.name}`);
}
document.getElementById('randomFilmBtn')?.addEventListener('click', () => randomFromList(films, 'кино/аниме'));
document.getElementById('randomCookingBtn')?.addEventListener('click', () => randomFromList(cooking, 'готовка'));
document.getElementById('randomPlaceBtn')?.addEventListener('click', () => randomFromList(places, 'места'));

// Вкладки
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${tabId}Panel`).classList.add('active');
    });
});

// Enter
document.getElementById('newFilmInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('addFilmBtn').click(); });
document.getElementById('newCookingInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('addCookingBtn').click(); });
document.getElementById('newPlaceInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('addPlaceBtn').click(); });