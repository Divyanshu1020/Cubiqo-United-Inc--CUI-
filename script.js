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

        weekEndDisplay.textContent = formattedEnd;
        currentWeekDisplay.innerHTML = `
            <span class="live-pulse" style="display: ${isCurrentWeek ? 'inline-block' : 'none'}"></span>
            ${formattedStart} – ${formattedEnd} 
            ${isCurrentWeek ? '<span class="current-label">Live</span>' : ''}
        `;

        // Filter table after updating week
        if (allTasks.length > 0) {
            renderTable(allTasks);
        }
    }

    // Default to current date (Today)
    const today = new Date();
    weekStartInput.value = today.toISOString().split('T')[0];
    updateWeekDates(today);

    weekStartInput.addEventListener('change', (e) => {
        if (e.target.value) {
            updateWeekDates(e.target.value);
        }
    });

    // --- Data Management ---

    async function fetchTasks() {
        if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL')) {
            showToast('Please set your GAS_WEB_APP_URL in index.html', 'error');
            return;
        }

        refreshBtn.classList.add('loading');
        try {
            const response = await fetch(GAS_WEB_APP_URL);
            const data = await response.json();

            // Handle the empty sheet case [[""]] or empty arrays
            if (!data || data.length === 0 || (data.length === 1 && data[0][0] === "")) {
                allTasks = [];
                renderTable([]);
                return;
            }

            // If we have data, assume row 0 is headers and slice it
            if (data.length > 1) {
                allTasks = data.slice(1).map(row => ({
                    weekStart: row[0] || '',
                    name: row[1] || 'Unknown',
                    type: row[2] || 'Task',
                    item: row[3] || '',
                    hours: row[4] || 0,
                    // submitted: row[5] || 'Existing'
                }));
            } else {
                // Only one row - might be data or just headers
                allTasks = [];
            }

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
        if (!showAllData) {
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

        tableBody.innerHTML = '';
        itemCountDisplay.textContent = filteredTasks.length;

        if (filteredTasks.length === 0) {
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
            return;
        }

        filteredTasks.forEach(task => {
            const tr = document.createElement('tr');

            // Format week start for display
            let weekDisplay = '---';
            if (task.weekStart) {
                try {
                    const d = new Date(task.weekStart);
                    // Use 'short' month for better clarity (e.g., Jan 12)
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
                    <button class="btn-refresh" style="padding: 4px 8px; font-size: 10px;">Ack</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    

    // --- Form Submission ---

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (GAS_WEB_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
            showToast('Please set your GAS_WEB_APP_URL in index.html', 'error');
            return;
        }

        const typeEl = document.getElementById('type');
        const itemEl = document.getElementById('item');
        const hoursEl = document.getElementById('hours');

        const formData = {
            weekStart: weekStartInput.value,
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
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Essential for GAS
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            // Since mode is 'no-cors', we won't get a proper JSON response body, 
            // but we can assume success if no error is thrown
            showToast('Task added successfully!');
            taskForm.reset();
            // Re-default the date to today
            const now = new Date();
            weekStartInput.value = now.toISOString().split('T')[0];
            updateWeekDates(now);

            // Refresh table
            setTimeout(fetchTasks, 1500);

        } catch (error) {
            console.error('Submit error:', error);
            showToast('Error submitting task', 'error');
        } finally {
            submitBtn.classList.remove('loading');
        }
    });

    // --- Search Logic ---

    searchInput.addEventListener('input', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;

        const term = target.value.toLowerCase();
        const filtered = allTasks.filter(task =>
            (task.name || '').toLowerCase().includes(term)
            // (task.item || '').toLowerCase().includes(term) ||
            // (task.type || '').toLowerCase().includes(term)
        );
        renderTable(filtered);
    });

    // --- UI Helpers ---

    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = 'toast show';
        if (type === 'error') toast.classList.add('error');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    refreshBtn.addEventListener('click', fetchTasks);

    showAllBtn.addEventListener('click', () => {
        showAllData = !showAllData;

        // Update button appearance
        if (showAllData) {
            showAllBtn.classList.add('active');
            showAllBtn.querySelector('span').textContent = 'Show Selected Week';
        } else {
            showAllBtn.classList.remove('active');
            showAllBtn.querySelector('span').textContent = 'View All';
        }

        renderTable(allTasks);
    });

    // Initial fetch
    fetchTasks();

    // Auto-refresh every 60 seconds
    setInterval(fetchTasks, 60000);
});
