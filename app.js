// ============================================
// DATA MANAGEMENT
// ============================================

// Your Running History Data
const testRunData = [
    { date: '2025-11-25', distance: 10.52, time: 3417, hr: 142, cadence: 175, elevation: null, notes: 'Easy recovery run' },
    { date: '2025-11-23', distance: 21.39, time: 6158, hr: 159, cadence: 176, elevation: null, notes: 'Half Marathon - Strong finish!' },
    { date: '2025-11-22', distance: 8.0, time: 2240, hr: 164, cadence: 174, elevation: null, notes: 'Tempo run' },
    { date: '2025-11-19', distance: 14.25, time: 4071, hr: 151, cadence: 173, elevation: null, notes: 'Long steady run' },
    { date: '2025-11-17', distance: 27.51, time: 8699, hr: 153, cadence: 170, elevation: null, notes: 'Ultra distance training - Amazing effort!' },
    { date: '2025-11-13', distance: 14.01, time: 3979, hr: 156, cadence: 172, elevation: null, notes: 'Steady pace run' },
    { date: '2025-11-11', distance: 10.02, time: 2926, hr: 151, cadence: 171, elevation: null, notes: 'Tempo run' },
    { date: '2025-11-10', distance: 7.0, time: 2604, hr: 135, cadence: 168, elevation: null, notes: 'Easy recovery' },
    { date: '2025-11-09', distance: 21.29, time: 6684, hr: 159, cadence: 169, elevation: null, notes: 'Half Marathon training' },
    { date: '2025-11-08', distance: 10.22, time: 3257, hr: 161, cadence: 161, elevation: null, notes: 'Steady run' },
    { date: '2025-11-06', distance: 12.31, time: 3608, hr: 157, cadence: 172, elevation: null, notes: 'Tempo run' },
    { date: '2025-11-03', distance: 16.82, time: 5130, hr: 159, cadence: 172, elevation: null, notes: 'Long run preparation' },
    { date: '2025-11-02', distance: 20.0, time: 5130, hr: 159, cadence: 172, elevation: null, notes: 'Long run preparation' },
];

let runHistory = JSON.parse(localStorage.getItem('runHistory')) || testRunData;

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

function saveData() {
    localStorage.setItem('runHistory', JSON.stringify(runHistory));
}

// ============================================
// NAVIGATION
// ============================================

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));

        link.classList.add('active');
        document.getElementById(`${tab}-section`).classList.add('active');

        if (tab === 'dashboard') initDashboard();
        if (tab === 'history') renderHistoryTable();
    });
});

document.querySelector('.view-all-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));

    document.querySelector('[data-tab="history"]').classList.add('active');
    document.getElementById('history-section').classList.add('active');
    renderHistoryTable();
});

// ============================================
// DASHBOARD
// ============================================

function initDashboard() {
    updateDashboardStats();
    renderRecentRuns();
    createWeeklyChart();
    createPaceChart();
}

