document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const weekStartInput = document.getElementById('weekStart');
    const weekEndDisplay = document.getElementById('weekEndDisplay');
    const currentWeekDisplay = document.getElementById('currentWeek');
    const tableBody = document.getElementById('tableBody');
    const itemCountDisplay = document.getElementById('itemCount');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const liveClock = document.getElementById('liveClock');
    const showAllBtn = document.getElementById('showAllBtn');
    const weekHeader = document.getElementById('weekHeader');

    let allTasks = [];
    let showAllData = true;

    if (!taskForm || !weekStartInput || !tableBody || !itemCountDisplay || !refreshBtn || !submitBtn || !showAllBtn) {
        console.error('Core UI elements missing');
        return;
    }

    const nameInput = document.getElementById('name');

    // --- Core Logic ---

    // Load remembered name
    if (nameInput instanceof HTMLInputElement) {
        const savedName = localStorage.getItem('cui_user_name');
        if (savedName) nameInput.value = savedName;
    }

    function updateClock() {
        if (!liveClock) return;
        const now = new Date();
        liveClock.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }

    setInterval(updateClock, 1000);
    updateClock();

    // --- Date Logic ---

    function getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    function formatDateForDisplay(date) {
        if (!(date instanceof Date)) date = new Date(date);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    function updateWeekDates(startDate) {
        const start = new Date(startDate);
        const end = new Date(startDate);
        end.setDate(start.getDate() + 6);

        const formattedStart = formatDateForDisplay(start);
        const formattedEnd = formatDateForDisplay(end);

        // Check if it's the current week
        const now = new Date();
        const currentMonday = getMonday(now);
        const selectedMonday = getMonday(start);
        const isCurrentWeek = currentMonday.getTime() === selectedMonday.getTime();

        if (weekEndDisplay) weekEndDisplay.textContent = formattedEnd;
        if (currentWeekDisplay) {
            currentWeekDisplay.innerHTML = `
                <span class="live-pulse" style="display: ${isCurrentWeek ? 'inline-block' : 'none'}"></span>
                ${formattedStart} – ${formattedEnd} 
                ${isCurrentWeek ? '<span class="current-label">Live</span>' : ''}
            `;
        }

        // Filter table after updating week
        if (allTasks.length > 0) {
            renderTable(allTasks);
        }
    }

    // Default to current date (Today)
    const today = new Date();
    if (weekStartInput instanceof HTMLInputElement) {
        weekStartInput.value = today.toISOString().split('T')[0];
        updateWeekDates(today);

        weekStartInput.addEventListener('change', (e) => {
            const target = e.target;
            if (target instanceof HTMLInputElement && target.value) {
                updateWeekDates(target.value);
            }
        });
    }

    // --- Data Management ---

    async function fetchTasks() {
        if (typeof GAS_WEB_APP_URL === 'undefined' || GAS_WEB_APP_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL')) {
            showToast('Please set your GAS_WEB_APP_URL in index.html', 'error');
            return;
        }

        refreshBtn.classList.add('loading');
        try {
            const response = await fetch(GAS_WEB_APP_URL);
            const data = await response.json();

            // Debug: Log the raw data from Google Sheets
            console.log('Raw data from Google Sheets:', data);

            // Handle empty data
            if (!data || data.length === 0) {
                allTasks = [];
                renderTable([]);
                return;
            }

            // The doGet returns objects with rowNumber field
            allTasks = data.map(task => {
                console.log('Processing task:', task); // Debug each task
                return {
                    rowNumber: task.rowNumber || 0,
                    weekStart: task.weekStart || '',
                    name: task.name || 'Unknown',
                    type: task.type || 'Task',
                    item: task.item || '',
                    hours: task.hours || 0,
                    acknowledged: task.acknowledged === true || task.acknowledged === 'true'
                };
            });

            console.log('Processed allTasks:', allTasks); // Debug processed data

            renderTable(allTasks);
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Connection failed. Make sure you used the /exec URL!', 'error');
        } finally {
            refreshBtn.classList.remove('loading');
        }
    }

    function renderTable(tasks) {
        // Filter tasks by selected week IF not in 'showAll' mode
        let filteredTasks = tasks;
        if (!showAllData && weekStartInput instanceof HTMLInputElement) {
            const selectedMonday = getMonday(weekStartInput.value);
            filteredTasks = tasks.filter(task => {
                if (!task.weekStart) return true;
                try {
                    const taskDate = new Date(task.weekStart);
                    const taskMonday = getMonday(taskDate);
                    return taskMonday.getTime() === selectedMonday.getTime();
                } catch (e) {
                    return true;
                }
            });
        }

        // Calculate total hours
        const totalHours = filteredTasks.reduce((sum, t) => sum + parseFloat(t.hours || 0), 0);
        const totalDisplay = document.getElementById('totalHoursSummary');
        if (totalDisplay) totalDisplay.textContent = `${totalHours}h`;

        // Update UI headers
        if (weekHeader) weekHeader.style.display = showAllData ? 'table-cell' : 'none';

        if (tableBody) tableBody.innerHTML = '';
        if (itemCountDisplay) itemCountDisplay.textContent = filteredTasks.length.toString();

        if (filteredTasks.length === 0) {
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr class="empty-state">
                        <td colspan="${showAllData ? '7' : '6'}">
                            <div class="empty-message">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M9 11l3 3L22 4"></path>
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                </svg>
                                <p>${showAllData ? 'No records found.' : 'No items found for this week.'}</p>
                                <p class="empty-subtext">${showAllData ? 'The database is currently empty.' : 'Add a task for this week or select a different date.'}</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            return;
        }

        filteredTasks.forEach(task => {
            const tr = document.createElement('tr');
            if (task.acknowledged) tr.classList.add('row-acknowledged');

            // Format week start for display
            let weekDisplay = '---';
            if (task.weekStart) {
                try {
                    const d = new Date(task.weekStart);
                    weekDisplay = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                } catch (e) {
                    weekDisplay = task.weekStart;
                }
            }

            tr.innerHTML = `
                <td><strong>${task.name || 'Unknown'}</strong></td>
                <td><span class="badge">${task.type || 'Task'}</span></td>
                <td style="display: ${showAllData ? 'table-cell' : 'none'}"><span class="week-tag">${weekDisplay}</span></td>
                <td title="${task.item}">${task.item || '---'}</td>
                <td>${task.hours || 0}h</td>
                <td>
                    ${task.acknowledged
                    ? '<span class="status-pill status-done">✓ Ack</span>'
                    : `<button class="btn-ack" data-row="${task.rowNumber}">Ack</button>`
                }
                </td>
            `;
            if (tableBody) tableBody.appendChild(tr);
        });

        if (tableBody) {
            tableBody.querySelectorAll('.btn-ack').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const target = e.target;
                    if (!(target instanceof HTMLElement)) return;

                    const rowNumber = target.getAttribute('data-row');
                    const task = allTasks.find(t => t.rowNumber == rowNumber);
                    if (task) {
                        await acknowledgeTask(task, target);
                    }
                });
            });
        }
    }

    async function acknowledgeTask(task, button) {
        if (typeof GAS_WEB_APP_URL === 'undefined') return;

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = '...';

        try {
            // We use mode: 'no-cors' because GAS redirects and doesn't support CORS easily
            await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'acknowledge',
                    rowNumber: task.rowNumber
                })
            });

            showToast('Task acknowledged!');
            task.acknowledged = true;
            renderTable(allTasks);

            // Re-fetch in background to ensure sync
            setTimeout(fetchTasks, 2000);
        } catch (error) {
            console.error('Ack error:', error);
            showToast('Failed to acknowledge', 'error');
            button.disabled = false;
            button.textContent = originalText || 'Ack';
        }
    }

    // --- Form Submission ---

    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (typeof GAS_WEB_APP_URL === 'undefined' || GAS_WEB_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
                showToast('Please set your GAS_WEB_APP_URL in index.html', 'error');
                return;
            }

            const typeEl = document.getElementById('type');
            const itemEl = document.getElementById('item');
            const hoursEl = document.getElementById('hours');

            const formData = {
                weekStart: weekStartInput instanceof HTMLInputElement ? weekStartInput.value : '',
                name: nameInput instanceof HTMLInputElement ? nameInput.value : '',
                type: (typeEl instanceof HTMLSelectElement) ? typeEl.value : '',
                item: (itemEl instanceof HTMLTextAreaElement) ? itemEl.value : '',
                hours: (hoursEl instanceof HTMLInputElement) ? hoursEl.value : 0
            };

            // Remember name
            if (formData.name) {
                localStorage.setItem('cui_user_name', formData.name);
            }

            submitBtn.classList.add('loading');

            try {
                await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors', // Essential for GAS
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                showToast('Task added successfully!');
                if (taskForm instanceof HTMLFormElement) taskForm.reset();

                // Re-default the date to today
                const now = new Date();
                if (weekStartInput instanceof HTMLInputElement) {
                    weekStartInput.value = now.toISOString().split('T')[0];
                    updateWeekDates(now);
                }

                // Refresh table
                setTimeout(fetchTasks, 1500);

            } catch (error) {
                console.error('Submit error:', error);
                showToast('Error submitting task', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });
    }

    // --- Search Logic ---

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLInputElement)) return;

            const term = target.value.toLowerCase();
            const filtered = allTasks.filter(task =>
                (task.name || '').toLowerCase().includes(term)
            );
            renderTable(filtered);
        });
    }

    // --- UI Helpers ---

    function showToast(message, type = 'success') {
        if (!toast || !toastMessage) return;
        toastMessage.textContent = message;
        toast.className = 'toast show';
        if (type === 'error') toast.classList.add('error');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    if (refreshBtn) refreshBtn.addEventListener('click', fetchTasks);

    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            showAllData = !showAllData;

            // Update button appearance
            const span = showAllBtn.querySelector('span');
            if (showAllData) {
                showAllBtn.classList.add('active');
                if (span) span.textContent = 'Show Selected Week';
            } else {
                showAllBtn.classList.remove('active');
                if (span) span.textContent = 'View All';
            }

            renderTable(allTasks);
        });
    }

    // Initial fetch
    fetchTasks();

    // Auto-refresh every 60 seconds
    setInterval(fetchTasks, 60000);
});
