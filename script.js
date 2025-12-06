// API Configuration
const API_ENDPOINTS = {
    'pl': 'https://api.poocoo.pl/api/v1',
    'en': 'https://api.poocoo.app/api/v1',
    'de': 'https://api.poocoo.de/api/v1',
    'fr': 'https://api.poocoo.fr/api/v1'
};
const DEFAULT_PAGE_SIZE = 100;

// =============================================
// LOCAL STORAGE KEYS
// =============================================
const STORAGE_KEYS = {
    LANGUAGE: 'poocoo_api_language',
    TAB1_FILTERS: 'poocoo_api_tab1_filters',
    TAB2_LETTERS: 'poocoo_api_tab2_letters'
};

// =============================================
// APPLICATION STATE
// =============================================
const state = {
    language: loadFromStorage(STORAGE_KEYS.LANGUAGE, 'en'),
    filters: {
        length: '',
        startsWith: '',
        contains: '',
        endsWith: ''
    },
    pagination: {
        currentPage: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 0
    },
    data: [],
    loading: false
};

// State for Tab 2 (Words From Letters)
const stateTab2 = {
    letters: loadFromStorage(STORAGE_KEYS.TAB2_LETTERS, ''),
    data: [],
    loading: false
};

// DOM Elements
const elements = {
    languageSelect: document.getElementById('languageSelect'),
    lengthInput: document.getElementById('lengthInput'),
    startsWithInput: document.getElementById('startsWithInput'),
    containsInput: document.getElementById('containsInput'),
    endsWithInput: document.getElementById('endsWithInput'),
    resultsInfo: document.getElementById('resultsInfo'),
    resultsList: document.getElementById('resultsList'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    errorMessage: document.getElementById('errorMessage'),
    paginationTop: document.getElementById('paginationTop'),
    currentApiEndpoint: document.getElementById('currentApiEndpoint')
};

// Debounce timer
let debounceTimer = null;

// =============================================
// LOCAL STORAGE FUNCTIONS
// =============================================
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

function loadFromStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
        return defaultValue;
    }
}

// =============================================
// INITIALIZATION
// =============================================
function init() {
    restoreFromStorage();
    attachEventListeners();
    initTabs();
    updateCurrentApiEndpoint();
    updateCurrentQueryTab2(); // Show Tab 2 query on load since it's now the default
    initResultsContainer();
    loadDataTab2(); // Load Tab 2 data instead of Tab 1
}

function restoreFromStorage() {
    // Restore language
    const savedLanguage = loadFromStorage(STORAGE_KEYS.LANGUAGE, 'en');
    state.language = savedLanguage;
    elements.languageSelect.value = savedLanguage;
    
    // Restore Tab 1 filters
    const savedFilters = loadFromStorage(STORAGE_KEYS.TAB1_FILTERS, null);
    if (savedFilters) {
        state.filters = savedFilters;
        elements.lengthInput.value = savedFilters.length || '';
        elements.startsWithInput.value = savedFilters.startsWith || '';
        elements.containsInput.value = savedFilters.contains || '';
        elements.endsWithInput.value = savedFilters.endsWith || '';
        
        // Show clear buttons for non-empty fields
        [elements.lengthInput, elements.startsWithInput, elements.containsInput, elements.endsWithInput].forEach(input => {
            updateClearButton(input);
        });
    }
    
    // Restore Tab 2 letters
    const savedLetters = loadFromStorage(STORAGE_KEYS.TAB2_LETTERS, '');
    if (savedLetters) {
        stateTab2.letters = savedLetters;
        const lettersInput = document.getElementById('lettersInput');
        if (lettersInput) {
            lettersInput.value = savedLetters;
            updateClearButton(lettersInput);
        }
    }
}

// Clear all inputs on page load
function clearAllInputs() {
    // Tab 1 inputs
    document.getElementById('lengthInput').value = '';
    document.getElementById('startsWithInput').value = '';
    document.getElementById('containsInput').value = '';
    document.getElementById('endsWithInput').value = '';
    
    // Tab 2 input
    document.getElementById('lettersInput').value = '';
    
    // Hide all clear buttons
    document.querySelectorAll('.clear-input').forEach(btn => {
        btn.style.display = 'none';
    });
}

