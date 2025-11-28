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
- **Data Persistence**: All data is saved locally in your browser

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Python 3.x (for running the local server)

### Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd pro-runner
   ```

### Running the Application

#### Option 1: Python HTTP Server (Recommended)
```bash
python -m http.server 8000
```
Then open your browser and navigate to `http://localhost:8000`

#### Option 2: Direct File Access
Simply open `index.html` directly in your browser. Note that some features may require a local server to avoid CORS issues.

#### Option 3: Using Node.js
If you have Node.js installed, you can use `http-server`:
```bash
npx http-server -p 8000
```

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

### Tracking Progress
- View your dashboard for an overview of your running metrics
- Check the charts to see your weekly distance and pace trends
- Use the History tab to filter and analyze your runs

## Technology Stack

- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with gradients, animations, and responsive design
- **JavaScript**: Vanilla JS for all functionality
- **Chart.js**: Interactive data visualizations
- **LocalStorage**: Client-side data persistence

## Project Structure

```
pro-runner/
├── index.html      # Main HTML file with app structure
├── styles.css      # All styling and animations
├── app.js          # Application logic and functionality
└── README.md       # This file
```

## Features in Detail

### Performance Calculations
- **VDOT Score**: Based on Jack Daniels' Running Formula for accurate fitness assessment
- **Riegel's Formula**: Uses a fatigue factor of 1.06 for road race predictions
- **Training Zones**: Automatically calculates Easy, Marathon, Threshold, Interval, and Repetition paces

### Data Management
- All data is stored locally in your browser's LocalStorage
- Export and clear functionality for data management
- No server required - completely client-side application

## Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Opera

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

This project is open source and available for personal use.

## Acknowledgments

- Race prediction algorithms based on established running science
- VDOT methodology from Jack Daniels' "Daniels' Running Formula"
- Chart visualizations powered by Chart.js

---

**Happy Running! 🏃‍♂️💨**
