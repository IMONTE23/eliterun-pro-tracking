// ============================================
// DATA MANAGEMENT
// ============================================

let runHistory = [];
let editingIndex = -1; // Track which run is being edited

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(seconds, distance) {
    const pacePerKm = seconds / distance;
    const min = Math.floor(pacePerKm / 60);
    const sec = Math.round(pacePerKm % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
}

async function fetchRuns() {
    try {
        const response = await fetch('/api/runs');
        if (response.ok) {
            runHistory = await response.json();
            updateUI();
        } else {
            console.error('Failed to fetch runs');
        }
    } catch (error) {
        console.error('Error fetching runs:', error);
    }
}

function updateUI() {
    if (document.getElementById('dashboard-section').classList.contains('active')) {
        initDashboard();
    }
    if (document.getElementById('history-section').classList.contains('active')) {
        renderHistoryTable();
    }
}

// ============================================
// NAVIGATION
// ============================================

function switchTab(tabName) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));

    const link = document.querySelector(`[data-tab="${tabName}"]`);
    if (link) link.classList.add('active');

    const section = document.getElementById(`${tabName}-section`);
    if (section) section.classList.add('active');

    // Initialize tab-specific content
    if (tabName === 'dashboard') initDashboard();
    if (tabName === 'racing') initRacingDashboard();
    if (tabName === 'history') renderHistoryTable();
}

function handleHashChange() {
    const hash = window.location.hash.slice(1); // Remove the #
    const validTabs = ['dashboard', 'racing', 'predictions', 'history'];

    if (hash && validTabs.includes(hash)) {
        switchTab(hash);
    } else {
        // Default to dashboard if no valid hash
        switchTab('dashboard');
        window.location.hash = '#dashboard';
    }
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        window.location.hash = `#${tab}`;
        switchTab(tab);
    });
});

document.querySelector('.view-all-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#history';
    switchTab('history');
});

// ============================================
// DASHBOARD
// ============================================

function initDashboard() {
    updateDashboardStats();
    renderRecentRuns();
    createWeeklyChart();
    createPaceChart();
    updateDashboardPredictions();
}

