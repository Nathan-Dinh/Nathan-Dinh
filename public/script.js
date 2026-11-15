(function () {
    var SCROLL_SPEED = 1200; // px per second while Up or Down is held
    var MIN_SCROLL = 100; // px moved by a quick tap
    // "/" and "/index.html" are the same page, so they share one remembered selection.
    var STORAGE_KEY = 'selected:' + location.pathname.replace(/index\.html$/, '');

    var upLayer = document.querySelector('.up-layer'); // The home page doesn't have one.

    // Hovering or selecting a social link shows a preview of where it goes.
    // Sites can't be shown live inside another site, so the previews are saved screenshots
    // in public/documents. LinkedIn only shows a sign-in page to visitors, so it has no screenshot.
    var documentsFolder = new URL('documents/', document.currentScript.src);
    var PREVIEWS = [
        { match: /github\.com/, title: 'GitHub', detail: 'Code and repositories', screenshot: 'github-preview.png', wide: true },
        { match: /linkedin\.com/, title: 'LinkedIn', detail: 'Work history and experience' },
        { match: /^mailto:/, title: 'Email', detail: 'Opens your email app' },
        { match: /\.pdf$/, title: 'Resume', detail: 'PDF, 2 pages', screenshot: 'nathan_dinh_resume-preview.png' }
    ];

    function addPreview(link) {
        var href = link.getAttribute('href');
        var preview = PREVIEWS.filter(function (item) { return item.match.test(href); })[0];
        if (!preview) return;

        var card = document.createElement('span');
        card.className = 'link-preview' + (preview.wide ? ' link-preview-wide' : '');
        card.setAttribute('aria-hidden', 'true'); // The link's own name already says where it goes.

        if (preview.screenshot) {
            var image = document.createElement('img');
            image.className = 'link-preview-image';
            image.src = new URL(preview.screenshot, documentsFolder).href;
            image.alt = '';
            card.appendChild(image);
        }

        var address = /\.pdf$/.test(href) ? null : href
            .replace(/^mailto:/, '')
            .replace(/^https?:\/\/(www\.)?/, '')
            .replace(/\/$/, '');

        [['title', preview.title], ['address', address], ['detail', preview.detail]].forEach(function (part) {
            if (!part[1]) return;
            var line = document.createElement('span');
            line.className = 'link-preview-' + part[0];
            line.textContent = part[1];
            card.appendChild(line);
        });

        link.appendChild(card);
    }

    Array.prototype.forEach.call(document.querySelectorAll('.socials a'), addPreview);

    // The home page shows one section at a time. Choosing a tab shows its section and puts its name
    // in the address (#projects), so a tab can be linked to and is still open after going back.
    // replaceState rather than a new history entry, so Back leaves the page instead of undoing tabs.
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));

    function openTab(tab) {
        tabs.forEach(function (each) {
            var open = each === tab;
            each.setAttribute('aria-selected', open);
            each.tabIndex = open ? 0 : -1; // Tab reaches only the open tab, as usual for tabs.
            document.getElementById(each.getAttribute('aria-controls')).hidden = !open;
        });
    }

    function tabForAddress() {
        var name = location.hash.slice(1);
        return tabs.filter(function (tab) { return tab.dataset.hash === name; })[0];
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            openTab(tab);
            history.replaceState(null, '', '#' + tab.dataset.hash);
        });
    });

    window.addEventListener('hashchange', function () {
        var tab = tabForAddress();
        if (tab) openTab(tab);
    });

    if (tabForAddress()) openTab(tabForAddress());

    // The links, tabs and project cards that Left and Right move through, in page order.
    // Anything in a closed tab is skipped. A tab is only selected by this; Enter opens it, so
    // Right can carry on past the tabs to the open section's cards.
    var allOptions = Array.prototype.slice.call(
        document.querySelectorAll('.socials a, [role="tab"], .card, .project-page a')
    );

    function visibleOptions() {
        return allOptions.filter(function (option) { return !option.closest('[hidden]'); });
    }

    var scrollKey = null; // The key currently held, if any
    var scrollDirection = 1;
    var scrollTravelled = 0;
    var lastScrollTime = 0;
    var scrollFrame = null;

    function scrollStep(now) {
        // The cap stops a big jump if the browser pauses between frames.
        var distance = SCROLL_SPEED * Math.min(now - lastScrollTime, 50) / 1000;
        lastScrollTime = now;
        window.scrollBy(0, scrollDirection * distance);
        scrollTravelled += distance;
        var keepGoing = scrollKey !== null || scrollTravelled < MIN_SCROLL;
        scrollFrame = keepGoing ? requestAnimationFrame(scrollStep) : null;
    }

    // Moves straight away, then keeps going until the key is released.
    function startScrolling(key) {
        scrollKey = key;
        scrollDirection = key === 'ArrowDown' ? 1 : -1;
        scrollTravelled = 0;
        if (scrollFrame === null) {
            var now = performance.now();
            lastScrollTime = now - 16;
            scrollStep(now);
        }
    }

    function stopScrolling() {
        scrollKey = null;
        cancelAnimationFrame(scrollFrame);
        scrollFrame = null;
    }

    // The next or previous item, stopping at the first and last.
    // With nothing selected yet, moving forward starts at the first item and back at the last.
    function neighbour(list, current, step) {
        var last = list.length - 1;
        var index = list.indexOf(current);
        if (index === -1) return list[step > 0 ? 0 : last];
        return list[Math.max(0, Math.min(last, index + step))];
    }

    // A link inside a card counts as its card.
    function selectedElement() {
        var element = document.activeElement;
        return element.closest('.card') || element;
    }

    function selectOption(option) {
        // preventScroll stops the browser sliding the carousel's contents sideways to reach a card.
        option.focus({ preventScroll: true });
        (option.closest('.carousel-stage') || option).scrollIntoView({ block: 'nearest' });
    }

    // Up and Down scroll the page, and Left and Right choose a link or card.
    // Enter opens whatever is selected. Backspace goes up a layer on pages that have one.
    document.addEventListener('keydown', function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        var key = event.key;

        if (key === 'Backspace' && upLayer && !event.repeat) {
            event.preventDefault();
            upLayer.click();
        } else if (key === 'Enter' && document.activeElement.matches('.card')) {
            // Links open on Enter by themselves. A selected card isn't a link, so it opens its own.
            var cardLink = document.activeElement.querySelector('a');
            if (cardLink) cardLink.click();
        } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
            event.preventDefault();
            selectOption(neighbour(visibleOptions(), selectedElement(), key === 'ArrowRight' ? 1 : -1));
        } else if (key === 'ArrowUp' || key === 'ArrowDown') {
            event.preventDefault(); // Replaces the browser's own, slower arrow scrolling.
            if (!event.repeat) startScrolling(key);
        }
    });

    // A quick tap still finishes its minimum distance after the key comes up.
    document.addEventListener('keyup', function (event) {
        if (event.key === scrollKey) scrollKey = null;
    });

    // The browser never reports the key coming up if the window loses focus first.
    window.addEventListener('blur', stopScrolling);

    // Sizes the footer name to fill the footer exactly. Letters vary in width between fonts,
    // so it's measured at a known size and scaled from there.
    var footerName = document.querySelector('.footer-name');

    function fitFooterName() {
        footerName.style.fontSize = '100px';
        var available = footerName.parentElement.clientWidth;
        // Slightly under, so rounding can't push it past the edge and scroll the page sideways.
        var natural = footerName.getBoundingClientRect().width;
        footerName.style.fontSize = (100 * available / natural) * 0.995 + 'px';
    }

    if (footerName) {
        fitFooterName();
        window.addEventListener('resize', fitFooterName);
    }

    // Remembers the selection for this browser tab, so coming back to a page doesn't lose it.
    // The open section comes back from the address first, so the same items are visible again.
    // Storage can be blocked by the browser, in which case the page just starts with nothing selected.
    window.addEventListener('pagehide', function () {
        try {
            sessionStorage.setItem(STORAGE_KEY, visibleOptions().indexOf(selectedElement()));
        } catch (error) {}
    });

    try {
        var saved = visibleOptions()[sessionStorage.getItem(STORAGE_KEY)];
        if (saved) selectOption(saved);
    } catch (error) {}
})();
