$(document).ready(function() {
  const options = {
    slidesToScroll: 1,
    slidesToShow: 1,
    loop: true,
    infinite: true,
    autoplay: false,
    autoplaySpeed: 3000,
  }
  // Initialize all div with carousel class
  const carousels = bulmaCarousel.attach('.carousel', options);
})

// Add date mapping for the slider
const dateToRelease = {
    '0': 'release_v2406',
    '1': 'release_v2501'
};

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded');
  
  // Initialize the table after a short delay to ensure all elements are ready
  setTimeout(() => {
    initializeCombinedTable();
  }, 100);
});

function initializeCombinedTable() {
  console.log('Initializing combined table');
  loadCombinedTableData();
  setupCombinedEventListeners();
  window.addEventListener('resize', adjustNameColumnWidth);

  const slider = document.querySelector('.slider input');
  if (!slider) {
    console.error('Slider element not found');
    return;
  }
  
  const tooltip = document.querySelector('.date-tooltip');
  const dates = ['2024-06', '2025-01'];

  function updateTooltipAndData(value) {
    if (tooltip) tooltip.textContent = dates[value];
    loadCombinedTableData();
  }

  // Add event listener for slider changes
  slider.addEventListener('input', function() {
    updateTooltipAndData(this.value);
  });

  // Initialize with default value
  updateTooltipAndData(slider.value);
}

function loadCombinedTableData() {
    console.log('Starting to load combined table data...');
    const slider = document.querySelector('.slider input');
    if (!slider) {
        console.error('Slider element not found');
        return;
    }
    
    const selectedDate = slider.value;
    console.log('Selected date:', selectedDate);
    const releaseVersion = dateToRelease[selectedDate];

    fetch(`./configs/${releaseVersion}/leaderboard.json`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Data loaded successfully');
            // Load data for the combined table
            loadCombinedTable(data);
            
            // Sort by consolidated performance by default
            const consolidatedHeader = document.querySelector('th.consolidated-main');
            if (consolidatedHeader) {
                sortCombinedTable(consolidatedHeader, true); // true forces descending order
            }
        })
        .catch(error => {
            console.error('Error loading table data:', error);
            const tbody = document.querySelector('#combined-mmmu-table tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="13">Error loading data: ${error.message}</td></tr>`;
            }
        });
}

