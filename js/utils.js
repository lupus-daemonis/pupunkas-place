export function heartBurst(x, y) {
    const burstContainer = document.createElement('div');
    burstContainer.className = 'heart-burst';
    burstContainer.style.position = 'fixed';
    burstContainer.style.left = '0';
    burstContainer.style.top = '0';
    burstContainer.style.width = '100%';
    burstContainer.style.height = '100%';
    burstContainer.style.pointerEvents = 'none';
    burstContainer.style.zIndex = '10000';
    document.body.appendChild(burstContainer);
    
    const heartCount = 35;
    const hearts = ['❤️', '💖', '💗', '💓', '💕', '💝', '💘', '🌸', '🌷', '💞'];
    
    for (let i = 0; i < heartCount; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 160;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 100;
        const startX = x + (Math.random() - 0.5) * 30;
        const startY = y + (Math.random() - 0.5) * 30;
        heart.style.left = (startX - 15) + 'px';
        heart.style.top = (startY - 15) + 'px';
        heart.style.setProperty('--dx', dx + 'px');
        heart.style.setProperty('--dy', dy + 'px');
        heart.style.fontSize = (16 + Math.random() * 18) + 'px';
        heart.style.position = 'absolute';
        heart.style.color = `rgb(255, ${120 + Math.random() * 80}, ${140 + Math.random() * 60})`;
        burstContainer.appendChild(heart);
        setTimeout(() => heart.remove(), 1000);
    }
    setTimeout(() => burstContainer.remove(), 1100);
}

export function showToast(msg, toastElement, closeBtnId) {
    const toast = document.getElementById(toastElement);
    const closeBtn = document.getElementById(closeBtnId);
    
    toast.querySelector('span').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

export function escapeHtml(str) { 
    return str?.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])) || ''; 
}

export function randomFromList(list, typeName, userNames) {
    const active = list.filter(i => !i.done);
    if (!active.length) { alert(`✨ Нет активных записей в "${typeName}"`); return; }
    const rand = active[Math.floor(Math.random() * active.length)];
    const authorName = rand.author === 'her' ? userNames.her : userNames.his;
    alert(`🎉 ${typeName}: ${rand.name}${rand.genre ? ` (${rand.genre})` : ''}\n✨ Добавил(а): ${authorName}`);
}