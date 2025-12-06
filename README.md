# Pro Runner - Advanced Running Analytics

A professional running analytics dashboard that helps runners track their performance, predict race times, and optimize their training.

## Features

### 📊 Dashboard
- **Performance Metrics**: Track total runs, weekly volume, average pace, and heart rate
- **Visual Analytics**: Interactive charts showing weekly distance and pace progression
- **Recent Activity**: Quick view of your most recent runs

### 🎯 Race Time Predictions
- **Riegel's Formula**: Predict race times based on a recent race result
- **VDOT Calculator**: Calculate your VDOT score using Jack Daniels' Running Formula
- **Training Pace Zones**: Get recommended paces for different training intensities

### 📈 History & Analytics
- **Run Tracking**: Add and manage all your running data
- **Detailed Metrics**: Track distance, time, pace, heart rate, cadence, and elevation
- **Advanced Filtering**: Search and sort your runs by various criteria
- **Data Persistence**: All data is saved to a local JSON database

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher recommended)

### Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd (PATH) eliterun-pro-tracking
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the server:
   ```bash
   npm start
   ```
   
   Or for development (with auto-reload):
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

## Usage

### Adding Your First Run
1. Navigate to the **History & Analytics** tab
2. Click **Add New Run**
3. Fill in your run details (date, distance, time, etc.)
4. Click **Save Run**

### Predicting Race Times
1. Go to the **Race Predictions** tab
2. Enter a recent race result (distance and time)
3. Click **Calculate Predictions**
4. View your predicted times for 10K, Half Marathon, and Marathon distances

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend**: Node.js, Express
- **Database**: Local JSON file system (`DB/runs.json`)

## Project Structure

```
pro-runner/
├── DB/
│   └── runs.json   # Database file
├── index.html      # Main HTML file
├── styles.css      # Styling
├── app.js          # Frontend logic
├── server.js       # Backend server & API
└── README.md       # This file
```

## License

This project is open source and available for personal use.