function loadCombinedTable(data) {
    console.log('Loading combined table with data');
    const tbody = document.querySelector('#combined-mmmu-table tbody');
    if (!tbody) {
        console.error('#combined-mmmu-table tbody not found');
        return;
    }
    
    tbody.innerHTML = '';

    if (!data || !data.leaderboardData || !Array.isArray(data.leaderboardData)) {
        console.error('Invalid data format:', data);
        tbody.innerHTML = '<tr><td colspan="13">Error: Invalid data format</td></tr>';
        return;
    }

    // Get all models
    const modelData = data.leaderboardData.map(model => ({
        info: model.info || { name: 'Unknown', type: 'unknown' },
        arithmetic: model.arithmetic || {},
        no_arithmetic: model.no_arithmetic || {},
        consolidated: model.consolidated || {}
    }));

    // Sort models by consolidated overall accuracy (descending)
    modelData.sort((a, b) => 
        (b.consolidated.overall_acc || 0) - (a.consolidated.overall_acc || 0)
    );

    // Find best and second best scores for styling
    const scores = {
        arithmetic: findBestScores(modelData, 'arithmetic'),
        no_arithmetic: findBestScores(modelData, 'no_arithmetic'),
        consolidated: findBestScores(modelData, 'consolidated')
    };

    modelData.forEach((model, index) => {
        try {
            const tr = document.createElement('tr');
            tr.classList.add(model.info.type || 'unknown');

            // Create name cell with link if available
            const nameCell = model.info.link && model.info.link.trim() !== '' ?
                `<a href="${model.info.link}" target="_blank"><strong>${model.info.name || 'Unknown'}</strong></a>` :
                `<strong>${model.info.name || 'Unknown'}</strong>`;

            // Helper function to format percentage with styling
            const formatPercentage = (value, category, rank) => {
                if (value === null || value === undefined) return '-';
                const formatted = (value * 100).toFixed(2) + '%';
                return applyStyleCombined(formatted, rank);
            };

            // Build row HTML with all columns and styling
            tr.innerHTML = `
                <td>${nameCell}</td>
                
                <!-- Arithmetic section -->
                <td class="arithmetic-main">${formatPercentage(model.arithmetic.overall_acc, 'arithmetic_overall', scores.arithmetic.overall[index])}</td>
                <td class="arithmetic-detail hidden">${formatPercentage(model.arithmetic.overall_acc_by_difficulty?.easy, 'arithmetic_easy', scores.arithmetic.easy[index])}</td>
                <td class="arithmetic-detail hidden">${formatPercentage(model.arithmetic.overall_acc_by_difficulty?.medium, 'arithmetic_medium', scores.arithmetic.medium[index])}</td>
                <td class="arithmetic-detail hidden">${formatPercentage(model.arithmetic.overall_acc_by_difficulty?.hard, 'arithmetic_hard', scores.arithmetic.hard[index])}</td>
                
                <!-- Non-Arithmetic section -->
                <td class="no-arithmetic-main">${formatPercentage(model.no_arithmetic.overall_acc, 'no_arithmetic_overall', scores.no_arithmetic.overall[index])}</td>
                <td class="no-arithmetic-detail hidden">${formatPercentage(model.no_arithmetic.overall_acc_by_difficulty?.easy, 'no_arithmetic_easy', scores.no_arithmetic.easy[index])}</td>
                <td class="no-arithmetic-detail hidden">${formatPercentage(model.no_arithmetic.overall_acc_by_difficulty?.medium, 'no_arithmetic_medium', scores.no_arithmetic.medium[index])}</td>
                <td class="no-arithmetic-detail hidden">${formatPercentage(model.no_arithmetic.overall_acc_by_difficulty?.hard, 'no_arithmetic_hard', scores.no_arithmetic.hard[index])}</td>
                
                <!-- Overall section -->
                <td class="overall-main">${formatPercentage(model.consolidated.overall_acc, 'consolidated_overall', scores.consolidated.overall[index])}</td>
                <td class="overall-detail hidden">${formatPercentage(model.consolidated.overall_acc_by_difficulty?.easy, 'consolidated_easy', scores.consolidated.easy[index])}</td>
                <td class="overall-detail hidden">${formatPercentage(model.consolidated.overall_acc_by_difficulty?.medium, 'consolidated_medium', scores.consolidated.medium[index])}</td>
                <td class="overall-detail hidden">${formatPercentage(model.consolidated.overall_acc_by_difficulty?.hard, 'consolidated_hard', scores.consolidated.hard[index])}</td>
            `;
            
            tbody.appendChild(tr);
        } catch (err) {
            console.error('Error creating row:', err);
        }
    });

    // Setup expand/collapse functionality
    setupExpandCollapse();
    console.log('Combined table loaded successfully');
}

function findBestScores(modelData, tableType) {
    const scores = {
        overall: Array(modelData.length).fill(0),
        easy: Array(modelData.length).fill(0),
        medium: Array(modelData.length).fill(0),
        hard: Array(modelData.length).fill(0)
    };
    
    // Sort models by each metric and assign ranks
    ['overall', 'easy', 'medium', 'hard'].forEach(category => {
        const sortedIndices = [...Array(modelData.length).keys()].sort((a, b) => {
            const valueA = category === 'overall' 
                ? (modelData[a][tableType].overall_acc || 0)
                : (modelData[a][tableType].overall_acc_by_difficulty?.[category] || 0);
            const valueB = category === 'overall'
                ? (modelData[b][tableType].overall_acc || 0)
                : (modelData[b][tableType].overall_acc_by_difficulty?.[category] || 0);
            return valueB - valueA;
        });
        
        // Assign ranks (1 for best, 2 for second best)
        sortedIndices.forEach((originalIndex, sortedPosition) => {
            if (sortedPosition === 0) scores[category][originalIndex] = 1;
            else if (sortedPosition === 1) scores[category][originalIndex] = 2;
        });
    });
    
    return scores;
}

function setupCombinedEventListeners() {
    // Setup sorting
    const sortableHeaders = document.querySelectorAll('#combined-mmmu-table th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => sortCombinedTable(header));
    });
}

function setupExpandCollapse() {
    // Get all section headers
    const arithmeticHeader = document.getElementById('arithmetic-header');
    const noArithmeticHeader = document.getElementById('no-arithmetic-header');
    const overallHeader = document.getElementById('overall-header');
    
    // Add click handlers to each header
    if (arithmeticHeader) {
        arithmeticHeader.addEventListener('click', function() {
            toggleSection('arithmetic');
        });
    }
    
    if (noArithmeticHeader) {
        noArithmeticHeader.addEventListener('click', function() {
            toggleSection('no-arithmetic');
        });
    }
    
    if (overallHeader) {
        overallHeader.addEventListener('click', function() {
            toggleSection('overall');
        });
    }
}