// Initialize tabs
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Add active class to clicked button and show its content
            button.classList.add('active');
            const tabContent = document.getElementById(`tab-${tabName}`);
            tabContent.style.display = 'block';
            tabContent.classList.add('active');
            
            // Update endpoint display based on active tab
            if (tabName === 'words') {
                updateCurrentQuery();
            } else if (tabName === 'endpoint2') {
                updateCurrentQueryTab2();
            }
        });
    });
    
    // Initialize Tab 2
    initTab2();
}

// Initialize results container structure
function initResultsContainer() {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'words-content';
    contentDiv.style.lineHeight = '1.8';
    contentDiv.style.fontSize = '1rem';
    contentDiv.style.color = 'var(--text-primary)';
    elements.resultsList.appendChild(contentDiv);
    
    // Show initial message
    contentDiv.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Set at least one filter above to search for words (length, starts with, contains, or ends with).</span>';
    elements.resultsInfo.textContent = 'Ready to search';
}

// Update current API endpoint display
function updateCurrentApiEndpoint() {
    const baseUrl = API_ENDPOINTS[state.language];
    elements.currentApiEndpoint.textContent = `${baseUrl}/words`;
    updateDocumentationLink();
}

function updateDocumentationLink() {
    const docLink = document.getElementById('docLink');
    const docUrls = {
        'pl': 'https://api.poocoo.pl/index.html',
        'en': 'https://api.poocoo.app/index.html',
        'de': 'https://api.poocoo.de/index.html',
        'fr': 'https://api.poocoo.fr/index.html'
    };
    docLink.href = docUrls[state.language];
}

// Update current query display
function updateCurrentQuery() {
    const queryDisplay = document.getElementById('currentQuery');
    const copyQueryBtn = document.getElementById('copyQueryBtn');
    
    const params = [];
    if (state.filters.length) params.push(`length=${state.filters.length}`);
    if (state.filters.startsWith) params.push(`startsWith=${state.filters.startsWith}`);
    if (state.filters.contains) params.push(`contains=${state.filters.contains}`);
    if (state.filters.endsWith) params.push(`endsWith=${state.filters.endsWith}`);
    
    if (params.length > 0) {
        params.push(`page=${state.pagination.currentPage}`);
        params.push(`pageSize=${state.pagination.pageSize}`);
        const baseUrl = API_ENDPOINTS[state.language];
        queryDisplay.textContent = `${baseUrl}/words?${params.join('&')}`;
        copyQueryBtn.style.display = 'block';
    } else {
        queryDisplay.textContent = '';
        copyQueryBtn.style.display = 'none';
    }
    
    // Reinitialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Copy to clipboard function
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        // Show 'Copied!' message
        const copiedMessage = document.getElementById('copied' + elementId.replace('current', ''));
        if (copiedMessage) {
            copiedMessage.style.display = 'inline';
            setTimeout(() => {
                copiedMessage.style.display = 'none';
            }, 2000);
        }
        
        // Visual feedback on button
        const btn = event.target.closest('.copy-btn-inline') || event.target.closest('.copy-btn');
        const icon = btn.querySelector('[data-lucide]');
        const originalIcon = icon.getAttribute('data-lucide');
        
        icon.setAttribute('data-lucide', 'check');
        lucide.createIcons();
        btn.style.color = 'var(--success)';
        
        setTimeout(() => {
            icon.setAttribute('data-lucide', originalIcon);
            lucide.createIcons();
            btn.style.color = '';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Event Listeners
function attachEventListeners() {
    elements.languageSelect.addEventListener('change', handleLanguageChange);
    
    // Add debounced input listeners for all filter inputs
    [elements.lengthInput, elements.startsWithInput, elements.containsInput, elements.endsWithInput].forEach(input => {
        input.addEventListener('input', (e) => {
            handleFilterInputDebounced();
            updateClearButton(e.target);
        });
    });
    
    // Prevent non-numeric input in length field
    elements.lengthInput.addEventListener('keydown', (e) => {
        // Allow: backspace, delete, tab, escape, enter, arrows
        if ([8, 9, 13, 27, 37, 38, 39, 40, 46].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: Cmd+A, Cmd+C, Cmd+V, Cmd+X (Mac)
            (e.keyCode === 65 && e.metaKey === true) ||
            (e.keyCode === 67 && e.metaKey === true) ||
            (e.keyCode === 86 && e.metaKey === true) ||
            (e.keyCode === 88 && e.metaKey === true)) {
            return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });
    
    // Add clear buttons functionality
    document.querySelectorAll('.clear-input').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const inputId = e.target.getAttribute('data-input');
            const input = document.getElementById(inputId);
            if (input) {
                input.value = '';
                e.target.style.display = 'none';
                handleFilterInputDebounced();
            }
        });
    });
    
    // Clear all filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
}

