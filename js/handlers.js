import { addDoc, updateDoc, deleteDoc, doc, getDocs } from './firebase.js';
import { filmsCol, cookingCol, placesCol, statusCol } from './firebase.js';
import { showToast } from './utils.js';
import { films, cooking, places, activeTab } from './ui.js';

// ⚠️ ВАЖНО: Добавьте импорт db
import { db } from './firebase.js';

let pendingDelete = null;
let currentUser = null;

export function setupDeleteModal(modalId, confirmId, cancelId) {
    const modal = document.getElementById(modalId);
    
    if (!modal) {
        console.error('Модалка не найдена:', modalId);
        return;
    }
    
    window.showDeleteModal = (callback) => {
        pendingDelete = callback;
        modal.classList.add('show');
    };
    
    const confirmBtn = document.getElementById(confirmId);
    const cancelBtn = document.getElementById(cancelId);
    
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            if (pendingDelete) pendingDelete(true);
            modal.classList.remove('show');
            pendingDelete = null;
        };
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            if (pendingDelete) pendingDelete(false);
            modal.classList.remove('show');
            pendingDelete = null;
        };
    }
}

export async function handleDelete(collectionName, id, itemAuthor, user) {

    // if (itemAuthor !== user) {
    //     showToast(`🚫 Нельзя удалить чужую запись!`, 'toastMessage', 'closeToastBtn');
    //     return false;
    // }
    
    return new Promise((resolve) => {
        window.showDeleteModal(async (confirmed) => {
            if (confirmed) {
                try {
                    // ИСПРАВЛЕНО: используем db из импорта
                    const docRef = doc(db, collectionName, id);
                    await deleteDoc(docRef);
                    showToast(`🗑️ Удалено!`, 'toastMessage', 'closeToastBtn');
                } catch (error) {
                    console.error('Ошибка удаления:', error);
                    showToast(`❌ Ошибка: ${error.message}`, 'toastMessage', 'closeToastBtn');
                }
            }
            resolve();
        });
    });
}

export async function addItem(collectionRef, name, extra = {}, user) {
    if (!name.trim()) return;
    try {
        await addDoc(collectionRef, { 
            name: name.trim(), 
            done: false, 
            createdAt: new Date(), 
            author: user, 
            ...extra 
        });
        showToast(`✅ Добавлено!`, 'toastMessage', 'closeToastBtn');
    } catch (error) {
        console.error('Ошибка добавления:', error);
        showToast(`❌ Ошибка: ${error.message}`, 'toastMessage', 'closeToastBtn');
    }
}

export function updateAddForm(activeTab, filmsCol, cookingCol, placesCol, currentUser, globalAddForm, dynamicAddForm, addItem) {
    if (activeTab === 'films') {
        dynamicAddForm.innerHTML = `
            <input type="text" id="newFilmInput" placeholder="Название фильма / аниме...">
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
        const addBtn = document.getElementById('dynamicAddBtn');
        const input = document.getElementById('newFilmInput');
        if (addBtn) {
            addBtn.onclick = () => {
                addItem(filmsCol, input?.value || '', { genre: document.getElementById('filmGenre')?.value || 'Драма' }, currentUser);
                if (input) input.value = '';
                globalAddForm.classList.remove('show');
            };
        }
        if (input) input.onkeypress = (e) => { if (e.key === 'Enter') addBtn?.click(); };
    } else if (activeTab === 'cooking') {
        dynamicAddForm.innerHTML = `
            <input type="text" id="newCookingInput" placeholder="Блюдо: паста, пицца, рамен...">
            <button id="dynamicAddBtn" class="inline-add-btn">+ Добавить блюдо</button>
        `;
        const addBtn = document.getElementById('dynamicAddBtn');
        const input = document.getElementById('newCookingInput');
        if (addBtn) {
            addBtn.onclick = () => {
                addItem(cookingCol, input?.value || '', {}, currentUser);
                if (input) input.value = '';
                globalAddForm.classList.remove('show');
            };
        }
        if (input) input.onkeypress = (e) => { if (e.key === 'Enter') addBtn?.click(); };
    } else if (activeTab === 'places') {
        dynamicAddForm.innerHTML = `
            <input type="text" id="newPlaceInput" placeholder="Кафе, парк, квест, выставка...">
            <button id="dynamicAddBtn" class="inline-add-btn">+ Добавить место</button>
        `;
        const addBtn = document.getElementById('dynamicAddBtn');
        const input = document.getElementById('newPlaceInput');
        if (addBtn) {
            addBtn.onclick = () => {
                addItem(placesCol, input?.value || '', {}, currentUser);
                if (input) input.value = '';
                globalAddForm.classList.remove('show');
            };
        }
        if (input) input.onkeypress = (e) => { if (e.key === 'Enter') addBtn?.click(); };
    }
}