function toggleSection(sectionName) {
    // Get the header element
    const header = document.getElementById(`${sectionName}-header`);
    if (!header) return;
    
    const isExpanding = header.textContent.includes('[+]');
    
    // First collapse all sections
    collapseAllSections();
    
    // Then expand the clicked section if needed
    if (isExpanding) {
        expandSection(sectionName);
    }
}

function collapseAllSections() {
    // Collapse all section headers
    const sectionHeaders = ['arithmetic-header', 'no-arithmetic-header', 'overall-header'];
    sectionHeaders.forEach(headerId => {
        const header = document.getElementById(headerId);
        if (header) {
            header.textContent = header.textContent.replace('[-]', '[+]');
            header.setAttribute('colspan', '1');
        }
    });
    
    // Hide all detail cells in the header
    const detailHeaders = document.querySelectorAll('.detail-cell');
    detailHeaders.forEach(cell => {
        cell.classList.add('hidden');
    });
    
    // Hide all detail cells in the table body
    const rows = document.querySelectorAll('#combined-mmmu-table tbody tr');
    rows.forEach(row => {
        // Hide arithmetic details (cells 2-4)
        for (let i = 2; i <= 4; i++) {
            if (row.cells[i]) row.cells[i].classList.add('hidden');
        }
        
        // Hide non-arithmetic details (cells 6-8)
        for (let i = 6; i <= 8; i++) {
            if (row.cells[i]) row.cells[i].classList.add('hidden');
        }
        
        // Hide overall details (cells 10-12)
        for (let i = 10; i <= 12; i++) {
            if (row.cells[i]) row.cells[i].classList.add('hidden');
        }
    });
}

function expandSection(sectionName) {
    // Update the header
    const header = document.getElementById(`${sectionName}-header`);
    if (header) {
        header.textContent = header.textContent.replace('[+]', '[-]');
        header.setAttribute('colspan', '4');
    }
    
    // Show the detail headers
    if (sectionName === 'arithmetic') {
        document.getElementById('arithmetic-detail-1')?.classList.remove('hidden');
        document.getElementById('arithmetic-detail-2')?.classList.remove('hidden');
        document.getElementById('arithmetic-detail-3')?.classList.remove('hidden');
    } else if (sectionName === 'no-arithmetic') {
        document.getElementById('no-arithmetic-detail-1')?.classList.remove('hidden');
        document.getElementById('no-arithmetic-detail-2')?.classList.remove('hidden');
        document.getElementById('no-arithmetic-detail-3')?.classList.remove('hidden');
    } else if (sectionName === 'overall') {
        document.getElementById('overall-detail-1')?.classList.remove('hidden');
        document.getElementById('overall-detail-2')?.classList.remove('hidden');
        document.getElementById('overall-detail-3')?.classList.remove('hidden');
    }
    
    // Show the detail cells in the table body
    const rows = document.querySelectorAll('#combined-mmmu-table tbody tr');
    rows.forEach(row => {
        if (sectionName === 'arithmetic') {
            // Show arithmetic details (cells 2-4)
            for (let i = 2; i <= 4; i++) {
                if (row.cells[i]) row.cells[i].classList.remove('hidden');
            }
        } else if (sectionName === 'no-arithmetic') {
            // Show non-arithmetic details (cells 6-8)
            for (let i = 6; i <= 8; i++) {
                if (row.cells[i]) row.cells[i].classList.remove('hidden');
            }
        } else if (sectionName === 'overall') {
            // Show overall details (cells 10-12)
            for (let i = 10; i <= 12; i++) {
                if (row.cells[i]) row.cells[i].classList.remove('hidden');
            }
        }
    });
}