// Update visibility of clear button for an input
function updateClearButton(input) {
    const wrapper = input.closest('.input-wrapper');
    if (wrapper) {
        const clearBtn = wrapper.querySelector('.clear-input');
        if (clearBtn) {
            clearBtn.style.display = input.value ? 'block' : 'none';
        }
    }
}

// Clear all filters
function clearAllFilters() {
    elements.lengthInput.value = '';
    elements.startsWithInput.value = '';
    elements.containsInput.value = '';
    elements.endsWithInput.value = '';
    
    // Hide all clear buttons
    document.querySelectorAll('.clear-input').forEach(btn => {
        btn.style.display = 'none';
    });
    
    state.filters = {
        length: '',
        startsWith: '',
        contains: '',
        endsWith: ''
    };
    saveToStorage(STORAGE_KEYS.TAB1_FILTERS, state.filters);
    state.pagination.currentPage = 1;
    loadData();
}

// Handlers
function handleFilterInputDebounced() {
    // Clear previous timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    // Set new timer for 300ms
    debounceTimer = setTimeout(() => {
        applyFilters();
    }, 300);
}

function applyFilters() {
    state.filters = {
        length: elements.lengthInput.value.trim(),
        startsWith: elements.startsWithInput.value.trim().toLowerCase(),
        contains: elements.containsInput.value.trim().toLowerCase(),
        endsWith: elements.endsWithInput.value.trim().toLowerCase()
    };
    saveToStorage(STORAGE_KEYS.TAB1_FILTERS, state.filters);
    state.pagination.currentPage = 1;
    loadData();
}

function handleLanguageChange() {
    state.language = elements.languageSelect.value;
    saveToStorage(STORAGE_KEYS.LANGUAGE, state.language);
    state.pagination.currentPage = 1;
    updateCurrentApiEndpoint();
    loadData();
    
    // Update Tab 2 if it has data
    if (stateTab2.letters) {
        updateCurrentQueryTab2();
        loadDataTab2();
    }
}

function handlePageChange(page) {
    state.pagination.currentPage = page;
    loadData();
}

// API Functions
function buildApiUrl() {
    const params = new URLSearchParams();
    
    if (state.filters.length) {
        params.append('length', state.filters.length);
    }
    if (state.filters.startsWith) {
        params.append('startsWith', state.filters.startsWith);
    }
    if (state.filters.contains) {
        params.append('contains', state.filters.contains);
    }
    if (state.filters.endsWith) {
        params.append('endsWith', state.filters.endsWith);
    }
    
    params.append('page', state.pagination.currentPage);
    params.append('pageSize', state.pagination.pageSize);
    
    const baseUrl = API_ENDPOINTS[state.language];
    return `${baseUrl}/words?${params.toString()}`;
}

async function loadData() {
    if (state.loading) return;
    
    // Check if at least one filter is set
    const hasFilter = state.filters.length || state.filters.startsWith || 
                     state.filters.contains || state.filters.endsWith;
    
    if (!hasFilter) {
        elements.resultsInfo.textContent = 'No filters set';
        const contentDiv = elements.resultsList.querySelector('.words-content');
        if (contentDiv) {
            contentDiv.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Set at least one filter above to search for words.</span>';
        }
        return;
    }
    
    state.loading = true;
    showLoading();
    hideError();
    updateCurrentQuery();
    
    try {
        const url = buildApiUrl();
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        
        // Check if API call was successful
        if (!result.success) {
            throw new Error(result.error || 'API returned unsuccessful response');
        }
        
        const data = result.data;
        
        // Update state with API response
        state.data = data.words || [];
        state.pagination.totalItems = data.totalCount || 0;
        state.pagination.totalPages = data.totalPages || 0;
        
        renderResults();
        renderPagination();
        
    } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to load data from API. Please try again later.');
        state.data = [];
        state.pagination.totalItems = 0;
        state.pagination.totalPages = 0;
    } finally {
        state.loading = false;
        hideLoading();
    }
}

