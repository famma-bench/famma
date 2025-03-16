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

// Update the date mapping
const dateToTable = {
    'release_v2406': 'base', // Base table
    'release_v2501': 'live'  // Live table
};

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded');
  
  // Initialize the table after a short delay to ensure all elements are ready
  setTimeout(() => {
    loadAllTables();
  }, 100);
});

function loadAllTables() {
    console.log('Loading all tables');
    
    // Load base table
    fetch('./configs/release_v2406/leaderboard.json')
        .then(response => {
            if (!response.ok) {
                console.error(`HTTP error loading base data: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Base data loaded successfully');
            loadTable(data, 'base');
        })
        .catch(error => {
            console.error('Error loading base table data:', error);
            document.querySelector('#base-table tbody').innerHTML = 
                `<tr><td colspan="13">Error loading data: ${error.message}</td></tr>`;
        });
    
    // Load live table
    fetch('./configs/release_v2501/leaderboard.json')
        .then(response => {
            if (!response.ok) {
                console.error(`HTTP error loading live data: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Live data loaded successfully');
            loadTable(data, 'live');
        })
        .catch(error => {
            console.error('Error loading live table data:', error);
            document.querySelector('#live-table tbody').innerHTML = 
                `<tr><td colspan="13">Error loading data: ${error.message}</td></tr>`;
        });

    // After both tables are loaded, ensure sorting is set up
    setTimeout(() => {
        setupSimpleSorting('base');
        setupSimpleSorting('live');
    }, 800); // Give tables time to load
}

function loadTable(data, tableId) {
    console.log(`Loading ${tableId} table with data`);
    const tbody = document.querySelector(`#${tableId}-table tbody`);
    if (!tbody) {
        console.error(`#${tableId}-table tbody not found`);
        return;
    }
    
    tbody.innerHTML = '';

    if (!data || !data.leaderboardData || !Array.isArray(data.leaderboardData)) {
        console.error('Invalid data format:', data);
        tbody.innerHTML = '<tr><td colspan="13">Error: Invalid data format</td></tr>';
        return;
    }

    // Log the first model data to help debug the data structure
    console.log('First model data sample:', JSON.stringify(data.leaderboardData[0], null, 2));

    // Map the data to a more reliable structure
    const modelData = data.leaderboardData.map(model => {
        // Get arithmetic data with fallbacks
        const arithmetic = model.arithmetic || {};
        const arithmeticByDiff = arithmetic.overall_acc_by_difficulty || {};
        
        // Get non-arithmetic data with fallbacks
        const noArithmetic = model.no_arithmetic || {};
        const noArithmeticByDiff = noArithmetic.overall_acc_by_difficulty || {};
        
        // Get consolidated data with fallbacks
        const consolidated = model.consolidated || {};
        const consolidatedByDiff = consolidated.overall_acc_by_difficulty || {};
        
        return {
            info: model.info || { name: 'Unknown', type: 'unknown' },
            arithmetic: {
                overall: arithmetic.overall_acc || 0,
                easy: arithmeticByDiff.easy || 0,
                medium: arithmeticByDiff.medium || 0,
                hard: arithmeticByDiff.hard || 0
            },
            noArithmetic: {
                overall: noArithmetic.overall_acc || 0,
                easy: noArithmeticByDiff.easy || 0,
                medium: noArithmeticByDiff.medium || 0,
                hard: noArithmeticByDiff.hard || 0
            },
            consolidated: {
                overall: consolidated.overall_acc || 0,
                easy: consolidatedByDiff.easy || 0,
                medium: consolidatedByDiff.medium || 0,
                hard: consolidatedByDiff.hard || 0
            }
        };
    });

    // Sort models by consolidated overall accuracy (descending)
    modelData.sort((a, b) => b.consolidated.overall - a.consolidated.overall);

    // Find the best and second-best scores for all categories
    const bestScores = {
        arithmetic: {
            overall: findTopScores(modelData.map(m => m.arithmetic.overall)),
            easy: findTopScores(modelData.map(m => m.arithmetic.easy)),
            medium: findTopScores(modelData.map(m => m.arithmetic.medium)),
            hard: findTopScores(modelData.map(m => m.arithmetic.hard))
        },
        noArithmetic: {
            overall: findTopScores(modelData.map(m => m.noArithmetic.overall)),
            easy: findTopScores(modelData.map(m => m.noArithmetic.easy)),
            medium: findTopScores(modelData.map(m => m.noArithmetic.medium)),
            hard: findTopScores(modelData.map(m => m.noArithmetic.hard))
        },
        consolidated: {
            overall: findTopScores(modelData.map(m => m.consolidated.overall)),
            easy: findTopScores(modelData.map(m => m.consolidated.easy)),
            medium: findTopScores(modelData.map(m => m.consolidated.medium)),
            hard: findTopScores(modelData.map(m => m.consolidated.hard))
        }
    };

    // Create rows for each model
    modelData.forEach(model => {
        const row = document.createElement('tr');
        row.classList.add(model.info.type || 'unknown');
        
        // Format name cell
        const nameCell = document.createElement('td');
        nameCell.style.width = '200px';
        nameCell.style.maxWidth = '200px';
        
        if (model.info.link && model.info.link.trim()) {
            const link = document.createElement('a');
            link.href = model.info.link;
            link.target = '_blank';
            link.textContent = model.info.name || 'Unknown';
            nameCell.appendChild(link);
        } else {
            const name = document.createElement('strong');
            name.textContent = model.info.name || 'Unknown';
            nameCell.appendChild(name);
        }
        row.appendChild(nameCell);
        
        // Helper function to format percentages with styling
        const formatValueWithRank = (value, category, subcategory) => {
            const formatted = (value * 100).toFixed(2) + '%';
            
            if (Math.abs(value - bestScores[category][subcategory].best) < 0.0001) {
                return `<b>${formatted}</b>`;  // Bold for the best
            } else if (Math.abs(value - bestScores[category][subcategory].second) < 0.0001) {
                return `<u>${formatted}</u>`;  // Underline for the second best
            }
            
            return formatted;
        };
        
        // Add arithmetic cells
        const arithmeticMainCell = document.createElement('td');
        arithmeticMainCell.classList.add('arithmetic-main');
        arithmeticMainCell.innerHTML = formatValueWithRank(model.arithmetic.overall, 'arithmetic', 'overall');
        row.appendChild(arithmeticMainCell);
        
        // Arithmetic detail cells
        const arithmeticEasyCell = document.createElement('td');
        arithmeticEasyCell.classList.add('arithmetic-detail');
        arithmeticEasyCell.innerHTML = formatValueWithRank(model.arithmetic.easy, 'arithmetic', 'easy');
        row.appendChild(arithmeticEasyCell);
        
        const arithmeticMediumCell = document.createElement('td');
        arithmeticMediumCell.classList.add('arithmetic-detail');
        arithmeticMediumCell.innerHTML = formatValueWithRank(model.arithmetic.medium, 'arithmetic', 'medium');
        row.appendChild(arithmeticMediumCell);
        
        const arithmeticHardCell = document.createElement('td');
        arithmeticHardCell.classList.add('arithmetic-detail');
        arithmeticHardCell.innerHTML = formatValueWithRank(model.arithmetic.hard, 'arithmetic', 'hard');
        row.appendChild(arithmeticHardCell);
        
        // Non-arithmetic cells
        const noArithmeticMainCell = document.createElement('td');
        noArithmeticMainCell.classList.add('no-arithmetic-main');
        noArithmeticMainCell.innerHTML = formatValueWithRank(model.noArithmetic.overall, 'noArithmetic', 'overall');
        row.appendChild(noArithmeticMainCell);
        
        // Non-arithmetic detail cells
        const noArithmeticEasyCell = document.createElement('td');
        noArithmeticEasyCell.classList.add('no-arithmetic-detail');
        noArithmeticEasyCell.innerHTML = formatValueWithRank(model.noArithmetic.easy, 'noArithmetic', 'easy');
        row.appendChild(noArithmeticEasyCell);
        
        const noArithmeticMediumCell = document.createElement('td');
        noArithmeticMediumCell.classList.add('no-arithmetic-detail');
        noArithmeticMediumCell.innerHTML = formatValueWithRank(model.noArithmetic.medium, 'noArithmetic', 'medium');
        row.appendChild(noArithmeticMediumCell);
        
        const noArithmeticHardCell = document.createElement('td');
        noArithmeticHardCell.classList.add('no-arithmetic-detail');
        noArithmeticHardCell.innerHTML = formatValueWithRank(model.noArithmetic.hard, 'noArithmetic', 'hard');
        row.appendChild(noArithmeticHardCell);
        
        // Overall (consolidated) cells
        const consolidatedMainCell = document.createElement('td');
        consolidatedMainCell.classList.add('overall-main');
        consolidatedMainCell.innerHTML = formatValueWithRank(model.consolidated.overall, 'consolidated', 'overall');
        row.appendChild(consolidatedMainCell);
        
        // Overall detail cells (hidden by default)
        const consolidatedEasyCell = document.createElement('td');
        consolidatedEasyCell.classList.add('overall-detail', 'hidden');
        consolidatedEasyCell.innerHTML = formatValueWithRank(model.consolidated.easy, 'consolidated', 'easy');
        row.appendChild(consolidatedEasyCell);
        
        const consolidatedMediumCell = document.createElement('td');
        consolidatedMediumCell.classList.add('overall-detail', 'hidden');
        consolidatedMediumCell.innerHTML = formatValueWithRank(model.consolidated.medium, 'consolidated', 'medium');
        row.appendChild(consolidatedMediumCell);
        
        const consolidatedHardCell = document.createElement('td');
        consolidatedHardCell.classList.add('overall-detail', 'hidden');
        consolidatedHardCell.innerHTML = formatValueWithRank(model.consolidated.hard, 'consolidated', 'hard');
        row.appendChild(consolidatedHardCell);
        
        // Add the row to the table
        tbody.appendChild(row);
    });
    
    console.log('Table loaded successfully with', modelData.length, 'rows');

    // Update column visibility
    updateTableColumnVisibility(tableId);
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
    document.querySelectorAll('#combined-mmmu-table td:first-child, #combined-mmmu-table th:first-child').forEach(cell => {
        cell.style.width = '200px';
        cell.style.maxWidth = '200px';
        cell.style.minWidth = '200px';
    });
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

    /* Model column width - make it narrower */
    .mmmu-table td:first-child,
    .mmmu-table th:first-child {
        width: 200px !important;
        max-width: 200px !important;
        min-width: 200px !important;
        padding-left: 10px !important;
    }
    
    /* Make model names wrap if needed */
    .mmmu-table td:first-child a,
    .mmmu-table td:first-child strong {
        white-space: normal;
        word-break: break-word;
    }
    
    /* Adjust the expanded column widths to be more balanced */
    .mmmu-table td.arithmetic-detail,
    .mmmu-table td.no-arithmetic-detail,
    .mmmu-table td.overall-detail,
    .mmmu-table th.detail-cell {
        width: 60px !important;
        max-width: 60px !important;
        padding: 8px 2px !important;
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

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(adjustNameColumnWidth, 500);
});

// Add this function to ensure columns are properly shown/hidden
function updateTableColumnVisibility(tableId) {
    console.log(`Updating column visibility for ${tableId} table`);
    
    // Check which sections are expanded from the headers
    const arithmeticExpanded = document.getElementById(`arithmetic-header-${tableId}`).getAttribute('colspan') === '4';
    const noArithmeticExpanded = document.getElementById(`no-arithmetic-header-${tableId}`).getAttribute('colspan') === '4';
    const overallExpanded = document.getElementById(`overall-header-${tableId}`).getAttribute('colspan') === '4';
    
    console.log('Section state:', {
        arithmetic: arithmeticExpanded ? 'expanded' : 'collapsed',
        noArithmetic: noArithmeticExpanded ? 'expanded' : 'collapsed',
        overall: overallExpanded ? 'expanded' : 'collapsed'
    });
    
    // Update detail cells in table body
    const rows = document.querySelectorAll(`#${tableId}-table tbody tr`);
    rows.forEach(row => {
        // Handle arithmetic details (cells 2-4)
        for (let i = 2; i <= 4; i++) {
            if (row.cells[i]) {
                if (arithmeticExpanded) {
                    row.cells[i].classList.remove('hidden');
                } else {
                    row.cells[i].classList.add('hidden');
                }
            }
        }
        
        // Handle non-arithmetic details (cells 6-8)
        for (let i = 6; i <= 8; i++) {
            if (row.cells[i]) {
                if (noArithmeticExpanded) {
                    row.cells[i].classList.remove('hidden');
                } else {
                    row.cells[i].classList.add('hidden');
                }
            }
        }
        
        // Handle overall details (cells 10-12)
        for (let i = 10; i <= 12; i++) {
            if (row.cells[i]) {
                if (overallExpanded) {
                    row.cells[i].classList.remove('hidden');
                } else {
                    row.cells[i].classList.add('hidden');
                }
            }
        }
    });
    
    console.log('Column visibility updated');
}

// Fix the toggleTableSection function to update both tables
function toggleTableSection(section, tableId) {
    console.log(`Toggling section ${section} for table ${tableId}`);
    
    const header = document.getElementById(`${section}-header-${tableId}`);
    if (!header) {
        console.error(`Header element ${section}-header-${tableId} not found`);
        return;
    }
    
    const isExpanded = header.getAttribute('colspan') === '4';
    
    // Toggle this section
    if (isExpanded) {
        // Collapse
        header.setAttribute('colspan', '1');
        header.textContent = header.textContent.replace('[-]', '[+]');
        
        // Hide detail headers and cells
        for (let i = 1; i <= 3; i++) {
            const detailEl = document.getElementById(`${section}-detail-${i}-${tableId}`);
            if (detailEl) detailEl.classList.add('hidden');
            
            // Also add hidden class to the corresponding detail cells in tbody
            const detailCells = document.querySelectorAll(`#${tableId}-table tbody td.${section}-detail`);
            detailCells.forEach(cell => cell.classList.add('hidden'));
        }
    } else {
        // Expand
        header.setAttribute('colspan', '4');
        header.textContent = header.textContent.replace('[+]', '[-]');
        
        // Show detail headers and cells
        for (let i = 1; i <= 3; i++) {
            const detailEl = document.getElementById(`${section}-detail-${i}-${tableId}`);
            if (detailEl) detailEl.classList.remove('hidden');
            
            // Also remove hidden class from the corresponding detail cells in tbody
            const detailCells = document.querySelectorAll(`#${tableId}-table tbody td.${section}-detail`);
            detailCells.forEach(cell => cell.classList.remove('hidden'));
        }
    }
    
    // Update column visibility
    updateTableColumnVisibility(tableId);
}

// Add this CSS to create vertical separators between sections
const sectionSeparatorStyle = document.createElement('style');
sectionSeparatorStyle.textContent = `
    /* Add vertical separators between main sections */
    .mmmu-table th[id^="arithmetic-header"],
    .mmmu-table th[id^="no-arithmetic-header"],
    .mmmu-table th[id^="overall-header"] {
        border-left: 2px solid #d0d0d0 !important;
    }
    
    /* Add vertical separators for the detail headers */
    .mmmu-table th[id^="arithmetic-main"],
    .mmmu-table th[id^="no-arithmetic-main"],
    .mmmu-table th[id^="overall-main"] {
        border-left: 2px solid #d0d0d0 !important;
    }
    
    /* Add vertical separators for data cells */
    .mmmu-table td.arithmetic-main,
    .mmmu-table td.no-arithmetic-main,
    .mmmu-table td.overall-main {
        border-left: 2px solid #d0d0d0 !important;
    }
    
    /* Last cell in each detail section gets a right border */
    .mmmu-table tr td:nth-child(5),
    .mmmu-table tr td:nth-child(9) {
        border-right: 2px solid #d0d0d0 !important;
    }
    
    /* Same for header cells */
    .mmmu-table tr th:nth-child(5),
    .mmmu-table tr th:nth-child(9) {
        border-right: 2px solid #d0d0d0 !important;
    }
    
    /* Add right border to Pass@1 columns to separate from detail columns */
    .mmmu-table th[id$="-main-base"],
    .mmmu-table th[id$="-main-live"] {
        border-right: 1px solid #e0e0e0 !important;
    }
    
    /* Add right border to Pass@1 data cells */
    .mmmu-table td.arithmetic-main,
    .mmmu-table td.no-arithmetic-main,
    .mmmu-table td.overall-main {
        border-right: 1px solid #e0e0e0 !important;
    }
`;
document.head.appendChild(sectionSeparatorStyle);

// Helper function to find the top two scores in an array
function findTopScores(values) {
    if (!values || values.length === 0) {
        return { best: 0, second: 0 };
    }
    
    const sortedValues = [...values].sort((a, b) => b - a);
    
    return {
        best: sortedValues[0],
        second: sortedValues.length > 1 ? sortedValues[1] : sortedValues[0]
    };
}

// Completely rewrite the sortTableByColumn function for simplicity and reliability
function sortTableByColumn(tableId, columnName, direction = 'desc') {
    console.log(`Sorting ${tableId} table by ${columnName} column in ${direction} direction`);
    
    const table = document.getElementById(`${tableId}-table`);
    if (!table) {
        console.error(`Table #${tableId}-table not found`);
        return;
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    // Get all rows
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) {
        console.warn('No rows to sort');
        return;
    }
    
    // Map column names to indices
    const columnMap = {
        'model': 0,
        'arithmetic': 1,
        'arithmetic-easy': 2,
        'arithmetic-medium': 3,
        'arithmetic-hard': 4,
        'noarithmetic': 5,
        'noarithmetic-easy': 6,
        'noarithmetic-medium': 7,
        'noarithmetic-hard': 8,
        'overall': 9,
        'overall-easy': 10,
        'overall-medium': 11,
        'overall-hard': 12
    };
    
    const columnIndex = columnMap[columnName];
    if (columnIndex === undefined) {
        console.error(`Unknown column name: ${columnName}`);
        return;
    }
    
    console.log(`Sorting by column index ${columnIndex}`);
    
    // Sort the rows
    rows.sort((rowA, rowB) => {
        const cellA = rowA.cells[columnIndex];
        const cellB = rowB.cells[columnIndex];
        
        if (!cellA || !cellB) {
            console.warn(`Missing cells at index ${columnIndex}`);
            return 0;
        }
        
        const valueA = parseFloat(cellA.textContent.replace('%', ''));
        const valueB = parseFloat(cellB.textContent.replace('%', ''));
        
        if (isNaN(valueA) || isNaN(valueB)) {
            console.warn(`Non-numeric values: ${cellA.textContent}, ${cellB.textContent}`);
            return 0;
        }
        
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
    });
    
    // Clear and repopulate table
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    rows.forEach(row => tbody.appendChild(row));
    
    // Update sort indicators on headers
    const headers = table.querySelectorAll('th.sortable');
    headers.forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
        
        if (header.id === `${columnName}-main-${tableId}`) {
            header.classList.add(`sorted-${direction}`);
        }
    });
    
    console.log(`Sort complete for ${tableId} table`);
}

