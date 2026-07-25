// script.js

// --------------------- Модель данных ---------------------
let tasks = [];
let currentFilter = 'all';      // 'all', 'active', 'completed'
let searchQuery = '';

// DOM-элементы
const taskListEl = document.getElementById('taskList');
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');

// --------------------- Работа с localStorage ---------------------
function loadFromStorage() {
    const stored = localStorage.getItem('tasks');
    if (stored) {
        try {
            tasks = JSON.parse(stored);
        } catch (e) {
            tasks = [];
        }
    } else {
        // Если нет сохранённых, можно добавить демо-задачи (опционально)
        tasks = [
            { id: Date.now() + 1, text: 'Изучить JavaScript', completed: false },
            { id: Date.now() + 2, text: 'Сделать To-Do список', completed: true },
        ];
    }
}

function saveToStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// --------------------- Генерация ID ---------------------
function generateId() {
    return Date.now() + Math.random() * 1000;
}

// --------------------- Рендеринг списка ---------------------
function renderTasks() {
    // Фильтрация по статусу
    let filtered = tasks;
    if (currentFilter === 'active') {
        filtered = filtered.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(task => task.completed);
    }

    // Поиск по тексту (регистронезависимый)
    if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(task => task.text.toLowerCase().includes(query));
    }

    // Если задач нет – показываем сообщение
    if (filtered.length === 0) {
        taskListEl.innerHTML = `<li style="text-align:center;color:#999;padding:20px;">Задач не найдено</li>`;
        return;
    }

    // Генерируем HTML
    let html = '';
    filtered.forEach(task => {
        const doneClass = task.completed ? 'done' : '';
        const checkedAttr = task.completed ? 'checked' : '';
        // Используем чекбокс или клик по тексту – здесь сделаем и то, и другое.
        // Для мобильных добавим обработку touchstart на тексте (см. делегирование ниже)
        html += `
            <li class="task-item" data-id="${task.id}">
                <input type="checkbox" class="task-checkbox" ${checkedAttr} />
                <span class="task-text ${doneClass}" data-id="${task.id}">${escapeHTML(task.text)}</span>
                <button class="delete-btn" data-id="${task.id}">✕</button>
            </li>
        `;
    });

    taskListEl.innerHTML = html;
}

// Простая защита от XSS (экранирование)
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --------------------- Операции с задачами ---------------------
function addTask(text) {
    if (!text.trim()) return;
    const newTask = {
        id: generateId(),
        text: text.trim(),
        completed: false
    };
    tasks.push(newTask);
    saveToStorage();
    renderTasks();
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveToStorage();
    renderTasks();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveToStorage();
        renderTasks();
    }
}

// --------------------- Обработчики событий (с делегированием) ---------------------

// 1. Добавление задачи (форма)
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value;
    addTask(text);
    taskInput.value = '';
    taskInput.focus();
});

// 2. Обработка кликов по списку (делегирование)
taskListEl.addEventListener('click', (e) => {
    const target = e.target;

    // Кнопка удаления
    if (target.classList.contains('delete-btn')) {
        const id = parseFloat(target.dataset.id);
        deleteTask(id);
        e.stopPropagation();
        return;
    }

    // Чекбокс
    if (target.classList.contains('task-checkbox')) {
        const li = target.closest('.task-item');
        if (li) {
            const id = parseFloat(li.dataset.id);
            toggleTask(id);
            // Чекбокс синхронизируется с состоянием задачи, но toggle уже обновляет данные и рендерит
        }
        e.stopPropagation();
        return;
    }

    // Клик по тексту задачи (тоже переключает статус)
    if (target.classList.contains('task-text')) {
        const id = parseFloat(target.dataset.id);
        toggleTask(id);
        e.stopPropagation();
    }
});

// 3. Обработка touchstart для мобильных (чтобы реагировать мгновенно)
// Используем тот же делегированный подход, но на событии touchstart.
// Чтобы избежать дублирования, можно объединить, но для надёжности добавим отдельно.
taskListEl.addEventListener('touchstart', (e) => {
    const target = e.target;
    // На мобильных обрабатываем только клик по тексту и чекбоксу (удаление – тоже, но там и так сработает)
    if (target.classList.contains('task-text')) {
        // Предотвращаем возможный конфликт с click (чтобы не вызывалось дважды)
        // Однако click всё равно может сработать, поэтому мы можем отменить действие, если touchstart уже обработал.
        // Простой способ: использовать флаг, но для простоты мы будем обрабатывать только touchstart, 
        // а click оставим для десктопа. Чтобы не дублировать, отключаем click для touch-устройств? 
        // Но лучше сделать так: на touchstart вызываем toggle, и preventDefault() чтобы не генерировался click.
        // Но тогда на десктопе touchstart не сработает, а click – сработает. 
        // Для единообразия можно обрабатывать только click, а на мобильных он тоже работает (с задержкой ~300 мс).
        // По условию ТЗ – использовать touchstart для мгновенности. Поэтому сделаем так:
        const id = parseFloat(target.dataset.id);
        toggleTask(id);
        e.preventDefault(); // предотвращаем click
    }
    // Аналогично для чекбокса – там тоже можно обработать touchstart
    if (target.classList.contains('task-checkbox')) {
        const li = target.closest('.task-item');
        if (li) {
            const id = parseFloat(li.dataset.id);
            toggleTask(id);
            e.preventDefault();
        }
    }
    // Для кнопки удаления также можно, но там click обычно работает быстро
});

// 4. Поиск (фильтр по тексту)
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTasks();
});

// 5. Фильтры по статусу (кнопки)
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Убираем активный класс у всех
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

// --------------------- Инициализация ---------------------
loadFromStorage();
saveToStorage(); // чтобы сохранить демо-задачи при первом запуске
renderTasks();