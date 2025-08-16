// This function runs when the HTML document has been fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    displayWelcomeMessage();
    displayExamTimers();
});

/**
 * Displays a time-sensitive welcome message.
 */
function displayWelcomeMessage() {
    const welcomeElement = document.getElementById('welcome-message');
    const currentHour = new Date().getHours();

    let greeting;
    if (currentHour < 12) {
        greeting = 'Good morning';
    } else if (currentHour < 18) {
        greeting = 'Good afternoon';
    } else {
        greeting = 'Good evening';
    }
    welcomeElement.textContent = `${greeting}.`;
}

/**
 * Fetches exam data from the API and displays countdown timers.
 */
async function displayExamTimers() {
    const timersContainer = document.getElementById('exam-timers-container');
    const apiUrl = 'https://kenshin.pythonanywhere.com/api/v1/exams';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const exams = await response.json();

        // Clear any placeholder content
        timersContainer.innerHTML = '';

        // Get today's date (at the start of the day for accurate comparison)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        exams.forEach(exam => {
            const examDate = new Date(exam.date);
            // Calculate the difference in milliseconds
            const timeDiff = examDate.getTime() - today.getTime();
            // Convert milliseconds to days and round up
            const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            // Create the HTML elements for the timer card
            const timerCard = document.createElement('div');
            timerCard.className = 'timer-card';

            const examNameElement = document.createElement('span');
            examNameElement.className = 'timer-exam-name';
            examNameElement.textContent = exam.name;

            const daysElement = document.createElement('span');
            daysElement.className = 'timer-days';
            daysElement.textContent = daysRemaining;
            
            // Add the elements to the card and the card to the container
            timerCard.appendChild(examNameElement);
            timerCard.appendChild(daysElement);
            timersContainer.appendChild(timerCard);
        });

    } catch (error) {
        timersContainer.innerHTML = '<p style="color: red;">Could not load exam dates.</p>';
        console.error('Error fetching exam data:', error);
    }
}