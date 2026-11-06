(function () {
    var SCROLL_SPEED = 1200; // px per second while Up or Down is held
    var MIN_SCROLL = 100; // px moved by a quick tap
    // "/" and "/index.html" are the same page, so they share one remembered selection.
    var STORAGE_KEY = 'selected:' + location.pathname.replace(/index\.html$/, '');

    var sideNav = document.querySelector('.side-nav');
    var modeLabel = document.getElementById('mode-label');
    var upLayer = document.querySelector('.up-layer'); // The home page doesn't have one.
    // The side navigation lists the links on this page, so it can't go out of date.
    var navLinks = Array.prototype.map.call(
        document.querySelectorAll('.socials a, .card a, .project-page a'),
        function (link, index) {
            var item = document.createElement('li');
            var navLink = document.createElement('a');
            var name = document.createElement('span');
            navLink.href = link.getAttribute('href');
            name.textContent = link.getAttribute('aria-label') || link.textContent.trim();
            name.style.setProperty('--index', index);
            navLink.appendChild(name);
            item.appendChild(navLink);
            sideNav.querySelector('ul').appendChild(item);
            return navLink;
        }
    );
    // The panel opens to fit the widest name. A width of auto can't be animated.
    sideNav.style.setProperty('--label-width', Math.max.apply(null, navLinks.map(function (navLink) {
        return navLink.firstChild.offsetWidth;
    })) + 'px');
    // The links and project cards that Left and Right move through, in page order.
    var options = Array.prototype.slice.call(
        document.querySelectorAll('.socials a, .card, .project-page a')
    );

    var selectedNavLink = navLinks[0];
    var navMode = false;

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

    // Scroll mode shows the page links as lines. Navigation mode shows their names.
    function setNavMode(on) {
        navMode = on;
        stopScrolling();
        document.body.classList.toggle('nav-mode', on);
        if (modeLabel) modeLabel.textContent = on ? 'navigation mode' : 'scroll mode';
        if (on) {
            selectedNavLink.focus({ preventScroll: true });
        } else if (sideNav.contains(document.activeElement)) {
            document.activeElement.blur();
        }
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

    // Space switches mode and Escape leaves navigation mode.
    // In scroll mode, Up and Down scroll the page, and Left and Right choose a link or card.
    // In navigation mode, Up and Down choose a link. Enter opens whatever is selected.
    // Backspace goes up a layer on pages that have one.
    document.addEventListener('keydown', function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        var key = event.key;

        if (key === ' ') {
            event.preventDefault(); // Stops Space scrolling the page.
            if (!event.repeat) setNavMode(!navMode);
        } else if (key === 'Escape' && navMode) {
            setNavMode(false);
        } else if (key === 'Backspace' && upLayer && !event.repeat) {
            event.preventDefault();
            upLayer.click();
        } else if (key === 'Enter' && document.activeElement.matches('.card')) {
            // Links open on Enter by themselves. A selected card isn't a link, so it opens its own.
            var cardLink = document.activeElement.querySelector('a');
            if (cardLink) cardLink.click();
        } else if ((key === 'ArrowLeft' || key === 'ArrowRight') && !navMode) {
            event.preventDefault();
            selectOption(neighbour(options, selectedElement(), key === 'ArrowRight' ? 1 : -1));
        } else if (key === 'ArrowUp' || key === 'ArrowDown') {
            event.preventDefault(); // Replaces the browser's own, slower arrow scrolling.
            if (navMode) {
                neighbour(navLinks, selectedNavLink, key === 'ArrowDown' ? 1 : -1).focus({ preventScroll: true });
            } else if (!event.repeat) {
                startScrolling(key);
            }
        }
    });

    // A quick tap still finishes its minimum distance after the key comes up.
    document.addEventListener('keyup', function (event) {
        if (event.key === scrollKey) scrollKey = null;
    });

    // The browser never reports the key coming up if the window loses focus first.
    window.addEventListener('blur', stopScrolling);

    // Tabbing into the links opens navigation mode, and tabbing out closes it.
    sideNav.addEventListener('focusin', function (event) {
        selectedNavLink = event.target;
        if (!navMode) setNavMode(true);
    });

    sideNav.addEventListener('focusout', function (event) {
        if (navMode && event.relatedTarget && !sideNav.contains(event.relatedTarget)) setNavMode(false);
    });

    // The lines are too small to aim at, so clicking one opens the panel rather than a page.
    // Without this, pressing on a line would focus it and open navigation mode too early,
    // and the rest of the click would then follow the link.
    sideNav.addEventListener('mousedown', function (event) {
        if (!navMode) event.preventDefault();
    });

    sideNav.addEventListener('click', function (event) {
        if (!navMode) {
            event.preventDefault();
            setNavMode(true);
        }
    });

    document.addEventListener('click', function (event) {
        if (navMode && !sideNav.contains(event.target)) setNavMode(false);
    });

    // Remembers the selection for this tab, so coming back to a page doesn't lose it.
    // Storage can be blocked by the browser, in which case the page just starts with nothing selected.
    var selectable = options.concat(navLinks);

    window.addEventListener('pagehide', function () {
        try {
            sessionStorage.setItem(STORAGE_KEY, selectable.indexOf(selectedElement()));
        } catch (error) {}
    });

    try {
        var saved = selectable[sessionStorage.getItem(STORAGE_KEY)];
        if (saved) selectOption(saved);
    } catch (error) {}
})();
