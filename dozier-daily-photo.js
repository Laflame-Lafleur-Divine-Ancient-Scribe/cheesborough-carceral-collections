/**
 * Dozier School Curated Photo Set - 12-Hour Randomization Module
 * Automatically rotates through the 10 curated Florida Dozier photographs every 12 hours.
 */
(function () {
  const DOZIER_PHOTOS = [
    {
      id: "dozier-reptile-demo",
      filename: "1950s_African American boys gathered on grounds to see a Ross Allen Reptile Institute demonstration at the School for Boys in Marianna, Florida..jpg",
      path: "01_Photos/02_By-State/Florida/1950s_African%20American%20boys%20gathered%20on%20grounds%20to%20see%20a%20Ross%20Allen%20Reptile%20Institute%20demonstration%20at%20the%20School%20for%20Boys%20in%20Marianna%2C%20Florida..jpg",
      rawPath: "01_Photos/02_By-State/Florida/1950s_African American boys gathered on grounds to see a Ross Allen Reptile Institute demonstration at the School for Boys in Marianna, Florida..jpg",
      caption: "1950s: African American boys gathered on grounds to see a Ross Allen Reptile Institute demonstration at the School for Boys in Marianna, Florida.",
      alt: "African American boys gathered for reptile demonstration at the School for Boys in Marianna",
      year: "1950s",
      topic: "Campus life and guest demonstrations"
    },
    {
      id: "dozier-open-house",
      filename: "1950s_African American boys gathering as guests arrive for Open House at the School for Boys in Marianna, Florida..jpg",
      path: "01_Photos/02_By-State/Florida/1950s_African%20American%20boys%20gathering%20as%20guests%20arrive%20for%20Open%20House%20at%20the%20School%20for%20Boys%20in%20Marianna%2C%20Florida..jpg",
      rawPath: "01_Photos/02_By-State/Florida/1950s_African American boys gathering as guests arrive for Open House at the School for Boys in Marianna, Florida..jpg",
      caption: "1950s: African American boys gathering as guests arrive for Open House at the School for Boys in Marianna, Florida.",
      alt: "African American boys gathering as guests arrive for Open House at the School for Boys in Marianna",
      year: "1950s",
      topic: "Open house and institutional staging"
    },
    {
      id: "dozier-barbershop",
      filename: "1950s_Barbershop for African American boys at the School for Boys in Marianna, Florida..jpg",
      path: "01_Photos/02_By-State/Florida/1950s_Barbershop%20for%20African%20American%20boys%20at%20the%20School%20for%20Boys%20in%20Marianna%2C%20Florida..jpg",
      rawPath: "01_Photos/02_By-State/Florida/1950s_Barbershop for African American boys at the School for Boys in Marianna, Florida..jpg",
      caption: "1950s: Barbershop for African American boys at the School for Boys in Marianna, Florida.",
      alt: "Barbershop for African American boys at the School for Boys in Marianna",
      year: "1950s",
      topic: "Vocational routines and segregated daily facilities"
    },
    {
      id: "dozier-bugle",
      filename: "1950s_Boy playing bugle at the School for Boys in Marianna, Florida..jpg",
      path: "01_Photos/02_By-State/Florida/1950s_Boy%20playing%20bugle%20at%20the%20School%20for%20Boys%20in%20Marianna%2C%20Florida..jpg",
      rawPath: "01_Photos/02_By-State/Florida/1950s_Boy playing bugle at the School for Boys in Marianna, Florida..jpg",
      caption: "1950s: Boy playing bugle at the School for Boys in Marianna, Florida.",
      alt: "Boy playing bugle at the School for Boys in Marianna",
      year: "1950s",
      topic: "Regimentation, music, and daily calls"
    },
    {
      id: "dozier-fire",
      filename: "1950s_Fire at the School for Boys in Marianna, Florida..jpg",
      path: "01_Photos/02_By-State/Florida/1950s_Fire%20at%20the%20School%20for%20Boys%20in%20Marianna%2C%20Florida..jpg",
      rawPath: "01_Photos/02_By-State/Florida/1950s_Fire at the School for Boys in Marianna, Florida..jpg",
      caption: "1950s: Fire at the School for Boys in Marianna, Florida.",
      alt: "Fire scene at the School for Boys in Marianna, Florida",
      year: "1950s",
      topic: "Campus incidents and structural hazards"
    },
    {
      id: "dozier-bus-1957",
      filename: "1957_Boys and bus from the Florida School for Boys at Marianna, Florida..jpg",
      path: "01_Photos/02_By-State/Florida/1957_Boys%20and%20bus%20from%20the%20Florida%20School%20for%20Boys%20at%20Marianna%2C%20Florida..jpg",
      rawPath: "01_Photos/02_By-State/Florida/1957_Boys and bus from the Florida School for Boys at Marianna, Florida..jpg",
      caption: "1957: Boys and bus from the Florida School for Boys at Marianna, Florida.",
      alt: "Boys and school bus from the Florida School for Boys at Marianna",
      year: "1957",
      topic: "Transportation and institutional excursions"
    },
    {
      id: "dozier-infirmary-1957",
      filename: "1957_Doctor examining a boy in the infirmary at the Florida Industrial School for Boys in Marianna..jpg",
      path: "01_Photos/02_By-State/Florida/1957_Doctor%20examining%20a%20boy%20in%20the%20infirmary%20at%20the%20Florida%20Industrial%20School%20for%20Boys%20in%20Marianna..jpg",
      rawPath: "01_Photos/02_By-State/Florida/1957_Doctor examining a boy in the infirmary at the Florida Industrial School for Boys in Marianna..jpg",
      caption: "1957: Doctor examining a boy in the infirmary at the Florida Industrial School for Boys in Marianna.",
      alt: "Doctor examining a student in the infirmary at the Florida Industrial School for Boys in Marianna",
      year: "1957",
      topic: "Institutional medical care and official documentation"
    },
    {
      id: "dozier-circus-clowns",
      filename: "3rd Annual F.I.S. circus clowns posing with costumes in Marianna_Florida.jpg",
      path: "01_Photos/02_By-State/Florida/3rd%20Annual%20F.I.S.%20circus%20clowns%20posing%20with%20costumes%20in%20Marianna_Florida.jpg",
      rawPath: "01_Photos/02_By-State/Florida/3rd Annual F.I.S. circus clowns posing with costumes in Marianna_Florida.jpg",
      caption: "3rd Annual F.I.S. circus clowns posing with costumes in Marianna, Florida.",
      alt: "Students in clown costumes at the 3rd Annual Florida Industrial School circus",
      year: "Historic",
      topic: "Staged festivities, performance, and institutional public relations"
    },
    {
      id: "dozier-dining-1940s",
      filename: "1940s_African American boys in dining hall at the School for Boys in Marianna, Florida.jpg",
      path: "01_Photos/02_By-State/Florida/1940s_African%20American%20boys%20in%20dining%20hall%20at%20the%20School%20for%20Boys%20in%20Marianna%2C%20Florida.jpg",
      rawPath: "01_Photos/02_By-State/Florida/1940s_African American boys in dining hall at the School for Boys in Marianna, Florida.jpg",
      caption: "1940s: African American boys in dining hall at the School for Boys in Marianna, Florida.",
      alt: "African American boys in dining hall at the School for Boys in Marianna",
      year: "1940s",
      topic: "Segregated dining halls and congregate life"
    },
    {
      id: "dozier-boxing-1940s",
      filename: "1940s_Boys in boxing match at the School for Boys in Marianna, Florida..jpg",
      path: "01_Photos/02_By-State/Florida/1940s_Boys%20in%20boxing%20match%20at%20the%20School%20for%20Boys%20in%20Marianna%2C%20Florida..jpg",
      rawPath: "01_Photos/02_By-State/Florida/1940s_Boys in boxing match at the School for Boys in Marianna, Florida..jpg",
      caption: "1940s: Boys in boxing match at the School for Boys in Marianna, Florida.",
      alt: "Boys in boxing match at the School for Boys in Marianna",
      year: "1940s",
      topic: "Athletic recreation, physical discipline, and public spectacle"
    }
  ];

  /**
  * Deterministic 12-hour pseudo-random index generator.
  * Changes at each UTC 12-hour slot boundary.
   */
  function getDailyDozierPhoto(offset = 0) {
    const now = new Date();
    const slotKey = Math.floor((now.getTime() + offset * 12 * 60 * 60 * 1000) / (12 * 60 * 60 * 1000));

    // Hash integer using splitmix32-style integer hashing for uniform randomness
    let hash = ((slotKey ^ 0x6d2b79f5) * 0x85ebca6b) >>> 0;
    hash = ((hash ^ (hash >>> 13)) * 0xc2b2ae35) >>> 0;
    hash = (hash ^ (hash >>> 16)) >>> 0;

    const index = hash % DOZIER_PHOTOS.length;
    return DOZIER_PHOTOS[index];
  }

  function applyDozierDailyPhotos() {
    const dailyPhoto = getDailyDozierPhoto(0);
    const photoUrl = encodeURI(dailyPhoto.rawPath || decodeURIComponent(dailyPhoto.path));

    // 1. Target hero image containers on Dozier research pages
    const heroDozierImages = document.querySelectorAll(
      '.dozier-hero-image, header.hero .hero-image[aria-label*="Dozier"], header.hero .hero-image[aria-label*="baseball"], header.hero .hero-image[aria-label*="Florida Industrial"], [data-dozier-photo="hero"]'
    );
    heroDozierImages.forEach((el) => {
      el.style.backgroundImage = `url("${photoUrl}")`;
      el.setAttribute("aria-label", dailyPhoto.alt);
      el.setAttribute("title", dailyPhoto.caption);
    });

    // 2. Target homepage feature-image elements on Dozier articles
    const featureImages = document.querySelectorAll(
      '.feature-image, .dozier-feature-image, [data-dozier-photo="feature"]'
    );
    featureImages.forEach((el) => {
      el.style.backgroundImage = `url("${photoUrl}")`;
      el.setAttribute("aria-label", dailyPhoto.alt);
      el.setAttribute("title", dailyPhoto.caption);
    });

    // 3. Target any element with data-dozier-photo or .dozier-daily-photo
    const genericTargets = document.querySelectorAll(
      '[data-dozier-photo], .dozier-daily-photo'
    );
    genericTargets.forEach((el) => {
      if (el.tagName === "IMG") {
        el.src = photoUrl;
        el.alt = dailyPhoto.alt;
        el.title = dailyPhoto.caption;
      } else {
        el.style.backgroundImage = `url("${photoUrl}")`;
        el.setAttribute("aria-label", dailyPhoto.alt);
        el.setAttribute("title", dailyPhoto.caption);
      }
    });

    // 4. Update dynamic caption and source link texts if present on the page
    const captionTargets = document.querySelectorAll(
      '[data-dozier-caption], .dozier-photo-caption'
    );
    captionTargets.forEach((el) => {
      el.textContent = dailyPhoto.caption;
    });

    const sourceLinkTargets = document.querySelectorAll(
      '[data-dozier-source-link], .dozier-photo-source-link'
    );
    sourceLinkTargets.forEach((el) => {
      el.href = photoUrl;
      el.textContent = `${dailyPhoto.year} archival photograph ↗`;
    });
  }

  // Expose on window object
  window.DozierDaily = {
    photos: DOZIER_PHOTOS,
    getDailyPhoto: getDailyDozierPhoto,
    apply: applyDozierDailyPhotos
  };

  // Run automatically
  applyDozierDailyPhotos();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDozierDailyPhotos);
  }
})();
