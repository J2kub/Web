// Wait for the DOM to be fully loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection (Pôvodné + Nové) ---
    const slider = document.getElementById('slider');
    const btnToggle = document.getElementById('btnToggle');
    const header = document.querySelector('header');
    const logo = document.getElementById('logo');
    const fullName = document.getElementById('fullName');
    const panels = document.querySelectorAll('.panel');
    const panel1 = document.querySelector('.panel.page1');
    const panel2 = document.querySelector('.panel.page2');
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const spotifyIframe = document.getElementById('spotify-iframe');
    const spotifyPlayerWrapper = document.getElementById('spotify-player-wrapper');
    const prevBtn = document.getElementById('spotify-prev');
    const nextBtn = document.getElementById('spotify-next');
    const hamburgerButton = document.getElementById('hamburger-button');
    const mainNav = document.getElementById('main-nav');
    // Zmena: Vyberáme odkazy presnejšie
    const mainNavLinks = document.querySelectorAll('#main-nav a[href^="#"]');
    const heroNavLinks = document.querySelectorAll('.hero-nav a[href^="#"]');
    const allNavLinks = [...mainNavLinks, ...heroNavLinks]; // Spojíme relevantné navigačné odkazy
    const instaHeartIcon = document.getElementById('insta-heart-icon');
    const instaCommentIcon = document.getElementById('insta-comment-icon');
    const heartParticleContainer = document.querySelector('#contacts .post-actions .heart-particle-container');
    const instaCommentBubble = document.getElementById('insta-comment-bubble');
    const timelineItems = document.querySelectorAll('.timeline-item');
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    // NOVÉ/UPRAVENÉ: Elementy pre sekciu projektov
    const projectCards = document.querySelectorAll('.project-card'); // Karty v termináli
    const projectDisplayScreen = document.querySelector('.project-display-screen'); // Pravý displej
    const displayContent = projectDisplayScreen?.querySelector('.display-content'); // Obsah displeja
    const displayPlaceholder = projectDisplayScreen?.querySelector('.display-placeholder'); // Placeholder displeja
    const projectDetailsStorage = document.querySelector('.project-details-storage'); // Skrytý obsah
    // ZMENA: Budeme listener dávať na kontajner mriežky pre event delegation
    const projectCardsGrid = document.querySelector('.project-cards-grid');

    // --- Application State (Pôvodné + Nové) ---
    let currentPanelIndex = 0; // 0 pre panel1, 1 pre panel2
    let isSliding = false;
    const slideDuration = 800; // Musí zodpovedať --transition-slide v CSS (v ms)
    let scrollAfterSlideTarget = null; // Element na scroll po slide
    let rafScrollId; // ID pre requestAnimationFrame (pre scroll)
    const spotifyTrackSources = [
        // NAHRAĎ TOTO SKUTOČNÝMI SPOTIFY EMBED URL!
        "https://open.spotify.com/embed/track/72FGmNspFL56LlAmwM1Rzv?utm_source=generator",
        "https://open.spotify.com/embed/track/59z99kJAUvNHtNcIZkxlQt?utm_source=generator",
        "https://open.spotify.com/embed/track/3hcivoswCVR8LZkHR8MYA5?utm_source=generator"
    ];
    let currentTrackIndex = 0;
    let touchStartX = 0; // Pre swipe gestá
    let touchEndX = 0; // Pre swipe gestá
    let commentBubbleTimeout; // Pre Instagram bublinu
    let glitchTimeout; // Timeout pre odstránenie glitch triedy (nové)
    // NOVÉ: Sledovanie aktuálne zobrazeného projektu
    let currentlyDisplayedProjectId = null;

    // --- Core Functions (Navigácia, Panely, Scroll - z poslednej verzie) ---

    /**
     * Plynulo posunie daný panel na cieľový element alebo na vrch.
     */
    function smoothScrollPanel(panelToScroll, targetElement = null) {
        if (!panelToScroll) return console.error("Chyba: Panel na skrolovanie nebol nájdený.");
        if (rafScrollId) cancelAnimationFrame(rafScrollId);

        rafScrollId = requestAnimationFrame(() => {
            try {
                if (targetElement) {
                    console.log(`[smoothScrollPanel] Spúšťam scrollIntoView pre #${targetElement.id}`);
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    console.log(`[smoothScrollPanel] Spúšťam scrollTo(0) pre panel ${panelToScroll.classList.contains('page1') ? '1' : '2'}`);
                    panelToScroll.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (error) { console.error(`[smoothScrollPanel] Chyba pri scroll:`, error); }
            finally { rafScrollId = null; }
        });
    }

    /**
     * Prepne medzi panelmi 1 a 2 s plynulou animáciou.
     */
    function togglePanel(callback) {
        if (isSliding || !slider || !panels || panels.length < 2) return;
        console.log("[togglePanel] Začínam prepínanie...");
        isSliding = true;
        const targetPanelIndex = 1 - currentPanelIndex;

        const onSlideEnd = (event) => {
            if (event.propertyName !== 'transform' || event.target !== slider) return;
            console.log("[togglePanel] Transitionend event zachytený.");
            isSliding = false;
            currentPanelIndex = targetPanelIndex;
            console.log("[togglePanel] currentPanelIndex aktualizovaný na:", currentPanelIndex);

            if (scrollAfterSlideTarget) {
                console.log("[togglePanel] Vykonávam scroll po slide na:", scrollAfterSlideTarget.id);
                const targetPanel = panels[currentPanelIndex];
                setTimeout(() => {
                    smoothScrollPanel(targetPanel, scrollAfterSlideTarget);
                    scrollAfterSlideTarget = null;
                }, 50);
            } else {
                console.log("[togglePanel] Nebol požiadaný scroll po slide.");
                if (typeof callback === 'function') {
                    console.log("[togglePanel] Spúšťam callback funkciu (bez element scrollu).");
                    callback();
                }
            }
            handleScroll();
            console.log("[togglePanel] Prepínanie dokončené.");
        };

        slider.addEventListener('transitionend', onSlideEnd, { once: true });
        slider.style.transform = `translateX(-${targetPanelIndex * 100}vw)`;

        if (btnToggle) {
            btnToggle.textContent = targetPanelIndex === 0 ? 'Profil' : 'Domov';
            btnToggle.classList.toggle('profile-active', targetPanelIndex === 1);
        }
        // Fallback timeout pre istotu
        setTimeout(() => {
            if (isSliding) {
                console.warn("[togglePanel] Transitionend fallback.");
                onSlideEnd({propertyName: 'transform', target: slider}); // Manuálne spustenie
            }
        }, slideDuration + 200);
    }

    /**
     * Spracuje kliknutie na navigačný odkaz.
     */
    function handleNavLinkClick(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const targetId = link.hash.substring(1);
        if (isSliding || !targetId) return;

        const mobileMenuWasOpen = mainNav && mainNav.classList.contains('active');
        closeMobileNavIfNeeded(link);
        if(mobileMenuWasOpen && link.closest('#main-nav')) link.blur();

        if (targetId === 'profile-timeline-start') {
            if (currentPanelIndex !== 1) {
                scrollAfterSlideTarget = null;
                togglePanel(() => smoothScrollPanel(panels[1]));
            } else {
                smoothScrollPanel(panels[1]);
            }
            return;
        }

        const targetElement = document.getElementById(targetId);
        if (!targetElement) return console.warn(`[handleNavLinkClick] Cieľový element #${targetId} nebol nájdený.`);
        const targetPanelElement = targetElement.closest('.panel');
        if (!targetPanelElement) return console.warn(`[handleNavLinkClick] Cieľový element #${targetId} nie je v žiadnom paneli.`);
        const targetPanelIndex = Array.from(panels).indexOf(targetPanelElement);

        if (currentPanelIndex === targetPanelIndex) {
            smoothScrollPanel(panels[currentPanelIndex], targetElement);
        } else {
            scrollAfterSlideTarget = targetElement;
            togglePanel();
        }
    }

    /**
     * Plynulo posunie aktuálne viditeľný panel na vrch.
     */
    function scrollToActivePanelTop() {
        if (panels && panels.length > currentPanelIndex) {
            smoothScrollPanel(panels[currentPanelIndex]);
        }
    }

    /**
     * Zobrazí alebo skryje tlačidlo "Scroll to Top".
     */
    function handleScroll() {
        if (!scrollToTopBtn || !panels || panels.length <= currentPanelIndex) return;
        const scrollThreshold = 300;
        const activePanel = panels[currentPanelIndex];
        if (activePanel) {
            const shouldBeVisible = activePanel.scrollHeight > activePanel.clientHeight && activePanel.scrollTop > scrollThreshold;
            scrollToTopBtn.classList.toggle('hidden', !shouldBeVisible);
        } else {
            scrollToTopBtn.classList.add('hidden');
        }
    }

    /**
     * Otvorí/zatvorí mobilné navigačné menu.
     */
    function toggleMobileNav() {
        if (!mainNav || !hamburgerButton) return;
        const isActive = mainNav.classList.toggle('active');
        hamburgerButton.classList.toggle('active', isActive);
        hamburgerButton.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        mainNav.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    }

    /**
     * Zatvorí mobilné menu, ak je otvorené a kliklo sa na odkaz v ňom.
     */
    function closeMobileNavIfNeeded(clickedLink) {
        if (mainNav && mainNav.classList.contains('active') && clickedLink.closest('#main-nav')) {
            toggleMobileNav();
        }
    }

    // --- Pôvodné funkcie (Spotify, Instagram, Swipe, atď.) ---

    /**
     * Loads a specific Spotify track into the iframe with fade effect.
     */
    function loadSpotifyTrack(index) {
        if (!spotifyIframe || !spotifyPlayerWrapper || index < 0 || index >= spotifyTrackSources.length) {
            console.error("Spotify player elements not found or track index out of bounds.");
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            return;
        }
        spotifyPlayerWrapper.classList.add('fading');
        setTimeout(() => {
            spotifyIframe.src = spotifyTrackSources[index];
            currentTrackIndex = index;
            updateNavButtons();
        }, 150);
        setTimeout(() => {
            spotifyPlayerWrapper.classList.remove('fading');
        }, 300);
    }

    /**
     * Updates the enabled/disabled state of Spotify navigation buttons.
     */
    function updateNavButtons() {
        if (!prevBtn || !nextBtn) return;
        prevBtn.disabled = (currentTrackIndex === 0);
        nextBtn.disabled = (currentTrackIndex === spotifyTrackSources.length - 1);
    }

    /**
     * Handles horizontal swipe gestures on the slider to toggle panels.
     */
    function handleSwipeGesture() {
        const swipeThreshold = 50;
        if (touchStartX - touchEndX > swipeThreshold && currentPanelIndex === 0) {
            togglePanel(); // Zavolá novú togglePanel funkciu
        } else if (touchEndX - touchStartX > swipeThreshold && currentPanelIndex === 1) {
            togglePanel(); // Zavolá novú togglePanel funkciu
        }
        touchStartX = 0;
        touchEndX = 0;
    }

    /**
     * Creates and animates flying heart particles for Instagram like effect.
     */
    function triggerHeartAnimation() {
        if (!heartParticleContainer) return console.warn("Heart particle container not found.");
        const particleCount = 5;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('heart-particle');
            const randomX = (Math.random() - 0.5) * 30;
            const randomDelay = Math.random() * 0.3;
            particle.style.left = `calc(50% + ${randomX}px)`;
            particle.style.animationDelay = `${randomDelay}s`;
            heartParticleContainer.appendChild(particle);
            particle.addEventListener('animationend', () => particle.remove());
        }
    }

    /**
     * Shows the comment confirmation bubble for Instagram section.
     */
    function showCommentBubble() {
        if (!instaCommentBubble) return;
        clearTimeout(commentBubbleTimeout);
        instaCommentBubble.classList.add('visible');
        commentBubbleTimeout = setTimeout(() => {
            instaCommentBubble.classList.remove('visible');
        }, 2500);
    }

    // --- NOVÉ/UPRAVENÉ FUNKCIE PRE SEKCIU PROJEKTOV ---

    /**
     * Zobrazí detaily projektu na displeji s glitch efektom.
     * @param {string} projectId - ID projektu (z data-project-id).
     */
    function displayProjectDetails(projectId) {
        if (!projectId || !projectDisplayScreen || !displayContent || !projectDetailsStorage) {
            return console.warn("Chýbajú elementy pre zobrazenie detailu projektu.");
        }
        console.log(`[displayProjectDetails] Zobrazujem projekt: ${projectId}`);
        const detailElement = projectDetailsStorage.querySelector(`#detail-${projectId}`);
        if (!detailElement) {
            displayContent.innerHTML = `<p style="color: red; text-align: center; margin-top: 2rem;">Chyba: Detail projektu #${projectId} nebol nájdený.</p>`;
            projectDisplayScreen.classList.add('has-content');
            currentlyDisplayedProjectId = 'error'; // Označíme, že je chyba
            return console.warn(`Detail pre projekt #${projectId} nebol nájdený.`);
        }

        clearTimeout(glitchTimeout);
        projectDisplayScreen.classList.add('is-glitching');

        glitchTimeout = setTimeout(() => {
            displayContent.innerHTML = detailElement.innerHTML;
            projectDisplayScreen.classList.remove('is-glitching');
            projectDisplayScreen.classList.add('has-content');
            displayContent.scrollTop = 0; // Scrollni na vrch nového obsahu
            currentlyDisplayedProjectId = projectId; // Uložíme ID zobrazeného projektu
            console.log(`[displayProjectDetails] Projekt ${projectId} zobrazený.`);
        }, 250); // Dĺžka glitch + buffer
    }

    /**
     * Resetuje displej projektu do predvoleného stavu.
     */
    function resetProjectDisplay() {
        if (!projectDisplayScreen || !displayContent) return;
        console.log("[resetProjectDisplay] Resetujem displej.");
        clearTimeout(glitchTimeout);
        projectDisplayScreen.classList.remove('is-glitching');
        projectDisplayScreen.classList.remove('has-content');
        displayContent.innerHTML = '';
        currentlyDisplayedProjectId = null; // Resetujeme ID
        // Odstránime 'active' triedu zo všetkých kariet
        projectCards.forEach(card => card.classList.remove('active'));
    }

    /**
     * Spracuje kliknutie na kartu projektu.
     * @param {Event} e - Event objekt.
     */
    function handleProjectCardClick(e) {
        // Nájdi najbližší rodičovský element, ktorý je .project-card
        const clickedCard = e.target.closest('.project-card');
        if (!clickedCard) return; // Kliknutie nebolo na kartu alebo jej potomka

        const projectId = clickedCard.dataset.projectId;
        if (!projectId) return console.warn("Kliknutá karta nemá data-project-id.");

        console.log(`[handleProjectCardClick] Kliknuté na kartu: ${projectId}`);

        // Odstránime 'active' triedu zo VŠETKÝCH kariet pred pridaním na novú
        projectCards.forEach(card => card.classList.remove('active'));

        if (projectId === currentlyDisplayedProjectId) {
            // Klikli sme na už aktívnu kartu -> resetujeme displej
            console.log("[handleProjectCardClick] Kliknuté na aktívnu kartu, resetujem.");
            resetProjectDisplay();
        } else {
            // Klikli sme na inú kartu -> zobrazíme jej detaily
            console.log("[handleProjectCardClick] Zobrazujem nový projekt.");
            displayProjectDetails(projectId);
            // Pridáme 'active' triedu na kliknutú kartu
            clickedCard.classList.add('active');
        }
    }


    // --- Intersection Observer Setup (Pôvodné) ---

    const handleTimelineIntersection = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const timelineItem = entry.target;
                timelineItem.classList.add('is-visible');
                const factIds = timelineItem.getAttribute('data-reveal-facts')?.split(',') || [];
                factIds.forEach((factId, index) => {
                    if (factId) {
                        const factBubble = timelineItem.querySelector(`#${factId.trim()}`);
                        if (factBubble) {
                            setTimeout(() => factBubble.classList.add('is-visible'), 200 + index * 100);
                        }
                    }
                });
                observer.unobserve(timelineItem);
            }
        });
    };
    const timelineObserver = new IntersectionObserver(handleTimelineIntersection, { root: null, rootMargin: '0px', threshold: 0.1 });
    if (timelineItems.length > 0) timelineItems.forEach(item => timelineObserver.observe(item));
    else console.warn("Nenašli sa žiadne elementy '.timeline-item' na sledovanie.");

    const handleGeneralIntersection = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    };
    const generalObserver = new IntersectionObserver(handleGeneralIntersection, { root: null, rootMargin: '0px', threshold: 0.15 });
    if (animatedElements.length > 0) animatedElements.forEach(element => generalObserver.observe(element));
    else console.warn("Nenašli sa žiadne elementy '.animate-on-scroll' na sledovanie.");


    // --- Event Listeners Setup (Kombinované + Zmeny pre projekty) ---
    console.log("Pripájam event listenery...");

    // Prepínanie panelov tlačidlom (Používa novú togglePanel)
    if (btnToggle) btnToggle.addEventListener('click', () => { scrollAfterSlideTarget = null; if (currentPanelIndex === 0) togglePanel(() => smoothScrollPanel(panels[1])); else togglePanel(); });
    else console.error("Element #btnToggle not found.");

    // Kliknutie na navigačné odkazy (Používa novú handleNavLinkClick)
    if (allNavLinks.length > 0) allNavLinks.forEach(link => link.addEventListener('click', handleNavLinkClick));
    else console.warn("Nenašli sa žiadne navigačné odkazy.");

    // Kliknutie na "Scroll to Top" tlačidlo (Používa novú scrollToActivePanelTop)
    if (scrollToTopBtn) scrollToTopBtn.addEventListener('click', scrollToActivePanelTop);
    else console.warn("Element #scrollToTopBtn nebol nájdený.");

    // Sledovanie scrollu v paneloch (Používa novú handleScroll)
    if (panels.length > 0) panels.forEach((panel, index) => panel.addEventListener('scroll', () => { if (index === currentPanelIndex) handleScroll(); }, { passive: true }));
    else console.error("Nenašli sa žiadne elementy .panel.");

    // Mobilná navigácia (hamburger) (Používa pôvodnú toggleMobileNav)
    if (hamburgerButton) hamburgerButton.addEventListener('click', toggleMobileNav);
    else console.error("Element #hamburger-button not found.");

    // Swipe gestá (Používa pôvodnú handleSwipeGesture, ktorá volá novú togglePanel)
    if (slider) { slider.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true }); slider.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipeGesture(); }, { passive: true }); }

    // Hover efekt pre meno (Pôvodný kód)
    if (logo && fullName) { const logoContainer = logo.closest('.logo-container'); if (logoContainer) { logoContainer.addEventListener('mouseenter', () => { fullName.style.opacity = '1'; fullName.style.transform = 'translateY(-50%) translateX(10px) scale(1)'; }); logoContainer.addEventListener('mouseleave', () => { fullName.style.opacity = '0'; fullName.style.transform = 'translateY(-50%) translateX(5px) scale(0.95)'; }); } }
    else console.warn("Element #logo alebo #fullName nebol nájdený pre hover efekt.");

    // Ovládanie Spotify (Pôvodný kód)
    if (nextBtn) nextBtn.addEventListener('click', () => { if (currentTrackIndex < spotifyTrackSources.length - 1) loadSpotifyTrack(currentTrackIndex + 1); });
    else console.error("Element #spotify-next not found.");
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentTrackIndex > 0) loadSpotifyTrack(currentTrackIndex - 1); });
    else console.error("Element #spotify-prev not found.");

    // Interakcie v Instagram sekcii (Pôvodný kód)
    if (instaHeartIcon) instaHeartIcon.addEventListener('click', () => { instaHeartIcon.classList.toggle('liked'); if (instaHeartIcon.classList.contains('liked')) triggerHeartAnimation(); });
    else console.warn("Element #insta-heart-icon not found.");
    if (instaCommentIcon) instaCommentIcon.addEventListener('click', showCommentBubble);
    else console.warn("Element #insta-comment-icon not found.");

    // ZMENA: Listener pre kliknutie na karty projektov (event delegation)
    if (projectCardsGrid) {
        projectCardsGrid.addEventListener('click', handleProjectCardClick);
        console.log("Pripravený click listener pre .project-cards-grid.");
    } else {
        console.warn("Nenašiel sa kontajner .project-cards-grid pre event delegation.");
    }

    // --- Initial Page Setup (Kombinované) ---
    console.log("Vykonávam počiatočné nastavenie...");

    // Typed.js (Pôvodný kód)
    const typedElement = document.getElementById('typed-hero');
    if (typedElement && typeof Typed !== 'undefined') {
        new Typed('#typed-hero', {
            strings: [ 'Ahoj, som Jakub.', 'Tvorím interaktívne weby.', 'Vitaj na mojej stránke.' ],
            typeSpeed: 50, backSpeed: 25, backDelay: 2000, startDelay: 500, loop: true, cursorChar: '|', showCursor: true
        });
    } else if (!typedElement) console.error("Element #typed-hero not found for Typed.js.");
    else console.error("Typed.js library not loaded.");

    // Tlačidlo Profil/Domov (Používa novú logiku)
    if (btnToggle) { btnToggle.textContent = currentPanelIndex === 0 ? 'Profil' : 'Domov'; btnToggle.classList.toggle('profile-active', currentPanelIndex === 1); }

    // Spotify (Pôvodný kód)
    if (spotifyTrackSources.length > 0 && spotifyIframe) {
        setTimeout(() => { loadSpotifyTrack(0); }, 100);
    } else {
        if (spotifyTrackSources.length === 0) console.warn("Spotify track list je prázdny.");
        if (!spotifyIframe) console.warn("Spotify iframe nenájdený.");
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
    }

    // Scroll to Top tlačidlo (Používa novú handleScroll)
    handleScroll();

    console.log("Kombinovaný JavaScript (v5 - click interaction) inicializovaný.");

}); // End of DOMContentLoaded listener