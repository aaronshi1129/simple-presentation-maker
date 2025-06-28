// script.js

document.addEventListener('DOMContentLoaded', () => {
    const paragraphsContainer = document.getElementById('paragraphs-container');
    const addParagraphBtn = document.getElementById('addParagraphBtn');
    const exportPresentationBtn = document.getElementById('exportPresentationBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    const metaInfoFields = {
        articleTitle: document.getElementById('articleTitle'),
        subtitle: document.getElementById('subtitle'),
        instructorName: document.getElementById('instructorName'),
        contactInfo: document.getElementById('contactInfo'),
        date: document.getElementById('date'),
        location: document.getElementById('location'),
    };

    let paragraphDataStore = []; // Stores the full data for all paragraphs
    let paragraphIdCounter = 0; // To uniquely identify paragraphs in the editor

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
        // For textarea, the value should be set as its innerHTML, not as a 'value' attribute.
        // It's also important to escape HTML content here.
        textarea.innerHTML = escapeHtml(value);
        return textarea;
    }

    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // --- Core Logic for Paragraph Management ---

    // Function to add a new explanation input set in the editor list view
    function renderExplanationItemInEditor(explanationContainer, explanation, paragraphSectionId) {
        const explanationItem = document.createElement('div');
        explanationItem.className = 'explanation-item';
        explanationItem.dataset.explanationId = explanation.id;

        // Retrieve the parent paragraph's raw text to get the target
        const paragraphData = paragraphDataStore.find(p => p.id === paragraphSectionId);
        const targetText = paragraphData ? paragraphData.text.substring(explanation.startIndex, explanation.endIndex) : '';

        explanationItem.innerHTML = `
            <button type="button" class="remove-explanation-btn" data-paragraph-id="${paragraphSectionId}" data-explanation-id="${explanation.id}">&times;</button>
            <div class="form-group">
                <label>Target Text:</label>
                <span class="explanation-target-display">${escapeHtml(targetText)}</span>
            </div>
            <div class="form-group">
                <label>Explanation:</label>
                ${createTextArea('explanationText', '', explanation.explanation).outerHTML}
            </div>
        `;
        explanationContainer.appendChild(explanationItem);

        // The explanation textarea is now editable
        const explanationTextArea = explanationItem.querySelector('textarea[name="explanationText"]');
        explanationTextArea.addEventListener('input', () => {
            const paragraph = paragraphDataStore.find(p => p.id === paragraphSectionId);
            const explanationIndex = paragraph.explanations.findIndex(exp => exp.id === explanation.id);
            if (paragraph && explanationIndex !== -1) {
                paragraph.explanations[explanationIndex].explanation = explanationTextArea.value.trim();
                saveToLocalStorage();
            }
        });
    }

    // Function to render the paragraph text in the display area with highlights
    function renderEditorParagraphDisplay(paragraphElement, paragraphData) {
        const displayArea = paragraphElement.querySelector('.paragraph-display-area');
        const rawText = paragraphData.text;
        let resultHtml = '';
        let lastIndex = 0;

        // Sort explanations by startIndex to process them in order
        const sortedExplanations = [...paragraphData.explanations].sort((a, b) => a.startIndex - b.startIndex);

        sortedExplanations.forEach(exp => {
            if (exp.startIndex >= lastIndex) {
                // Add text before the current highlight
                resultHtml += escapeHtml(rawText.substring(lastIndex, exp.startIndex));
                // Add the highlighted text with a specific class for editor
                const highlightedContent = rawText.substring(exp.startIndex, exp.endIndex);
                resultHtml += `<span class="highlighted-text-editor" data-explanation-id="${exp.id}">${escapeHtml(highlightedContent)}</span>`;
                lastIndex = exp.endIndex;
            }
        });

        // Add any remaining text after the last highlight
        resultHtml += escapeHtml(rawText.substring(lastIndex));
        displayArea.innerHTML = resultHtml;
    }

    // Function to add a new paragraph section to the editor UI
    function addParagraphSection(paragraphObj = null) {
        paragraphIdCounter++;
        const paragraphId = paragraphObj ? paragraphObj.id : generateUniqueId();
        const initialText = paragraphObj ? paragraphObj.text : '';
        const initialExplanations = paragraphObj ? paragraphObj.explanations : [];

        const paragraphSection = document.createElement('div');
        paragraphSection.className = 'section paragraph-section';
        paragraphSection.dataset.paragraphId = paragraphId;
        paragraphSection.innerHTML = `
            <button type="button" class="remove-paragraph-btn" data-paragraph-id="${paragraphId}">&times;</button>
            <h3>Paragraph ${paragraphIdCounter}</h3>
            <div class="form-group">
                <label for="paragraphText_${paragraphId}">Paragraph Text:</label>
                ${createTextArea(`paragraphText_${paragraphId}`, 'Paste your paragraph here...', initialText).outerHTML}
            </div>
            <button type="button" class="button confirm-paragraph-btn" data-paragraph-id="${paragraphId}">Confirm Paragraph</button>
            <button type="button" class="button edit-paragraph-btn" style="display: none;" data-paragraph-id="${paragraphId}">Edit Paragraph</button>

            <div class="paragraph-display-area" style="display: none;"></div>

            <h4>Explanations for this Paragraph:</h4>
            <div class="explanations-list">
                <p class="no-explanations-yet" style="display: ${initialExplanations.length > 0 ? 'none' : 'block'};">No explanations added yet. Select text above to add one.</p>
            </div>
            <button type="button" class="button add-explanation-btn-manual" data-paragraph-id="${paragraphId}">Add Explanation (Manual)</button>
        `;
        paragraphsContainer.appendChild(paragraphSection);

        // Add to data store or update
        if (!paragraphObj) {
            paragraphDataStore.push({
                id: paragraphId,
                text: initialText,
                explanations: []
            });
        } else {
            // Find and update existing paragraph entry if re-adding for display
            const existingParagraphIndex = paragraphDataStore.findIndex(p => p.id === paragraphId);
            if (existingParagraphIndex > -1) {
                paragraphDataStore[existingParagraphIndex] = paragraphObj;
            } else {
                paragraphDataStore.push(paragraphObj);
            }
        }

        // Set up the state based on whether initialText exists
        const textarea = paragraphSection.querySelector(`textarea[name="paragraphText_${paragraphId}"]`);
        const confirmBtn = paragraphSection.querySelector('.confirm-paragraph-btn');
        const editBtn = paragraphSection.querySelector('.edit-paragraph-btn');
        const displayArea = paragraphSection.querySelector('.paragraph-display-area');

        if (initialText) {
            textarea.style.display = 'none';
            confirmBtn.style.display = 'none';
            displayArea.style.display = 'block';
            editBtn.style.display = 'inline-block';
            renderEditorParagraphDisplay(paragraphSection, paragraphDataStore.find(p => p.id === paragraphId));

            const explanationsList = paragraphSection.querySelector('.explanations-list');
            initialExplanations.forEach(exp => renderExplanationItemInEditor(explanationsList, exp, paragraphId));
            if (initialExplanations.length > 0) {
                paragraphSection.querySelector('.no-explanations-yet').style.display = 'none';
            }
        } else {
            textarea.style.display = 'block';
            confirmBtn.style.display = 'inline-block';
            displayArea.style.display = 'none';
            editBtn.style.display = 'none';
        }

        setupParagraphInteractions(paragraphSection); // Setup selection handler
    }

    function confirmParagraph(paragraphSection) {
        const paragraphId = paragraphSection.dataset.paragraphId;
        const textarea = paragraphSection.querySelector(`textarea[name="paragraphText_${paragraphId}"]`);
        const displayArea = paragraphSection.querySelector('.paragraph-display-area');
        const confirmBtn = paragraphSection.querySelector('.confirm-paragraph-btn');
        const editBtn = paragraphSection.querySelector('.edit-paragraph-btn');
        const noExplanationsYet = paragraphSection.querySelector('.no-explanations-yet');

        const rawText = textarea.value.trim();

        if (!rawText) {
            alert('Paragraph text cannot be empty. Please enter some text before confirming.');
            return;
        }

        let paragraph = paragraphDataStore.find(p => p.id === paragraphId);
        if (!paragraph) {
            paragraph = { id: paragraphId, text: rawText, explanations: [] };
            paragraphDataStore.push(paragraph);
        } else {
            // If text has changed, clear existing explanations, as their offsets might be invalid
            if (paragraph.text !== rawText) {
                if (confirm('Changing the paragraph text will clear all existing explanations for this paragraph. Continue?')) {
                    paragraph.explanations = [];
                    paragraphSection.querySelector('.explanations-list').innerHTML = `<p class="no-explanations-yet" style="display: block;">No explanations added yet. Select text above to add one.</p>`;
                } else {
                    return; // User cancelled
                }
            }
            paragraph.text = rawText;
        }

        textarea.style.display = 'none';
        confirmBtn.style.display = 'none';
        displayArea.style.display = 'block';
        editBtn.style.display = 'inline-block';

        renderEditorParagraphDisplay(paragraphSection, paragraph);
        noExplanationsYet.style.display = paragraph.explanations.length > 0 ? 'none' : 'block';
        saveToLocalStorage();
    }

    function editParagraph(paragraphSection) {
        const paragraphId = paragraphSection.dataset.paragraphId;
        const textarea = paragraphSection.querySelector(`textarea[name="paragraphText_${paragraphId}"]`);
        const displayArea = paragraphSection.querySelector('.paragraph-display-area');
        const confirmBtn = paragraphSection.querySelector('.confirm-paragraph-btn');
        const editBtn = paragraphSection.querySelector('.edit-paragraph-btn');

        textarea.style.display = 'block';
        confirmBtn.style.display = 'inline-block';
        displayArea.style.display = 'none';
        editBtn.style.display = 'none';
        saveToLocalStorage(); // Save any changes before editing
    }

    function deleteParagraph(paragraphId) {
        if (confirm('Are you sure you want to remove this paragraph and all its explanations?')) {
            const paragraphSection = document.querySelector(`.paragraph-section[data-paragraph-id="${paragraphId}"]`);
            if (paragraphSection) {
                paragraphSection.remove();
                paragraphDataStore = paragraphDataStore.filter(p => p.id !== paragraphId);
                saveToLocalStorage();
                // Re-index paragraph numbers (optional, but good for UX)
                document.querySelectorAll('.paragraph-section').forEach((section, index) => {
                    section.querySelector('h3').textContent = `Paragraph ${index + 1}`;
                });
            }
        }
    }

    function addExplanationToParagraph(paragraphId, startIndex, endIndex, explanationText) {
        const paragraph = paragraphDataStore.find(p => p.id === paragraphId);
        if (paragraph && explanationText) {
            const newExplanation = {
                id: generateUniqueId(),
                startIndex: startIndex,
                endIndex: endIndex,
                explanation: explanationText
            };
            paragraph.explanations.push(newExplanation);

            const paragraphSection = document.querySelector(`.paragraph-section[data-paragraph-id="${paragraphId}"]`);
            if (paragraphSection) {
                renderEditorParagraphDisplay(paragraphSection, paragraph); // Re-render highlights
                const explanationsList = paragraphSection.querySelector('.explanations-list');
                renderExplanationItemInEditor(explanationsList, newExplanation, paragraphId);
                paragraphSection.querySelector('.no-explanations-yet').style.display = 'none';
            }
            saveToLocalStorage();
        }
    }

    function removeExplanation(paragraphId, explanationId) {
        if (confirm('Are you sure you want to remove this explanation?')) {
            const paragraph = paragraphDataStore.find(p => p.id === paragraphId);
            if (paragraph) {
                paragraph.explanations = paragraph.explanations.filter(exp => exp.id !== explanationId);
                const paragraphSection = document.querySelector(`.paragraph-section[data-paragraph-id="${paragraphId}"]`);
                if (paragraphSection) {
                    renderEditorParagraphDisplay(paragraphSection, paragraph); // Re-render highlights
                    const explanationItem = paragraphSection.querySelector(`.explanation-item[data-explanation-id="${explanationId}"]`);
                    if (explanationItem) {
                        explanationItem.remove();
                    }
                    if (paragraph.explanations.length === 0) {
                        paragraphSection.querySelector('.no-explanations-yet').style.display = 'block';
                    }
                }
                saveToLocalStorage();
            }
        }
    }

    // --- Text Selection and Offset Calculation ---

    // Function to get character offsets within an element's text content, ignoring HTML tags.
    function getSelectionOffsetsInRawText(range, ancestorElement) {
        let preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(ancestorElement);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const startIndex = preSelectionRange.toString().length;

        let postSelectionRange = range.cloneRange();
        postSelectionRange.selectNodeContents(ancestorElement);
        postSelectionRange.setStart(range.endContainer, range.endOffset);
        const endIndex = ancestorElement.textContent.length - postSelectionRange.toString().length;

        return { start: startIndex, end: endIndex };
    }

    // Global variable for the floating button
    let addExplanationPopup = null;
    let currentSelectionInfo = null; // { paragraphId, startIndex, endIndex, selectedText }

    function showAddExplanationPopup(x, y) {
        if (!addExplanationPopup) {
            addExplanationPopup = document.createElement('div');
            addExplanationPopup.className = 'add-explanation-popup';
            addExplanationPopup.textContent = 'Add Explanation';
            document.body.appendChild(addExplanationPopup);

            addExplanationPopup.addEventListener('click', () => {
                if (currentSelectionInfo) {
                    const explanationText = prompt(`Enter explanation for "${currentSelectionInfo.selectedText}":`);
                    if (explanationText !== null && explanationText.trim() !== '') {
                        addExplanationToParagraph(
                            currentSelectionInfo.paragraphId,
                            currentSelectionInfo.startIndex,
                            currentSelectionInfo.endIndex,
                            explanationText.trim()
                        );
                    }
                }
                hideAddExplanationPopup();
                window.getSelection().removeAllRanges(); // Clear selection after adding
            });
        }
        addExplanationPopup.style.left = `${x}px`;
        addExplanationPopup.style.top = `${y}px`;
        addExplanationPopup.style.display = 'block';
    }

    function hideAddExplanationPopup() {
        if (addExplanationPopup) {
            addExplanationPopup.style.display = 'none';
            currentSelectionInfo = null;
        }
    }

    function setupParagraphInteractions(paragraphSection) {
        const displayArea = paragraphSection.querySelector('.paragraph-display-area');
        const paragraphId = paragraphSection.dataset.paragraphId;

        // Selection handler for `paragraph-display-area`
        displayArea.addEventListener('mouseup', (event) => {
            const selection = window.getSelection();
            if (selection.isCollapsed) {
                hideAddExplanationPopup();
                return;
            }

            const range = selection.getRangeAt(0);
            if (!displayArea.contains(range.commonAncestorContainer)) {
                hideAddExplanationPopup();
                return; // Selection is outside this paragraph's display area
            }

            const offsets = getSelectionOffsetsInRawText(range, displayArea);
            const selectedText = selection.toString().trim();

            if (selectedText.length > 0) {
                currentSelectionInfo = {
                    paragraphId: paragraphId,
                    startIndex: offsets.start,
                    endIndex: offsets.end,
                    selectedText: selectedText
                };
                // Position popup near the selected text
                const rect = range.getBoundingClientRect();
                showAddExplanationPopup(rect.left + window.scrollX + rect.width / 2, rect.top + window.scrollY);
            } else {
                hideAddExplanationPopup();
            }
        });

        // Hide popup if click outside selection or popup
        document.addEventListener('mousedown', (event) => {
            if (addExplanationPopup && addExplanationPopup.style.display === 'block') {
                if (!addExplanationPopup.contains(event.target) && !displayArea.contains(event.target)) {
                    hideAddExplanationPopup();
                }
            }
        });

        // Click handler for already highlighted spans in editor
        displayArea.addEventListener('click', (event) => {
            if (event.target.classList.contains('highlighted-text-editor')) {
                const explanationId = event.target.dataset.explanationId;
                const explanationItem = paragraphSection.querySelector(`.explanation-item[data-explanation-id="${explanationId}"]`);

                if (explanationItem) {
                    // Scroll the explanation item into view
                    explanationItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Add a temporary highlight class
                    explanationItem.classList.add('highlight-flash');
                    setTimeout(() => {
                        explanationItem.classList.remove('highlight-flash');
                    }, 1000); // Remove the class after 1 second
                }
            }
        });
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
            paragraphDataStore = []; // Clear data store

            // Populate paragraphs and explanations using the new structure
            if (data.paragraphs && data.paragraphs.length > 0) {
                data.paragraphs.forEach(p => addParagraphSection(p)); // Pass full paragraph object
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
            paragraphDataStore = []; // Clear data store
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
        const target = event.target;
        const paragraphSection = target.closest('.paragraph-section');
        const paragraphId = paragraphSection ? paragraphSection.dataset.paragraphId : null;

        if (target.classList.contains('remove-paragraph-btn')) {
            if (paragraphId) {
                deleteParagraph(paragraphId);
            }
        } else if (target.classList.contains('confirm-paragraph-btn')) {
            if (paragraphSection) {
                confirmParagraph(paragraphSection);
            }
        } else if (target.classList.contains('edit-paragraph-btn')) {
            if (paragraphSection) {
                editParagraph(paragraphSection);
            }
        } else if (target.classList.contains('add-explanation-btn-manual')) {
            if (paragraphId) {
                const paragraph = paragraphDataStore.find(p => p.id === paragraphId);
                if (paragraph && paragraph.text) { // Ensure paragraph is confirmed
                    const targetText = prompt('Enter the exact word, phrase, or sentence to explain:');
                    if (targetText !== null && targetText.trim() !== '') {
                        const explanationText = prompt(`Enter explanation for "${targetText}":`);
                        if (explanationText !== null && explanationText.trim() !== '') {
                            // Manual entry: find the first occurrence not already explained
                            let found = false;
                            const currentParagraphText = paragraph.text;
                            let searchIndex = 0;
                            while (searchIndex !== -1) {
                                const index = currentParagraphText.indexOf(targetText, searchIndex);
                                if (index === -1) break;

                                // Check if this occurrence already has an explanation
                                const alreadyExplained = paragraph.explanations.some(exp =>
                                    exp.startIndex === index && exp.endIndex === index + targetText.length
                                );

                                if (!alreadyExplained) {
                                    addExplanationToParagraph(paragraphId, index, index + targetText.length, explanationText.trim());
                                    found = true;
                                    break;
                                }
                                searchIndex = index + targetText.length; // Continue search after this occurrence
                            }
                            if (!found) {
                                alert(`"${targetText}" not found in the paragraph, or all occurrences are already explained. You can select text directly from the paragraph for more precise control.`);
                            }
                        }
                    }
                } else {
                    alert('Please confirm the paragraph text first before adding explanations.');
                }
            }
        } else if (target.classList.contains('remove-explanation-btn')) {
            const explanationItem = target.closest('.explanation-item');
            if (explanationItem && paragraphId) {
                const explanationId = explanationItem.dataset.explanationId;
                removeExplanation(paragraphId, explanationId);
            }
        }
    });

    // Save meta info to local storage on any input change
    document.querySelector('.meta-info-section').addEventListener('input', saveToLocalStorage);

    exportPresentationBtn.addEventListener('click', () => {
        const presentationData = collectPresentationData();
        const htmlContent = generatePresentationHtml(presentationData);
        let fileName = presentationData.meta.title.trim();
        if (fileName) {
            // Sanitize filename: replace invalid characters with underscores, limit length
            fileName = fileName.replace(/[^a-z0-9\s-]/gi, '_').replace(/\s+/g, '-').toLowerCase();
            if (fileName.length > 50) { // Limit length to avoid excessively long filenames
                fileName = fileName.substring(0, 50);
            }
            if (!fileName) { // Fallback if sanitization results in empty string
                fileName = 'untitled_presentation';
            }
        } else {
            fileName = 'untitled_presentation';
        }
        downloadHtmlFile(htmlContent, `${fileName}.html`);
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
            paragraphs: paragraphDataStore.filter(p => p.text.trim() !== '') // Only export paragraphs with content
        };
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

    // Function to highlight target text within a paragraph for the EXPORTED HTML
    function highlightTextInParagraph(paragraphText, explanations) {
        let resultHtml = '';
        let lastIndex = 0;

        // Filter out explanations that are invalid (e.g., indices out of bounds)
        const validExplanations = explanations.filter(exp =>
            exp.startIndex >= 0 && exp.endIndex <= paragraphText.length && exp.startIndex < exp.endIndex
        );

        // Sort explanations by startIndex to process them in order
        // If start indices are the same, longer explanations should come first (for nested or overlapping highlights)
        const sortedExplanations = [...validExplanations].sort((a, b) => {
            if (a.startIndex === b.startIndex) {
                return b.endIndex - a.endIndex; // Longer explanation first
            }
            return a.startIndex - b.startIndex;
        });

        sortedExplanations.forEach(exp => {
            // Check for overlaps with already processed text
            if (exp.startIndex >= lastIndex) {
                // Add text before the current highlight
                resultHtml += escapeHtml(paragraphText.substring(lastIndex, exp.startIndex));
                // Add the highlighted text
                const highlightedContent = paragraphText.substring(exp.startIndex, exp.endIndex);
                resultHtml += `<span class="highlighted-text" data-target="${escapeHtml(highlightedContent)}" data-explanation="${escapeHtml(exp.explanation)}">${escapeHtml(highlightedContent)}</span>`;
                lastIndex = exp.endIndex;
            } else if (exp.endIndex > lastIndex) {
                // Handle cases where a new highlight partially overlaps an already processed one.
                // This logic prioritizes explanations by start index, then by length for same start index.
                // If a new explanation starts before 'lastIndex', it means it's fully or partially contained within an earlier, already processed span.
                // In such cases, we skip it to prevent malformed HTML (e.g., `<span><span>...</span></span>` or `<span>...<span>`).
                // The current sort logic is robust enough for non-overlapping or simple nested scenarios.
            }
        });

        // Add any remaining text after the last highlight
        resultHtml += escapeHtml(paragraphText.substring(lastIndex));
        return resultHtml;
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
    <title>${escapeHtml(data.meta.title || 'Instructional Presentation')}</title>
    <style>
        html {
            font-size: var(--base-font-size, 16px); /* Default to 16px */
        }
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
            font-size: 3rem; /* Adjusted to rem */
            margin-bottom: 20px;
        }
        .slide h2 {
            color: #34495e;
            font-size: 2.2rem; /* Adjusted to rem */
            margin-bottom: 15px;
        }
        .slide p {
            font-size: 1.4rem; /* Adjusted to rem */
            line-height: 1.6;
            color: #555;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 1.8rem; /* Adjusted to rem */
            color: #7f8c8d;
        }
        .meta-list {
            list-style: none;
            padding: 0;
            margin-top: 30px;
            font-size: 1.2rem; /* Adjusted to rem */
            color: #666;
        }
        .meta-list li {
            margin-bottom: 10px;
        }
        .main-paragraph {
            text-align: left;
            white-space: pre-wrap; /* Preserve line breaks from textarea */
        }

        /* Navigation and Font Adjustment buttons */
        .controls-container {
            position: fixed;
            bottom: 20px;
            width: 100%;
            text-align: center;
            z-index: 99;
            display: flex;
            justify-content: center;
            gap: 10px; /* Space between button groups */
        }
        .navigation, .font-size-controls {
            display: flex;
            gap: 10px; /* Space between buttons within a group */
        }
        .navigation button, .font-size-controls button {
            padding: 12px 25px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 18px; /* Fixed font size for buttons */
            transition: background-color 0.3s ease, transform 0.2s ease;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .navigation button:hover, .font-size-controls button:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
        }
        .navigation button:active, .font-size-controls button:active {
            transform: translateY(0);
        }
        .navigation button:disabled, .font-size-controls button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
            box-shadow: none;
        }
        .font-size-controls button {
            background-color: #2ecc71; /* Different color for font controls */
        }
        .font-size-controls button:hover {
            background-color: #27ae60;
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
            font-size: 1.8rem; /* Adjusted to rem */
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .modal-content p {
            font-size: 1.2rem; /* Adjusted to rem */
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
            font-size: 12px; /* Fixed font size for footer */
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
    <div class="controls-container">
        <div class="font-size-controls">
            <button id="decrease-font">A-</button>
            <button id="increase-font">A+</button>
        </div>
        <div class="navigation">
            <button id="prev-slide">Previous</button>
            <button id="next-slide">Next</button>
        </div>
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

        // Font Size Controls
        const decreaseFontButton = document.getElementById('decrease-font');
        const increaseFontButton = document.getElementById('increase-font');
        let currentBaseFontSizePx = 16; // Initial font size for 1rem

        const MIN_FONT_SIZE = 12;
        const MAX_FONT_SIZE = 24;
        const FONT_SIZE_STEP = 2;

        function updateFontSize() {
            document.documentElement.style.setProperty('--base-font-size', \`\${currentBaseFontSizePx}px\`);
        }

        function adjustFontSize(delta) {
            let newSize = currentBaseFontSizePx + delta;
            newSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, newSize));
            if (newSize !== currentBaseFontSizePx) {
                currentBaseFontSizePx = newSize;
                updateFontSize();
            }
        }

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

        decreaseFontButton.addEventListener('click', () => adjustFontSize(-FONT_SIZE_STEP));
        increaseFontButton.addEventListener('click', () => adjustFontSize(FONT_SIZE_STEP));

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
            updateFontSize(); // Set initial font size on load

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
