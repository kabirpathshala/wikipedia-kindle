document.addEventListener('DOMContentLoaded', () => {
    // Theme Switching
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.className = `theme-${theme} ${getFontClass()}`;
        });
    });

    // Font Size Switching
    const fontSizeButtons = document.querySelectorAll('.font-size-btn');
    const fontClasses = ['font-small', 'font-medium', 'font-large', 'font-xlarge'];
    let currentFontIndex = 1; // medium

    function getFontClass() {
        return fontClasses[currentFontIndex];
    }

    fontSizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.action === 'increase' && currentFontIndex < fontClasses.length - 1) {
                currentFontIndex++;
            } else if (btn.dataset.action === 'decrease' && currentFontIndex > 0) {
                currentFontIndex--;
            }
            updateBodyClasses();
        });
    });

    // Width Switching
    const widthButtons = document.querySelectorAll('.width-btn');
    const widthClasses = ['width-small', 'width-medium', 'width-large', 'width-xlarge'];
    let currentWidthIndex = 1; // medium

    function getWidthClass() {
        return widthClasses[currentWidthIndex];
    }

    widthButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.action === 'increase' && currentWidthIndex < widthClasses.length - 1) {
                currentWidthIndex++;
            } else if (btn.dataset.action === 'decrease' && currentWidthIndex > 0) {
                currentWidthIndex--;
            }
            updateBodyClasses();
        });
    });

    function updateBodyClasses() {
        const currentTheme = Array.from(document.body.classList).find(c => c.startsWith('theme-')) || 'theme-light';
        document.body.className = `${currentTheme} ${getFontClass()} ${getWidthClass()}`;
    }

    // Initialize with default classes
    updateBodyClasses();

    // Tabs Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // History Logic
    const historyContainer = document.getElementById('history-container');
    let readHistory = JSON.parse(localStorage.getItem('wiki-history') || '[]');

    function renderHistory() {
        if (readHistory.length === 0) {
            historyContainer.innerHTML = '<p class="history-empty">No reading history yet.</p>';
            return;
        }

        historyContainer.innerHTML = readHistory.map(item =>
            `<div class="history-item" data-title="${item}">${item.replace(/_/g, ' ')}</div>`
        ).join('');

        const historyItems = historyContainer.querySelectorAll('.history-item');
        historyItems.forEach(item => {
            item.addEventListener('click', () => {
                fetchWikipediaArticle(item.dataset.title, false); // false = don't add to history again
            });
        });
    }

    function addToHistory(title) {
        // Remove if exists to move to top
        readHistory = readHistory.filter(t => t !== title);
        readHistory.unshift(title);

        // Keep last 50
        if (readHistory.length > 50) readHistory.pop();

        localStorage.setItem('wiki-history', JSON.stringify(readHistory));
        renderHistory();
    }

    // Initialize history
    renderHistory();



    // Wikipedia Integration
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const articleContainer = document.getElementById('article-container');
    const articleTitle = document.getElementById('article-title');
    const tocContainer = document.getElementById('toc-container');

    async function fetchWikipediaArticle(title, saveHistory = true) {
        try {
            articleContainer.innerHTML = '<div class="welcome-screen"><p>Loading...</p></div>';

            const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`);

            if (!response.ok) {
                throw new Error('Article not found');
            }

            const html = await response.text();

            // Parse HTML to clean it up and build TOC
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Clean up Unwanted Elements
            const elementsToRemove = doc.querySelectorAll('.mw-editsection, .reference, .navbox, .metadata, style, link');
            elementsToRemove.forEach(el => el.remove());

            // Update UI
            articleTitle.textContent = title.replace(/_/g, ' ');
            if (saveHistory) addToHistory(title);

            // We wrap the content in a div for formatting
            articleContainer.innerHTML = `<div class="wiki-content">${doc.body.innerHTML}</div>`;

            // Build TOC
            buildTableOfContents(doc);

            // Fix relative links
            const links = articleContainer.querySelectorAll('a[href^="./"]');
            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    const newTitle = href.replace('./', '');
                    // Keep internal anchors handled by browser if they start with #
                    if (newTitle.startsWith('#')) {
                        const el = document.getElementById(newTitle.substring(1));
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        return;
                    }
                    fetchWikipediaArticle(newTitle);
                });
            });

        } catch (error) {
            console.error(error);
            articleContainer.innerHTML = `<div class="welcome-screen"><p>Error loading article. Try another search.</p></div>`;
            tocContainer.innerHTML = '<p class="toc-empty">No content to display.</p>';
        }
    }

    function buildTableOfContents(doc) {
        const headings = doc.querySelectorAll('h2, h3');
        if (headings.length === 0) {
            tocContainer.innerHTML = '<p class="toc-empty">No table of contents available.</p>';
            return;
        }

        let tocHTML = '';
        headings.forEach((heading, index) => {
            // Ensure heading has an ID so we can scroll to it
            if (!heading.id) {
                heading.id = `heading-${index}`;
            }

            // Update actual DOM since we queried from parsed doc? 
            // Wait, we query doc but those elements are already added to `articleContainer` via innerHTML.
            // We need to re-query from articleContainer to set IDs that work on the page.
        });

        // Re-query from actual DOM to sync IDs and attach listeners later
        const pageHeadings = articleContainer.querySelectorAll('h2, h3');
        pageHeadings.forEach((heading, index) => {
            if (!heading.id) {
                heading.id = `heading-${index}`;
            }

            const level = heading.tagName.toLowerCase() === 'h2' ? 'level-2' : 'level-3';
            tocHTML += `<div class="toc-item ${level}" data-target="${heading.id}">${heading.textContent}</div>`;
        });

        tocContainer.innerHTML = tocHTML;

        // Add click listeners to TOC items
        const tocItems = tocContainer.querySelectorAll('.toc-item');
        tocItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.dataset.target;
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    const handleSearch = () => {
        const query = searchInput.value.trim();
        if (query) {
            fetchWikipediaArticle(query);
        }
    };

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Dictionary Tooltip logic
    let popupExtant = null;

    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        // Remove existing popup if selection is empty or multi-word
        if (!text || text.includes(' ') || text.length < 2) {
            if (popupExtant) {
                popupExtant.remove();
                popupExtant = null;
            }
            return;
        }
    });

    document.addEventListener('mouseup', async (e) => {
        // Run only if a selection happened inside the article container
        if (!articleContainer.contains(e.target)) return;

        const selection = window.getSelection();
        const text = selection.toString().trim();

        // Simple regex to check if it's a single word (only letters/hyphens)
        if (!text || !/^[A-Za-z-]+$/.test(text)) return;

        // If tracking same word, do nothing
        if (popupExtant && popupExtant.dataset.word === text) return;

        // Remove old popup
        if (popupExtant) {
            popupExtant.remove();
            popupExtant = null;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Create temporary loading popup
        const popup = document.createElement('div');
        popup.className = 'dictionary-popup';
        popup.dataset.word = text;
        popup.innerHTML = `<em>Looking up "${text}"...</em>`;
        document.body.appendChild(popup);
        popupExtant = popup;

        // Initial Position
        let topPos = rect.top - popup.offsetHeight - 10;
        let leftPos = rect.left + (rect.width / 2) - (popup.offsetWidth / 2);

        if (topPos < 0) topPos = rect.bottom + 10;
        if (leftPos < 0) leftPos = 10;

        popup.style.top = `${topPos}px`;
        popup.style.left = `${leftPos}px`;

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${text.toLowerCase()}`);
            if (!res.ok) throw new Error('Not found');
            const data = await res.json();

            const meaning = data[0].meanings[0];
            const partOfSpeech = meaning.partOfSpeech;
            const definition = meaning.definitions[0].definition;

            popup.innerHTML = `
                <strong>${text}</strong> <span class="pos">(${partOfSpeech})</span>
                <p>${definition}</p>
            `;

            // Adjust position with new height
            topPos = rect.top - popup.offsetHeight - 10;
            leftPos = rect.left + (rect.width / 2) - (popup.offsetWidth / 2);
            if (topPos < 0) topPos = rect.bottom + 10;
            if (leftPos < 0) leftPos = 10;

            popup.style.top = `${topPos}px`;
            popup.style.left = `${leftPos}px`;

        } catch (err) {
            popup.innerHTML = `<em>No definition found for "${text}"</em>`;

            topPos = rect.top - popup.offsetHeight - 10;
            leftPos = rect.left + (rect.width / 2) - (popup.offsetWidth / 2);
            if (topPos < 0) topPos = rect.bottom + 10;
            popup.style.top = `${topPos}px`;
            popup.style.left = `${leftPos}px`;
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (popupExtant && !popupExtant.contains(e.target)) {
            if (window.getSelection().isCollapsed) {
                popupExtant.remove();
                popupExtant = null;
            }
        }
    });

});
