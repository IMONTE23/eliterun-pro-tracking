const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'DB', 'runs.json');
const RACES_DB_PATH = path.join(__dirname, 'DB', 'races.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from root

// Helper to read DB
const readDB = () => {
    if (!fs.existsSync(DB_PATH)) {
        return [];
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data || '[]');
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));
};

// Helper to read Races DB
const readRacesDB = () => {
    if (!fs.existsSync(RACES_DB_PATH)) {
        return [];
    }
    const data = fs.readFileSync(RACES_DB_PATH, 'utf8');
    return JSON.parse(data || '[]');
};

// Helper to write Races DB
const writeRacesDB = (data) => {
    fs.writeFileSync(RACES_DB_PATH, JSON.stringify(data, null, 4));
};

// API Routes

// GET all runs
app.get('/api/runs', (req, res) => {
    try {
        const runs = readDB();
        res.json(runs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// POST new run
app.post('/api/runs', (req, res) => {
    try {
        const newRun = req.body;
        const runs = readDB();
        runs.unshift(newRun); // Add to beginning
        writeDB(runs);
        res.status(201).json(newRun);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save run' });
    }
});

// PUT update run
app.put('/api/runs/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const updatedRun = req.body;
        const runs = readDB();

        if (index >= 0 && index < runs.length) {
            runs[index] = updatedRun;
            writeDB(runs);
            res.json(updatedRun);
        } else {
            res.status(404).json({ error: 'Run not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to update run' });
    }
});

// DELETE run
app.delete('/api/runs/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const runs = readDB();

        if (index >= 0 && index < runs.length) {
            const deleted = runs.splice(index, 1);
            writeDB(runs);
            res.json(deleted[0]);
        } else {
            res.status(404).json({ error: 'Run not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete run' });
    }
});

// ============================================
// RACES API ROUTES
// ============================================

// GET all races
app.get('/api/races', (req, res) => {
    try {
        const races = readRacesDB();
        res.json(races);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read races database' });
    }
});

// POST new race
app.post('/api/races', (req, res) => {
    try {
        const newRace = req.body;
        const races = readRacesDB();
        races.unshift(newRace); // Add to beginning
        writeRacesDB(races);
        res.status(201).json(newRace);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save race' });
    }
});

// PUT update race
app.put('/api/races/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const updatedRace = req.body;
        const races = readRacesDB();

        if (index >= 0 && index < races.length) {
            races[index] = updatedRace;
            writeRacesDB(races);
            res.json(updatedRace);
        } else {
            res.status(404).json({
                error: 'Race not found',
                debug: { receivedIndex: index, dbLength: races.length }
            });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to update race' });
    }
});

// DELETE race
app.delete('/api/races/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const races = readRacesDB();

        if (index >= 0 && index < races.length) {
            const deleted = races.splice(index, 1);
            writeRacesDB(races);
            res.json(deleted[0]);
        } else {
            res.status(404).json({
                error: 'Race not found',
                debug: { receivedIndex: index, dbLength: races.length }
            });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete race' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
