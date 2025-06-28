// script.js

document.addEventListener('DOMContentLoaded', () => {
    const paragraphsContainer = document.getElementById('paragraphs-container');
    const addParagraphBtn = document.getElementById('addParagraphBtn');
    const exportPresentationBtn = document.getElementById('exportPresentationBtn');
    const clearAllBtn = document.getElementById('clearAllBtn'); // Get the clear all button

    const metaInfoFields = {
        articleTitle: document.getElementById('articleTitle'),
        subtitle: document.getElementById('subtitle'),
        instructorName: document.getElementById('instructorName'),
        contactInfo: document.getElementById('contactInfo'),
        date: document.getElementById('date'),
        location: document.getElementById('location'),
    };

    let paragraphIdCounter = 0; // To uniquely identify paragraphs

    // Helper to create input elements
    function createTextInput(name, placeholder = '', value = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = name;
        input.placeholder = placeholder;
        input.value = value;
        return input;
    }

    function createTextArea(name, placeholder = '', value = '') {
        const textarea = document.createElement('textarea');
        textarea.name = name;
        textarea.placeholder = placeholder;
        textarea.value = value;
        return textarea;
    }

    // Function to add a new explanation input set
    function addExplanation(explanationContainer, targetText = '', explanationText = '') {
        const explanationItem = document.createElement('div');
        explanationItem.className = 'explanation-item';
        explanationItem.innerHTML = `
            <button type="button" class="remove-explanation-btn">&times;</button>
            <div class="form-group">
                <label>Target Text (word, phrase, or sentence):</label>
                ${createTextInput('targetText', 'e.g., "photosynthesis"', targetText).outerHTML}
            </div>
            <div class="form-group">
                <label>Explanation:</label>
                ${createTextArea('explanation', 'e.g., The process by which green plants...', explanationText).outerHTML}
            </div>
        `;
        explanationContainer.appendChild(explanationItem);
    }

    // Function to add a new paragraph section
    function addParagraphSection(paragraphText = '', explanations = []) {
        paragraphIdCounter++;
        const paragraphSection = document.createElement('div');
        paragraphSection.className = 'section paragraph-section';
        paragraphSection.dataset.paragraphId = paragraphIdCounter;
        paragraphSection.innerHTML = `
            <button type="button" class="remove-paragraph-btn" data-paragraph-id="${paragraphIdCounter}">&times;</button>
            <h3>Paragraph ${paragraphIdCounter}</h3>
            <div class="form-group">
                <label for="paragraphText_${paragraphIdCounter}">Paragraph Text:</label>
                ${createTextArea(`paragraphText_${paragraphIdCounter}`, 'Paste your paragraph here...', paragraphText).outerHTML}
            </div>
            <h4>Explanations for this Paragraph:</h4>
            <div class="explanations-list">
                <!-- Explanations will be added here -->
            </div>
            <button type="button" class="button add-explanation-btn" data-paragraph-id="${paragraphIdCounter}">Add Explanation</button>
        `;
        paragraphsContainer.appendChild(paragraphSection);

        const explanationsList = paragraphSection.querySelector('.explanations-list');
        explanations.forEach(exp => addExplanation(explanationsList, exp.target, exp.explanation));
    }

    // --- Local Storage Functions ---

    function saveToLocalStorage() {
        const data = collectPresentationData();
        localStorage.setItem('eslPresentationData', JSON.stringify(data));
    }

    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('eslPresentationData');
        if (savedData) {
            const data = JSON.parse(savedData);

            // Populate meta info
            for (const key in metaInfoFields) {
                if (metaInfoFields[key] && data.meta[key]) {
                    metaInfoFields[key].value = data.meta[key];
                }
            }

            // Clear existing dynamic content before loading
            paragraphsContainer.innerHTML = '';
            paragraphIdCounter = 0; // Reset counter before re-adding

            // Populate paragraphs and explanations
            if (data.paragraphs && data.paragraphs.length > 0) {
                data.paragraphs.forEach(p => addParagraphSection(p.text, p.explanations));
            } else {
                addParagraphSection(); // Add one default if no paragraphs saved
            }
        } else {
            addParagraphSection(); // Add one default if no data in local storage
        }
    }

    function clearAllData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.removeItem('eslPresentationData');
            // Clear meta info fields
            for (const key in metaInfoFields) {
                if (metaInfoFields[key]) {
                    metaInfoFields[key].value = '';
                }
            }
            // Clear all paragraphs and add one default
            paragraphsContainer.innerHTML = '';
            paragraphIdCounter = 0; // Reset counter
            addParagraphSection();
            alert('All data cleared!');
        }
    }

    // Initial load from local storage
    loadFromLocalStorage();

    // Event Listeners for adding/removing paragraphs and explanations (delegated)
    addParagraphBtn.addEventListener('click', () => {
        addParagraphSection();
        saveToLocalStorage(); // Save after adding a paragraph
    });

    clearAllBtn.addEventListener('click', clearAllData); // Add event listener for clear all button

    paragraphsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-paragraph-btn')) {
            const paragraphSection = event.target.closest('.paragraph-section');
            if (paragraphSection) {
                paragraphSection.remove();
                saveToLocalStorage(); // Save after removing a paragraph
            }
        } else if (event.target.classList.contains('add-explanation-btn')) {
            const paragraphSection = event.target.closest('.paragraph-section');
            if (paragraphSection) {
                const explanationsList = paragraphSection.querySelector('.explanations-list');
                addExplanation(explanationsList);
                saveToLocalStorage(); // Save after adding an explanation
            }
        } else if (event.target.classList.contains('remove-explanation-btn')) {
            const explanationItem = event.target.closest('.explanation-item');
            if (explanationItem) {
                explanationItem.remove();
                saveToLocalStorage(); // Save after removing an explanation
            }
        }
    });

    // Save to local storage on any input change in the form
    document.querySelector('.container').addEventListener('input', (event) => {
        // Only save if the input is within a form group and not the export button
        if (event.target.closest('.form-group') || event.target.classList.contains('paragraph-section')) {
            saveToLocalStorage();
        }
    });

    exportPresentationBtn.addEventListener('click', () => {
        const presentationData = collectPresentationData();
        const htmlContent = generatePresentationHtml(presentationData);
        downloadHtmlFile(htmlContent, 'esl_presentation.html');
    });

    function collectPresentationData() {
        const data = {
            meta: {
                title: metaInfoFields.articleTitle.value,
                subtitle: metaInfoFields.subtitle.value,
                instructorName: metaInfoFields.instructorName.value,
                contactInfo: metaInfoFields.contactInfo.value,
                date: metaInfoFields.date.value,
                location: metaInfoFields.location.value,
            },
            paragraphs: []
        };

        document.querySelectorAll('.paragraph-section').forEach(paragraphSection => {
            const paragraphText = paragraphSection.querySelector('textarea[name^="paragraphText_"]').value.trim();
            const explanations = [];
            paragraphSection.querySelectorAll('.explanation-item').forEach(explanationItem => {
                const target = explanationItem.querySelector('input[name="targetText"]').value.trim();
                const explanation = explanationItem.querySelector('textarea[name="explanation"]').value.trim();
                if (target && explanation) { // Only include explanations with both target and explanation
                    explanations.push({ target, explanation });
                }
            });
            if (paragraphText) { // Only include paragraphs with text
                data.paragraphs.push({
                    text: paragraphText,
                    explanations: explanations
                });
            }
        });
        return data;
    }

    // Utility function to escape HTML for data attributes and content
    function escapeHtml(text) {
        if (typeof text !== 'string') return text; // Handle non-string inputs
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Function to highlight target text within a paragraph using a robust placeholder strategy
    function highlightTextInParagraph(paragraphText, explanations) {
        let tempParagraph = paragraphText;
        const processedExplanations = []; // Store targets and explanations with their original casing

        // Sort explanations by target text length in descending order to handle overlapping phrases
        const sortedExplanations = [...explanations].sort((a, b) => b.target.length - a.target.length);

        sortedExplanations.forEach((exp, index) => {
            const target = exp.target;
            const explanation = exp.explanation;

            if (!target) return;

            // Use a regex to find all occurrences of the target text (case-insensitive)
            // \b for word boundaries if needed for whole words, but for phrases, direct match.
            // Escape special regex characters in the target string.
            const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedTarget})`, 'gi'); // Capture the matched text

            tempParagraph = tempParagraph.replace(regex, (match) => {
                // Store the original matched text (preserving case) and explanation
                processedExplanations.push({ originalMatch: match, explanation: explanation });
                // Replace with a unique placeholder, storing index for later lookup
                return `__HIGHLIGHT_PLACEHOLDER_${processedExplanations.length - 1}__`;
            });
        });

        // Now replace placeholders with the actual HTML spans
        let finalParagraph = tempParagraph;
        processedExplanations.forEach((item, index) => {
            const placeholder = `__HIGHLIGHT_PLACEHOLDER_${index}__`;
            const highlightedSpan = `<span class="highlighted-text" data-target="${escapeHtml(item.originalMatch)}" data-explanation="${escapeHtml(item.explanation)}">${escapeHtml(item.originalMatch)}</span>`;
            // Use a regex to replace all occurrences of the specific placeholder
            finalParagraph = finalParagraph.split(placeholder).join(highlightedSpan);
        });

        return finalParagraph;
    }

    function generatePresentationHtml(data) {
        let slidesHtml = '';

        // First Page Slide
        slidesHtml += `
            <div class="slide">
                <div class="slide-content">
                    <h1>${escapeHtml(data.meta.title || 'Untitled Presentation')}</h1>
                    ${data.meta.subtitle ? `<p class="subtitle">${escapeHtml(data.meta.subtitle)}</p>` : ''}
                    <ul class="meta-list">
                        ${data.meta.instructorName ? `<li><strong>Instructor:</strong> ${escapeHtml(data.meta.instructorName)}</li>` : ''}
                        ${data.meta.contactInfo ? `<li><strong>Contact:</strong> ${escapeHtml(data.meta.contactInfo)}</li>` : ''}
                        ${data.meta.date ? `<li><strong>Date:</strong> ${escapeHtml(data.meta.date)}</li>` : ''}
                        ${data.meta.location ? `<li><strong>Location:</strong> ${escapeHtml(data.meta.location)}</li>` : ''}
                    </ul>
                </div>
            </div>
        `;

        // Content Slides
        data.paragraphs.forEach((paragraph, index) => {
            const processedParagraphHtml = highlightTextInParagraph(paragraph.text, paragraph.explanations);
            slidesHtml += `
                <div class="slide content-slide">
                    <div class="slide-content paragraph-slide-content">
                        <h2>Paragraph ${index + 1}</h2>
                        <p class="main-paragraph">${processedParagraphHtml}</p>
                    </div>
                </div>
            `;
        });

        // Final Page Slide
        slidesHtml += `
            <div class="slide final-slide">
                <div class="slide-content">
                    <h1>Thank You!</h1>
                    <p class="question-prompt">Please feel free to ask any questions.</p>
                    ${data.meta.instructorName ? `<p><strong>Instructor:</strong> ${escapeHtml(data.meta.instructorName)}</p>` : ''}
                    ${data.meta.contactInfo ? `<p><strong>Contact:</strong> ${escapeHtml(data.meta.contactInfo)}</p>` : ''}
                </div>
            </div>
        `;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(data.meta.title || 'ESL Presentation')}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100vh;
            background-color: #f0f2f5;
            color: #333;
        }
        #presentation-container {
            flex-grow: 1;
            position: relative;
            width: 100%;
            height: 100%;
        }
        .slide {
            display: none;
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 50px;
            box-sizing: border-box;
            background-color: #ffffff;
            transition: opacity 0.5s ease-in-out;
            opacity: 0;
            flex-direction: column;
        }
        .slide.active {
            display: flex;
            opacity: 1;
        }
        .slide-content {
            max-width: 900px;
            width: 100%;
            padding: 20px;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .slide h1 {
            color: #2c3e50;
            font-size: 3em;
            margin-bottom: 20px;
        }
        .slide h2 {
            color: #34495e;
            font-size: 2.2em;
            margin-bottom: 15px;
        }
        .slide p {
            font-size: 1.4em;
            line-height: 1.6;
            color: #555;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 1.8em;
            color: #7f8c8d;
        }
        .meta-list {
            list-style: none;
            padding: 0;
            margin-top: 30px;
            font-size: 1.2em;
            color: #666;
        }
        .meta-list li {
            margin-bottom: 10px;
        }
        .main-paragraph {
            text-align: left;
            white-space: pre-wrap; /* Preserve line breaks from textarea */
        }

        /* Navigation buttons */
        .navigation {
            position: fixed;
            bottom: 20px;
            width: 100%;
            text-align: center;
            z-index: 99;
        }
        .navigation button {
            padding: 12px 25px;
            margin: 0 10px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.2em;
            transition: background-color 0.3s ease, transform 0.2s ease;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .navigation button:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
        }
        .navigation button:active {
            transform: translateY(0);
        }
        .navigation button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
            box-shadow: none;
        }

        /* Explanation Modal */
        .explanation-modal {
            display: none;
            position: fixed;
            z-index: 1000; /* High z-index to be on top */
            left: 0; top: 0;
            width: 100%; height: 100%;
            background-color: rgba(0,0,0,0.6); /* Darker overlay */
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px); /* Optional: blur background */
        }
        .modal-content {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            position: relative;
            animation: fadeInScale 0.3s ease-out;
            text-align: left; /* Align text within modal */
        }
        .modal-content h3 {
            color: #3498db;
            margin-top: 0;
            font-size: 1.8em;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .modal-content p {
            font-size: 1.2em;
            line-height: 1.5;
            color: #444;
        }
        .close-button {
            color: #aaa;
            font-size: 36px;
            font-weight: bold;
            cursor: pointer;
            position: absolute;
            top: 10px;
            right: 20px;
            line-height: 1;
            transition: color 0.2s ease;
        }
        .close-button:hover,
        .close-button:focus {
            color: #333;
        }

        /* Highlighted text styling */
        .highlighted-text {
            cursor: pointer;
            text-decoration: underline dotted #3498db;
            color: #3498db;
            font-weight: bold;
            transition: color 0.2s ease, text-decoration-color 0.2s ease;
        }
        .highlighted-text:hover {
            color: #2980b9;
            text-decoration-color: #2980b9;
        }

        /* Animations */
        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        /* Footer styles for exported HTML - Minimalist bottom-left */
        .site-footer {
            background-color: transparent; /* Make background transparent */
            color: #7f8c8d; /* Subtle color */
            padding: 0; /* Remove padding */
            margin-top: 0; /* Remove margin */
            text-align: left; /* Align text to left */
            font-size: 0.7em; /* Smaller font size */
            width: auto; /* Adjust width to content */
            flex-shrink: 0;
            position: fixed; /* Fixed position */
            bottom: 10px; /* 10px from bottom */
            left: 10px; /* 10px from left */
            z-index: 100; /* Ensure it's above other content but below modal */
        }

        .site-footer .footer-content {
            max-width: none; /* Remove max-width constraint */
            margin: 0; /* Remove margin */
            padding: 0; /* Remove padding */
        }

        .site-footer p {
            font-size: 1em; /* Keep paragraph font size relative to footer font size */
            line-height: 1.2;
            margin: 0; /* Remove default paragraph margin */
        }

        .site-footer a {
            color: #7f8c8d; /* Subtle link color */
            text-decoration: none;
        }

        .site-footer a:hover {
            color: #2c3e50; /* Slightly darker on hover */
        }

        .site-footer .separator {
            margin: 0 5px; /* Smaller separator margin */
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div id="presentation-container">
        ${slidesHtml}
    </div>
    <div class="navigation">
        <button id="prev-slide">Previous</button>
        <button id="next-slide">Next</button>
    </div>
    <div id="explanationModal" class="explanation-modal">
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h3 id="modalTargetText"></h3>
            <p id="modalExplanation"></p>
        </div>
    </div>
    <footer class="site-footer">
        <div class="footer-content">
            <p>
                Created with <a href="https://app.aaronshi.cc/simple-presentation-maker/" target="_blank" rel="noopener noreferrer">Simple Presentation Maker</a>
                <span class="separator">|</span>
                <a href="https://app.aaronshi.cc" target="_blank" rel="noopener noreferrer">Visit AaronShi.cc App</a>
            </p>
        </div>
    </footer>

    <script>
        let currentSlideIndex = 0;
        const slides = [];
        const modal = document.getElementById('explanationModal');
        const modalTargetText = document.getElementById('modalTargetText');
        const modalExplanation = document.getElementById('modalExplanation');
        const closeButton = document.querySelector('.close-button');
        const prevButton = document.getElementById('prev-slide');
        const nextButton = document.getElementById('next-slide');

        function updateNavigationButtons() {
            prevButton.disabled = currentSlideIndex === 0;
            nextButton.disabled = currentSlideIndex === slides.length - 1;
        }

        function showSlide(index) {
            if (index < 0 || index >= slides.length) return;

            slides.forEach(slide => slide.classList.remove('active'));
            slides[index].classList.add('active');
            currentSlideIndex = index;
            updateNavigationButtons();
        }

        function nextSlide() {
            showSlide(currentSlideIndex + 1);
        }

        function prevSlide() {
            showSlide(currentSlideIndex - 1);
        }

        // Modal functions
        function openModal(targetText, explanation) {
            modalTargetText.textContent = targetText;
            modalExplanation.textContent = explanation;
            modal.style.display = 'flex';
        }

        function closeModal() {
            modal.style.display = 'none';
        }

        // Event Listeners
        closeButton.onclick = closeModal;
        window.onclick = function(event) {
            if (event.target == modal) {
                closeModal();
            }
        };

        prevButton.addEventListener('click', prevSlide);
        nextButton.addEventListener('click', nextSlide);

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (modal.style.display === 'flex') { // If modal is open, only allow escape to close it
                if (e.key === 'Escape') {
                    closeModal();
                }
                return;
            }

            if (e.key === 'ArrowRight') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'Escape') {
                // If no modal is open, Escape could do something else if desired
                // For now, it only closes modal
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.slide').forEach(slide => slides.push(slide));
            if (slides.length > 0) {
                showSlide(0); // Show the first slide
            }

            // Attach click listeners for highlighted text
            // Using event delegation on the presentation container for dynamic content
            document.getElementById('presentation-container').addEventListener('click', (event) => {
                if (event.target.classList.contains('highlighted-text')) {
                    const target = event.target.dataset.target;
                    const explanation = event.target.dataset.explanation;
                    openModal(target, explanation);
                }
            });
        });
    </script>
</body>
</html>
        `;
    }

    function downloadHtmlFile(content, filename) {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up the object URL
    }
});