import matter from 'https://esm.sh/gray-matter';

// Variables for the live clock/countdown feature
let isClockMode = true;
let upcomingExamDate = null;
let upcomingExamName = '';
let timerInterval = null;

// This is our main function that runs when the page is ready
document.addEventListener('DOMContentLoaded', async () => {
    // These functions work on any page with the header
    displayWelcomeMessage();
    
    // Fetch exam data once and use it where needed
    const futureExams = await fetchAndProcessExams();
    if (futureExams && futureExams.length > 0) {
        // Find the most upcoming exam and store its details for the clock
        const upcomingExam = futureExams[0];
        upcomingExamDate = new Date(upcomingExam.date);
        upcomingExamName = upcomingExam.name;
        // Now that we have the data, setup the clock
        setupLiveTimeDisplay();
    }

    // These functions will only run if their HTML elements exist on the current page
    displayExamTimers(futureExams); 
    displayPerformanceData();
    initializeFileExplorer(futureExams); // This will only run on the editorials page
});

/**
 * Fetches and processes exam data, returning a sorted array of future exams.
 */
async function fetchAndProcessExams() {
    const apiUrl = 'https://kenshin.pythonanywhere.com/api/v1/exams';
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const exams = await response.json();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureExams = exams.map(exam => {
            const examDate = new Date(exam.date);
            const timeDiff = examDate.getTime() - today.getTime();
            const daysRemaining = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            return { ...exam, daysRemaining };
        }).filter(exam => exam.daysRemaining >= 0);
        
        return futureExams;
    } catch (error) {
        console.error('Failed to fetch and process exam data:', error);
        return null; // Return null on error
    }
}

/**
 * Displays the current date and a time-sensitive welcome message.
 */
