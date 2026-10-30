/**
 * ============================================================================
 * JISHNU MONDAL — PORTFOLIO JAVASCRIPT
 * Lenis Smooth Scroll + GSAP ScrollTrigger + 3D Carousel & Drum Physics
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. LENIS + GSAP TICKER SYNCHRONIZATION
  // ==========================================
  gsap.registerPlugin(ScrollTrigger, Draggable);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.0,
    autoRaf: false,
  });

  // Sync Lenis scroll with ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Drive Lenis directly via GSAP's central high-performance ticker
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  // Disable GSAP lag smoothing to prevent scroll stutter / jumps
  gsap.ticker.lagSmoothing(0);

  // Shared references for pinned ScrollTriggers
  let aboutTlInstance = null;
  let worksScrollTrigger = null;

  // ==========================================
  // 2. PRELOADER ANIMATION
  // ==========================================
  const preloader = document.getElementById('preloader');
  const path = document.getElementById('preloader-stroke');
  const dot = document.getElementById('preloader-dot');

  const urlParams = new URLSearchParams(window.location.search);
  const isolateParam = urlParams.get('isolate');
  const skipPreloader = urlParams.get('nopreloader') === '1' || isolateParam !== null;
  if (isolateParam) {
    if (preloader) preloader.style.display = 'none';
    document.querySelectorAll('.section').forEach((sec) => {
      if (sec.id !== isolateParam) {
        sec.style.display = 'none';
      }
    });
  }

  if (skipPreloader && preloader) {
    preloader.style.display = 'none';
    initHeroEntrance();
    const scrollPxParam = urlParams.get('scrollpx');
    if (scrollPxParam) {
      const px = parseFloat(scrollPxParam);
      window.scrollTo(0, px);
      if (lenis) lenis.scrollTo(px, { immediate: true });
      ScrollTrigger.refresh();
      ScrollTrigger.update();
    }
  } else if (path && dot) {
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    const preChars = document.querySelectorAll('.pre-char');
    const preDot = document.querySelector('.preloader-title .dot');

    // Minimal initial state: soft subtle fade
    if (preChars.length > 0) {
      gsap.set(preChars, { opacity: 0, y: 6, filter: 'blur(4px)' });
      if (preDot) gsap.set(preDot, { opacity: 0 });

      // Clean, minimal letter fade-in
      gsap.timeline({ delay: 0.15 })
        .to(preChars, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.35,
          stagger: 0.06,
          ease: 'power2.out'
        })
        .to(preDot, {
          opacity: 1,
          duration: 0.25,
          ease: 'power2.out'
        }, '-=0.08');
    }

    const proxy = { progress: 0 };

    gsap.to(proxy, {
      progress: 1,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        const currentLength = proxy.progress * pathLength;
        path.style.strokeDashoffset = pathLength - currentLength;
        const point = path.getPointAtLength(currentLength);
        dot.setAttribute('cx', point.x);
        dot.setAttribute('cy', point.y);
      },
      onComplete: () => {
        // Clean, minimal fade out
        gsap.to(preloader, {
          opacity: 0,
          duration: 0.55,
          ease: 'power2.inOut',
          onStart: () => {
            preloader.style.pointerEvents = 'none';
            initHeroEntrance();
          },
          onComplete: () => {
            preloader.style.display = 'none';
          }
        });
      }
    });
  } else if (preloader) {
    preloader.style.display = 'none';
    initHeroEntrance();
  }

  // ==========================================
  // 3. HERO ENTRANCE & PARALLAX
  // ==========================================
  function initHeroEntrance() {
    if (urlParams.get('noanim') === '1') {
      gsap.set('.hero-title-container, #hero-portrait-inner, .hero-corner-left, .hero-corner-right', {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        y: 0
      });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo('.hero-title-container',
      { filter: 'blur(25px)', opacity: 0, scale: 0.96 },
      { filter: 'blur(0px)', opacity: 1, scale: 1, duration: 1.4 }
    )
    .fromTo('#hero-portrait-inner',
      { opacity: 0, y: 35, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2 },
      '-=1.0'
    )
    .fromTo('.hero-corner-left, .hero-corner-right',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.15 },
      '-=0.8'
    );

    // Subtle mouse parallax on hero portrait inner container
    const heroSection = document.getElementById('hero');
    const portraitInner = document.getElementById('hero-portrait-inner');
    if (heroSection && portraitInner) {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(portraitInner, {
          x: x * 16,
          y: y * 10,
          rotationY: x * 8,
          duration: 1.2,
          ease: 'power2.out'
        });
      });
      heroSection.addEventListener('mouseleave', () => {
        gsap.to(portraitInner, { x: 0, y: 0, rotationY: 0, duration: 1.5, ease: 'power3.out' });
      });
    }
  }

  // ==========================================
  // 4. NAVBAR THEME INVERSION ON DARK SECTIONS
  // ==========================================
  const darkSections = ['#about', '#experience', '#contact'];
  darkSections.forEach((selector) => {
    const sec = document.querySelector(selector);
    if (sec) {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 80px',
        end: 'bottom 80px',
        onEnter: () => document.body.classList.add('nav-dark-theme'),
        onLeave: () => document.body.classList.remove('nav-dark-theme'),
        onEnterBack: () => document.body.classList.add('nav-dark-theme'),
        onLeaveBack: () => document.body.classList.remove('nav-dark-theme'),
      });
    }
  });


  // ==========================================
  // 5. ABOUT SECTION PINNED ZOOM PORTAL
  // ==========================================
  const aboutSection = document.getElementById('about');
  const portalCard = document.getElementById('about-portal-card');
  const wordAbout = document.querySelector('.word-about');
  const wordMe = document.querySelector('.word-me');
  const aboutDetails = document.getElementById('about-details');

  if (aboutSection && portalCard) {
    const aboutTl = gsap.timeline({
      scrollTrigger: {
        trigger: aboutSection,
        start: 'top top',
        end: '+=260%',
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
      }
    });
    aboutTlInstance = aboutTl;

    aboutTl
      // Split words spread outward and fade out
      .to(wordAbout, { x: -160, opacity: 0, ease: 'none', duration: 0.5 }, 0)
      .to(wordMe, { x: 160, opacity: 0, ease: 'none', duration: 0.5 }, 0)
      // Background backdrop fades smoothly into global dark canvas
      .to('.about-backdrop', { opacity: 0.2, ease: 'none', duration: 0.6 }, 0)
      // Portal card reaches full zoom at t = 0.8 (generous cinematic zoom distance)
      .to(portalCard, {
        scale: 1.2,
        width: 'clamp(300px, 44vw, 620px)',
        height: 'clamp(190px, 29vw, 390px)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.95), 0 0 60px rgba(255,42,59,0.35)',
        ease: 'none',
        duration: 0.8
      }, 0)
      // Subtle levitation inside portal finishes by t = 0.8
      .fromTo('.spotlight-img',
        { scale: 1.15, y: 15 },
        { scale: 1, y: -10, ease: 'none', duration: 0.8 },
        0
      )
      // Details bar fades and slides up smoothly, fully settled by t = 0.8
      .fromTo(aboutDetails,
        { opacity: 0, y: 35 },
        { opacity: 1, y: 0, ease: 'power2.out', duration: 0.4 },
        0.4
      )
      // Holding buffer: Keep image locked at full zoom before allowing scroll down to next page
      .to({}, { duration: 0.2 });

    const aboutProgressParam = urlParams.get('aboutprogress');
    if (aboutProgressParam !== null) {
      if (aboutTl.scrollTrigger) aboutTl.scrollTrigger.kill();
      aboutTl.progress(parseFloat(aboutProgressParam));
    }
  }

  // Seamless scroll integration: Experience section flows smoothly right from below the zoomed card
  const expContainer = document.querySelector('.exp-container');
  if (expContainer) {
    gsap.fromTo(expContainer,
      { opacity: 0.3, y: 60 },
      {
        opacity: 1,
        y: 0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#experience',
          start: 'top 85%',
          end: 'top 40%',
          scrub: 1,
        }
      }
    );
  }

  // ==========================================
  // 6. EXPERIENCE SECTION TABS & WATERMARK
  // ==========================================
  // Background continuous smooth text marquee
  const expMarquee = document.getElementById('exp-watermark-text');
  if (expMarquee) {
    gsap.to(expMarquee, {
      xPercent: -50,
      repeat: -1,
      duration: 35,
      ease: 'linear'
    });
  }

  // ==========================================
  // PREMIUM 3D CARD SWITCHER & DEPTH CHOREOGRAPHY
  // ==========================================
  function initExperienceCardSwitcher() {
    const tabBtns = Array.from(document.querySelectorAll('.exp-tab-btn'));
    const cardsContainer = document.querySelector('.exp-cards-col');
    const expCards = {
      learning: document.getElementById('card-learning'),
      freelance: document.getElementById('card-freelance')
    };

    if (!tabBtns.length || !expCards.learning || !expCards.freelance) return;

    const roleOrder = tabBtns.map((b) => b.dataset.role);
    let currentRole = 'learning';
    let idleFloatTween = null;

    // Initialize initial card states
    Object.entries(expCards).forEach(([role, card]) => {
      if (!card) return;
      if (role === currentRole) {
        card.classList.add('active');
        card.style.visibility = 'visible';
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
        card.style.zIndex = '2';
        card.setAttribute('aria-hidden', 'false');
        gsap.set(card, { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0 });
      } else {
        card.classList.remove('active');
        card.style.visibility = 'hidden';
        card.style.opacity = '0';
        card.style.pointerEvents = 'none';
        card.style.zIndex = '1';
        card.setAttribute('aria-hidden', 'true');
        gsap.set(card, { x: 0, y: 30, scale: 0.94, rotateX: 0, rotateY: 0 });
      }
    });

    // Subtle ambient idle float on the active card
    function startIdleFloat() {
      if (idleFloatTween) idleFloatTween.kill();
      const activeCard = expCards[currentRole];
      if (!activeCard) return;

      idleFloatTween = gsap.to(activeCard, {
        y: '-=6',
        duration: 3.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        overwrite: 'auto'
      });
    }

    function stopIdleFloat() {
      if (idleFloatTween) {
        idleFloatTween.kill();
        idleFloatTween = null;
      }
      const activeCard = expCards[currentRole];
      if (activeCard) {
        gsap.to(activeCard, { y: 0, duration: 0.35, ease: 'power2.out' });
      }
    }

    startIdleFloat();

    // Central Card Switch Dispatcher
    function switchRole(targetRole) {
      if (targetRole === currentRole || !expCards[targetRole]) return;

      const outgoingCard = expCards[currentRole];
      const incomingCard = expCards[targetRole];

      const oldIndex = roleOrder.indexOf(currentRole);
      const newIndex = roleOrder.indexOf(targetRole);
      const direction = newIndex >= oldIndex ? 1 : -1;

      // Update state tracking and buttons immediately
      currentRole = targetRole;

      tabBtns.forEach((btn) => {
        const isActive = btn.dataset.role === targetRole;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
        if (isActive && urlParams.get('noanim') !== '1') {
          gsap.fromTo(btn,
            { scale: 0.93 },
            { scale: 1, duration: 0.35, ease: 'back.out(2)' }
          );
        }
      });

      // If noanim mode is requested (e.g. headless tests) resolve instantly
      if (urlParams.get('noanim') === '1') {
        outgoingCard.classList.remove('active');
        outgoingCard.style.visibility = 'hidden';
        outgoingCard.style.opacity = '0';
        outgoingCard.style.pointerEvents = 'none';
        outgoingCard.style.zIndex = '1';
        outgoingCard.setAttribute('aria-hidden', 'true');

        incomingCard.classList.add('active');
        incomingCard.style.visibility = 'visible';
        incomingCard.style.opacity = '1';
        incomingCard.style.pointerEvents = 'auto';
        incomingCard.style.zIndex = '2';
        incomingCard.setAttribute('aria-hidden', 'false');
        gsap.set(incomingCard, { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, opacity: 1 });
        return;
      }

      // Stop ambient float during transition
      if (idleFloatTween) {
        idleFloatTween.kill();
        idleFloatTween = null;
      }

      // Kill any active tweens on cards for bulletproof rapid-click handling
      gsap.killTweensOf([outgoingCard, incomingCard]);

      // 1. Outgoing Card Animation: Subtly recedes into depth, slides away, and dissolves
      outgoingCard.style.zIndex = '1';
      outgoingCard.style.pointerEvents = 'none';

      gsap.to(outgoingCard, {
        y: direction * -34,
        scale: 0.93,
        opacity: 0,
        rotateX: direction * 4.5,
        duration: 0.52,
        ease: 'power2.inOut',
        onComplete: () => {
          outgoingCard.classList.remove('active');
          outgoingCard.style.visibility = 'hidden';
          outgoingCard.setAttribute('aria-hidden', 'true');
          gsap.set(outgoingCard, { clearProps: 'transform,rotateX,rotateY' });
        }
      });

      // 2. Incoming Card Animation: Slides into place with scale-up and shadow expansion
      incomingCard.classList.add('active');
      incomingCard.style.visibility = 'visible';
      incomingCard.style.zIndex = '2';
      incomingCard.setAttribute('aria-hidden', 'false');

      const tl = gsap.timeline({
        onComplete: () => {
          incomingCard.style.pointerEvents = 'auto';
          startIdleFloat();
          if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
          }
        }
      });

      tl.fromTo(incomingCard,
        {
          y: direction * 42,
          scale: 0.92,
          opacity: 0,
          rotateX: direction * -4.5,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 10px rgba(255, 42, 59, 0)'
        },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          rotateX: 0,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(255, 42, 59, 0.14)',
          duration: 0.65,
          ease: 'power3.out'
        }
      );

      // 3. Interior micro-stagger for Apple/Linear quality polish
      const interiorElements = [
        incomingCard.querySelector('.exp-card-header'),
        incomingCard.querySelector('.exp-role-title'),
        incomingCard.querySelector('.exp-role-summary'),
        incomingCard.querySelector('.exp-milestones')
      ].filter(Boolean);

      if (interiorElements.length) {
        gsap.killTweensOf(interiorElements);
        tl.fromTo(interiorElements,
          { y: direction * 14, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.05, duration: 0.52, ease: 'power2.out' },
          0.1
        );
      }
    }

    // Tab button click listeners
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetRole = btn.dataset.role;
        switchRole(targetRole);
      });
    });

    // Optional Interactive 3D Perspective Tilt on Mousemove for Desktop
    if (cardsContainer && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let isHovered = false;

      cardsContainer.addEventListener('mouseenter', () => {
        isHovered = true;
        stopIdleFloat();
      });

      cardsContainer.addEventListener('mousemove', (e) => {
        const activeCard = expCards[currentRole];
        if (!activeCard) return;

        const rect = cardsContainer.getBoundingClientRect();
        const xPercent = (e.clientX - rect.left) / rect.width - 0.5;
        const yPercent = (e.clientY - rect.top) / rect.height - 0.5;

        gsap.to(activeCard, {
          rotateY: xPercent * 6,
          rotateX: -yPercent * 6,
          duration: 0.35,
          ease: 'power1.out',
          overwrite: 'auto'
        });
      });

      cardsContainer.addEventListener('mouseleave', () => {
        isHovered = false;
        const activeCard = expCards[currentRole];
        if (activeCard) {
          gsap.to(activeCard, {
            rotateX: 0,
            rotateY: 0,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => {
              if (!isHovered) startIdleFloat();
            }
          });
        }
      });
    }

    // Optional deep-link or initial parameter (e.g. ?exprole=freelance)
    const expRoleParam = urlParams.get('exprole');
    if (expRoleParam && expCards[expRoleParam] && expRoleParam !== currentRole) {
      switchRole(expRoleParam);
    }
  }

  initExperienceCardSwitcher();

  // ==========================================
  // 7. FEATURED PROJECT 3D CURVED CAROUSEL
  // ==========================================
  const carouselStage = document.getElementById('carousel-3d-stage');
  const carouselCards = Array.from(document.querySelectorAll('.carousel-card'));
  const carouselTitle = document.getElementById('carousel-title');
  const carouselSub = document.getElementById('carousel-sub');
  const carouselNum = document.getElementById('carousel-num');

  const totalCarouselCards = carouselCards.length;
  const radius = 540; // 3D cylinder radius
  let currentAngle = 0;
  let targetAngle = 0;
  let isDraggingCarousel = false;
  let startX = 0;
  let prevAngle = 0;

  function applyCarouselTransforms() {
    const anglePerCard = 360 / totalCarouselCards;
    let closestCardIndex = 0;
    let minCardDistance = Infinity;

    carouselCards.forEach((card, i) => {
      const cardAngle = i * anglePerCard + currentAngle;
      const rad = (cardAngle * Math.PI) / 180;

      // 3D Cylinder geometry
      const x = Math.sin(rad) * radius;
      const z = Math.cos(rad) * radius - radius;
      const rotateY = -cardAngle;

      card.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${rotateY}deg)`;

      // Normalised angle to find front-facing card (closest to z = 0)
      const normalizedAngle = ((cardAngle % 360) + 360) % 360;
      const distFromFront = Math.min(normalizedAngle, 360 - normalizedAngle);

      if (distFromFront < minCardDistance) {
        minCardDistance = distFromFront;
        closestCardIndex = i;
      }
    });

    // Update active metadata footer
    const activeCard = carouselCards[closestCardIndex];
    if (activeCard && carouselTitle && carouselSub && carouselNum) {
      if (carouselTitle.textContent !== activeCard.dataset.title) {
        carouselTitle.textContent = activeCard.dataset.title;
        carouselSub.textContent = activeCard.dataset.subtitle;
        carouselNum.textContent = activeCard.dataset.num;
      }
    }
  }

  let carouselRafId = null;
  let isCarouselInView = false;

  function updateCarouselPositions() {
    if (!isCarouselInView) {
      carouselRafId = null;
      return;
    }
    // Smooth lerp
    currentAngle += (targetAngle - currentAngle) * 0.12;
    applyCarouselTransforms();
    carouselRafId = requestAnimationFrame(updateCarouselPositions);
  }

  // Pointer drag controls for carousel with touch-scroll safety
  if (carouselStage) {
    let startY = 0;
    let isHorizontalGesture = false;
    let hasCaptured = false;

    carouselStage.addEventListener('pointerdown', (e) => {
      isDraggingCarousel = true;
      startX = e.clientX;
      startY = e.clientY;
      prevAngle = targetAngle;
      isHorizontalGesture = false;
      hasCaptured = false;
      if (e.pointerType !== 'touch') {
        hasCaptured = true;
        try { carouselStage.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });

    carouselStage.addEventListener('pointermove', (e) => {
      if (!isDraggingCarousel) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // On touch, detect gesture intention
      if (e.pointerType === 'touch' && !hasCaptured) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          if (Math.abs(dx) > Math.abs(dy)) {
            isHorizontalGesture = true;
            hasCaptured = true;
            try { carouselStage.setPointerCapture(e.pointerId); } catch (_) {}
          } else {
            // Predominantly vertical swipe: release so browser scrolls page naturally!
            isDraggingCarousel = false;
            return;
          }
        }
      }

      if (e.pointerType !== 'touch' || isHorizontalGesture) {
        targetAngle = prevAngle + dx * 0.22;
      }
    });

    const stopDrag = (e) => {
      isDraggingCarousel = false;
      isHorizontalGesture = false;
      if (hasCaptured && e && e.pointerId) {
        try { carouselStage.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      hasCaptured = false;
    };

    carouselStage.addEventListener('pointerup', stopDrag);
    carouselStage.addEventListener('pointercancel', stopDrag);

    // Wheel scrub inside carousel
    carouselStage.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        targetAngle -= e.deltaX * 0.3;
      }
    }, { passive: false });

    // ScrollTrigger to rotate carousel as user scrolls past
    ScrollTrigger.create({
      trigger: '#landing-pages',
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        if (!isDraggingCarousel) {
          targetAngle = -self.progress * 240;
        }
      }
    });

    // Pause rAF when carousel section is offscreen to preserve mobile battery & GPU
    const landingSec = document.getElementById('landing-pages');
    if (landingSec) {
      const carouselObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isCarouselInView = entry.isIntersecting;
          if (isCarouselInView && !carouselRafId) {
            carouselRafId = requestAnimationFrame(updateCarouselPositions);
          }
        });
      }, { threshold: 0.05 });
      carouselObserver.observe(landingSec);
    }

    applyCarouselTransforms();
    isCarouselInView = true;
    carouselRafId = requestAnimationFrame(updateCarouselPositions);

    // Ensure carousel looping videos play reliably
    document.querySelectorAll('.carousel-card video').forEach((vid) => {
      vid.muted = true;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          const resumeVideos = () => {
            document.querySelectorAll('.carousel-card video').forEach((v) => v.play().catch(() => {}));
            window.removeEventListener('click', resumeVideos);
            window.removeEventListener('touchstart', resumeVideos);
          };
          window.addEventListener('click', resumeVideos, { once: true });
          window.addEventListener('touchstart', resumeVideos, { once: true });
        });
      }
    });
  }

  // ==========================================
  // 8. WORKS '26 / 3D REVOLVING DRUM SHOWCASE
  // ==========================================
  const drumCylinder = document.getElementById('drum-cylinder');
  const drumFaces = Array.from(document.querySelectorAll('.drum-face'));
  const drumHeading = document.getElementById('drum-active-heading');
  const drumMenuItems = Array.from(document.querySelectorAll('.drum-nav-item'));
  const totalFaces = drumFaces.length;
  const drumRadius = 208; // 3D drum cylinder radius matching 240px face height

  // Arrange faces in a 3D hexagonal ring around horizontal X axis
  drumFaces.forEach((face, index) => {
    const angleX = (index / totalFaces) * 360;
    face.style.transform = `rotateX(${angleX}deg) translateZ(${drumRadius}px)`;
  });

  let currentDrumAngleX = 0;
  let activeProjectIndex = 0;

  function setDrumActiveProject(index) {
    activeProjectIndex = index;
    // Update left heading with quick fade animation
    if (drumHeading && drumFaces[index]) {
      const name = drumFaces[index].dataset.name;
      gsap.to(drumHeading, {
        opacity: 0,
        y: -10,
        duration: 0.15,
        onComplete: () => {
          drumHeading.textContent = name;
          gsap.to(drumHeading, { opacity: 1, y: 0, duration: 0.25 });
        }
      });
    }

    // Update right menu list
    drumMenuItems.forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
  }

  // ScrollTrigger pinned sequence for Works '26
  const worksSection = document.getElementById('works');
  if (worksSection && drumCylinder) {
    worksScrollTrigger = ScrollTrigger.create({
      trigger: worksSection,
      start: 'top top',
      end: '+=200%',
      pin: true,
      scrub: 0.8,
      onUpdate: (self) => {
        // Rotate through all 6 faces across scroll duration
        const rotX = -self.progress * (360 * ((totalFaces - 1) / totalFaces));
        currentDrumAngleX = rotX;
        drumCylinder.style.transform = `rotateX(${rotX}deg)`;

        // Calculate active face
        const normalizedAngle = (-rotX % 360 + 360) % 360;
        const faceIndex = Math.min(
          totalFaces - 1,
          Math.max(0, Math.round((normalizedAngle / 360) * totalFaces) % totalFaces)
        );

        if (faceIndex !== activeProjectIndex) {
          setDrumActiveProject(faceIndex);
        }
      }
    });

    // Right menu clicking directly rotates to selected project
    drumMenuItems.forEach((item, idx) => {
      item.addEventListener('click', () => {
        const targetRotX = -(idx / totalFaces) * 360;
        gsap.to(drumCylinder, {
          transform: `rotateX(${targetRotX}deg)`,
          duration: 0.9,
          ease: 'power3.out',
          onUpdate: () => {
            setDrumActiveProject(idx);
          }
        });
      });
    });

    // Touch/drag on drum cylinder with touch-scroll safety
    const drumViewport = document.getElementById('drum-viewport');
    let isDraggingDrum = false;
    let drumStartY = 0;
    let drumStartX = 0;
    let drumStartAngle = 0;
    let hasCapturedDrum = false;

    if (drumViewport) {
      drumViewport.addEventListener('pointerdown', (e) => {
        isDraggingDrum = true;
        drumStartY = e.clientY;
        drumStartX = e.clientX;
        drumStartAngle = currentDrumAngleX;
        hasCapturedDrum = false;
        if (e.pointerType !== 'touch') {
          hasCapturedDrum = true;
          try { drumViewport.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });

      drumViewport.addEventListener('pointermove', (e) => {
        if (!isDraggingDrum) return;
        const dy = e.clientY - drumStartY;

        // On touch, allow native vertical scroll unless deliberate drag
        if (e.pointerType === 'touch' && !hasCapturedDrum) {
          if (Math.abs(dy) > 10) {
            // Let the page scroll naturally
            isDraggingDrum = false;
            return;
          }
        }

        currentDrumAngleX = drumStartAngle + dy * 0.45;
        drumCylinder.style.transform = `rotateX(${currentDrumAngleX}deg)`;

        const normalizedAngle = (-currentDrumAngleX % 360 + 360) % 360;
        const faceIndex = Math.min(
          totalFaces - 1,
          Math.max(0, Math.round((normalizedAngle / 360) * totalFaces) % totalFaces)
        );
        if (faceIndex !== activeProjectIndex) {
          setDrumActiveProject(faceIndex);
        }
      });

      const endDrumDrag = (e) => {
        isDraggingDrum = false;
        if (hasCapturedDrum && e && e.pointerId) {
          try { drumViewport.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        hasCapturedDrum = false;
      };
      drumViewport.addEventListener('pointerup', endDrumDrag);
      drumViewport.addEventListener('pointercancel', endDrumDrag);
    }
  }

  // ==========================================
  // 9. SERVICES ACCORDION INTERACTION
  // ==========================================
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach((item) => {
    const header = item.querySelector('.accordion-header');
    const body = item.querySelector('.accordion-body');
    const arrow = item.querySelector('.accordion-arrow');

    // Initialize default open item
    if (item.classList.contains('active')) {
      body.style.height = body.scrollHeight + 'px';
      arrow.textContent = '∧';
      header.setAttribute('aria-expanded', 'true');
    } else {
      body.style.height = '0px';
      arrow.textContent = '∨';
      header.setAttribute('aria-expanded', 'false');
    }

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all items
      accordionItems.forEach((other) => {
        other.classList.remove('active');
        const otherHeader = other.querySelector('.accordion-header');
        const otherBody = other.querySelector('.accordion-body');
        const otherArrow = other.querySelector('.accordion-arrow');
        if (otherHeader) otherHeader.setAttribute('aria-expanded', 'false');
        if (otherBody) otherBody.style.height = '0px';
        if (otherArrow) otherArrow.textContent = '∨';
      });

      // Toggle clicked item
      if (!isActive) {
        item.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
        body.style.height = body.scrollHeight + 'px';
        arrow.textContent = '∧';
      } else {
        header.setAttribute('aria-expanded', 'false');
      }

      // Refresh ScrollTrigger calculations after accordion animation
      setTimeout(() => {
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      }, 350);
    });
  });

  // Recalculate dynamic scrollHeight for active accordion items on window resize/orientationchange
  window.addEventListener('resize', () => {
    accordionItems.forEach((item) => {
      if (item.classList.contains('active')) {
        const body = item.querySelector('.accordion-body');
        if (body) body.style.height = body.scrollHeight + 'px';
      }
    });
  });

  // ==========================================
  // 10. FOOTER ANIMATION
  // ==========================================
  const footerTitle = document.getElementById('footer-title');
  if (footerTitle && urlParams.get('noanim') !== '1') {
    ScrollTrigger.create({
      trigger: '#contact',
      start: 'top 75%',
      onEnter: () => {
        gsap.fromTo(footerTitle,
          { filter: 'blur(15px)', opacity: 0, y: 30 },
          { filter: 'blur(0px)', opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }
        );
      }
    });
  }

  // ==========================================
  // 11. NAVBAR INTERACTIVITY & SYNCHRONIZED SCROLL
  // ==========================================
  const navLinks = document.querySelectorAll('.nav-link');
  const drawerNavLinks = document.querySelectorAll('.drawer-nav-link');

  function setActiveNav(id) {
    if (!id) return;
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === `#${id}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    drawerNavLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === `#${id}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Exact pin-aware scroll position calculation
  function getSectionScrollTop(id) {
    if (id === 'hero') return 0;
    const el = document.getElementById(id);
    if (!el) return 0;

    // If the element was pinned by ScrollTrigger, its container is the .pin-spacer!
    const container = (el.parentElement && el.parentElement.classList.contains('pin-spacer'))
      ? el.parentElement
      : el;

    let top = 0;
    let curr = container;
    while (curr) {
      top += curr.offsetTop;
      curr = curr.offsetParent;
    }

    return Math.max(0, top - 60);
  }

  // Synchronize active nav link highlight in real-time as user scrolls
  function updateActiveNavOnScroll(scrollY) {
    const y = typeof scrollY === 'number' ? scrollY : (window.scrollY || 0);

    const aboutTop = getSectionScrollTop('about');
    const expTop = getSectionScrollTop('experience');
    const landingTop = getSectionScrollTop('landing-pages');
    const worksTop = getSectionScrollTop('works');
    const servicesTop = getSectionScrollTop('services');

    const threshold = 100;

    if (y < aboutTop - threshold) {
      setActiveNav('hero');
    } else if (y < expTop - threshold) {
      setActiveNav('about');
    } else if (y < landingTop - threshold) {
      setActiveNav('experience');
    } else if (y < worksTop - threshold) {
      setActiveNav('landing-pages');
    } else if (y < servicesTop - threshold) {
      setActiveNav('works');
    } else {
      setActiveNav('services');
    }
  }

  // Bind real-time active link updater to both Lenis scroll and window scroll
  lenis.on('scroll', (e) => {
    updateActiveNavOnScroll(e.scroll);
  });
  window.addEventListener('scroll', () => {
    updateActiveNavOnScroll(window.scrollY);
  });

  // Smooth, accurate anchor navigation for navbar and in-page links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const idClean = targetId.replace('#', '');
      const targetEl = document.getElementById(idClean);
      if (!targetEl) return;

      e.preventDefault();

      const targetPos = getSectionScrollTop(idClean);

      lenis.scrollTo(targetPos, {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        onComplete: () => {
          setActiveNav(idClean);
        }
      });

      setActiveNav(idClean);
    });
  });

  // ==========================================
  // MOBILE NAVIGATION DRAWER CONTROLLER
  // ==========================================
  function initMobileDrawer() {
    const navToggle = document.getElementById('nav-toggle');
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!navToggle || !drawer) return;

    let isOpen = false;

    function openDrawer() {
      isOpen = true;
      navToggle.classList.add('is-active');
      navToggle.setAttribute('aria-expanded', 'true');
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      lenis.stop();
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      if (!isOpen) return;
      isOpen = false;
      navToggle.classList.remove('is-active');
      navToggle.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      lenis.start();
      document.body.style.overflow = '';
    }

    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeDrawer);
    }

    drawer.querySelectorAll('.drawer-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024 && isOpen) {
        closeDrawer();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    });
  }

  initMobileDrawer();

  // Refresh ScrollTrigger after assets settle
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });

  // ==========================================
  // 12. LET'S TALK RED LIQUID PHYSICS SIMULATION
  // ==========================================
  function initFooterLiquid() {
    const canvas = document.getElementById('footer-liquid-canvas');
    const card = document.querySelector('.footer-card');
    if (!canvas || !card) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Simulation constants
    const TENSION = 0.024;        // Spring stiffness
    const DAMPING = 0.038;        // Viscous damping
    const SPREAD = 0.22;          // Neighbor wave propagation
    const SPREAD_PASSES = 8;      // Dispersion passes per frame
    const BASE_FILL_RATIO = 0.58; // Liquid baseline rests cleanly between title and buttons

    let numNodes = 0;
    let nodes = [];
    let leftDeltas = [];
    let rightDeltas = [];

    // Sloshing & Tilt parameters (sensors & inertia)
    let sloshAngle = 0;
    let sloshVel = 0;
    const TILT_SPRING = 0.028;
    const TILT_DAMP = 0.065;
    let targetTilt = 0;
    let sensorAvailable = false;

    // Underwater rising bubbles
    let bubbles = [];
    const MAX_BUBBLES = 40;

    // Mouse & Touch interaction tracking
    const mouse = {
      x: -1000,
      y: -1000,
      prevX: -1000,
      prevY: -1000,
      vx: 0,
      vy: 0,
      isInside: false,
      lastTime: performance.now()
    };

    function resize() {
      const rect = card.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initNodes();
    }

    function initNodes() {
      numNodes = Math.max(45, Math.min(150, Math.floor(width / 11)));
      nodes = [];
      leftDeltas = new Float32Array(numNodes);
      rightDeltas = new Float32Array(numNodes);

      const baseLevel = height * BASE_FILL_RATIO;
      for (let i = 0; i < numNodes; i++) {
        const x = (i / (numNodes - 1)) * width;
        nodes.push({
          x: x,
          y: baseLevel,
          targetY: baseLevel,
          vel: 0
        });
      }

      // Seed initial bubbles
      bubbles = [];
      for (let i = 0; i < 16; i++) {
        spawnBubble(
          Math.random() * width,
          baseLevel + 20 + Math.random() * (height - baseLevel - 30)
        );
      }
    }

    function disturb(x, force, radius = 85) {
      if (numNodes === 0) return;
      for (let i = 0; i < numNodes; i++) {
        const dist = Math.abs(nodes[i].x - x);
        if (dist < radius) {
          const factor = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
          nodes[i].vel += force * factor;
        }
      }
    }

    function spawnBubble(x, y) {
      if (bubbles.length >= MAX_BUBBLES) return;
      bubbles.push({
        x: x !== undefined ? x : Math.random() * width,
        y: y !== undefined ? y : (height - 15 - Math.random() * 30),
        radius: 1.5 + Math.random() * 3.2,
        vy: -0.8 - Math.random() * 1.5,
        wobbleSpeed: 0.035 + Math.random() * 0.06,
        wobbleAmp: 1.0 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.45
      });
    }

    // Interactive pointer events on the footer card
    card.addEventListener('pointerenter', (e) => {
      mouse.isInside = true;
      const rect = card.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.lastTime = performance.now();
      disturb(mouse.x, -8, 90);
    });

    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const now = performance.now();
      const dt = Math.max(1, now - mouse.lastTime);
      mouse.lastTime = now;

      mouse.vx = ((currentX - mouse.x) / dt) * 16;
      mouse.vy = ((currentY - mouse.y) / dt) * 16;
      mouse.x = currentX;
      mouse.y = currentY;
      mouse.isInside = true;

      const speed = Math.hypot(mouse.vx, mouse.vy);
      const idx = Math.min(numNodes - 1, Math.max(0, Math.floor((mouse.x / width) * (numNodes - 1))));
      const currentSurfaceY = nodes[idx] ? nodes[idx].y : height * BASE_FILL_RATIO;
      const distFromSurface = mouse.y - currentSurfaceY;

      // When cursor is close to surface or moving fast over card
      if (Math.abs(distFromSurface) < 140 || speed > 3.5) {
        let push = mouse.vy * 0.4;
        push += (Math.random() - 0.5) * Math.min(speed * 0.3, 5);
        if (e.pointerType === 'touch') {
          // Dampen push on touch to prevent normal scroll-swipes from thrashing fluid
          push *= 0.35;
        }
        push = Math.max(-20, Math.min(20, push));

        if (Math.abs(push) > 0.35) {
          disturb(mouse.x, push, Math.min(140, 50 + speed * 2.2));
          if (speed > 5 && Math.random() < 0.28) {
            spawnBubble(mouse.x + (Math.random() - 0.5) * 40, Math.max(currentSurfaceY + 20, mouse.y));
          }
        }
      }
    });

    card.addEventListener('pointerdown', (e) => {
      const rect = card.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      disturb(clickX, -24, 120);
      for (let i = 0; i < 7; i++) {
        spawnBubble(
          clickX + (Math.random() - 0.5) * 70,
          Math.min(height - 15, clickY + Math.random() * 50)
        );
      }

      // iOS Safari 13+ Gyroscope permission request on first user touch
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then((res) => {
          if (res === 'granted') {
            sensorAvailable = true;
          }
        }).catch(() => {});
      }
    });

    card.addEventListener('pointerleave', () => {
      mouse.isInside = false;
      mouse.vx = 0;
      mouse.vy = 0;
    });

    // Real device tilt sensor (gyroscope / accelerometer)
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma !== null && e.gamma !== undefined) {
        sensorAvailable = true;
        const clampedGamma = Math.max(-40, Math.min(40, e.gamma));
        targetTilt = (clampedGamma * Math.PI / 180) * 0.45;
      }
    }, { passive: true });

    let animationFrameId = null;
    let isRunning = false;
    let time = 0;

    function updatePhysics() {
      time++;
      const baseFill = height * BASE_FILL_RATIO;

      // Guessing / Desktop tilt physics when hardware sensor not present
      if (!sensorAvailable) {
        if (mouse.isInside) {
          const lateralInertia = -mouse.vx * 0.003;
          const posTilt = ((mouse.x - width / 2) / (width / 2)) * 0.045;
          targetTilt = Math.max(-0.25, Math.min(0.25, lateralInertia + posTilt));
        } else {
          targetTilt = 0;
        }
      }

      // Slosh angle spring-damper dynamics (simulates real container inertia)
      sloshVel += (targetTilt - sloshAngle) * TILT_SPRING - sloshVel * TILT_DAMP;
      sloshAngle += sloshVel;

      // Update node springs
      for (let i = 0; i < numNodes; i++) {
        const dx = nodes[i].x - width / 2;
        const tiltOffset = dx * Math.sin(sloshAngle);
        // Ambient natural multi-frequency undulation
        const ambient = Math.sin(time * 0.02 + nodes[i].x * 0.007) * 3.2
                      + Math.cos(time * 0.035 + nodes[i].x * 0.018) * 1.6;

        nodes[i].targetY = baseFill + tiltOffset + ambient;

        const dy = nodes[i].targetY - nodes[i].y;
        nodes[i].vel += dy * TENSION - nodes[i].vel * DAMPING;
        nodes[i].y += nodes[i].vel;
      }

      // Multi-pass neighbor wave propagation
      for (let p = 0; p < SPREAD_PASSES; p++) {
        for (let i = 0; i < numNodes; i++) {
          if (i > 0) {
            leftDeltas[i] = SPREAD * (nodes[i].y - nodes[i - 1].y);
            nodes[i - 1].vel += leftDeltas[i];
          }
          if (i < numNodes - 1) {
            rightDeltas[i] = SPREAD * (nodes[i].y - nodes[i + 1].y);
            nodes[i + 1].vel += rightDeltas[i];
          }
        }
        for (let i = 0; i < numNodes; i++) {
          if (i > 0) nodes[i - 1].y += leftDeltas[i];
          if (i < numNodes - 1) nodes[i + 1].y += rightDeltas[i];
        }
      }

      // Ambient bubble generation
      if (time % 36 === 0 && Math.random() < 0.75) {
        spawnBubble();
      }

      // Update bubbles
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y += b.vy;
        b.phase += b.wobbleSpeed;

        const currentX = b.x + Math.sin(b.phase) * b.wobbleAmp;
        const nodeIdx = Math.min(numNodes - 1, Math.max(0, Math.floor((currentX / width) * (numNodes - 1))));
        const surfaceY = nodes[nodeIdx] ? nodes[nodeIdx].y : baseFill;

        if (b.y <= surfaceY + 2) {
          disturb(currentX, -1.2, 25);
          bubbles.splice(i, 1);
        }
      }
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      if (numNodes < 2) return;

      // 1. Background liquid layer (depth & parallax)
      ctx.beginPath();
      const backOffset = 10;
      ctx.moveTo(nodes[0].x, nodes[0].y + Math.sin(time * 0.03) * 6 + backOffset);
      for (let i = 0; i < numNodes - 1; i++) {
        const waveOffset = Math.sin(time * 0.028 + i * 0.15) * 7 + backOffset;
        const xc = (nodes[i].x + nodes[i + 1].x) / 2;
        const yc = (nodes[i].y + nodes[i + 1].y) / 2 + waveOffset;
        ctx.quadraticCurveTo(nodes[i].x, nodes[i].y + waveOffset, xc, yc);
      }
      ctx.lineTo(nodes[numNodes - 1].x, nodes[numNodes - 1].y + backOffset);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(150, 10, 25, 0.42)';
      ctx.fill();

      // 2. Main primary red liquid volume
      const grad = ctx.createLinearGradient(0, height * 0.35, 0, height);
      grad.addColorStop(0, 'rgba(255, 42, 59, 0.76)');
      grad.addColorStop(0.3, 'rgba(220, 20, 42, 0.88)');
      grad.addColorStop(0.7, 'rgba(165, 12, 28, 0.94)');
      grad.addColorStop(1, 'rgba(95, 4, 15, 0.98)');

      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 0; i < numNodes - 1; i++) {
        const xc = (nodes[i].x + nodes[i + 1].x) / 2;
        const yc = (nodes[i].y + nodes[i + 1].y) / 2;
        ctx.quadraticCurveTo(nodes[i].x, nodes[i].y, xc, yc);
      }
      ctx.lineTo(nodes[numNodes - 1].x, nodes[numNodes - 1].y);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // 3. Surface crest luminous highlight
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 0; i < numNodes - 1; i++) {
        const xc = (nodes[i].x + nodes[i + 1].x) / 2;
        const yc = (nodes[i].y + nodes[i + 1].y) / 2;
        ctx.quadraticCurveTo(nodes[i].x, nodes[i].y, xc, yc);
      }
      ctx.lineTo(nodes[numNodes - 1].x, nodes[numNodes - 1].y);

      ctx.save();
      ctx.shadowColor = '#ff2a3b';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255, 155, 175, 0.92)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();

      // 4. Underwater bubbles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const bx = b.x + Math.sin(b.phase) * b.wobbleAmp;
        ctx.beginPath();
        ctx.arc(bx, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 190, 200, ${b.alpha * 0.7})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 60, 80, ${b.alpha * 0.9})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(bx - b.radius * 0.35, b.y - b.radius * 0.35, Math.max(0.6, b.radius * 0.28), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha * 0.85})`;
        ctx.fill();
      }

      // 5. Cursor water glow / refraction
      if (mouse.isInside && mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height) {
        const nodeIdx = Math.min(numNodes - 1, Math.max(0, Math.floor((mouse.x / width) * (numNodes - 1))));
        const surfaceY = nodes[nodeIdx] ? nodes[nodeIdx].y : height * BASE_FILL_RATIO;
        if (mouse.y >= surfaceY - 50) {
          const radial = ctx.createRadialGradient(mouse.x, mouse.y, 4, mouse.x, mouse.y, 90);
          radial.addColorStop(0, 'rgba(255, 80, 100, 0.25)');
          radial.addColorStop(0.6, 'rgba(255, 42, 59, 0.08)');
          radial.addColorStop(1, 'rgba(255, 42, 59, 0)');
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 90, 0, Math.PI * 2);
          ctx.fillStyle = radial;
          ctx.fill();
        }
      }
    }

    function loop() {
      if (!isRunning) return;
      updatePhysics();
      render();
      animationFrameId = requestAnimationFrame(loop);
    }

    function start() {
      if (isRunning) return;
      isRunning = true;
      animationFrameId = requestAnimationFrame(loop);
    }

    function stop() {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }

    // Performance: Only run when footer card is intersecting viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          start();
        } else {
          stop();
        }
      });
    }, { threshold: 0 });

    observer.observe(card);

    resize();
    render();
    start();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
  }

  // Initialize Footer Liquid Simulation
  initFooterLiquid();

  // ==========================================================================
  // 12. BULLETPROOF EMAIL DISPATCHER, MAGNETIC PHYSICS & HUD TOAST
  // ==========================================================================
  const RECIPIENT_EMAIL = 'harshvsvardhan22@gmail.com';
  const toastEl = document.getElementById('email-toast');
  const toastGmailLink = document.getElementById('toast-gmail-link');
  const toastCloseBtn = document.getElementById('toast-close-btn');
  let toastTimeout = null;

  // Cross-browser clipboard copy with fallback
  function copyEmailToClipboard(email) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(email).catch(() => {
        fallbackCopyText(email);
      });
    } else {
      fallbackCopyText(email);
      return Promise.resolve();
    }
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.warn('Fallback copy failed', err);
    }
    document.body.removeChild(textarea);
  }

  // Display Toast Notification via GSAP
  function showEmailToast(gmailUrl) {
    if (!toastEl) return;

    if (toastGmailLink && gmailUrl) {
      toastGmailLink.href = gmailUrl;
    }

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    toastEl.classList.add('active');
    gsap.killTweensOf(toastEl);
    gsap.fromTo(toastEl,
      { y: 60, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
    );

    toastTimeout = setTimeout(() => {
      dismissEmailToast();
    }, 5500);
  }

  function dismissEmailToast() {
    if (!toastEl) return;
    gsap.to(toastEl, {
      y: 40,
      opacity: 0,
      scale: 0.96,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => {
        toastEl.classList.remove('active');
      }
    });
  }

  if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', dismissEmailToast);
  }

  // Central Email Dispatcher
  function dispatchEmailInquiry(serviceName) {
    const service = serviceName || 'General Inquiry';
    const subject = `Project Inquiry: ${service} — Harsh Vardhan Singh`;
    const body = `Hi Harsh,\n\nI came across your portfolio and would like to discuss a ${service} project.\n\nProject Overview:\nTimeline:\nBudget Range:\n\nLooking forward to your reply!`;

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    const mailtoUrl = `mailto:${RECIPIENT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${RECIPIENT_EMAIL}&su=${encodedSubject}&body=${encodedBody}`;

    // 1. Copy to clipboard immediately
    copyEmailToClipboard(RECIPIENT_EMAIL);

    // 2. Device-aware dispatch
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile browsers handle mailto: natively into Mail/Gmail apps
      window.location.href = mailtoUrl;
    } else {
      // Desktop: Open Gmail compose directly in a new tab + show floating Toast HUD with fallback
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      showEmailToast(gmailUrl);
    }
  }

  // Bind to all contact/inquiry buttons
  document.querySelectorAll('[data-email-cta]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const serviceName = btn.getAttribute('data-service') || 'General Inquiry';
      dispatchEmailInquiry(serviceName);
    });
  });

  // Bind quick copy buttons
  document.querySelectorAll('[data-copy-email]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      copyEmailToClipboard(RECIPIENT_EMAIL);
      showEmailToast(`https://mail.google.com/mail/?view=cm&fs=1&to=${RECIPIENT_EMAIL}`);
      const label = btn.querySelector('.copy-label');
      if (label) {
        const orig = label.textContent;
        label.textContent = 'COPIED!';
        setTimeout(() => { label.textContent = orig; }, 2000);
      }
    });
  });

  // ==========================================================================
  // GSAP MAGNETIC PHYSICS FOR CTA BUTTONS
  // ==========================================================================
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.magnetic-btn').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;

        gsap.to(btn, {
          x: relX * 0.3,
          y: relY * 0.3,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1.1, 0.4)'
        });
      });
    });
  }

});
