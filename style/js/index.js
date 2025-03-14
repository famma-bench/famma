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
            // Load data for each table type
            loadTableForType('consolidated', data);
            loadTableForType('arithmetic', data);
            loadTableForType('no_arithmetic', data);
            
            // Setup tab switching after data is loaded
            setupTabSwitching();

            // Sort all tables by Overall Performance in descending order by default
            document.querySelectorAll('.mmmu-table').forEach(table => {
                const performanceHeader = table.querySelector('th.overall-main');
                if (performanceHeader) {
                    sortTable(performanceHeader, true); // true forces descending order
                }
            });
        })
        .catch(error => {
            console.error('Error loading table data:', error);
            document.querySelectorAll('.mmmu-table tbody').forEach(tbody => {
                tbody.innerHTML = `<tr><td colspan="17">Error loading data: ${error.message}</td></tr>`;
            });
        });
}

function loadTableForType(tableType, data) {
    const tbody = document.querySelector(`#${tableType}-mmmu-table tbody`);
    tbody.innerHTML = '';

    // Get model data for this table type
    const modelData = data.leaderboardData.map(model => ({
        info: model.info,
        ...model[tableType]  // Spread the data directly instead of nesting it
    })).filter(model => model.overall_acc !== undefined); // Filter out models that don't have data for this type

    // Prepare scores for styling
    const scores = prepareScoresForStyling(modelData);

    modelData.forEach((model, index) => {
        const tr = document.createElement('tr');
        tr.classList.add(model.info.type);

        // Create name cell with link if available
        const nameCell = model.info.link && model.info.link.trim() !== '' ?
            `<a href="${model.info.link}" target="_blank"><strong>${model.info.name}</strong></a>` :
            `<strong>${model.info.name}</strong>`;

        // Helper function to format percentage with styling
        const formatPercentage = (value, category) => {
            if (!value && value !== 0) return '-';
            const formatted = (value * 100).toFixed(2) + '%';
            const rank = scores[category]?.[index];
            return applyStyle(formatted, rank);
        };

        // Build row HTML with all columns and styling
        tr.innerHTML = `
            <td>${nameCell}</td>
            <td class="overall-main">${formatPercentage(model.overall_acc, 'overall')}</td>
            <td class="hidden overall-detail">${formatPercentage(model.overall_acc_by_language?.english, 'overall_english')}</td>
            <td class="hidden overall-detail">${formatPercentage(model.overall_acc_by_language?.chinese, 'overall_chinese')}</td>
            <td class="hidden overall-detail">${formatPercentage(model.overall_acc_by_language?.french, 'overall_french')}</td>
            <td class="easy-main">${formatPercentage(model.overall_acc_by_difficulty?.easy, 'easy')}</td>
            <td class="hidden easy-detail">${formatPercentage(model.overall_acc_by_difficulty_english?.easy, 'easy_english')}</td>
            <td class="hidden easy-detail">${formatPercentage(model.overall_acc_by_difficulty_chinese?.easy, 'easy_chinese')}</td>
            <td class="hidden easy-detail">${formatPercentage(model.overall_acc_by_difficulty_french?.easy, 'easy_french')}</td>
            <td class="medium-main">${formatPercentage(model.overall_acc_by_difficulty?.medium, 'medium')}</td>
            <td class="hidden medium-detail">${formatPercentage(model.overall_acc_by_difficulty_english?.medium, 'medium_english')}</td>
            <td class="hidden medium-detail">${formatPercentage(model.overall_acc_by_difficulty_chinese?.medium, 'medium_chinese')}</td>
            <td class="hidden medium-detail">${formatPercentage(model.overall_acc_by_difficulty_french?.medium, 'medium_french')}</td>
            <td class="hard-main">${formatPercentage(model.overall_acc_by_difficulty?.hard, 'hard')}</td>
            <td class="hidden hard-detail">${formatPercentage(model.overall_acc_by_difficulty_english?.hard, 'hard_english')}</td>
            <td class="hidden hard-detail">${formatPercentage(model.overall_acc_by_difficulty_chinese?.hard, 'hard_chinese')}</td>
            <td class="hidden hard-detail">${formatPercentage(model.overall_acc_by_difficulty_french?.hard, 'hard_french')}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function setupTabSwitching() {
    // Tab switching functionality
    const tabs = document.querySelectorAll('.table-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and content
            document.querySelectorAll('.table-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.table-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            const tableType = tab.getAttribute('data-table');
            tab.classList.add('active');
            document.getElementById(`${tableType}-table`).classList.add('active');
        });
    });
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

function prepareScoresForStyling(data) {
    const scores = {};
    const categories = [
        'overall', 'overall_english', 'overall_chinese', 'overall_french',
        'easy', 'easy_english', 'easy_chinese', 'easy_french',
        'medium', 'medium_english', 'medium_chinese', 'medium_french',
        'hard', 'hard_english', 'hard_chinese', 'hard_french'
    ];

    categories.forEach(category => {
        const values = data.map(model => {
            if (category === 'overall') return model.overall_acc;
            if (category.startsWith('overall_')) {
                const lang = category.split('_')[1];
                return model.overall_acc_by_language?.[lang];
            }
            const [diff, lang] = category.split('_');
            if (!lang) return model.overall_acc_by_difficulty?.[diff];
            return model[`overall_acc_by_difficulty_${lang}`]?.[diff];
        }).filter(v => v != null);

        if (values.length > 0) {
            const sortedValues = [...new Set(values)].sort((a, b) => b - a);
            scores[category] = data.map(model => {
                let value;
                if (category === 'overall') value = model.overall_acc;
                else if (category.startsWith('overall_')) {
                    const lang = category.split('_')[1];
                    value = model.overall_acc_by_language?.[lang];
                } else {
                    const [diff, lang] = category.split('_');
                    if (!lang) value = model.overall_acc_by_difficulty?.[diff];
                    else value = model[`overall_acc_by_difficulty_${lang}`]?.[diff];
                }
                if (value == null) return -1;
                return sortedValues.indexOf(value);
            });
        }
    });

    return scores;
}

function applyStyle(value, rank) {
    if (value === '-') return '-';
    if (rank === 0) return `<b>${value}</b>`;
    if (rank === 1) return `<u>${value}</u>`;
    return value;
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