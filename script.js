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

    let allTasks = [];

    // --- Date Logic ---

    // Default to current week's Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    weekStartInput.value = monday.toISOString().split('T')[0];
    updateWeekDates(monday);

    function formatDateForDisplay(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    function updateWeekDates(startDate) {
        const start = new Date(startDate);
        const end = new Date(startDate);
        end.setDate(start.getDate() + 6);

        const formattedStart = formatDateForDisplay(start);
        const formattedEnd = formatDateForDisplay(end);

        weekEndDisplay.textContent = formattedEnd;
        currentWeekDisplay.textContent = `${formattedStart} – ${formattedEnd}`;
    }

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
                    submitted: row[5] || 'Existing'
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
        tableBody.innerHTML = '';
        itemCountDisplay.textContent = tasks.length;

        if (tasks.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="6">
                        <div class="empty-message">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M9 11l3 3L22 4"></path>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                            <p>No items yet.</p>
                            <p class="empty-subtext">Add your first task to get started!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tasks.forEach(task => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${task.name}</strong></td>
                <td><span class="badge">${task.type}</span></td>
                <td title="${task.item}">${task.item}</td>
                <td>${task.hours}h</td>
                <td style="color: var(--color-text-tertiary)">${task.submitted || 'Just now'}</td>
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

        const formData = {
            weekStart: weekStartInput.value,
            name: document.getElementById('name').value,
            type: document.getElementById('type').value,
            item: document.getElementById('item').value,
            hours: document.getElementById('hours').value
        };

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
            // Re-default the date
            weekStartInput.value = monday.toISOString().split('T')[0];
            updateWeekDates(monday);

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
        const term = e.target.value.toLowerCase();
        const filtered = allTasks.filter(task =>
            task.name.toLowerCase().includes(term) ||
            task.item.toLowerCase().includes(term) ||
            task.type.toLowerCase().includes(term)
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

    // Initial fetch
    fetchTasks();
});
