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

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
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

  // Role Tab Switching
  const tabBtns = document.querySelectorAll('.exp-tab-btn');
  const expCards = {
    learning: document.getElementById('card-learning'),
    freelance: document.getElementById('card-freelance')
  };

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const role = btn.dataset.role;
      Object.entries(expCards).forEach(([key, card]) => {
        if (key === role) {
          card.classList.add('active');
          gsap.fromTo(card,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
          );
        } else {
          card.classList.remove('active');
        }
      });
    });
  });

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

  function updateCarouselPositions() {
    // Smooth lerp
    currentAngle += (targetAngle - currentAngle) * 0.12;
    applyCarouselTransforms();
    requestAnimationFrame(updateCarouselPositions);
  }

  // Pointer drag controls for carousel
  if (carouselStage) {
    carouselStage.addEventListener('pointerdown', (e) => {
      isDraggingCarousel = true;
      startX = e.clientX;
      prevAngle = targetAngle;
      carouselStage.setPointerCapture(e.pointerId);
    });

    carouselStage.addEventListener('pointermove', (e) => {
      if (!isDraggingCarousel) return;
      const dx = e.clientX - startX;
      targetAngle = prevAngle + dx * 0.22;
    });

    const stopDrag = () => {
      isDraggingCarousel = false;
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

    applyCarouselTransforms();
    updateCarouselPositions();

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

    // Touch/drag on drum cylinder
    const drumViewport = document.getElementById('drum-viewport');
    let isDraggingDrum = false;
    let drumStartY = 0;
    let drumStartAngle = 0;

    if (drumViewport) {
      drumViewport.addEventListener('pointerdown', (e) => {
        isDraggingDrum = true;
        drumStartY = e.clientY;
        drumStartAngle = currentDrumAngleX;
        drumViewport.setPointerCapture(e.pointerId);
      });

      drumViewport.addEventListener('pointermove', (e) => {
        if (!isDraggingDrum) return;
        const dy = e.clientY - drumStartY;
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

      const endDrumDrag = () => {
        isDraggingDrum = false;
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
    } else {
      body.style.height = '0px';
      arrow.textContent = '∨';
    }

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all items
      accordionItems.forEach((other) => {
        other.classList.remove('active');
        const otherBody = other.querySelector('.accordion-body');
        const otherArrow = other.querySelector('.accordion-arrow');
        otherBody.style.height = '0px';
        otherArrow.textContent = '∨';
      });

      // Toggle clicked item
      if (!isActive) {
        item.classList.add('active');
        body.style.height = body.scrollHeight + 'px';
        arrow.textContent = '∧';
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

  // Refresh ScrollTrigger after assets settle
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });

});
