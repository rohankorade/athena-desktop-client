document.addEventListener('DOMContentLoaded', () => {
    displayWelcomeMessage();
    displayExamTimers();
    displayPerformanceData();
});

/**
 * Displays the current date and a time-sensitive welcome message.
 */
function displayWelcomeMessage() {
    const dateElement = document.getElementById('current-date');
    const dividerElement = document.querySelector('#welcome-message .divider');
    const greetingElement = document.getElementById('greeting');
    
    const now = new Date();

    // 1. Get each part of the date individually
    const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const day = now.getDate();
    const month = now.toLocaleDateString('en-GB', { month: 'long' });
    const year = now.getFullYear();

    // 2. Build the final string with the comma exactly where we want it
    const formattedDate = `${weekday}, ${day} ${month} ${year}`;
    
    // 3. Set the text content
    dateElement.textContent = formattedDate;

    // 4. Set the divider
    dividerElement.textContent = '|';

    // 5. Determine and set the greeting
    const currentHour = now.getHours();
    let greeting;
    if (currentHour < 12) {
        greeting = 'Good Morning';
    } else if (currentHour < 18) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }
    greetingElement.textContent = greeting;
}

async function displayExamTimers() {
    const upcomingContainer = document.getElementById('upcoming-exam-container');
    const othersContainer = document.getElementById('other-exams-container');
    const apiUrl = 'https://kenshin.pythonanywhere.com/api/v1/exams';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const exams = await response.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Map exams to include days remaining and then filter out past exams
        const futureExams = exams.map(exam => {
            const examDate = new Date(exam.date);
            const timeDiff = examDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            return { ...exam, daysRemaining }; // Return a new object with the calculated days
        }).filter(exam => exam.daysRemaining >= 0);

        // Clear any previous content
        upcomingContainer.innerHTML = '';
        othersContainer.innerHTML = '';

        if (futureExams.length === 0) {
            upcomingContainer.innerHTML = '<p>No upcoming exams.</p>';
            return;
        }

        // 2. Separate the most upcoming exam from the rest
        const upcomingExam = futureExams[0];
        const otherExams = futureExams.slice(1);

        // 3. Create and display the block for the most upcoming exam
        const upcomingBlock = createExamBlock(upcomingExam, true);
        upcomingContainer.appendChild(upcomingBlock);

        // 4. Create and display blocks for all other exams
        otherExams.forEach(exam => {
            const examBlock = createExamBlock(exam, false);
            othersContainer.appendChild(examBlock);
        });

    } catch (error) {
        upcomingContainer.innerHTML = '<p style="color: red;">Could not load exam dates.</p>';
        console.error('Error fetching exam data:', error);
    }
}

/**
 * A helper function to create the HTML element for a single exam block.
 * @param {object} exam - The exam object from the API.
 * @param {boolean} isUpcoming - True if it's the main, large block.
 * @returns {HTMLElement} - The fully constructed div element for the exam block.
 */
function createExamBlock(exam, isUpcoming = false) {
    const examBlock = document.createElement('div');
    examBlock.className = 'exam-block';
    if (isUpcoming) {
        examBlock.classList.add('exam-block--upcoming');
    }

    const nameElement = document.createElement('p');
    nameElement.className = 'exam-name';
    nameElement.textContent = exam.name;

    const divider = document.createElement('hr');
    divider.className = 'exam-divider';

    const daysElement = document.createElement('p');
    daysElement.className = 'exam-days';
    daysElement.textContent = exam.daysRemaining;

    examBlock.appendChild(nameElement);
    examBlock.appendChild(divider);
    examBlock.appendChild(daysElement);

    return examBlock;
}

// Displays the performance data in a chart and a list of scores.
// This function fetches the data from the API and populates the UI accordingly.
async function displayPerformanceData() {
    const scoresContainer = document.getElementById('scores-list-container');
    const chartCanvas = document.getElementById('performance-chart');

    // In a real app, you would get this ID dynamically (e.g., from a dropdown)
    // For now, we'll use the one you provided.
    const seriesId = 'eSZtHFBepNOZaOABQx7I';
    const apiUrl = `https://kenshin.pythonanywhere.com/api/v1/mocks/${seriesId}/tests`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const tests = await response.json();

        // 1. Populate the list of scores on the left
        scoresContainer.innerHTML = ''; // Clear placeholder
        [...tests].reverse().forEach(test => {
            const scoreBlock = document.createElement('div');
            scoreBlock.className = 'score-block';
            scoreBlock.innerHTML = `
                <span class="score-block-name">${test.subject} (Test #${test['test-number']})</span>
                <span class="score-block-value">${test.score}</span>
            `;
            scoresContainer.appendChild(scoreBlock);
        });

        // 2. Prepare data and draw the chart on the right
        const labels = tests.map(test => new Date(test.date).toLocaleDateString('en-GB', {day:'numeric', month:'short'}));
        const scores = tests.map(test => test.score);

        new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Mock Score',
                    data: scores,
                    borderColor: '#4267B2', // A nice blue color
                    backgroundColor: 'rgba(66, 103, 178, 0.1)',
                    fill: true,
                    tension: 0.3, // Makes the line curve smoothly
                    pointBackgroundColor: '#4267B2',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Hides the legend label to keep it clean
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false, // Y-axis doesn't have to start at 0
                        ticks: {
                            padding: 10
                        }
                    },
                    x: {
                        ticks: {
                            padding: 10
                        }
                    }
                }
            }
        });

    } catch (error) {
        scoresContainer.innerHTML = `<p style="color: red;">Could not load performance data.</p>`;
        console.error("Error fetching performance data:", error);
    }
}