// Rendering Functions
function renderResults() {
    // Preserve the element structure, just update content
    let contentDiv = elements.resultsList.querySelector('.words-content');
    
    if (!contentDiv) {
        contentDiv = document.createElement('div');
        contentDiv.className = 'words-content';
        contentDiv.style.lineHeight = '1.8';
        contentDiv.style.fontSize = '1rem';
        contentDiv.style.color = 'var(--text-primary)';
        elements.resultsList.appendChild(contentDiv);
    }
    
    if (state.data.length === 0) {
        contentDiv.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">No words found matching your criteria.</span>';
        elements.resultsInfo.textContent = 'No results';
        return;
    }
    
    const startIndex = (state.pagination.currentPage - 1) * state.pagination.pageSize + 1;
    const endIndex = Math.min(startIndex + state.data.length - 1, state.pagination.totalItems);
    
    elements.resultsInfo.textContent = `Showing ${startIndex}-${endIndex} of ${formatNumber(state.pagination.totalItems)} words`;
    
    // Render as comma-separated words
    const wordsText = state.data
        .map(word => escapeHtml(word))
        .join(', ');
    
    contentDiv.textContent = wordsText;
}

function renderPagination() {
    const paginationHTML = createPaginationHTML();
    elements.paginationTop.innerHTML = paginationHTML;
}

function createPaginationHTML() {
    if (state.pagination.totalPages <= 1) {
        return '';
    }
    
    const currentPage = state.pagination.currentPage;
    const totalPages = state.pagination.totalPages;
    const maxVisiblePages = 5;
    
    let html = '';
    
    // Previous button
    html += `<button class="page-btn" onclick="handlePageChange(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Previous
    </button>`;
    
    // Page numbers
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="page-btn" onclick="handlePageChange(1)">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding: 0 8px; color: var(--text-muted);">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="handlePageChange(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding: 0 8px; color: var(--text-muted);">...</span>`;
        }
        html += `<button class="page-btn" onclick="handlePageChange(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button class="page-btn" onclick="handlePageChange(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        Next
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>`;
    
    return html;
}

// UI Helper Functions
function showLoading() {
    elements.loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    elements.loadingSpinner.style.display = 'none';
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}

function hideError() {
    elements.errorMessage.style.display = 'none';
}

// Utility Functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make handlePageChange globally accessible
window.handlePageChange = handlePageChange;

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    init();
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }
});

// Make copyToClipboard globally accessible
window.copyToClipboard = copyToClipboard;

// =============================================
// TAB 2: WORDS FROM LETTERS FUNCTIONALITY
// =============================================

let debounceTimerTab2 = null;

// Initialize Tab 2
function initTab2() {
    const lettersInput = document.getElementById('lettersInput');
    const clearBtn = document.getElementById('clearFiltersTab2');
    const clearInputBtn = lettersInput.parentElement.querySelector('.clear-input');
    
    // Input change listener
    lettersInput.addEventListener('input', (e) => {
        // Show/hide clear button
        clearInputBtn.style.display = e.target.value ? 'block' : 'none';
        
        // Debounced search
        clearTimeout(debounceTimerTab2);
        debounceTimerTab2 = setTimeout(() => {
            stateTab2.letters = e.target.value.trim().toLowerCase();
            saveToStorage(STORAGE_KEYS.TAB2_LETTERS, stateTab2.letters);
            updateCurrentQueryTab2();
            loadDataTab2();
        }, 300);
    });
    
    // Clear button
    clearBtn.addEventListener('click', () => {
        lettersInput.value = '';
        clearInputBtn.style.display = 'none';
        stateTab2.letters = '';
        saveToStorage(STORAGE_KEYS.TAB2_LETTERS, '');
        updateCurrentQueryTab2();
        loadDataTab2();
    });
    
    // Individual clear button
    clearInputBtn.addEventListener('click', () => {
        lettersInput.value = '';
        clearInputBtn.style.display = 'none';
        stateTab2.letters = '';
        saveToStorage(STORAGE_KEYS.TAB2_LETTERS, '');
        updateCurrentQueryTab2();
        loadDataTab2();
    });
    
    // Initial load
    initResultsContainerTab2();
    loadDataTab2();
}

// Update current query display for Tab 2
function updateCurrentQueryTab2() {
    const queryDisplay = document.getElementById('currentQuery');
    const endpointDisplay = document.getElementById('currentApiEndpoint');
    const copyQueryBtn = document.getElementById('copyQueryBtn');
    const baseUrl = API_ENDPOINTS[state.language];
    
    // Update endpoint
    endpointDisplay.textContent = `${baseUrl}/words-from-letters`;
    
    if (stateTab2.letters) {
        const fullQuery = `${baseUrl}/words-from-letters?letters=${stateTab2.letters}`;
        queryDisplay.textContent = fullQuery;
        copyQueryBtn.style.display = 'inline-flex';
    } else {
        queryDisplay.textContent = '';
        copyQueryBtn.style.display = 'none';
    }
}

