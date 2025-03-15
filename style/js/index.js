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

document.addEventListener('DOMContentLoaded', function() {
  loadTableData();
  setupEventListeners();
  initializeSorting();
  window.addEventListener('resize', adjustNameColumnWidth);

  const slider = document.querySelector('.slider input');
  const tooltip = document.querySelector('.date-tooltip');
  const dates = ['2024-06', '2025-01'];

  function updateTooltipAndData(value) {
    tooltip.textContent = dates[value];
    loadTableData();  // Load new data when slider changes
  }

  // Add event listener for slider changes
  slider.addEventListener('input', function() {
    updateTooltipAndData(this.value);
  });

  // Initialize with default value
  updateTooltipAndData(slider.value);
});

function loadTableData() {
    console.log('Starting to load table data...');
    const selectedDate = document.querySelector('.slider input').value;
    console.log('Selected date:', selectedDate);
    const releaseVersion = dateToRelease[selectedDate];

    fetch(`./configs/${releaseVersion}/leaderboard.json`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            // Load data for the combined table
            loadCombinedTable(data);
            
            // Sort by consolidated performance by default
            const consolidatedHeader = document.querySelector('th.consolidated-main');
            if (consolidatedHeader) {
                sortTable(consolidatedHeader, true); // true forces descending order
            }
        })
        .catch(error => {
            console.error('Error loading table data:', error);
            document.querySelector('#combined-mmmu-table tbody').innerHTML = 
                `<tr><td colspan="13">Error loading data: ${error.message}</td></tr>`;
        });
}

function loadCombinedTable(data) {
    const tbody = document.querySelector('#combined-mmmu-table tbody');
    tbody.innerHTML = '';

    // Get all models
    const modelData = data.leaderboardData.map(model => ({
        info: model.info,
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
        const tr = document.createElement('tr');
        tr.classList.add(model.info.type);

        // Create name cell with link if available
        const nameCell = model.info.link && model.info.link.trim() !== '' ?
            `<a href="${model.info.link}" target="_blank"><strong>${model.info.name}</strong></a>` :
            `<strong>${model.info.name}</strong>`;

        // Helper function to format percentage with styling
        const formatPercentage = (value, category, rank) => {
            if (!value && value !== 0) return '-';
            const formatted = (value * 100).toFixed(2) + '%';
            return applyStyle(formatted, rank);
        };

        // Build row HTML with all columns and styling
        tr.innerHTML = `
            <td>${nameCell}</td>
            
            <!-- Arithmetic section -->
            <td class="arithmetic-main">${formatPercentage(model.arithmetic.overall_acc, 'arithmetic_overall', scores.arithmetic.overall[index])}</td>
            <td class="hidden arithmetic-detail">${formatPercentage(model.arithmetic.overall_acc_by_difficulty?.easy, 'arithmetic_easy', scores.arithmetic.easy[index])}</td>
            <td class="hidden arithmetic-detail">${formatPercentage(model.arithmetic.overall_acc_by_difficulty?.medium, 'arithmetic_medium', scores.arithmetic.medium[index])}</td>
            <td class="hidden arithmetic-detail">${formatPercentage(model.arithmetic.overall_acc_by_difficulty?.hard, 'arithmetic_hard', scores.arithmetic.hard[index])}</td>
            
            <!-- Non-Arithmetic section -->
            <td class="no-arithmetic-main">${formatPercentage(model.no_arithmetic.overall_acc, 'no_arithmetic_overall', scores.no_arithmetic.overall[index])}</td>
            <td class="hidden no-arithmetic-detail">${formatPercentage(model.no_arithmetic.overall_acc_by_difficulty?.easy, 'no_arithmetic_easy', scores.no_arithmetic.easy[index])}</td>
            <td class="hidden no-arithmetic-detail">${formatPercentage(model.no_arithmetic.overall_acc_by_difficulty?.medium, 'no_arithmetic_medium', scores.no_arithmetic.medium[index])}</td>
            <td class="hidden no-arithmetic-detail">${formatPercentage(model.no_arithmetic.overall_acc_by_difficulty?.hard, 'no_arithmetic_hard', scores.no_arithmetic.hard[index])}</td>
            
            <!-- Consolidated section -->
            <td class="consolidated-main">${formatPercentage(model.consolidated.overall_acc, 'consolidated_overall', scores.consolidated.overall[index])}</td>
            <td class="hidden consolidated-detail">${formatPercentage(model.consolidated.overall_acc_by_difficulty?.easy, 'consolidated_easy', scores.consolidated.easy[index])}</td>
            <td class="hidden consolidated-detail">${formatPercentage(model.consolidated.overall_acc_by_difficulty?.medium, 'consolidated_medium', scores.consolidated.medium[index])}</td>
            <td class="hidden consolidated-detail">${formatPercentage(model.consolidated.overall_acc_by_difficulty?.hard, 'consolidated_hard', scores.consolidated.hard[index])}</td>
        `;
        
        tbody.appendChild(tr);
    });

    // Setup expand/collapse functionality
    setupExpandCollapse();
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

function setupExpandCollapse() {
    // Setup expand/collapse for each section
    ['arithmetic', 'no-arithmetic', 'consolidated'].forEach(section => {
        const header = document.querySelector(`.${section}-header`);
        if (header) {
            header.addEventListener('click', function() {
                const mainCells = document.querySelectorAll(`.${section}-main`);
                const detailCells = document.querySelectorAll(`.${section}-detail`);
                
                if (detailCells[0].classList.contains('hidden')) {
                    // Expand
                    detailCells.forEach(cell => {
                        cell.classList.remove('hidden');
                        cell.classList.add('expanded');
                    });
                    mainCells.forEach(cell => {
                        cell.classList.add('expanded');
                    });
                    this.textContent = this.textContent.replace('[+]', '[-]');
                } else {
                    // Collapse
                    detailCells.forEach(cell => {
                        cell.classList.add('hidden');
                        cell.classList.remove('expanded');
                    });
                    mainCells.forEach(cell => {
                        cell.classList.remove('expanded');
                    });
                    this.textContent = this.textContent.replace('[-]', '[+]');
                }
            });
        }
    });
}

function applyStyle(value, rank) {
    if (rank === 1) return `<b>${value}</b>`;
    if (rank === 2) return `<u>${value}</u>`;
    return value;
}

function setupEventListeners() {
    // Setup sorting
    const sortableHeaders = document.querySelectorAll('.mmmu-table th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => sortTable(header));
    });

    // Setup expanding/collapsing
    const sectionHeaders = document.querySelectorAll('.mmmu-table th[class$="-header"]');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
    });
}

