// ============================================
// RACING DASHBOARD - DATA MANAGEMENT
// ============================================

let raceHistory = [];
let editingRaceIndex = -1;
let selectedRaceDistance = 5; // Default: 5km

// Chart instances
let racingFinishTimeChart = null;
let racingPaceChart = null;
let racingHRChart = null;
let racingCadenceChart = null;

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

// ============================================
// RACING DASHBOARD - DATA FUNCTIONS
// ============================================

async function fetchRaces() {
    try {
        const response = await fetch(`/api/races?t=${new Date().getTime()}`);
        if (response.ok) {
            raceHistory = await response.json();
            updateRacingUI();
        } else {
            console.error('Failed to fetch races');
        }
    } catch (error) {
        console.error('Error fetching races:', error);
    }
}

function updateRacingUI() {
    if (document.getElementById('racing-section') && document.getElementById('racing-section').classList.contains('active')) {
        renderRacingCharts(selectedRaceDistance);
        renderRaceList(selectedRaceDistance);
    }
}

// ============================================
// RACING DASHBOARD - DISTANCE FILTERING
// ============================================

function filterRacesByDistance(targetDistance) {
    let tolerance;
    if (targetDistance === 5) tolerance = 0.5;
    else if (targetDistance === 10) tolerance = 1;
    else if (targetDistance === 21.1) tolerance = 1;
    else if (targetDistance === 42.195) tolerance = 1;
    else tolerance = 1;

    return raceHistory.filter(race =>
        Math.abs(race.distance - targetDistance) <= tolerance
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ============================================
// RACING DASHBOARD - FORECASTING
// ============================================

function calculateForecast(dataPoints, periods = 1) {
    if (dataPoints.length < 2) return [];

    // Simple linear regression
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    dataPoints.forEach((point, index) => {
        sumX += index;
        sumY += point;
        sumXY += index * point;
        sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let i = 1; i <= periods; i++) {
        forecast.push(slope * (n - 1 + i) + intercept);
    }

    return forecast;
}

function calculateVDOTForecast(races, targetDistance) {
    if (races.length === 0) return null;

    // Calculate VDOT for each race
    let totalVDOT = 0;
    let validCount = 0;

    // Use only the latest 3 races for forecast
    const recentRaces = races.slice(-3);

    recentRaces.forEach(race => {
        if (typeof calculateVDOT === 'function') {
            const vdot = calculateVDOT(race.distance, race.time);
            if (vdot > 0) {
                totalVDOT += vdot;
                validCount++;
            }
        }
    });

    if (validCount === 0) return null;

    const avgVDOT = totalVDOT / validCount;

    // Predict time for the target distance using Average VDOT
    if (typeof predictTimeFromVDOT === 'function') {
        return predictTimeFromVDOT(avgVDOT, targetDistance); // Returns seconds
    }

    return null;
}

// ============================================
// RACING DASHBOARD - CHARTS
// ============================================

function renderRacingCharts(distance) {
    console.log('Updating charts for distance:', distance);
    const races = filterRacesByDistance(distance);

    createRacingFinishTimeChart(races, distance);
    createRacingPaceChart(races, distance);
    createRacingHRChart(races);
    createRacingCadenceChart(races);
}

function createRacingFinishTimeChart(races, distance) {
    const canvas = document.getElementById('racing-finish-time-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (racingFinishTimeChart) {
        racingFinishTimeChart.destroy();
    }

    const times = races.map(r => r.time / 60); // Convert to minutes
    const labels = races.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }));

    // Calculate Average
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const avgData = Array(times.length).fill(avgTime);

    // Forecast using VDOT
    const predictedSeconds = calculateVDOTForecast(races, distance);
    const forecastValue = predictedSeconds ? predictedSeconds / 60 : null; // Convert to minutes
    const forecastLabel = 'Forecast';

    const chartLabels = forecastValue ? [...labels, forecastLabel] : labels;
    const chartData = [...times, null];
    const forecastData = forecastValue ? [...Array(times.length).fill(null), forecastValue] : [];
    const avgChartData = forecastValue ? [...avgData, avgTime] : avgData;

    racingFinishTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Actual Time',
                data: chartData,
                borderColor: 'rgba(99, 102, 241, 1)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)'
            }, {
                label: 'Average',
                data: avgChartData,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }, ...(forecastValue ? [{
                label: 'Forecast',
                data: forecastData,
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 6,
                pointBackgroundColor: 'rgba(168, 85, 247, 1)'
            }] : [])]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, labels: { color: '#94a3b8' } },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const minutes = context.parsed.y;
                            const h = Math.floor(minutes / 60);
                            const m = Math.floor(minutes % 60);
                            const s = Math.round((minutes % 1) * 60);
                            return `${context.dataset.label}: ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            const h = Math.floor(value / 60);
                            const m = Math.round(value % 60);
                            return `${h}:${String(m).padStart(2, '0')}`;
                        }
                    },
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

function createRacingPaceChart(races, distance) {
    const canvas = document.getElementById('racing-pace-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (racingPaceChart) {
        racingPaceChart.destroy();
    }

    const paces = races.map(r => (r.time / r.distance / 60)); // min/km
    const labels = races.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }));

    // Calculate Average
    const avgPace = paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : 0;
    const avgData = Array(paces.length).fill(avgPace);

    // Forecast using VDOT
    const predictedSeconds = calculateVDOTForecast(races, distance);
    const predictedPace = predictedSeconds ? (predictedSeconds / distance / 60) : null; // min/km
    const forecastLabel = 'Forecast';

    const chartLabels = predictedPace ? [...labels, forecastLabel] : labels;
    const chartData = [...paces, null];
    const forecastData = predictedPace ? [...Array(paces.length).fill(null), predictedPace] : [];
    const avgChartData = predictedPace ? [...avgData, avgPace] : avgData;

    racingPaceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Actual Pace',
                data: chartData,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: 'rgba(16, 185, 129, 1)'
            }, {
                label: 'Average',
                data: avgChartData,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }, ...(predictedPace ? [{
                label: 'Forecast',
                data: forecastData,
                borderColor: 'rgba(20, 184, 166, 1)',
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 6,
                pointBackgroundColor: 'rgba(20, 184, 166, 1)'
            }] : [])]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, labels: { color: '#94a3b8' } },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const pace = context.parsed.y;
                            const min = Math.floor(pace);
                            const sec = Math.round((pace % 1) * 60);
                            return `${context.dataset.label}: ${min}:${String(sec).padStart(2, '0')}/km`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    reverse: true,
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            const min = Math.floor(value);
                            const sec = Math.round((value % 1) * 60);
                            return `${min}:${String(sec).padStart(2, '0')}`;
                        }
                    },
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

function createRacingHRChart(races) {
    const canvas = document.getElementById('racing-hr-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (racingHRChart) {
        racingHRChart.destroy();
    }

    const racesWithHR = races.filter(r => r.hr);
    const hrs = racesWithHR.map(r => r.hr);
    const labels = racesWithHR.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }));

    // Calculate Average
    const avgHR = hrs.length > 0 ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
    const avgData = Array(hrs.length).fill(avgHR);

    // Forecast
    const forecast = hrs.length >= 2 ? calculateForecast(hrs, 1) : [];
    const forecastLabel = 'Forecast';

    const chartLabels = forecast.length > 0 ? [...labels, forecastLabel] : labels;
    const avgChartData = forecast.length > 0 ? [...avgData, avgHR] : avgData;

    racingHRChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Actual HR',
                data: [...hrs, null],
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: 'rgba(239, 68, 68, 1)'
            }, {
                label: 'Average',
                data: avgChartData,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }, ...(forecast.length > 0 ? [{
                label: 'Forecast',
                data: [...Array(hrs.length).fill(null), forecast[0]],
                borderColor: 'rgba(245, 158, 11, 1)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 6,
                pointBackgroundColor: 'rgba(245, 158, 11, 1)'
            }] : [])]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, labels: { color: '#94a3b8' } }
            },
            scales: {
                y: {
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

function createRacingCadenceChart(races) {
    const canvas = document.getElementById('racing-cadence-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (racingCadenceChart) {
        racingCadenceChart.destroy();
    }

    const racesWithCadence = races.filter(r => r.cadence);
    const cadences = racesWithCadence.map(r => r.cadence);
    const labels = racesWithCadence.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }));

    // Calculate Average
    const avgCadence = cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : 0;
    const avgData = Array(cadences.length).fill(avgCadence);

    // Forecast
    const forecast = cadences.length >= 2 ? calculateForecast(cadences, 1) : [];
    const forecastLabel = 'Forecast';

    const chartLabels = forecast.length > 0 ? [...labels, forecastLabel] : labels;
    const avgChartData = forecast.length > 0 ? [...avgData, avgCadence] : avgData;

    racingCadenceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Actual Cadence',
                data: [...cadences, null],
                borderColor: 'rgba(249, 115, 22, 1)',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: 'rgba(249, 115, 22, 1)'
            }, {
                label: 'Average',
                data: avgChartData,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }, ...(forecast.length > 0 ? [{
                label: 'Forecast',
                data: [...Array(cadences.length).fill(null), forecast[0]],
                borderColor: 'rgba(234, 179, 8, 1)',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 6,
                pointBackgroundColor: 'rgba(234, 179, 8, 1)'
            }] : [])]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, labels: { color: '#94a3b8' } }
            },
            scales: {
                y: {
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
// RACING DASHBOARD - RACE LIST
// ============================================

function renderRaceList(distance) {
    // Get races and sort by date descending (latest first) for the list
    const races = filterRacesByDistance(distance).reverse();
    const container = document.getElementById('race-list');
    const countElement = document.getElementById('race-count');

    if (!container) return;

    if (countElement) {
        countElement.textContent = `${races.length} race${races.length !== 1 ? 's' : ''}`;
    }

    if (races.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #64748b;">No races found for this distance. Add your first race!</p>';
        return;
    }

    container.innerHTML = races.map((race, index) => {
        const originalIndex = raceHistory.indexOf(race);
        const date = new Date(race.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const time = formatTime(race.time);
        const pace = formatPace(race.time, race.distance);

        return `
            <div class="race-item">
                <div class="race-main">
                    <div class="race-name">${race.raceName || 'Race'}</div>
                    <div class="race-date">${date}</div>
                </div>
                <div class="race-stats">
                    <div class="race-stat">
                        <span class="stat-label">Distance</span>
                        <span class="stat-value">${race.distance.toFixed(2)} km</span>
                    </div>
                    <div class="race-stat">
                        <span class="stat-label">Time</span>
                        <span class="stat-value">${time}</span>
                    </div>
                    <div class="race-stat">
                        <span class="stat-label">Pace</span>
                        <span class="stat-value">${pace}/km</span>
                    </div>
                    ${race.hr ? `
                    <div class="race-stat">
                        <span class="stat-label">Avg HR</span>
                        <span class="stat-value">${race.hr} bpm</span>
                    </div>
                    ` : ''}
                    ${race.cadence ? `
                    <div class="race-stat">
                        <span class="stat-label">Cadence</span>
                        <span class="stat-value">${race.cadence} spm</span>
                    </div>
                    ` : ''}
                </div>
                ${race.notes ? `<div class="race-notes">${race.notes}</div>` : ''}
                <div class="race-actions">
                    <button class="btn-icon" onclick="editRaceEntry(${originalIndex})" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="removeRaceEntry(${originalIndex})" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// RACING DASHBOARD - CRUD OPERATIONS
