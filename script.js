document.addEventListener('DOMContentLoaded', () => {
    displayWelcomeMessage();
    displayExamTimers();
});

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