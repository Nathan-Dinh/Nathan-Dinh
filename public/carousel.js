(function () {
    // How a card looks at each distance from the middle.
    // x is a percentage of the card's own width, so it scales with card size.
    // The last slot is off-stage: cards at or past it are hidden.
    var LAYOUT = [
        { x: 0, scale: 1, opacity: 1 },
        { x: 94, scale: 0.78, opacity: 0.9 },
        { x: 167, scale: 0.6, opacity: 0.5 },
        { x: 207, scale: 0.6, opacity: 0 }
    ];
    var LAST_SLOT = LAYOUT.length - 1;
    var DRAG_THRESHOLD = 5; // px moved before a press counts as a drag, not a tap
    var SWIPE_DISTANCE = 40; // px dragged to change card, even if the nearest card hasn't changed

    var stage = document.getElementById('carousel-stage');
    var cards = Array.prototype.slice.call(stage.querySelectorAll('.card'));
    var active = 0;
    var drag = null;

    // Keeps a position between the first and last card. It can be fractional during a drag.
    function limit(position) {
        return Math.max(0, Math.min(cards.length - 1, position));
    }

    function render(position) {
        cards.forEach(function (card, index) {
            var offset = index - position;
            var distance = Math.abs(offset);
            var slot = Math.min(Math.floor(distance), LAST_SLOT);
            var from = LAYOUT[slot];
            var to = LAYOUT[Math.min(slot + 1, LAST_SLOT)];
            var progress = distance - slot;
            var x = from.x + (to.x - from.x) * progress;
            var scale = from.scale + (to.scale - from.scale) * progress;
            var direction = offset < 0 ? -1 : 1;

            card.style.transform = 'translateX(' + direction * x + '%) scale(' + scale + ')';
            card.style.opacity = from.opacity + (to.opacity - from.opacity) * progress;
            card.style.zIndex = Math.round((cards.length - distance) * 10);
            card.classList.toggle('is-active', Math.round(offset) === 0);
            card.classList.toggle('is-hidden', distance >= LAST_SLOT);
        });
    }

    function goTo(index) {
        active = limit(index);
        render(active);
    }

    // Focus is what marks a card as selected, so script.js can move through and remember it.
    function select(index) {
        goTo(index);
        cards[active].focus({ preventScroll: true });
    }

    // Pixels of dragging that move the carousel by one card.
    function dragStep() {
        return cards[0].offsetWidth * LAYOUT[1].x / 100;
    }

    // Selecting a card from the keyboard, or restoring it, brings it to the middle.
    cards.forEach(function (card, index) {
        card.addEventListener('focus', function () {
            goTo(index);
        });
    });

    // Without this, pressing a side card would focus it, and so move it, before a drag could start.
    stage.addEventListener('mousedown', function (event) {
        if (!event.target.closest('a')) event.preventDefault();
    });

    // Pointer events cover mouse, touch, and pen.
    // Capturing the pointer sends clicks to the stage rather than the card,
    // so taps on a card are handled in endDrag, not with click listeners.
    // Presses on a link are left alone so the link still opens.
    stage.addEventListener('pointerdown', function (event) {
        if (drag || !event.isPrimary || event.button !== 0 || event.target.closest('a')) return;
        drag = {
            id: event.pointerId,
            startX: event.clientX,
            card: event.target.closest('.card'),
            moved: false
        };
        stage.setPointerCapture(event.pointerId);
    });

    stage.addEventListener('pointermove', function (event) {
        if (!drag || event.pointerId !== drag.id) return;
        var dx = event.clientX - drag.startX;
        if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
        drag.moved = true;
        stage.classList.add('is-dragging');
        render(limit(active - dx / dragStep()));
    });

    function endDrag(event) {
        if (!drag || event.pointerId !== drag.id) return;
        var finished = drag;
        drag = null;
        stage.classList.remove('is-dragging');

        if (event.type === 'pointercancel') {
            goTo(active);
        } else if (finished.moved) {
            var dx = event.clientX - finished.startX;
            var cardsMoved = Math.round(-dx / dragStep());
            if (cardsMoved === 0 && Math.abs(dx) >= SWIPE_DISTANCE) {
                cardsMoved = dx < 0 ? 1 : -1;
            }
            select(active + cardsMoved);
        } else if (finished.card) {
            var index = cards.indexOf(finished.card);
            // A finger can't easily aim for the title, so tapping the middle card opens it.
            var opens = index === active && event.pointerType !== 'mouse';
            select(index);
            if (opens) finished.card.querySelector('a').click();
        }
    }

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // Stops the browser's own dragging of links and images.
    stage.addEventListener('dragstart', function (event) {
        event.preventDefault();
    });

    goTo(active);
})();