// ============================================

function resetRaceForm() {
    editingRaceIndex = -1;
    const formTitle = document.getElementById('race-form-title');
    if (formTitle) formTitle.textContent = 'Add New Race';

    const saveBtn = document.getElementById('save-race-btn');
    if (saveBtn) saveBtn.textContent = 'Save Race';

    const dateInput = document.getElementById('race-date');
    if (dateInput) {
        if (dateInput._flatpickr) {
            dateInput._flatpickr.setDate(new Date());
        } else {
            dateInput.valueAsDate = new Date();
        }
    }

    ['race-name', 'race-type', 'race-distance', 'race-time-h', 'race-time-m', 'race-time-s', 'race-hr', 'race-cadence', 'race-notes'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });

    // Pre-fill distance based on selected filter
    const distanceInput = document.getElementById('race-distance');
    if (distanceInput) distanceInput.value = selectedRaceDistance;
}

async function saveRace() {
    const raceName = document.getElementById('race-name').value;
    const date = document.getElementById('race-date').value;
    const raceType = document.getElementById('race-type').value;
    const distance = parseFloat(document.getElementById('race-distance').value);
    const hours = parseInt(document.getElementById('race-time-h').value) || 0;
    const minutes = parseInt(document.getElementById('race-time-m').value) || 0;
    const seconds = parseInt(document.getElementById('race-time-s').value) || 0;
    const hr = parseInt(document.getElementById('race-hr').value) || null;
    const cadence = parseInt(document.getElementById('race-cadence').value) || null;
    const notes = document.getElementById('race-notes').value;

    if (!raceName || !date || !raceType || !distance || distance <= 0) {
        alert('Please fill in race name, date, race type, and distance');
        return;
    }

    const time = hours * 3600 + minutes * 60 + seconds;
    if (time <= 0) {
        alert('Please enter a valid time');
        return;
    }

    const pace = time / distance; // pace in seconds per km
    const raceData = { raceName, date, distance, raceType, time, hr, cadence, pace, notes };

    try {
        let response;
        if (editingRaceIndex >= 0) {
            response = await fetch(`/api/races/${editingRaceIndex}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(raceData)
            });
        } else {
            response = await fetch('/api/races', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(raceData)
            });
        }

        if (response.ok) {
            await fetchRaces();
            const form = document.getElementById('race-form');
            if (form) form.classList.add('hidden');
            resetRaceForm();
        } else {
            alert('Failed to save race');
        }
    } catch (error) {
        console.error('Error saving race:', error);
        alert('Error saving race');
    }
}

window.editRaceEntry = function (index) {
    console.log('Editing race index:', index);
    const race = raceHistory[index];
    if (!race) return;

    editingRaceIndex = index;

    document.getElementById('race-name').value = race.raceName || '';
    const dateInput = document.getElementById('race-date');
    if (dateInput._flatpickr) {
        dateInput._flatpickr.setDate(race.date);
    } else {
        dateInput.value = race.date;
    }
    document.getElementById('race-type').value = race.raceType || '';
    document.getElementById('race-distance').value = race.distance;

    const h = Math.floor(race.time / 3600);
    const m = Math.floor((race.time % 3600) / 60);
    const s = race.time % 60;

    document.getElementById('race-time-h').value = h || '';
    document.getElementById('race-time-m').value = m || '';
    document.getElementById('race-time-s').value = s || '';
    document.getElementById('race-hr').value = race.hr || '';
    document.getElementById('race-cadence').value = race.cadence || '';
    document.getElementById('race-notes').value = race.notes || '';

    document.getElementById('race-form-title').textContent = 'Edit Race';
    document.getElementById('save-race-btn').textContent = 'Update Race';
    document.getElementById('race-form').classList.remove('hidden');

    document.getElementById('race-form').scrollIntoView({ behavior: 'smooth' });
};

window.removeRaceEntry = async function (index) {
    console.log('Requesting delete for index:', index);
    console.log('Current raceHistory length:', raceHistory.length);
    if (confirm('Are you sure you want to delete this race?')) {
        try {
            const response = await fetch(`/api/races/${index}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchRaces();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Delete failed:', response.status, errorData);
                const debugInfo = errorData.debug ? ` (Index: ${errorData.debug.receivedIndex}, Length: ${errorData.debug.dbLength})` : '';
                alert(`Failed to delete race: ${errorData.error || response.statusText}${debugInfo}`);
            }
        } catch (error) {
            console.error('Error deleting race:', error);
            alert('Error deleting race');
        }
    }
};

// ============================================
// RACING DASHBOARD - INITIALIZATION
// ============================================

function initRacingDashboard() {
    fetchRaces();

    // Distance filter buttons
    document.querySelectorAll('.distance-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedRaceDistance = parseFloat(btn.dataset.distance);

            // Update active state
            document.querySelectorAll('.distance-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update UI
            renderRacingCharts(selectedRaceDistance);
            renderRaceList(selectedRaceDistance);

            // Pre-fill distance in form
            const distanceInput = document.getElementById('race-distance');
            if (distanceInput) distanceInput.value = selectedRaceDistance;
        });
    });

    // Form controls
    const toggleBtn = document.getElementById('toggle-race-form-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            resetRaceForm();
            document.getElementById('race-form').classList.toggle('hidden');
        });
    }

    const cancelBtn = document.getElementById('cancel-race-form-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('race-form').classList.add('hidden');
            resetRaceForm();
        });
    }

    const saveBtn = document.getElementById('save-race-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveRace);
    }
}