// Initialize results container for Tab 2
function initResultsContainerTab2() {
    const resultsList = document.getElementById('resultsListTab2');
    const contentDiv = document.createElement('div');
    contentDiv.className = 'words-content';
    contentDiv.style.lineHeight = '1.8';
    contentDiv.style.fontSize = '1rem';
    contentDiv.style.color = 'var(--text-primary)';
    resultsList.appendChild(contentDiv);
    
    contentDiv.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Enter letters above to find all possible words (anagram solver).</span>';
    document.getElementById('resultsInfoTab2').textContent = 'Ready to search';
}

// Load data for Tab 2
async function loadDataTab2() {
    if (!stateTab2.letters) {
        const contentDiv = document.getElementById('resultsListTab2').querySelector('.words-content');
        if (contentDiv) {
            contentDiv.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Enter letters above to find all possible words (anagram solver).</span>';
        }
        document.getElementById('resultsInfoTab2').textContent = 'Ready to search';
        document.getElementById('errorMessageTab2').style.display = 'none';
        return;
    }
    
    if (stateTab2.letters.length > 15) {
        showErrorTab2('Maximum 15 characters allowed');
        return;
    }
    
    stateTab2.loading = true;
    showLoadingTab2(true);
    hideErrorTab2();
    
    try {
        const baseUrl = API_ENDPOINTS[state.language];
        const url = `${baseUrl}/words-from-letters?letters=${encodeURIComponent(stateTab2.letters)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error(result.error || 'Invalid response from API');
        }
        
        stateTab2.data = result.data;
        stateTab2.loading = false;
        
        displayResultsTab2(result.data);
        showLoadingTab2(false);
        
    } catch (error) {
        stateTab2.loading = false;
        showLoadingTab2(false);
        showErrorTab2(`Failed to load data: ${error.message}`);
        console.error('Error loading data:', error);
    }
}

// Display results for Tab 2
function displayResultsTab2(data) {
    const contentDiv = document.getElementById('resultsListTab2').querySelector('.words-content');
    const resultsInfo = document.getElementById('resultsInfoTab2');
    
    if (!data || !data.wordGroups || data.wordGroups.length === 0) {
        contentDiv.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">No words found from these letters.</span>';
        resultsInfo.textContent = 'No results found';
        return;
    }
    
    const totalWords = data.totalCount || 0;
    resultsInfo.textContent = `Found ${totalWords} word${totalWords !== 1 ? 's' : ''} from "${stateTab2.letters}"`;
    
    // Build HTML grouped by length
    let html = '';
    
    data.wordGroups.forEach((group, index) => {
        const length = group.length;
        const words = group.words;
        const count = group.count;
        
        // Header line
        html += `<div style="margin-bottom: 15px; padding-bottom: 15px; ${index < data.wordGroups.length - 1 ? 'border-bottom: 1px solid var(--border);' : ''}">`;
        html += `<div style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 10px; font-weight: 600;">`;
        html += `${length} ${length === 1 ? 'letter' : 'letters'} (${count} word${count !== 1 ? 's' : ''})`;
        html += `</div>`;
        
        // Words on one line separated by commas
        const wordsLine = words.map(w => escapeHtml(w)).join(', ');
        html += `<div style="color: var(--text-primary); font-size: 1rem; line-height: 1.6;">`;
        html += wordsLine;
        html += `</div>`;
        html += `</div>`;
    });
    
    contentDiv.innerHTML = html;
}

// Show/hide loading for Tab 2
function showLoadingTab2(show) {
    const spinner = document.getElementById('loadingSpinnerTab2');
    spinner.style.display = show ? 'flex' : 'none';
}

// Show error for Tab 2
function showErrorTab2(message) {
    const errorDiv = document.getElementById('errorMessageTab2');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    const contentDiv = document.getElementById('resultsListTab2').querySelector('.words-content');
    if (contentDiv) {
        contentDiv.innerHTML = '';
    }
    document.getElementById('resultsInfoTab2').textContent = 'Error';
}

// Hide error for Tab 2
function hideErrorTab2() {
    document.getElementById('errorMessageTab2').style.display = 'none';
}