function updateDashboardPredictions() {
    if (!runHistory || runHistory.length === 0) return;

    // Calculate VDOT for each run and find the max
    let maxVdot = 0;
    let maxVdotRun = null;

    runHistory.forEach(run => {
        if (run.distance > 0 && run.time > 0) {
            const vdot = calculateVDOT(run.distance, run.time);
            if (vdot > maxVdot) {
                maxVdot = vdot;
                maxVdotRun = run;
            }
        }
    });

    if (maxVdot > 0) {
        const date = new Date(maxVdotRun.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        document.getElementById('best-vdot-display').textContent = `(Best VDOT: ${Math.round(maxVdot)} from ${maxVdotRun.distance}km on ${date})`;
        document.getElementById('dashboard-10k').textContent = formatTime(Math.round(predictTimeFromVDOT(maxVdot, 10)));
        document.getElementById('dashboard-21k').textContent = formatTime(Math.round(predictTimeFromVDOT(maxVdot, 21.1)));
        document.getElementById('dashboard-42k').textContent = formatTime(Math.round(predictTimeFromVDOT(maxVdot, 42.2)));
    }
}

function updateDashboardStats() {
    const totalRuns = runHistory.length;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyRuns = runHistory.filter(r => new Date(r.date) >= weekAgo);
    const weeklyVolume = weeklyRuns.reduce((sum, r) => sum + r.distance, 0);

    const avgPaceSeconds = runHistory.length > 0 ? runHistory.reduce((sum, r) => sum + (r.time / r.distance), 0) / runHistory.length : 0;
    const runsWithHr = runHistory.filter(r => r.hr);
    const avgHR = runsWithHr.length > 0 ? Math.round(runsWithHr.reduce((sum, r) => sum + r.hr, 0) / runsWithHr.length) : 0;

    document.getElementById('total-runs').textContent = totalRuns;
    document.getElementById('weekly-volume').textContent = `${weeklyVolume.toFixed(1)} km`;
    document.getElementById('avg-pace').textContent = formatPace(avgPaceSeconds, 1);
    document.getElementById('avg-hr').textContent = `${avgHR} bpm`;
}

function renderRecentRuns() {
    const recentRuns = runHistory.slice(0, 5);
    const container = document.getElementById('recent-runs-list');

    container.innerHTML = recentRuns.map(run => `
        <div class="run-item">
            <div class="run-date">${new Date(run.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div class="run-details">
                <h4>${run.distance} km</h4>
                <div class="run-stats">
                    <span>⏱️ ${formatTime(run.time)}</span>
                    <span>⚡ ${formatPace(run.time, run.distance)}/km</span>
                    ${run.hr ? `<span>❤️ ${run.hr} bpm</span>` : ''}
                </div>
            </div>
            <div class="run-badge">${run.notes || 'Run'}</div>
        </div>
    `).join('');
}

let weeklyChartInstance = null;
let paceChartInstance = null;

function createWeeklyChart() {
    const canvas = document.getElementById('weekly-chart');
    const ctx = canvas.getContext('2d');

    if (weeklyChartInstance) {
        weeklyChartInstance.destroy();
    }

    // Aggregate by week
    const weeklyData = {};
    runHistory.forEach(run => {
        const date = new Date(run.date);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + run.distance;
    });

    const weeks = Object.keys(weeklyData).sort().slice(-8);
    const distances = weeks.map(w => weeklyData[w]);

    // Calculate Average
    const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;
    const avgData = Array(distances.length).fill(avgDistance);

    weeklyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeks.map(w => new Date(w).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Distance (km)',
                data: distances,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                borderRadius: 8,
                order: 2
            }, {
                label: 'Average',
                data: avgData,
                type: 'line',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
                order: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

function createPaceChart() {
    const canvas = document.getElementById('pace-chart');
    const ctx = canvas.getContext('2d');

    if (paceChartInstance) {
        paceChartInstance.destroy();
    }

    const recentRuns = runHistory.slice(0, 10).reverse();
    const paces = recentRuns.map(r => r.time / r.distance / 60);

    // Calculate Average
    const avgPace = paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : 0;
    const avgData = Array(paces.length).fill(avgPace);

    paceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: recentRuns.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Pace (min/km)',
                data: paces,
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(168, 85, 247, 1)'
            }, {
                label: 'Average',
                data: avgData,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    reverse: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================
// RACE PREDICTIONS
// ============================================

document.getElementById('calculate-btn').addEventListener('click', calculatePredictions);

function calculatePredictions() {
    // Use querySelector to target inputs specifically in the calculator card to avoid ID conflicts
    const distanceInput = document.querySelector('.calculator-card #race-distance');
    const hoursInput = document.querySelector('.calculator-card #race-hours');
    const minutesInput = document.querySelector('.calculator-card #race-minutes');
    const secondsInput = document.querySelector('.calculator-card #race-seconds');

    const distance = parseFloat(distanceInput ? distanceInput.value : 0);
    const hours = parseInt(hoursInput ? hoursInput.value : 0) || 0;
    const minutes = parseInt(minutesInput ? minutesInput.value : 0) || 0;
    const seconds = parseInt(secondsInput ? secondsInput.value : 0) || 0;

    if (!distance || distance <= 0) {
        alert('Please enter a valid distance');
        return;
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds <= 0) {
        alert('Please enter a valid time');
        return;
    }

    // Riegel's Formula: T2 = T1 * (D2/D1)^1.06
    const riegel10k = calculateRiegel(distance, totalSeconds, 10);
    const riegel21k = calculateRiegel(distance, totalSeconds, 21.1);
    const riegel42k = calculateRiegel(distance, totalSeconds, 42.2);

    document.getElementById('riegel-10k').textContent = formatTime(Math.round(riegel10k));
    document.getElementById('riegel-21k').textContent = formatTime(Math.round(riegel21k));
    document.getElementById('riegel-42k').textContent = formatTime(Math.round(riegel42k));

    // VDOT
    const vdot = calculateVDOT(distance, totalSeconds);
    document.getElementById('vdot-score').textContent = Math.round(vdot);

    document.getElementById('vdot-10k').textContent = formatTime(Math.round(predictTimeFromVDOT(vdot, 10)));
    document.getElementById('vdot-21k').textContent = formatTime(Math.round(predictTimeFromVDOT(vdot, 21.1)));
    document.getElementById('vdot-42k').textContent = formatTime(Math.round(predictTimeFromVDOT(vdot, 42.2)));

    renderPaceZones(vdot);
}

function calculateRiegel(d1, t1, d2) {
    return t1 * Math.pow(d2 / d1, 1.06);
}

function calculateVDOT(distance, timeSeconds) {
    const velocity = (distance * 1000) / timeSeconds * 60; // m/min
    const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity;
    const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeSeconds / 60) + 0.2989558 * Math.exp(-0.1932605 * timeSeconds / 60);
    return vo2 / percentMax;
}

function predictTimeFromVDOT(vdot, distance) {
    // Simplified VDOT prediction (approximation)
    let estimatedTime;
    if (distance <= 5) {
        estimatedTime = distance * 1000 / (29.54 + 5.000663 * vdot - 0.007546 * vdot * vdot);
    } else if (distance <= 15) {
        estimatedTime = distance * 1000 / (27.61 + 4.734 * vdot - 0.00665 * vdot * vdot);
    } else {
        estimatedTime = distance * 1000 / (26.01 + 4.527 * vdot - 0.00591 * vdot * vdot);
    }
    return estimatedTime * 60; // Return in seconds
}

function renderPaceZones(vdot) {
    const container = document.getElementById('pace-zones');

    const zones = [
        { name: 'Easy', class: 'zone-easy', desc: 'Conversational pace', multiplier: 0.70 },
        { name: 'Marathon', class: 'zone-marathon', desc: 'Race pace', multiplier: 0.84 },
        { name: 'Threshold', class: 'zone-threshold', desc: 'Comfortably hard', multiplier: 0.88, showIntervals: true },
        { name: 'Interval', class: 'zone-interval', desc: '5K pace', multiplier: 0.98, showIntervals: true },
        { name: 'Repetition', class: 'zone-repetition', desc: 'Fast bursts', multiplier: 1.0, showIntervals: true }
    ];

    const intervalDistances = [1200, 800, 600, 400, 300, 200];

    container.innerHTML = zones.map(zone => {
        const velocity = 29.54 + 5.000663 * vdot * zone.multiplier;
        const paceSeconds = 1000 / velocity * 60;
        const pace = formatPace(paceSeconds, 1);

        let intervalsHtml = '';
        if (zone.showIntervals) {
            const intervals = intervalDistances.map(dist => {
                const timeSeconds = paceSeconds * (dist / 1000);
                const m = Math.floor(timeSeconds / 60);
                const s = Math.round(timeSeconds % 60);
                const shortTime = `${m}:${String(s).padStart(2, '0')}`;

                return `<div class="interval-item"><span>${dist}m</span><strong>${shortTime}</strong></div>`;
            }).join('');

            intervalsHtml = `<div class="zone-intervals">${intervals}</div>`;
        }

        return `
            <div class="pace-zone ${zone.class} ${zone.showIntervals ? 'has-intervals' : ''}">
                <div class="zone-header">
                    <div class="zone-name">${zone.name}</div>
                    <div class="zone-description">${zone.desc}</div>
                </div>
                <div class="zone-main-pace">
                    <span class="label">Pace:</span>
                    <span class="value">${pace}/km</span>
                </div>
                ${intervalsHtml}
            </div>
        `;
    }).join('');
}

// ============================================
// HISTORY & ANALYTICS
// ============================================

document.getElementById('toggle-form-btn').addEventListener('click', () => {
    resetForm();
    document.getElementById('run-form').classList.toggle('hidden');
});

document.getElementById('cancel-form-btn').addEventListener('click', () => {
    document.getElementById('run-form').classList.add('hidden');
    resetForm();
});

function resetForm() {
    editingIndex = -1;
    document.getElementById('save-run-btn').textContent = 'Save Run';
    document.querySelector('#run-form h3').textContent = 'Add New Run';

    if (document.getElementById('run-date')._flatpickr) {
        document.getElementById('run-date')._flatpickr.setDate(new Date());
    } else {
        document.getElementById('run-date').valueAsDate = new Date();
    }
    document.getElementById('run-distance').value = '';
    document.getElementById('run-time-h').value = '';
    document.getElementById('run-time-m').value = '';
    document.getElementById('run-time-s').value = '';
    document.getElementById('run-hr').value = '';
    document.getElementById('run-cadence').value = '';
    document.getElementById('run-elevation').value = '';
    document.getElementById('run-notes').value = '';
}

// Dashboard form controls
document.getElementById('dashboard-toggle-form-btn').addEventListener('click', () => {
    resetDashboardForm();
    document.getElementById('dashboard-run-form').classList.toggle('hidden');
});

document.getElementById('dashboard-cancel-form-btn').addEventListener('click', () => {
    document.getElementById('dashboard-run-form').classList.add('hidden');
    resetDashboardForm();
});

document.getElementById('dashboard-save-run-btn').addEventListener('click', saveDashboardRun);

function resetDashboardForm() {
    if (document.getElementById('dashboard-run-date')._flatpickr) {
        document.getElementById('dashboard-run-date')._flatpickr.setDate(new Date());
    } else {
        document.getElementById('dashboard-run-date').valueAsDate = new Date();
    }
    document.getElementById('dashboard-run-distance').value = '';
    document.getElementById('dashboard-run-time-h').value = '';
    document.getElementById('dashboard-run-time-m').value = '';
    document.getElementById('dashboard-run-time-s').value = '';
    document.getElementById('dashboard-run-hr').value = '';
    document.getElementById('dashboard-run-cadence').value = '';
    document.getElementById('dashboard-run-elevation').value = '';
    document.getElementById('dashboard-run-notes').value = '';
}

async function saveDashboardRun() {
    const date = document.getElementById('dashboard-run-date').value;
    const distance = parseFloat(document.getElementById('dashboard-run-distance').value);
    const hours = parseInt(document.getElementById('dashboard-run-time-h').value) || 0;
    const minutes = parseInt(document.getElementById('dashboard-run-time-m').value) || 0;
    const seconds = parseInt(document.getElementById('dashboard-run-time-s').value) || 0;
    const hr = parseInt(document.getElementById('dashboard-run-hr').value) || null;
    const cadence = parseInt(document.getElementById('dashboard-run-cadence').value) || null;
    const elevation = parseInt(document.getElementById('dashboard-run-elevation').value) || null;
    const notes = document.getElementById('dashboard-run-notes').value;

    if (!date || !distance || distance <= 0) {
        alert('Please fill in date and distance');
        return;
    }

    const time = hours * 3600 + minutes * 60 + seconds;
    if (time <= 0) {
        alert('Please enter a valid time');
        return;
    }

    const runData = { date, distance, time, hr, cadence, elevation, notes };

    try {
        const response = await fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(runData)
        });

        if (response.ok) {
            await fetchRuns(); // Refresh data
            document.getElementById('dashboard-run-form').classList.add('hidden');
            resetDashboardForm();
        } else {
            alert('Failed to save run');
        }
    } catch (error) {
        console.error('Error saving run:', error);
        alert('Error saving run');
    }
}


document.getElementById('clear-all-btn').addEventListener('click', async () => {
    const confirmMessage = `⚠️ WARNING: This will permanently delete ALL ${runHistory.length} runs from your history!\n\nThis action cannot be undone. Are you absolutely sure?`;

    if (confirm(confirmMessage)) {

        alert('Bulk delete not implemented in this version to prevent accidental data loss.');
    }
});

document.getElementById('save-run-btn').addEventListener('click', saveRun);

async function saveRun() {
    const date = document.getElementById('run-date').value;
    const distance = parseFloat(document.getElementById('run-distance').value);
    const hours = parseInt(document.getElementById('run-time-h').value) || 0;
    const minutes = parseInt(document.getElementById('run-time-m').value) || 0;
    const seconds = parseInt(document.getElementById('run-time-s').value) || 0;
    const hr = parseInt(document.getElementById('run-hr').value) || null;
    const cadence = parseInt(document.getElementById('run-cadence').value) || null;
    const elevation = parseInt(document.getElementById('run-elevation').value) || null;
    const notes = document.getElementById('run-notes').value;

    if (!date || !distance || distance <= 0) {
        alert('Please fill in date and distance');
        return;
    }

    const time = hours * 3600 + minutes * 60 + seconds;
    if (time <= 0) {
        alert('Please enter a valid time');
        return;
    }

    const runData = { date, distance, time, hr, cadence, elevation, notes };

    try {
        let response;
        if (editingIndex >= 0) {
            // Update existing run
            response = await fetch(`/api/runs/${editingIndex}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(runData)
            });
        } else {
            // Create new run
            response = await fetch('/api/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(runData)
            });
        }

        if (response.ok) {
            await fetchRuns(); // Refresh data
            document.getElementById('run-form').classList.add('hidden');
            resetForm();
        } else {
            alert('Failed to save run');
        }
    } catch (error) {
        console.error('Error saving run:', error);
        alert('Error saving run');
    }
}

window.editRun = function (index) {
    const run = runHistory[index];
    if (!run) return;

    editingIndex = index;

    // Populate form
    if (document.getElementById('run-date')._flatpickr) {
        document.getElementById('run-date')._flatpickr.setDate(run.date);
    } else {
        document.getElementById('run-date').value = run.date;
    }
    document.getElementById('run-distance').value = run.distance;

    const h = Math.floor(run.time / 3600);
    const m = Math.floor((run.time % 3600) / 60);
    const s = run.time % 60;

    document.getElementById('run-time-h').value = h || '';
    document.getElementById('run-time-m').value = m || '';
    document.getElementById('run-time-s').value = s || '';

    document.getElementById('run-hr').value = run.hr || '';
    document.getElementById('run-cadence').value = run.cadence || '';
    document.getElementById('run-elevation').value = run.elevation || '';
    document.getElementById('run-notes').value = run.notes || '';

    // Update UI state
    document.getElementById('save-run-btn').textContent = 'Update Run';
    document.querySelector('#run-form h3').textContent = 'Edit Run';
    document.getElementById('run-form').classList.remove('hidden');

    // Scroll to form
    document.getElementById('run-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteRun = async function (index) {
    if (confirm('Are you sure you want to delete this run?')) {
        try {
            const response = await fetch(`/api/runs/${index}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchRuns();
            } else {
                alert('Failed to delete run');
            }
        } catch (error) {
            console.error('Error deleting run:', error);
            alert('Error deleting run');
        }
    }
};

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;

    // Create a copy with original indices to preserve them during sort/filter
    let indexedData = runHistory.map((run, index) => ({ ...run, originalIndex: index }));

    let filteredData = indexedData.filter(run =>
        (run.notes || '').toLowerCase().includes(searchTerm) ||
        run.date.includes(searchTerm) ||
        run.distance.toString().includes(searchTerm)
    );

    // Sort
    filteredData.sort((a, b) => {
        switch (sortBy) {
            case 'date-desc': return new Date(b.date) - new Date(a.date);
            case 'date-asc': return new Date(a.date) - new Date(b.date);
            case 'distance-desc': return b.distance - a.distance;
            case 'distance-asc': return a.distance - b.distance;
            case 'pace-asc': return (a.time / a.distance) - (b.time / b.distance);
            case 'pace-desc': return (b.time / b.distance) - (a.time / a.distance);
            default: return 0;
        }
    });

    tbody.innerHTML = filteredData.map(run => `
        <tr>
            <td>${new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td>${run.distance.toFixed(1)}</td>
            <td>${formatTime(run.time)}</td>
            <td>${formatPace(run.time, run.distance)}</td>
            <td>${run.hr || '-'}</td>
            <td>${run.cadence || '-'}</td>
            <td>${run.elevation || '-'}</td>
            <td>${run.notes || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="editRun(${run.originalIndex})" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="deleteRun(${run.originalIndex})" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

document.getElementById('search-input').addEventListener('input', renderHistoryTable);
document.getElementById('sort-select').addEventListener('change', renderHistoryTable);

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Flatpickr
    const flatpickrConfig = {
        dateFormat: "Y-m-d", // Value format (ISO)
        altInput: true,
        altFormat: "d/m/Y", // Display format
        defaultDate: "today"
    };

    flatpickr("#run-date", flatpickrConfig);
    flatpickr("#dashboard-run-date", flatpickrConfig);
    flatpickr("#race-date", flatpickrConfig);

    fetchRuns();

    // Handle hash navigation on page load
    handleHashChange();
});

// Listen for hash changes (browser back/forward button)
window.addEventListener('hashchange', handleHashChange);