function toggleSection(header) {
    const section = header.className.replace('-header', '');
    const isExpanded = header.textContent.includes('[-]');
    const table = header.closest('table');

    // Get all section headers
    const sections = ['overall', 'easy', 'medium', 'hard'];
    
    // First collapse all sections
    sections.forEach(sec => {
        const secHeader = table.querySelector(`.${sec}-header`);
        const secMainCells = table.querySelectorAll(`.${sec}-main`);
        const secDetailCells = table.querySelectorAll(`.${sec}-detail`);
        
        // Remove expanded class and hide detail cells for all sections
        if (sec !== section || isExpanded) {
            if (secHeader.textContent.includes('[-]')) {
                secHeader.textContent = secHeader.textContent.replace('[-]', '[+]');
            }
            secMainCells.forEach(cell => {
                cell.classList.remove('hidden', 'expanded');
            });
            secDetailCells.forEach(cell => {
                cell.classList.add('hidden');
                cell.classList.remove('expanded');
            });
            secHeader.setAttribute('colspan', '1');
        }
    });

    // If we're expanding the clicked section
    if (!isExpanded) {
        header.textContent = header.textContent.replace('[+]', '[-]');
        const mainCells = table.querySelectorAll(`.${section}-main`);
        const detailCells = table.querySelectorAll(`.${section}-detail`);
        
        mainCells.forEach(cell => {
            cell.classList.add('expanded');
        });
        detailCells.forEach(cell => {
            cell.classList.remove('hidden');
            cell.classList.add('expanded');
        });
        
        // Set colspan for the header
        header.setAttribute('colspan', '4');
    }
}