function displayWelcomeMessage() {
    // Get the elements we need to update
    const dateElement = document.getElementById('current-date');
    const dividerElements = document.querySelectorAll('#welcome-message .divider');
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
    dividerElements.forEach(divider => divider.textContent = '|');

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



/**
 * Sets up the click listener and the one-second interval for the time display.
 */
function setupLiveTimeDisplay() {
    const timeElement = document.getElementById('time-display');
    if (!timeElement) return;

    // Add a click listener to toggle between clock and countdown
    timeElement.addEventListener('click', () => {
        isClockMode = !isClockMode; // Flip the mode
        updateTimeDisplay(); // Update immediately on click
    });

    // Clear any previous interval to prevent duplicates
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Start the timer that updates the display every second
    timerInterval = setInterval(updateTimeDisplay, 1000);
}

/**
 * This function runs every second to update the time display.
 * It shows either the current time or a countdown to the next exam.
 */
function updateTimeDisplay() {
    const timeElement = document.getElementById('time-display');
    if (!timeElement) return;
    
    const now = new Date();

    if (isClockMode) {
        // CLOCK MODE: Show current time in hh:mm:ss format
        timeElement.textContent = now.toLocaleTimeString('en-GB');

    } else {
        // COUNTDOWN MODE: Show time remaining to the next exam
        if (!upcomingExamDate) {
            timeElement.textContent = "No upcoming exam.";
            return;
        }

        const diff = upcomingExamDate.getTime() - now.getTime();

        if (diff <= 0) {
            timeElement.textContent = "Exam day is here!";
            return;
        }

        // Calculate days, hours, minutes, seconds
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Format the output string
        timeElement.textContent = `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} until ${upcomingExamName}`;
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

    // GUARD CLAUSE: If these elements don't exist on the page, exit the function.
    if (!scoresContainer || !chartCanvas) {
        return; // If these elements don't exist, stop.
    }

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

/**
 * Displays the main countdown blocks. Now accepts exam data as a parameter.
 * @param {Array} futureExams - The pre-fetched and processed array of future exams.
 */
function displayExamTimers(futureExams) {
    const upcomingContainer = document.getElementById('upcoming-exam-container');
    const othersContainer = document.getElementById('other-exams-container');

    // GUARD CLAUSE: If these elements don't exist on the page, exit the function.
    if (!upcomingContainer || !othersContainer) {
        return;
    }
    
    try {
        if (!futureExams || futureExams.length === 0) {
            upcomingContainer.innerHTML = '<p>No upcoming exams.</p>';
            return;
        }

        // Clear any previous content
        upcomingContainer.innerHTML = '';
        othersContainer.innerHTML = '';

        const upcomingExam = futureExams[0];
        const otherExams = futureExams.slice(1);

        const upcomingBlock = createExamBlock(upcomingExam, true);
        upcomingContainer.appendChild(upcomingBlock);

        otherExams.forEach(exam => {
            const examBlock = createExamBlock(exam, false);
            othersContainer.appendChild(examBlock);
        });

    } catch (error) {
        upcomingContainer.innerHTML = '<p style="color: red;">Could not load exam dates.</p>';
        console.error('Error displaying exam timers:', error);
    }
}

/**
 * Initializes the entire file explorer functionality for the editorials page.
 */
async function initializeFileExplorer(futureExams) {
    const explorerContainer = document.getElementById('file-explorer');
    if (!explorerContainer) return; // Only run on the editorials page

    const breadcrumb = document.getElementById('breadcrumb');
    const list = document.getElementById('explorer-list');

    // Clear the list and set a loading message
    list.innerHTML = '<li class="loading-message">Loading Editorials...</li>';

    let editorialsByDate = {}; // This will hold our organized data
    let allEditorials = [];
    let currentState = { level: 'years', year: null, month: null };

    // 1. Fetch and process the data into a nested structure
    async function fetchData() {
        const response = await fetch('https://kenshin.pythonanywhere.com/api/v1/notes/editorials');
        const editorials = await response.json();
        allEditorials = editorials;

        // Group editorials by year, then month, then day
        editorials.forEach(e => {
            const date = new Date(e.date);
            const year = date.getFullYear();
            const month = date.toLocaleString('en-GB', { month: 'long' });
            const day = date.getDate();

            if (!editorialsByDate[year]) editorialsByDate[year] = {};
            if (!editorialsByDate[year][month]) editorialsByDate[year][month] = {};
            if (!editorialsByDate[year][month][day]) editorialsByDate[year][month][day] = [];
            
            editorialsByDate[year][month][day].push(e);
        });
    }

    // 2. Functions to render the different levels of the explorer
    function render() {
        list.innerHTML = ''; // Clear the list
        

        // Render the correct level
        if (currentState.level === 'years') {
			breadcrumb.innerHTML = `<span class="crumb-active">🏠 Editorials</span>`;
            renderHomeStats(futureExams, allEditorials);
            Object.keys(editorialsByDate).sort((a, b) => b - a).forEach(year => { // Sort years descending
                const item = document.createElement('li');
                item.className = 'explorer-item';
                item.textContent = year;
                item.dataset.year = year;
                list.appendChild(item);
            });
		} else if (currentState.level === 'months') {
			breadcrumb.innerHTML = `
				<span class="crumb" data-level="years">🏠</span> 
				> <span class="crumb-active">${currentState.year}</span>`;
            Object.keys(editorialsByDate[currentState.year]).forEach(month => {
                const item = document.createElement('li');
                item.className = 'explorer-item';
                item.textContent = month;
                item.dataset.month = month;
                list.appendChild(item);
            });
		} else if (currentState.level === 'dates') {
			breadcrumb.innerHTML = `
				<span class="crumb" data-level="years">🏠</span> 
				> <span class="crumb" data-level="months">${currentState.year}</span> 
				> <span class="crumb-active">${currentState.month}</span>`;
            Object.keys(editorialsByDate[currentState.year][currentState.month]).sort((a,b) => a - b).forEach(day => { // Sort dates ascending
                const item = document.createElement('li');
                item.className = 'explorer-item';
                item.textContent = String(day).padStart(2, '0');
                item.dataset.day = day;
                list.appendChild(item);
            });
		}
    }

    // 3. Event listener to handle clicks
	list.addEventListener('click', (event) => {
		const target = event.target.closest('.explorer-item');
		if (!target) return;
	
		const { action, year, month, day } = target.dataset;
	
		if (action === 'back') {
			if (currentState.level === 'dates') {
				currentState.level = 'months';
				currentState.month = null;
			} else if (currentState.level === 'months') {
				currentState.level = 'years';
				currentState.year = null;
			}
			render(); // Re-render the list after navigating
		} else if (year) {
			currentState.level = 'months';
			currentState.year = year;
			render(); // Re-render the list after navigating
		} else if (month) {
			currentState.level = 'dates';
			currentState.month = month;
			render(); // Re-render the list after navigating
		} else if (day) {
			// This is the selection logic
			document.querySelectorAll('.explorer-item.selected').forEach(el => el.classList.remove('selected'));
			target.classList.add('selected');
			
			// Render the editorials on the right
			renderEditorialsForDay(day);
			// DO NOT re-render the list here
		}
	});

    breadcrumb.addEventListener('click', (event) => {
			const target = event.target.closest('.crumb');
			if (!target) return;
		
			const { level } = target.dataset;
		
			if (level === 'years') {
				currentState = { level: 'years', year: null, month: null };
                renderHomeStats(futureExams, allEditorials);
			} else if (level === 'months') {
				currentState.level = 'months';
				currentState.month = null;
			}
			
			// After changing state, re-render the explorer list and clear the content area
			render();
		});

    // Initial setup
    await fetchData();
    render(); // Initial render of the years

    // Add this new function inside initializeFileExplorer
    function renderEditorialsForDay(day) {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = ''; // Clear previous content

        const editorials = editorialsByDate[currentState.year][currentState.month][day];
        if (!editorials) return;

        editorials.forEach(e => {
            const item = document.createElement('div');
            item.className = 'editorial-item';

            const statusClass = e.is_read ? 'status-read' : 'status-unread';
            const statusText = e.is_read ? 'Read' : 'Unread';
            const toggleButtonText = e.is_read ? 'Mark as Unread' : 'Mark as Read';

            // Add data-doc-id to buttons
			item.innerHTML = `
				<div class="editorial-info">
					<p class="editorial-title">${e.original_filename.replaceAll('_', ' ').replace('.md', '')}</p>
					<div class="editorial-meta">
						<span>${new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
						<span class="status-dot ${statusClass}"></span>
						<span>${statusText}</span>
					</div>
				</div>
				<div class="editorial-actions">
					<button class="btn-view" data-doc-id="${e.id}" data-athena-id="${e.athena_id}">View</button>
					<button class="btn-toggle-read" data-doc-id="${e.id}" data-athena-id="${e.athena_id}">${toggleButtonText}</button>
				</div>
			`;
            contentArea.appendChild(item);
        });
    }

    	// ADD THIS NEW FUNCTION inside initializeFileExplorer
	function renderHomeStats(futureExams, allEditorials) {
		const contentArea = document.getElementById('content-area');
		contentArea.innerHTML = ''; // Clear previous content
	
		// 1. Calculate Total Days
		const prelimsExam = futureExams.find(e => e.id === 'pWySIJBI4yDC6v2YzLlD');
		const totalDaysAvailable = prelimsExam ? prelimsExam.daysRemaining : 0;
	
		// 2. Calculate Editorial Counts
		const totalEditorials = allEditorials.length;
		const unreadCount = allEditorials.filter(e => !e.is_read).length;
		const readCount = totalEditorials - unreadCount;
	
		// 3. Calculate Per Day Metric
		const perDayMetric = totalDaysAvailable > 0 ? (unreadCount / totalDaysAvailable).toFixed(1) : 0;
	
		// 4. Create the HTML and render it
		const statsHTML = `
			<div class="stats-grid">
				<div class="stat-card">
					<p class="stat-value">${totalDaysAvailable}</p>
					<p class="stat-label">Days to CSP</p>
				</div>
				<div class="stat-card">
					<p class="stat-value">${totalEditorials}</p>
					<p class="stat-label">Total Editorials</p>
				</div>
				<div class="stat-card">
					<p class="stat-value" style="color: #42b72a;">${readCount}</p>
					<p class="stat-label">Read</p>
				</div>
				<div class="stat-card">
					<p class="stat-value" style="color: #f02849;">${unreadCount}</p>
					<p class="stat-label">Unread</p>
				</div>
				<div class="stat-card">
					<p class="stat-value">${perDayMetric}</p>
					<p class="stat-label">Per Day Metric</p>
				</div>
			</div>
		`;
		contentArea.innerHTML = statsHTML;
	}

	const contentArea = document.getElementById('content-area');
	const modal = document.getElementById('editorial-modal');
	const modalTitle = document.getElementById('modal-title');
	const modalMeta = document.getElementById('modal-meta');
	const modalBody = document.getElementById('modal-body');
	
	// Event listener for all actions in the content area
	contentArea.addEventListener('click', async (event) => {
		const target = event.target;
	
		// --- VIEW BUTTON LOGIC ---
		if (target.classList.contains('btn-view')) {
			const docId = target.dataset.docId;
			
			// Show modal with a loading message
			modalTitle.textContent = 'Loading...';
			modalMeta.innerHTML = '';
			modalBody.innerHTML = '';
			modal.classList.add('visible');
	
			try {
				// 1. Get the temporary download link from our API
				const linkResponse = await fetch(`https://kenshin.pythonanywhere.com/api/v1/notes/editorials/${docId}/download-link`);
				const { download_url } = await linkResponse.json();
	
				// 2. Fetch the raw .md file content from the link
				const fileResponse = await fetch(download_url);
				const mdContent = await fileResponse.text();
	
				// 3. Parse the file content
				const { data, content } = matter(mdContent);
				const htmlContent = marked.parse(content); // from Marked.js library
	
				// 4. Populate and display the modal
				modalTitle.textContent = data.title || target.closest('.editorial-item').querySelector('.editorial-title').textContent;
				
				let metaHTML = '';
				if (data.subject) metaHTML += `<span><strong>Subject:</strong> ${data.subject}</span>`;
				if (data.source) metaHTML += `<span><strong>Source:</strong> ${data.source}</span>`;
				modalMeta.innerHTML = metaHTML;
				if (data.tags && Array.isArray(data.tags)) {
					data.tags.forEach(tag => modalMeta.innerHTML += `<span class="modal-tag">${tag}</span>`);
				}
				
				modalBody.innerHTML = htmlContent;
	
			} catch (error) {
				modalTitle.textContent = 'Error';
				modalBody.innerHTML = '<p>Could not load the editorial content. Please try again.</p>';
				console.error('Error viewing editorial:', error);
			}
		}
	
		// --- TOGGLE READ/UNREAD BUTTON LOGIC ---
		if (target.classList.contains('btn-toggle-read')) {
			const docId = target.dataset.docId;
			const athenaId = target.dataset.athenaId;
		
			// First, find the currently selected day in the explorer list
			const selectedDayElement = document.querySelector('#explorer-list .explorer-item.selected');
			if (!selectedDayElement) return; // Exit if no day is selected
		
			const day = selectedDayElement.dataset.day;
			
			// Now, find the specific editorial in our data using the IDs
			const editorialsForDay = editorialsByDate[currentState.year][currentState.month][day];
			if (!editorialsForDay) return;
			const itemToUpdate = editorialsForDay.find(e => e.id === docId);
			if (!itemToUpdate) return;
		
			// Proceed with the update
			const newStatus = !itemToUpdate.is_read;
		
			// API call to update the status in the database
			fetch(`https://kenshin.pythonanywhere.com/api/v1/notes/status/${athenaId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_read: newStatus })
			});
			
			// Update the item in our local data so the UI can refresh instantly
			itemToUpdate.is_read = newStatus;
			
			// Re-render the list to show the change
			renderEditorialsForDay(day);
		}
	});
	
	// Logic to close the modal
	modal.addEventListener('click', (event) => {
		// Close if the backdrop or the close button is clicked
		if (event.target.classList.contains('modal-backdrop') || event.target.classList.contains('modal-close-btn')) {
			modal.classList.remove('visible');
		}
	});
}