function sortCombinedTable(header, forceDescending = false) {
    const table = header.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
    const sortType = header.getAttribute('data-sort');
    
    // First, clean up all headers in this table
    table.querySelectorAll('th').forEach(th => {
        // Remove sorted classes
        th.classList.remove('sorted-asc', 'sorted-desc');
        
        // Remove any existing sort indicators
        const originalText = th.textContent.replace(/ ↓$/, '');
        th.textContent = originalText;
    });

    // Add sorted class to current header
    header.classList.add('sorted-desc');
    
    // Add sort indicator to header text
    const cleanText = header.textContent.replace(/ ↓$/, '');
    header.textContent = cleanText + ' ↓';

    // Sort the rows (always descending)
    rows.sort((a, b) => {
        const aValue = a.children[columnIndex].textContent.trim();
        const bValue = b.children[columnIndex].textContent.trim();

        if (sortType === 'string') {
            return bValue.localeCompare(aValue);
        } else if (sortType === 'number') {
            const aNum = parseFloat(aValue.replace('%', ''));
            const bNum = parseFloat(bValue.replace('%', ''));
            if (isNaN(aNum)) return 1;
            if (isNaN(bNum)) return -1;
            return bNum - aNum;
        }
        return 0;
    });

    // Reorder the rows in the table
    rows.forEach(row => tbody.appendChild(row));
}

function adjustNameColumnWidth() {
    const nameColumn = document.querySelector('#combined-mmmu-table td:first-child');
    if (nameColumn) {
        const maxWidth = Math.min(300, Math.max(200, window.innerWidth * 0.25));
        document.querySelectorAll('#combined-mmmu-table td:first-child, #combined-mmmu-table th:first-child').forEach(cell => {
            cell.style.width = `${maxWidth}px`;
            cell.style.maxWidth = `${maxWidth}px`;
        });
    }
}

function applyStyleCombined(value, rank) {
    if (value === '-') return '-';
    if (rank === 1) return `<b>${value}</b>`;
    if (rank === 2) return `<u>${value}</u>`;
    return value;
}

// Add CSS styles for the combined table
const combinedTableStyle = document.createElement('style');
combinedTableStyle.textContent = `
    .mmmu-table th[class$="-header"] {
        cursor: pointer;
        text-align: center;
        white-space: nowrap;
        border-left: none !important;
        font-size: 15px;
        font-weight: bold;
    }

    .mmmu-table th {
        text-align: center;
        padding: 8px 4px;
        font-size: 15px;
        color: #1a1a1a;
        font-weight: bold;
    }
    
    .mmmu-table td {
        text-align: center;
        padding: 8px 4px;
        font-size: 14.5px;
        color: #1a1a1a;
        font-weight: normal;
    }

    .mmmu-table td:first-child {
        text-align: left;
        color: #0066cc;
        font-size: 16px;
        font-weight: bold;
    }

    .mmmu-table td[class$="-main"],
    .mmmu-table td[class$="-detail"] {
        border-left: none !important;
    }

    /* Style for the best score (bold) */
    .mmmu-table td b {
        color: #000;
        font-size: 14px;
        font-weight: 700;
    }

    /* Style for the second-best score (underlined) */
    .mmmu-table td u {
        color: #000000;
        font-size: 14px;
        font-weight: normal;
        text-decoration-thickness: 1.5px;
        text-underline-offset: 2px;
    }

    /* Make sure the table doesn't overflow */
    .mmmu-table {
        table-layout: fixed;
        width: 100%;
    }

    /* Add horizontal scroll if needed */
    .table-wrapper {
        overflow-x: auto;
    }

    /* Links in the table */
    .mmmu-table a {
        color: #0066cc;
        text-decoration: none;
        font-size: 16px;
        font-weight: bold;
    }

    .mmmu-table a:hover {
        text-decoration: underline;
    }

    /* Model column width */
    .mmmu-table td:first-child,
    .mmmu-table th:first-child {
        width: 300px !important;
        max-width: 300px !important;
        min-width: 300px !important;
        padding-left: 15px !important;
    }

    /* Default (collapsed) column widths */
    .mmmu-table td.arithmetic-main,
    .mmmu-table td.no-arithmetic-main,
    .mmmu-table td.consolidated-main {
        width: 70px !important;
        max-width: 70px !important;
    }

    /* Expanded column widths */
    .mmmu-table td.expanded {
        width: 35px !important;
        max-width: 35px !important;
        padding: 8px 1px !important;
        font-size: 13.5px !important;
    }

    /* Make text in expanded columns more compact */
    .mmmu-table td.expanded b,
    .mmmu-table td.expanded u {
        font-size: 13.5px !important;
    }

    /* Sorting indicators */
    .mmmu-table th.sorted-asc::after {
        content: " ↑";
    }

    .mmmu-table th.sorted-desc::after {
        content: " ↓";
    }
`;
document.head.appendChild(combinedTableStyle); 