// Simplify the setup of table sorting
function setupSimpleSorting(tableId) {
    console.log(`Setting up simple sorting for ${tableId} table`);
    
    // Add click handlers to sortable headers
    const arithmeticHeader = document.getElementById(`arithmetic-main-${tableId}`);
    const noArithmeticHeader = document.getElementById(`no-arithmetic-main-${tableId}`);
    const overallHeader = document.getElementById(`overall-main-${tableId}`);
    
    if (arithmeticHeader) {
        arithmeticHeader.addEventListener('click', function() {
            const direction = this.classList.contains('sorted-desc') ? 'asc' : 'desc';
            sortTableByColumn(tableId, 'arithmetic', direction);
        });
    }
    
    if (noArithmeticHeader) {
        noArithmeticHeader.addEventListener('click', function() {
            const direction = this.classList.contains('sorted-desc') ? 'asc' : 'desc';
            sortTableByColumn(tableId, 'noarithmetic', direction);
        });
    }
    
    if (overallHeader) {
        overallHeader.addEventListener('click', function() {
            const direction = this.classList.contains('sorted-desc') ? 'asc' : 'desc';
            sortTableByColumn(tableId, 'overall', direction);
        });
        
        // Default sort by overall column
        overallHeader.classList.add('sorted-desc');
        sortTableByColumn(tableId, 'overall', 'desc');
    }
}

// Remove any setTimeout calls that might be confusing the process
function initializeTables() {
    // Load data for both tables
    loadAllTables();
    
    // Wait for tables to be populated, then set up sorting
    setTimeout(() => {
        setupSimpleSorting('base');
        setupSimpleSorting('live');
    }, 1000);
}

// Clean starting point
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing tables');
    initializeTables();
});

// Add this CSS to make sure sorting indicators are visible
const sortIndicatorStyle = document.createElement('style');
sortIndicatorStyle.textContent = `
    /* More prominent sorting indicators */
    .mmmu-table th.sortable {
        cursor: pointer;
        position: relative;
    }
    
    .mmmu-table th.sortable:hover {
        background-color: #f5f5f5;
    }
    
    .mmmu-table th.sorted-asc::after {
        content: " ↑";
        color: #3273dc;
        font-weight: bold;
    }
    
    .mmmu-table th.sorted-desc::after {
        content: " ↓";
        color: #3273dc;
        font-weight: bold;
    }
`;
document.head.appendChild(sortIndicatorStyle); 