function sortTable(header, forceDescending = false) {
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

function initializeSorting() {
    // Add expansion indicators [+] to section headers
    document.querySelectorAll('.mmmu-table th[class$="-header"]').forEach(header => {
        if (!header.textContent.includes('[+]') && !header.textContent.includes('[-]')) {
            header.textContent = header.textContent + ' [+]';
        }
    });

    // Add sorting indicators to sortable headers
    document.querySelectorAll('.mmmu-table th.sortable').forEach(header => {
        if (header.textContent.includes('Performance')) {
            header.textContent = 'Performance ↓';
            header.classList.add('sorted-desc');
        }
    });

    // Perform the initial sort on Performance column for each table
    document.querySelectorAll('.mmmu-table').forEach(table => {
        const performanceHeader = table.querySelector('th[data-sort="number"]');
        if (performanceHeader) {
            sortTable(performanceHeader);  // Sort descending by default
        }
    });
}

function adjustNameColumnWidth() {
    const tables = document.querySelectorAll('.mmmu-table');
    tables.forEach(table => {
        const nameColumn = table.querySelector('td:first-child');
        if (nameColumn) {
            const maxWidth = Math.min(300, Math.max(200, window.innerWidth * 0.25));
            table.querySelectorAll('td:first-child, th:first-child').forEach(cell => {
                cell.style.width = `${maxWidth}px`;
                cell.style.maxWidth = `${maxWidth}px`;
            });
        }
    });
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .mmmu-table th[class$="-header"] {
        cursor: pointer;
        text-align: center;
        white-space: nowrap;
        border-left: none !important;
        font-size: 15px;
        font-weight: bold;  /* Make headers bold */
    }

    .mmmu-table th {
        text-align: center;
        padding: 8px 4px;
        font-size: 15px;
        color: #1a1a1a;  /* Darker text for better contrast */
        font-weight: bold;  /* Make all headers bold */
    }
    
    .mmmu-table td {
        text-align: center;
        padding: 8px 4px;
        font-size: 14.5px;
        color: #1a1a1a;  /* Darker text for better contrast */
        font-weight: normal;  /* Regular weight for all cells */
    }

    .mmmu-table td:first-child {
        text-align: left;
        color: #0066cc;  /* Blue color for model names */
        font-size: 16px;  /* Larger font size for model names */
        font-weight: bold;  /* Make model names bold */
    }

    .mmmu-table td[class$="-main"],
    .mmmu-table td[class$="-detail"] {
        border-left: none !important;
    }

    /* Style for the best score (bold) */
    .mmmu-table td b {
        color: #000;  /* Darker color for bold (best) scores */
        font-size: 14px;
        font-weight: 700;  /* Keep bold only for the best scores */
    }

    /* Style for the second-best score (underlined) */
    .mmmu-table td u {
        color: #000000;
        font-size: 14px;
        font-weight: normal;  /* Regular weight for second-best */
        text-decoration-thickness: 1.5px;
        text-underline-offset: 2px;
    }

    /* Make sure the table doesn't overflow */
    .mmmu-table {
        table-layout: fixed;
        width: 100%;
    }

    /* Add horizontal scroll if needed */
    .table-container {
        overflow-x: auto;
    }

    /* Links in the table */
    .mmmu-table a {
        color: #0066cc;
        text-decoration: none;
        font-size: 16px;  /* Larger font size for model name links */
        font-weight: bold;  /* Make model name links bold */
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
    .mmmu-table td.overall-main,
    .mmmu-table td.easy-main,
    .mmmu-table td.medium-main,
    .mmmu-table td.hard-main {
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

    /* Adjust table layout */
    .mmmu-table {
        table-layout: fixed;
        width: 100%;
    }

    .table-wrapper {
        overflow-x: auto;
        max-width: 100%;
    }

    /* Make text in expanded columns more compact */
    .mmmu-table td.expanded b,
    .mmmu-table td.expanded u {
        font-size: 13.5px !important;
    }

    /* Remove the old sorting indicators */
    .mmmu-table th.sorted-asc::after,
    .mmmu-table th.sorted-desc::after {
        content: "";
    }
`;
document.head.appendChild(style);