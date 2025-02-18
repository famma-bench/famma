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
            const tbody = document.querySelector('#mmmu-table tbody');
            tbody.innerHTML = '';

            // Prepare scores for styling
            const scores = prepareScoresForStyling(data.leaderboardData);

            data.leaderboardData.forEach((model, index) => {
                const tr = document.createElement('tr');
                tr.classList.add(model.info.type);

                // Create name cell with link if available
                const nameCell = model.info.link && model.info.link.trim() !== '' ?
                    `<a href="${model.info.link}" target="_blank">${model.info.name}</a>` :
                    model.info.name;

                // Helper function to format percentage with styling
                const formatPercentage = (value, category) => {
                    if (!value) return '-';
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

            initializeSorting();
        })
        .catch(error => {
            console.error('Error loading table data:', error);
            const tbody = document.querySelector('#mmmu-table tbody');
            tbody.innerHTML = `<tr><td colspan="17">Error loading data: ${error.message}</td></tr>`;
        });
}

function setupEventListeners() {
    // Setup sorting
    const sortableHeaders = document.querySelectorAll('#mmmu-table th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => sortTable(header));
    });

    // Setup expanding/collapsing
    const sectionHeaders = document.querySelectorAll('#mmmu-table th[class$="-header"]');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
    });
}

function toggleSection(header) {
    const section = header.className.replace('-header', '');
    const isExpanded = header.textContent.includes('[-]');

    // Get all section headers
    const sections = ['overall', 'easy', 'medium', 'hard'];
    
    // First collapse all sections
    sections.forEach(sec => {
        const secHeader = document.querySelector(`.${sec}-header`);
        const secMainCells = document.querySelectorAll(`.${sec}-main`);
        const secDetailCells = document.querySelectorAll(`.${sec}-detail`);
        const secDetailHeaders = document.querySelectorAll(`.${sec}-detail-header`);
        
        // Remove highlight from all sections
        secDetailCells.forEach(cell => cell.style.backgroundColor = '');
        secMainCells.forEach(cell => cell.style.backgroundColor = '');
        secDetailHeaders.forEach(header => header.style.backgroundColor = '');
        
        // If this is not the clicked section, or if we're collapsing the clicked section
        if (sec !== section || isExpanded) {
            if (secHeader.textContent.includes('[-]')) {
                secHeader.textContent = secHeader.textContent.replace('[-]', '[+]');
            }
            secMainCells.forEach(cell => {
                cell.classList.remove('hidden');
                cell.style.width = '80px';
            });
            secDetailCells.forEach(cell => {
                cell.classList.add('hidden');
                cell.style.width = '';
            });
            secHeader.setAttribute('colspan', '1');
        }
    });

    // If we're expanding the clicked section
    if (!isExpanded) {
        // Expand only the clicked section
        header.textContent = header.textContent.replace('[+]', '[-]');
        const mainCells = document.querySelectorAll(`.${section}-main`);
        const detailCells = document.querySelectorAll(`.${section}-detail`);
        const detailHeaders = document.querySelectorAll(`.${section}-detail-header`);
        
        // Add highlight to expanded section
        const highlightColor = '#f0fff0';  // Light gray background
        detailCells.forEach(cell => cell.style.backgroundColor = highlightColor);
        mainCells.forEach(cell => cell.style.backgroundColor = highlightColor);
        detailHeaders.forEach(header => header.style.backgroundColor = highlightColor);
        
        mainCells.forEach(cell => {
            cell.classList.remove('hidden');
            cell.style.width = '60px';  // Reduced width for expanded view
        });
        detailCells.forEach(cell => {
            cell.classList.remove('hidden');
            cell.style.width = '60px';  // Reduced width for expanded view
        });
        header.setAttribute('colspan', '4');
    }
}

function resetTable() {
  document.querySelectorAll('.pro-details, .val-details, .test-details').forEach(function(cell) {
    cell.classList.add('hidden');
  });

  document.querySelectorAll('.pro-overall, .val-overall, .test-overall').forEach(function(cell) {
    cell.classList.remove('hidden');
  });

  document.querySelector('.pro-details-cell').setAttribute('colspan', '1');
  document.querySelector('.val-details-cell').setAttribute('colspan', '1');
  document.querySelector('.test-details-cell').setAttribute('colspan', '1');

  var valOverallHeader = document.querySelector('#mmmu-table thead tr:last-child th.val-overall');
  sortTable(valOverallHeader, true);

  setTimeout(adjustNameColumnWidth, 0);
}