function updateDashboardStats() {
    const totalRuns = runHistory.length;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyRuns = runHistory.filter(r => new Date(r.date) >= weekAgo);
    const weeklyVolume = weeklyRuns.reduce((sum, r) => sum + r.distance, 0);

    const avgPaceSeconds = runHistory.reduce((sum, r) => sum + (r.time / r.distance), 0) / runHistory.length;
    const avgHR = Math.round(runHistory.filter(r => r.hr).reduce((sum, r) => sum + r.hr, 0) / runHistory.filter(r => r.hr).length);

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
            <div class="run-date">${new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
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

function createWeeklyChart() {
    const canvas = document.getElementById('weekly-chart');
    const ctx = canvas.getContext('2d');

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

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeks.map(w => new Date(w).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Distance (km)',
                data: distances,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                borderRadius: 8
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

    const recentRuns = runHistory.slice(0, 10).reverse();
    const paces = recentRuns.map(r => (r.time / r.distance / 60).toFixed(2));

    new Chart(ctx, {
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
    const distance = parseFloat(document.getElementById('race-distance').value);
    const hours = parseInt(document.getElementById('race-hours').value) || 0;
    const minutes = parseInt(document.getElementById('race-minutes').value) || 0;
    const seconds = parseInt(document.getElementById('race-seconds').value) || 0;

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
    return estimatedTime / 60; // Return in seconds
}

function renderPaceZones(vdot) {
    const container = document.getElementById('pace-zones');

    const zones = [
        { name: 'Easy', class: 'zone-easy', desc: 'Conversational pace', multiplier: 0.70 },
        { name: 'Marathon', class: 'zone-marathon', desc: 'Race pace', multiplier: 0.84 },
        { name: 'Threshold', class: 'zone-threshold', desc: 'Comfortably hard', multiplier: 0.88 },
        { name: 'Interval', class: 'zone-interval', desc: '5K pace', multiplier: 0.98 },
        { name: 'Repetition', class: 'zone-repetition', desc: 'Fast bursts', multiplier: 1.0 }
    ];

    container.innerHTML = zones.map(zone => {
        const velocity = 29.54 + 5.000663 * vdot * zone.multiplier;
        const paceSeconds = 1000 / velocity * 60;
        const pace = formatPace(paceSeconds, 1);

        return `
            <div class="pace-zone ${zone.class}">
                <div class="zone-name">${zone.name}</div>
                <div class="zone-description">${zone.desc}</div>
                <div class="zone-pace">${pace}/km</div>
            </div>
        `;
    }).join('');
}

// ============================================
// HISTORY & ANALYTICS
// ============================================

document.getElementById('toggle-form-btn').addEventListener('click', () => {
    document.getElementById('run-form').classList.toggle('hidden');
});

document.getElementById('cancel-form-btn').addEventListener('click', () => {
    document.getElementById('run-form').classList.add('hidden');
});

document.getElementById('clear-all-btn').addEventListener('click', clearAllData);

function clearAllData() {
    const confirmMessage = `⚠️ WARNING: This will permanently delete ALL ${runHistory.length} runs from your history!\n\nThis action cannot be undone. Are you absolutely sure?`;

    if (confirm(confirmMessage)) {
        const doubleConfirm = confirm('Last chance! Click OK to permanently delete all data, or Cancel to keep it.');

        if (doubleConfirm) {
            runHistory = [];
            saveData();
            renderHistoryTable();

            if (document.getElementById('dashboard-section').classList.contains('active')) {
                initDashboard();
            }

            alert('✅ All run history has been cleared.');
        }
    }
}

document.getElementById('save-run-btn').addEventListener('click', saveNewRun);

function saveNewRun() {
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

    const newRun = { date, distance, time, hr, cadence, elevation, notes };
    runHistory.unshift(newRun);
    saveData();

    document.getElementById('run-form').classList.add('hidden');
    document.getElementById('run-date').value = '';
    document.getElementById('run-distance').value = '';
    document.getElementById('run-time-h').value = '';
    document.getElementById('run-time-m').value = '';
    document.getElementById('run-time-s').value = '';
    document.getElementById('run-hr').value = '';
    document.getElementById('run-cadence').value = '';
    document.getElementById('run-elevation').value = '';
    document.getElementById('run-notes').value = '';

    renderHistoryTable();
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;

    let filteredData = runHistory.filter(run =>
        run.notes.toLowerCase().includes(searchTerm) ||
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

    tbody.innerHTML = filteredData.map((run, index) => `
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
                    <button class="btn-icon" onclick="deleteRun(${runHistory.indexOf(run)})">
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

function deleteRun(index) {
    if (confirm('Are you sure you want to delete this run?')) {
        runHistory.splice(index, 1);
        saveData();
        renderHistoryTable();
        if (document.getElementById('dashboard-section').classList.contains('active')) {
            initDashboard();
        }
    }
}

document.getElementById('search-input').addEventListener('input', renderHistoryTable);
document.getElementById('sort-select').addEventListener('change', renderHistoryTable);

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    document.getElementById('run-date').valueAsDate = new Date();
});
