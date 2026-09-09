'use strict';
const plans=[
  {
    "id": "plugged_in",
    "name": "Plugged In",
    "price": 3,
    "rank": 1,
    "variable": "STRIPE_PRICE_PLUGGED_IN"
  },
  {
    "id": "full_member",
    "name": "Full Member",
    "price": 6,
    "rank": 2,
    "variable": "STRIPE_PRICE_FULL_MEMBER"
  },
  {
    "id": "legacy_circle",
    "name": "Legacy Circle",
    "price": 9,
    "rank": 3,
    "variable": "STRIPE_PRICE_LEGACY_CIRCLE"
  }
];
const resources=[
  {
    "id": "reading-record",
    "title": "Read the record, then question it",
    "description": "A guided method for separating what a document says from what it proves.",
    "tier": "plugged_in",
    "kind": "Reading guide",
    "sources": [
      {
        "title": "Paperwork",
        "url": "/RESEARCH.html"
      },
      {
        "title": "Evidence Index",
        "url": "/EVIDENCE-INDEX.html"
      }
    ]
  },
  {
    "id": "memory-evidence",
    "title": "Listen to memory with care",
    "description": "A reading path through personal recollections, prison stories, and their limits.",
    "tier": "plugged_in",
    "kind": "Reading guide",
    "sources": [
      {
        "title": "Personal Collections",
        "url": "/PERSONAL-COLLECTIONS.html"
      },
      {
        "title": "Mama Herc",
        "url": "/MAMA-HERC.html"
      },
      {
        "title": "Behind the Gate",
        "url": "/BEHIND-THE-GATE.html"
      }
    ]
  },
  {
    "id": "follow-case",
    "title": "Follow a case through changing law",
    "description": "Build a timeline that keeps allegations, decisions, and later reviews distinct.",
    "tier": "plugged_in",
    "kind": "Reading guide",
    "sources": [
      {
        "title": "The Dunbar Village Case",
        "url": "/Dunbar.html"
      },
      {
        "title": "The Groveland Four",
        "url": "/GROVELAND-FOUR.html"
      },
      {
        "title": "Law Library",
        "url": "/LAW-LIBRARY.html"
      }
    ]
  },
  {
    "id": "rivers-love",
    "title": "Rivers Love: a research collection",
    "description": "A structured route through family records, legal events, and unresolved identity questions.",
    "tier": "full_member",
    "kind": "Case collection",
    "sources": [
      {
        "title": "Rivers Love",
        "url": "/RIVERS-LOVE.html"
      },
      {
        "title": "The American Siberia",
        "url": "/AmSiberUncovered.html"
      },
      {
        "title": "Evidence Index",
        "url": "/EVIDENCE-INDEX.html"
      }
    ]
  },
  {
    "id": "dozier",
    "title": "Dozier: reading an institutional record",
    "description": "Read the report, school newspapers, and photographic history alongside one another.",
    "tier": "full_member",
    "kind": "Case collection",
    "sources": [
      {
        "title": "The Boys of Dozier",
        "url": "/DOZIER-RESEARCH.html"
      },
      {
        "title": "The 1969 Visiting Committee Report",
        "url": "/DOZIER-1969-REPORT.html"
      },
      {
        "title": "The Yellow Jacket Collection",
        "url": "/DOZIER-NEWSPAPERS.html"
      }
    ]
  },
  {
    "id": "american-siberia",
    "title": "American Siberia: an insider account in context",
    "description": "Connect Powell’s account with institutional history and the people behind the record.",
    "tier": "full_member",
    "kind": "Case collection",
    "sources": [
      {
        "title": "The American Siberia Uncovered",
        "url": "/AmSiberUncovered.html"
      },
      {
        "title": "Florida Prison System",
        "url": "/FLORIDA-PRISON-SYSTEM.html"
      },
      {
        "title": "The Day Prison Had an Address",
        "url": "/MILLEDGEVILLE-TO-PINE-WOODS.html"
      },
      {
        "title": "Florida’s Early Prison History",
        "url": "/MalachiMartin-Chattahoochee.html"
      }
    ]
  }
];
function rank(tier){return plans.find(p=>p.id===tier)?.rank||0;}
function catalog(){return resources;}
module.exports={plans,resources,rank,catalog};