function sortTable(header, forceDescending = false, maintainOrder = false) {
    var table = document.getElementById('mmmu-table');
    if (!table) {
        console.error('Table with id "mmmu-table" not found');
        return;
    }

    var tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    var rows = Array.from(tbody.querySelectorAll('tr'));
    if (!rows || rows.length === 0) {
        console.error('No rows found in table');
        return;
    }

    var headers = Array.from(header.parentNode.children);
    var columnIndex = headers.indexOf(header);
    var sortType = header.dataset.sort;

    var isDescending = forceDescending || (!header.classList.contains('asc') && !header.classList.contains('desc')) || header.classList.contains('asc');

    if (!maintainOrder) {
        rows.sort(function(a, b) {
            var aValue = getCellValue(a, columnIndex);
            var bValue = getCellValue(b, columnIndex);

            if (aValue === '-' && bValue !== '-') return isDescending ? 1 : -1;
            if (bValue === '-' && aValue !== '-') return isDescending ? -1 : 1;

            if (sortType === 'number') {
                // Remove % sign and convert to number
                aValue = parseFloat(aValue.replace('%', '')) || 0;
                bValue = parseFloat(bValue.replace('%', '')) || 0;
                return isDescending ? bValue - aValue : aValue - bValue;
            } else {
                return isDescending ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
            }
        });
    }

    // Update sort direction indicators
    headers.forEach(function(th) {
        th.classList.remove('asc', 'desc');
    });
    header.classList.add(isDescending ? 'desc' : 'asc');

    // Reorder rows
    rows.forEach(function(row) {
        tbody.appendChild(row);
    });
}

function getCellValue(row, index) {
    var cells = Array.from(row.children);
    var cell = cells[index];

    if (!cell) {
        console.error('Cell not found at index:', index);
        return '';
    }

    if (cell.classList.contains('hidden')) {
        if (cell.classList.contains('pro-details') || cell.classList.contains('pro-overall')) {
            cell = cells.find(c => (c.classList.contains('pro-overall') || c.classList.contains('pro-details')) && !c.classList.contains('hidden'));
        } else if (cell.classList.contains('val-details') || cell.classList.contains('val-overall')) {
            cell = cells.find(c => (c.classList.contains('val-overall') || c.classList.contains('val-details')) && !c.classList.contains('hidden'));
        } else if (cell.classList.contains('test-details') || cell.classList.contains('test-overall')) {
            cell = cells.find(c => (c.classList.contains('test-overall') || c.classList.contains('test-details')) && !c.classList.contains('hidden'));
        }
    }

    return cell ? cell.textContent.trim() : '';
}

function initializeSorting() {
    console.log('Attempting to sort table...');
    
    // Add expansion indicators [+] to section headers
    const headers = document.querySelectorAll('#mmmu-table th');
    headers.forEach(header => {
        if (header.classList.contains('overall-header') || 
            header.classList.contains('easy-header') || 
            header.classList.contains('medium-header') || 
            header.classList.contains('hard-header')) {
            if (!header.textContent.includes('[+]')) {
                header.textContent = header.textContent + ' [+]';
            }
        }
    });

    // Perform the initial sort on Performance column
    const performanceHeader = document.querySelector('#mmmu-table th[data-sort="number"]');
    if (performanceHeader) {
        sortTable(performanceHeader, true);  // Force descending order
    } else {
        console.error('Could not find performance header');
    }
}

function adjustNameColumnWidth() {
    const nameColumn = document.querySelectorAll('#mmmu-table td:first-child, #mmmu-table th:first-child');
    let maxWidth = 0;

    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'nowrap';
    document.body.appendChild(span);

    nameColumn.forEach(cell => {
        span.textContent = cell.textContent;
        const width = span.offsetWidth;
        if (width > maxWidth) {
            maxWidth = width;
        }
    });

    document.body.removeChild(span);

    maxWidth += 60;  // Increased padding from 20 to 60

    nameColumn.forEach(cell => {
        cell.style.width = `${maxWidth}px`;
        cell.style.minWidth = `${maxWidth}px`;
        cell.style.maxWidth = `${maxWidth}px`;
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
    #mmmu-table th[class$="-header"] {
        cursor: pointer;
        text-align: center;
        white-space: nowrap;
        border-left: none !important;
        font-size: 15px;
    }

    #mmmu-table th, #mmmu-table td {
        text-align: center;
        padding: 8px 4px;
        font-size: 14.5px;
        color: #1a1a1a;  // Darker text for better contrast
        font-weight: normal;  // Regular weight for all cells
    }

    #mmmu-table td:first-child {
        text-align: left;
        color: #0066cc;  // Blue color for model names
    }

    #mmmu-table td[class$="-main"],
    #mmmu-table td[class$="-detail"] {
        border-left: none !important;
    }

    /* Style for the best score (bold) */
    #mmmu-table td b {
        color: #000;  // Darker color for bold (best) scores
        font-size: 14px;
        font-weight: 700;  // Keep bold only for the best scores
    }

    /* Style for the second-best score (underlined) */
    #mmmu-table td u {
        color: #000000;
        font-size: 14px;
        font-weight: normal;  // Regular weight for second-best
        text-decoration-thickness: 1.5px;
        text-underline-offset: 2px;
    }

    /* Make sure the table doesn't overflow */
    #mmmu-table {
        table-layout: fixed;
        width: 100%;
    }

    /* Add horizontal scroll if needed */
    .table-container {
        overflow-x: auto;
    }

    /* Links in the table */
    #mmmu-table a {
        color: #0066cc;
        text-decoration: none;
    }

    #mmmu-table a:hover {
        text-decoration: underline;
    }
`;
document.head.appendChild(style);