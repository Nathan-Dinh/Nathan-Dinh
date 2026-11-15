(function () {
    var SCROLL_SPEED = 1200; // px per second while Up or Down is held
    var MIN_SCROLL = 100; // px moved by a quick tap
    // "/" and "/index.html" are the same page, so they share one remembered selection.
    var STORAGE_KEY = 'selected:' + location.pathname.replace(/index\.html$/, '');

    var upLayer = document.querySelector('.up-layer'); // The home page doesn't have one.
    // The links and project cards that Left and Right move through, in page order.
    var options = Array.prototype.slice.call(
        document.querySelectorAll('.socials a, .card, .project-page a')
    );

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
            selectOption(neighbour(options, selectedElement(), key === 'ArrowRight' ? 1 : -1));
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

    // Remembers the selection for this tab, so coming back to a page doesn't lose it.
    // Storage can be blocked by the browser, in which case the page just starts with nothing selected.
    window.addEventListener('pagehide', function () {
        try {
            sessionStorage.setItem(STORAGE_KEY, options.indexOf(selectedElement()));
        } catch (error) {}
    });

    try {
        var saved = options[sessionStorage.getItem(STORAGE_KEY)];
        if (saved) selectOption(saved);
    } catch (error) {}
})();
