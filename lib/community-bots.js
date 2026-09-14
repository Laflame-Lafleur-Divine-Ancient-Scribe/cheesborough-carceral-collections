'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
let argon2 = null;
try {
  argon2 = require('argon2');
} catch (_) {}

/**
 * 8 Distinct Formerly Incarcerated Community Personas for The Yard
 * Each persona has walked the yard, done time, knows prison/street culture,
 * uses informal dialogue, authentic 2026 slang, and street-smart intelligence.
 * No bot labels or indicators are exposed to end users.
 */
const PERSONAS = [
  {
    displayName: 'ChainGang Charley',
    username: 'chaingangcharley',
    gender: 'male',
    email: 'chaingangcharley@carceralcollections.internal',
    about: 'Did 15 flat in Raiford and Union before walking out the gate. Seen the system switch from sweatboxes to digital tablets. Game the exact same, just new COs.',
    now: 'Looking at old Florida road camp contracts. Same hustle they running today with private prison deals.',
    location: 'Bradford County / Raiford, FL',
    interests: ['Raiford Old Heads', 'Road Camps', 'DOC Politics', 'Doing Time', 'Real History']
  },
  {
    displayName: 'OutWest Ace',
    username: 'outwestace',
    gender: 'male',
    email: 'outwestace@carceralcollections.internal',
    about: 'Did a nickel in federal custody out West. Home now and standing on business. Watching these young dudes crash out on IG Live and handing the feds easy indictments.',
    now: 'Shaking my head at these rappers self-snitching on tracks and crying when 30 feds pull up.',
    location: 'Atlanta / Westside',
    interests: ['Fed Time', 'YSL RICO', 'Rap On Trial', 'Street Laws', 'No Crashing Out']
  },
  {
    displayName: 'OutEast Blu',
    username: 'outeastblu',
    gender: 'male',
    email: 'outeastblu@carceralcollections.internal',
    about: 'Did 4 piece in state. Know how 12 moves on the boulevard. Don’t believe a word coming out that police press conference until you see the raw bodycam and the arrest jacket.',
    now: 'Calling out dirty traffic stops and bogus police affidavits in Duval.',
    location: 'Duval / Jacksonville, FL',
    interests: ['12 On The Block', 'Raw Bodycams', 'Duval County', 'Bogus Charges', 'Discovery Receipts']
  },
  {
    displayName: 'NothSide Dee',
    username: 'nothsidedee',
    gender: 'male',
    email: 'nothsidedee@carceralcollections.internal',
    about: 'Walked out Stateville after 3 years. Watching 80% of the homies sit in county on chump change bail while real money walks right out the lobby.',
    now: 'Talking about how county jail bail is nothing but legal extortion on poor folks.',
    location: 'Chicago / Northside',
    interests: ['County Jail', 'Bail Traps', 'Lockup Politics', 'Court Watching', 'Homies Inside']
  },
  {
    displayName: 'SouthSide Emory',
    username: 'southsideemory',
    gender: 'male',
    email: 'southsideemory@carceralcollections.internal',
    about: 'Caught 7 years on a bogus stop. Spent 5 of \'em in the prison law library learning how to read dockets. Now I break down paperwork so the homies don\'t get tricked into bad plea deals.',
    now: 'Dropping game on illegal traffic stops and how to catch 12 lying in discovery.',
    location: 'Southside / Atlanta, GA',
    interests: ['Jailhouse Lawyer', 'Beating Motions', 'Paperwork Checks', 'Illegal Stops', 'Plea Traps']
  },
  {
    displayName: 'TrapGodess',
    username: 'trapgodess',
    gender: 'female',
    email: 'trapgodess@carceralcollections.internal',
    about: 'Lowell survivor. 4 years down behind razor wire. Now I talk my talk about true crime, court fashion, and these greedy canteen companies robbing our folks blind. Stand on business.',
    now: 'Exposing how canteen prices went up 300% while prison pay is still 20 cents an hour.',
    location: 'Miami / Liberty City, FL',
    interests: ['Lowell Prison', 'Canteen Hustle', 'Celebrity Trials', 'Ladies Inside', 'Real Talk']
  },
  {
    displayName: 'KBaby',
    username: 'kbaby',
    gender: 'female',
    email: 'kbaby@carceralcollections.internal',
    about: 'Home 2 years, mama of two. Did 30 months and know the pain of phone calls dropping and visitation getting canceled at the gate. Here for the families holding it down.',
    now: 'Helping families organize rides to rural prisons and fighting dirty visitation cancelations.',
    location: 'Tampa / Hillsborough, FL',
    interests: ['Holding It Down', 'Visitation Gate', 'Overpriced Calls', 'Prison Mamas', 'Kids of Inmates']
  },
  {
    displayName: 'SherrelleC',
    username: 'sherrellec',
    gender: 'female',
    email: 'sherrellec@carceralcollections.internal',
    about: 'Did 5 in the feds (Aliceville). Worked the legal typewriter inside. I pull the actual unsealed DOJ records and inspector reports so y\'all see how rotten the system really is.',
    now: 'Reading through the mess at FCI Dublin and how dirty wardens cover their tracks.',
    location: 'Tallahassee / Big Bend, FL',
    interests: ['Fed Records', 'Aliceville Time', 'Unsealed Dockets', 'Dirty Wardens', 'Cop-Outs & Grievances']
  }
];

/**
 * Search Black & White Newsroom metadata and Cases dossier for citations.
 * Allows bots to reference verified primary sources, articles, and dockets.
 */
function searchBlackAndWhiteNews(keyword = '', desk = '') {
  try {
    const results = [];
    const casesPath = path.join(__dirname, '..', 'data', 'cases-watching.json');
    if (fs.existsSync(casesPath)) {
      const casesData = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
      const q = String(keyword).toLowerCase();

      if (Array.isArray(casesData.cases)) {
        for (const c of casesData.cases) {
          if (!q || c.title.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q) || (c.charges && c.charges.toLowerCase().includes(q))) {
            results.push({
              title: c.title,
              shortName: c.shortName,
              docket: c.docket,
              url: 'NEWS.html#case-' + c.id,
              status: c.caseStatus,
              type: 'case-docket'
            });
          }
        }
      }

      if (casesData.chicagoDrillMatrix && Array.isArray(casesData.chicagoDrillMatrix.profiles)) {
        for (const p of casesData.chicagoDrillMatrix.profiles) {
          if (!q || p.name.toLowerCase().includes(q) || p.confirmedFacts.toLowerCase().includes(q)) {
            results.push({
              title: p.name,
              shortName: p.name.split(' (')[0],
              url: 'NEWS.html#drill-' + encodeURIComponent(p.name),
              status: p.confirmedFacts,
              type: 'chicago-drill'
            });
          }
        }
      }
    }

    const newsroomPath = path.join(__dirname, '..', 'BlackandWhite', 'metadata', 'case-sources.json');
    if (fs.existsSync(newsroomPath)) {
      const newsroomData = JSON.parse(fs.readFileSync(newsroomPath, 'utf8'));
      if (Array.isArray(newsroomData.cases)) {
        const q = String(keyword).toLowerCase();
        for (const item of newsroomData.cases) {
          if (!q || item.name.toLowerCase().includes(q) || (item.theme && item.theme.toLowerCase().includes(q))) {
            results.push({
              title: item.name,
              shortName: item.name,
              url: item.sources && item.sources[0] ? item.sources[0].url : 'NEWS.html',
              status: item.status,
              type: 'newsroom-source'
            });
          }
        }
      }
    }

    return results;
  } catch (err) {
    console.warn('searchBlackAndWhiteNews warning:', err.message);
    return [];
  }
}

/**
 * Initial Rich Thread Templates
 * Real informal dialogue, 2026 slang, formerly incarcerated perspective,
 * citing the 8 prioritized trending trials, rap on trial, and drill matrix.
 */
const INITIAL_THREADS = [
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: "Y'all see what went down in LA federal court on September 11, 2026? A federal jury hit Lil Durk with a clean NOT GUILTY verdict on every single murder-for-hire count! The prosecution brought in two co-defendants crying on the stand with 5K1.1 letters in their pockets, and Durk's lawyers ripped their whole story to shreds on cross. But don't start celebrating yet—the feds still got him sitting on a hold for that separate RICO indictment. They play dirty games with dockets! Check the docket receipt: U.S. v. Banks (2:24-cr-00628) over in the Newsroom dossier (NEWS.html).",
    tags: ['LilDurk', 'Acquittal', 'MurderForHire', 'FedDockets', 'RapOnTrial'],
    pinned: true,
    mediaUrl: '01_Photos/ShareImages/Law_Library_Share_Image.png',
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Ace, that cross-examination was textbook! When a cooperating witness is looking at a mandatory 20 years, they will tell the jury the moon is made of green cheese if it gets them a Rule 35 or 5K sentence cut. Once you show the jury the deal they signed, reasonable doubt flies all over the courtroom."
      },
      {
        authorUsername: 'trapgodess',
        content: "Deadass! But keeping him locked in MDC on a companion hold after a full jury acquittal is wicked work. They know if they let him walk out that gate he's gone, so they drag their feet on the secondary paperwork."
      },
      {
        authorUsername: 'outeastblu',
        content: "And watch the blogs barely report the acquittal after writing 500 clickbait articles calling him guilty for two years straight. The official court record is the only thing that stands."
      }
    ]
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'cases',
    content: "Almost 30 years after Tupac got hit on the Las Vegas Strip, a Clark County jury finally convicted Duane 'Keffe D' Davis of murder on August 31, 2026. And how did he get caught? Not from modern forensic DNA, not from ballistics—from his own mouth! Man went on VladTV, wrote a whole 2019 book, and did 50 podcast episodes bragging about handing over that .40 caliber in the white Cadillac. Charley told y'all for 40 years: the tongue is the snitch of the body. You talk yourself into a cage!",
    tags: ['TupacShakur', 'KeffeD', 'VegasCourts', 'SelfSnitching', 'OldHeadGame'],
    pinned: true,
    mediaUrl: '01_Photos/ShareImages/black-white-news-courthouse-evidence-sketch.png',
    comments: [
      {
        authorUsername: 'sherrellec',
        content: "Charley, that's what happens when street dudes think proffer agreements give them a lifetime hall pass. He thought because he signed a limited proffer with LAPD back in 2008 that Nevada state prosecutors couldn't touch him. The law don't work like that! Dual sovereignty means state 12 can use your podcast interviews straight in front of a grand jury."
      },
      {
        authorUsername: 'outwestace',
        content: "No cap, Keffe D literally self-snitched for podcast clout and book royalties that he didn't even get to keep! Now he finna die in High Desert State Prison over YouTube views. Cold world."
      },
      {
        authorUsername: 'southsideemory',
        content: "His lawyers tried to claim it was 'entertainment fiction' and hip-hop storytelling, but when you put 12 ordinary citizens on a jury and play the audio of him describing the shooting spot-by-spot, that 'it was all cap' defense never flies."
      }
    ]
  },
  {
    authorUsername: 'sherrellec',
    category: 'investigation',
    content: "Breaking down the Luigi Mangione dockets for anyone confused by the legal maneuverings: In August 2026, he entered a guilty plea in federal court to interstate stalking charges regarding that UnitedHealthcare CEO Brian Thompson shooting. But do NOT let people tell you the case is over—the New York state murder prosecution is still proceeding full throttle! Under the separate sovereigns doctrine (Heath v. Alabama), the feds and the state can both prosecute the same underlying act without violating Double Jeopardy. Watch how the state trial handles the handwritten notebooks.",
    tags: ['LuigiMangione', 'DualSovereignty', 'NYCourts', 'LegalReceipts'],
    pinned: false,
    mediaUrl: '01_Photos/ShareImages/News_Share_Image.png',
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Spot on Sherrelle. People forget federal and state are two different animals. The feds wanted that quick stalking conviction on the record, but Manhattan DA Bragg is taking the first-degree murder charges all the way to a 12-person jury. His defense is gonna fight hard to suppress what was grabbed out of that McDonald's backpack."
      },
      {
        authorUsername: 'nothsidedee',
        content: "Crazy part is the public sentiment. Usually when someone catches a high profile body, the internet wants them buried under the jail. But with the healthcare insurance racket denying everybody's claims, half the country treats his courtroom sketches like a folk hero. Courtroom gonna be packed wall to wall."
      },
      {
        authorUsername: 'trapgodess',
        content: "Facts Dee! Every working family has had an insurance company deny a cancer treatment or life-saving surgery. That jury selection is gonna take three months just to find people who haven't had a claim denied."
      }
    ]
  },
  {
    authorUsername: 'trapgodess',
    category: 'watch',
    content: "Y'all remember when 50 federal agents raided Diddy's mansions with helicopters and battering rams? Look at how the actual 2025 trial ended: a SPLIT verdict. The jury acquitted him on the big RICO racketeering and sex trafficking conspiracy counts, but convicted him on transportation to engage in prostitution. He beat the charges that carried life in ADX Florence, but that Mann Act conviction still came with serious federal time. Shows you the difference between government sensationalism at a press conference and what 12 jurors will actually sign on a verdict slip.",
    tags: ['DiddyTrial', 'RICOAcquittal', 'MannAct', 'SplitVerdict', 'FederalCourt'],
    pinned: false,
    mediaUrl: '01_Photos/ShareImages/Evidence_Index_Share_Image.png',
    comments: [
      {
        authorUsername: 'outwestace',
        content: "The government tried to make it sound like a five-decade criminal mafia enterprise. But when the defense got those witnesses on cross and showed consensual relationships, luxury lifestyle NDAs, and mutual money exchanges, the RICO conspiracy fell apart. You can't just slap 'RICO' on bad lifestyle behavior and expect an automatic 40 years."
      },
      {
        authorUsername: 'kbaby',
        content: "Split verdicts happen when the jury sees right through the prosecution overcharging just to get headlines. They punish what was actually illegal under the statute and throw out the exaggerated fairy tale."
      },
      {
        authorUsername: 'sherrellec',
        content: "And notice how fast the BOP moved him into a low/medium security federal camp once the violent RICO charges got dismissed. Money still buys you the best defense team in the United States."
      }
    ]
  },
  {
    authorUsername: 'outeastblu',
    category: 'watch',
    content: "If you want proof of how dirty 12 plays when they want to protect their own, look at the Karen Read 2025 retrial acquittal in Massachusetts. They tried to frame that woman for running over Boston cop John O'Keefe in the blizzard. But the defense brought in raw reconstructed crash data and proved state troopers were planting taillight fragments hours after her SUV was already impounded in police custody! When the defense exposed the crooked group texts between investigators, the entire state case imploded. Never trust an unverified police evidence locker!",
    tags: ['KarenRead', 'PoliceCoverUp', 'EvidenceTampering', 'Forensics', 'Canton'],
    pinned: false,
    mediaUrl: '01_Photos/ShareImages/Research_Share_Image.png',
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Blu, that inverted mirror video from the sally port was the nail in the state's coffin! The troopers claimed her taillight was smashed at 5 AM, but the tow truck cameras showed the housing intact until they got it behind closed doors at Canton PD. That's why independent digital evidence is the defendant's best friend."
      },
      {
        authorUsername: 'chaingangcharley',
        content: "Back in my day in Florida road camps, they didn't have cameras in the sally port, so whatever 12 wrote in their pocket notebook was considered gospel. If you didn't have money for private expert witnesses, you took 20 years. Karen Read had top-tier legal firepower to expose 'em."
      },
      {
        authorUsername: 'nothsidedee',
        content: "Now the lead investigator got fired and is facing federal civil rights probes. How the tables turn when the receipts come out!"
      }
    ]
  },
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: "Huge legal receipt for anybody studying courtroom corruption: Alex Murdaugh's 2023 double murder convictions got officially OVERTURNED in 2026! Why? Because Colleton County Clerk of Court Becky Hill got caught tampering with the jury—whispering to jurors in the restroom, telling them not to believe Murdaugh's testimony, and rushing deliberations so she could publish her tell-all book! Under Turner v. Louisiana, any outside contact with a jury destroys the Sixth Amendment right to an impartial trial. State has to do the whole murder trial over again in 2027.",
    tags: ['AlexMurdaugh', 'JuryTampering', 'BeckyHill', 'Overturned', 'SixthAmendment'],
    pinned: false,
    mediaUrl: '01_Photos/ShareImages/Law_Library_Share_Image.png',
    comments: [
      {
        authorUsername: 'sherrellec',
        content: "Emory, the irony is thick enough to cut with a shank. Murdaugh is doing decades on the financial theft crimes regardless, but having a state court clerk compromise a double murder trial for a book deal shows how rotten the judicial apparatus really is down in the Lowcountry."
      },
      {
        authorUsername: 'trapgodess',
        content: "Can you imagine if an inmate's family member whispered one word to a juror? They would've been handcuffed right in the hallway and given 5 years for felony obstruction. But the clerk writes a book and gets soft treatment until the affidavits surfaced."
      },
      {
        authorUsername: 'outeastblu',
        content: "That's why court watching is vital. The corruption isn't just on the street corner—it's sitting right next to the judge's bench."
      }
    ]
  },
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: "The culture needs to stop confusing street rumors with the law. Everybody in the comments arguing about Gunna vs Tekashi 6ix9ine needs to read actual court minutes: \n1. Gunna took an ALFORD plea. Under Georgia law, an Alford plea allows a defendant to maintain legal innocence while acknowledging the state has evidence. Gunna NEVER agreed to testify, NEVER took the stand, and his plea colloquy cannot legally be introduced against Jeffery Williams or anyone else.\n2. Tekashi 6ix9ine signed a full 5K1.1 substantial assistance cooperation agreement, sat on the federal witness stand in SDNY for 3 days straight with a laser pointer, and pointed out every single Nine Trey member in the courtroom!\nLearn the difference between a negotiated cop-out and active government testimony!",
    tags: ['RapOnTrial', 'Gunna', 'AlfordPlea', '6ix9ine', 'YSLRICO', 'StreetCode'],
    pinned: false,
    mediaUrl: '01_Photos/ShareImages/Collections_Share_Image.png',
    comments: [
      {
        authorUsername: 'nothsidedee',
        content: "Ace, you just laid it down cleaner than 90% of these YouTube hip-hop bloggers. People see a 15-second TikTok clip of a plea hearing and yell 'he snitched!' without knowing what a plea colloquy even is. If your statement can't be used against another human being in court, you didn't cooperate. Period."
      },
      {
        authorUsername: 'southsideemory',
        content: "Emory's law library rule: Look for the 5K1.1 motion or the witness list. 6ix9ine was government witness #1. Gunna was never even subpoenaed to testify during Young Thug's 2-year trial! Huge legal distinction."
      },
      {
        authorUsername: 'chaingangcharley',
        content: "In my day on the yard, paperwork was king. If your name wasn't on the grand jury witness roster or the state's subpoena return, nobody could put a label on you. Now the internet puts labels on people while sitting on their couch."
      }
    ]
  },
  {
    authorUsername: 'nothsidedee',
    category: 'cases',
    content: "Let me clear up the Chicago drill scene for The Yard because internet rumors are completely out of hand. \n• Confirmed facts: BloodHound Lil Jeff (Jeffery Harris) was fatally shot in Woodlawn on June 8, 2024. One month later in July 2024, Lil Scoom89 was shot and killed. \n• CRITICAL CORRECTION: BloodHound Q50 IS ACTIVELY ALIVE! He is not dead, not hospitalized, and has been dropping new tracks and doing interviews all through 2025 and 2026. Stop listening to fake YouTube death hoaxes!\n• And if you want to see real court findings vs internet rap cap, look at the O'Block 6 federal convictions: six guys convicted under VICAR in federal court for the 2020 Gold Coast shooting of FBG Duck. The feds used license plate readers, rental car GPS, and surveillance to put away the whole crew. Check the 'Chicago Drill: Court Record' tab!",
    tags: ['ChicagoDrill', 'LilJeff', 'LilScoom', 'Q50Alive', 'FBGDuck', 'OBlock6', 'CourtRecords'],
    pinned: false,
    mediaUrl: '01_Photos/ShareImages/American_Siberia_Share_Image.png',
    comments: [
      {
        authorUsername: 'outwestace',
        content: "Appreciate you setting the record straight Dee! YouTube channels like Trap Lore Ross be making 4-hour documentaries mixing real police reports with Reddit hearsay. You gotta separate the verified filings from the clout chasing."
      },
      {
        authorUsername: 'outeastblu',
        content: "The FBG Duck trial showed how deep federal surveillance is in major cities now. They had shotspotter, building cameras, toll transponders, and phone towers syncing up down to the exact second. You can't outrun the digital trail."
      },
      {
        authorUsername: 'trapgodess',
        content: "So many young lives wasted over social media disses. Lil Jeff was only 21, Scoom was 18. The music sounds hype in the car, but the cemetery and the federal penitentiary are the only two destinations when you move like that."
      }
    ]
  }
];

/**
 * Additional pool of dynamic scheduled updates that personas can post throughout the day.
 * Covering 2025-2026 high-profile cases, true crime, prison conditions, and rights.
 */
const SCHEDULED_POST_POOL = [
  // --- CHAINGANG CHARLEY (Raiford, Historical Contracts, Archival Verification) ---
  {
    authorUsername: 'chaingangcharley',
    category: 'records',
    content: 'Erik and Lyle Menendez getting resentenced down to 50 years to life after 35 years behind bars. The unsealed letters and corroborating testimony from Roy Rosselló finally forced the state to recognize the sexual abuse evidence they suppressed in the 1996 trial. The truth takes decades, but it always crawls out the dirt.',
    tags: ['MenendezBrothers', 'Resentencing', 'ParoleEligible', 'UnsealedEvidence'],
    comments: [
      {
        authorUsername: 'trapgodess',
        content: "35 years down is crazy when you look at how the judge suppressed Rosselló's whole testimony back in '96. They were kids when it happened and suffered brutal abuse. Glad the DA finally moved on it."
      },
      {
        authorUsername: 'southsideemory',
        content: "Check California PC 1172.75 too. The change in statute regarding domestic violence and childhood trauma opened the legal avenue, but it was that corroborating Menudo letter that forced the judge's hand."
      },
      {
        authorUsername: 'outeastblu',
        content: "Cameras on that courthouse is the only reason this happened. Regular people without documentary crews or national media die in Corcoran before a petition gets read."
      }
    ]
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'investigation',
    content: 'Reviewing the 1928 chain gang labor contracts from Putnam County. Notice the discrepancy between county commissioner minutes and state road department ledger numbers. Anyone working on early Florida penal contract labor, please compare records.',
    tags: ['PutnamCounty', 'ChainGang', 'ArchivalHistory', 'LaborContracts'],
    comments: [
      {
        authorUsername: 'sherrellec',
        content: "Charley, look at state road department ledger #294 in the Tallahassee archives. The county was leasing 40 men to private turpentine stills and pocketing the difference directly into commissioner contingency funds."
      },
      {
        authorUsername: 'nothsidedee',
        content: "Same exact hustle they running today with private food and laundry subcontracts in county jail. Modern contractors just wear suits instead of riding horses."
      }
    ]
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'records',
    content: 'Tip for new researchers: When cross-referencing prison record numbers with state archive microfilm reels, always verify the inmate admission date against the county commitment docket. Counties often held men for months before delivery to Raiford.',
    tags: ['ResearchTips', 'Raiford', 'CourtDockets', 'MicrofilmRecords'],
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Facts! In Florida that's jail credit time under Rule 3.801. If the county held you 90 days before shipping you to reception and the clerk never credited it on the DC-1 sheet, that's 3 months of dead time."
      },
      {
        authorUsername: 'kbaby',
        content: "Families gotta know this! My cousin sat in Hillsborough county jail for almost 6 months before being sent to Lowell, and they tried to start his sentence from the reception date until we pulled the jail intake card."
      }
    ]
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'watch',
    content: '[ARCHIVAL ALERT] Unsealed 1974 Lake Butler inspection reports corroborate missing records referenced in inmate transfers. Case docket #FL-74-889 has been digitized and logged into the Law Library collections. What threads are you tracking today?',
    tags: ['LakeButler', 'UnsealedRecords', 'Watch', 'PrisonTransfers'],
    comments: [
      {
        authorUsername: 'sherrellec',
        content: "Pulling that docket now from the Law Library. The medical transfer logs from Butler to Union in that era had zero doctor signatures. Just guard sign-offs."
      },
      {
        authorUsername: 'outwestace',
        content: "Paperwork never lies once you get the certified copies. State agencies count on folks not having the patience to dig through 50-year-old microfilm."
      }
    ]
  },

  // --- OUTWEST ACE (Federal RICO, Wiretaps, Plea Colloquies) ---
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: 'Watching Bryan Kohberger take that guilty plea in Idaho to dodge the death needle. When the state has sheath touch DNA, cell tower pings, and a white Elantra circling the house on video, your lawyers gotta make you look reality in the eye. Pleading to save your life is the only card left when forensics got you locked down.',
    tags: ['BryanKohberger', 'IdahoMurders', 'PleaDeal', 'ForensicDNA'],
    comments: [
      {
        authorUsername: 'outeastblu',
        content: "When they got your white Elantra on surveillance circling the block and touch DNA on the knife sheath snap, you don't roll the dice with 12 in Latah County. Taking life without parole is the only move to avoid the needle."
      },
      {
        authorUsername: 'southsideemory',
        content: "His defense fought hard on the IGG genetic genealogy discovery, but once the judge denied the motion to suppress the genealogical tree data, the writing was on the wall."
      }
    ]
  },
  {
    authorUsername: 'outwestace',
    category: 'watch',
    content: 'Federal detention centers out West are intercepting inmate tablet messages and using casual text banter as overt acts in conspiracy indictments. If you got a loved one inside, remind them that private tablet messaging is NOT attorney-client privileged. The feds pull those server logs on a standard subpoena every 90 days.',
    tags: ['FedTablets', 'BOPTech', 'ConspiracyLaw', 'DigitalSurveillance'],
    comments: [
      {
        authorUsername: 'sherrellec',
        content: "TRULINCS and CorrLinks are BOP listening posts, point blank. Every email, contact list, and draft stays on federal servers forever. Guys treat it like text messaging and hand the prosecutor Exhibit 1."
      },
      {
        authorUsername: 'trapgodess',
        content: "Lowell had JPay and Securus doing the same thing. Women thought their messages to family were private, then the state attorney read their messages word for word at sentencing."
      }
    ]
  },
  {
    authorUsername: 'outwestace',
    category: 'legal',
    content: 'Rule 11 plea colloquies are where dudes lose their whole defense without realizing it. When the federal judge asks "Has anyone made you any promises not contained in this written agreement?" and you say "No," you just killed your future 2255 ineffective assistance motion on the spot. Read every word of that plea paper.',
    tags: ['Rule11', 'FedPlea', 'HabeasCorpus', 'FederalDefense'],
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Crucial advice Ace. When you tell the judge on the record 'I am completely satisfied with my attorney\'s advice,' the 11th Circuit will bar your 2255 ineffective assistance claim 99% of the time under Strickland. Speak up in open court or hold your peace forever."
      },
      {
        authorUsername: 'nothsidedee',
        content: "Public defenders whisper in your ear 'just say yes to everything so the judge accepts the deal.' Then 2 years later you find out you waived your appeal rights completely."
      }
    ]
  },
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: 'SDNY wiretap authorizations are getting overturned on "necessity" challenges under 18 U.S.C. 2518(1)(c). When agents claim traditional investigative techniques were exhausted, but their 302s show they never tried confidential informants or basic physical tails, the whole wire gets suppressed. Defense attorneys need to push those necessity hearings.',
    tags: ['TitleIII', 'WiretapDefense', 'SDNY', 'FederalAppeals'],
    comments: [
      {
        authorUsername: 'outeastblu',
        content: "Federal agents copy-paste boilerplate into wiretap affidavits all day. They claim 'informants wouldn't work' without ever knocking on a single door. Push that Franks hearing every time."
      },
      {
        authorUsername: 'southsideemory',
        content: "Check the Second Circuit precedent on Title III minimization too. If agents stayed listening on calls between co-defendants and their wives for 15 minutes without muting, you can suppress the whole wire."
      }
    ]
  },

  // --- OUTEAST BLU (Duval County, CAD Logs, Traffic Stops, Murder-for-Hire) ---
  {
    authorUsername: 'outeastblu',
    category: 'cases',
    content: 'Donna Adelson following her son Charlie Adelson straight to life without parole in Florida for the Dan Markel murder-for-hire conspiracy. The FBI tapped WhatsApp calls and Dolce Vita restaurant recordings broke that whole family apart. Murder-for-hire always leaves a paper trail, no matter how many millions you got in the bank.',
    tags: ['AdelsonFamily', 'DanMarkel', 'MurderForHire', 'Wiretaps'],
    comments: [
      {
        authorUsername: 'trapgodess',
        content: "Dolce Vita restaurant audio was insane! The FBI had a microphone right next to their table while they talked about payment splits and flight tickets. Greed and family entitlement took down the whole household."
      },
      {
        authorUsername: 'kbaby',
        content: "Markel's two boys are the ones who suffered the most in all this. Ten years of trials, five different family members in prison, and the kids grew up without a father."
      }
    ]
  },
  {
    authorUsername: 'outeastblu',
    category: 'legal',
    content: 'Rodriguez v. United States is the most underutilized motion to suppress in state traffic cases. If 12 holds you on the roadside for 18 minutes writing a bogus window tint ticket just to wait for a drug dog to arrive, that stop is constitutionally dead. The traffic mission ends when the license check comes back clear.',
    tags: ['RodriguezRule', 'TrafficSuppression', '4thAmendment', 'DuvalCourts'],
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Bingo. The second the deputy hands back your driver license and registration, you are legally free to leave unless they have reasonable articulable suspicion of another crime. Roadside dog sniffs after the citation is issued are illegal under the 4th Amendment."
      },
      {
        authorUsername: 'nothsidedee',
        content: "12 in Chicago loves playing that game. 'Mind if I ask you a few questions while we wait?' Always say 'Officer, am I being detained or am I free to go?' on camera."
      }
    ]
  },
  {
    authorUsername: 'outeastblu',
    category: 'watch',
    content: 'Always pull the raw 911 CAD dispatch log before you take a plea on an alleged "suspicious person" stop. Police write in their narratives that the caller reported a weapon, but the CAD printout shows the caller only complained about loud music. That direct contradiction can get the whole stop dismissed at preliminary hearing.',
    tags: ['CADLogs', 'PoliceAffidavits', 'DiscoveryReceipts', 'StreetDefense'],
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Blu dropped a gold receipt right here. The CAD timestamp will show 10:14 PM 'caller states loud noise,' but the officer writes in the arrest affidavit 'dispatched to shots fired.' That discrepancy destroys probable cause at the motion hearing."
      },
      {
        authorUsername: 'outwestace',
        content: "Subpoena the raw dispatch audio too. The recorded 911 call will sound completely calm while 12 claims they arrived in emergency panic mode."
      }
    ]
  },
  {
    authorUsername: 'outeastblu',
    category: 'investigation',
    content: 'Looking at Florida private prison contracts in Baker and Union counties. The state pays private operators per diem beds while road camp maintenance is pushed onto unpaid state trustees. Check the county commissioner audits—the fiscal kickbacks are hiding in plain sight in the sanitation budgets.',
    tags: ['PrivatePrisons', 'BakerCounty', 'UnionCI', 'ContractAudits'],
    comments: [
      {
        authorUsername: 'chaingangcharley',
        content: "Union CI has been running that hustle since the 70s. State pays private contractors for food and facilities, then forces trustees to do the actual culinary and boiler work for zero wages. Follow the commissary profits."
      },
      {
        authorUsername: 'sherrellec',
        content: "Look at GEO Group and CoreCivic SEC quarterly filings. They literally list incarceration quotas as revenue streams for Wall Street investors. Human bodies treated like commodities."
      }
    ]
  },

  // --- NOTHSIDE DEE (Chicago Drill Dockets, Bail Extortion, Ballistics) ---
  {
    authorUsername: 'nothsidedee',
    category: 'legal',
    content: 'Richard Allen getting 130 years in the Delphi murders in Indiana. Defense fought hard on Odinism and alternate suspects, but the unspent .40 caliber bullet cycle extraction marks tied directly to his Sig Sauer handgun sealed his fate. Forensics on extractors and ejectors is serious science.',
    tags: ['DelphiMurders', 'RichardAllen', 'BallisticForensics', 'IndianaTrial'],
    comments: [
      {
        authorUsername: 'outeastblu',
        content: "Firearms toolmark comparison has a lot of subjective wiggle room, but when that unspent .40 casing matched his personal weapon's extractor claws, the jury wasn't buying the alternate theories."
      },
      {
        authorUsername: 'southsideemory',
        content: "His appellate team is definitely taking that case to the Indiana Supreme Court over the defense counsel disqualification drama and the third-party culprit evidence exclusions."
      }
    ]
  },
  {
    authorUsername: 'nothsidedee',
    category: 'legal',
    content: 'How the Illinois SAFE-T Act changed Cook County: Cash bail was nothing but legal ransom keeping poor brothers locked up while real money walked. Now the state actually has to prove you are a specific, present threat to a named victim before they can hold you pretrial. Demand your detention hearing timeline!',
    tags: ['SAFETAct', 'CookCounty', 'BailReform', 'PretrialJustice'],
    comments: [
      {
        authorUsername: 'kbaby',
        content: "Eliminating cash bail was a blessing for poor mamas. Before the SAFE-T Act, a family had to decide between paying rent or paying $1,000 bond for a loved one accused of shoplifting. Money shouldn't decide freedom."
      },
      {
        authorUsername: 'outwestace',
        content: "The bail bondsmen and insurance lobbies spent millions trying to kill that law with fear-mongering TV ads. Real justice means you get held on risk, not on your bank account balance."
      }
    ]
  },
  {
    authorUsername: 'nothsidedee',
    category: 'watch',
    content: 'Stateville and Menard inmates filing 1983 federal civil rights complaints over boiler shutdowns in sub-zero winter temperatures. When IDOC locks men in unheated cells with ice forming on the window bars, that is 8th Amendment cruel and unusual punishment. Keep documentation of every sick call request.',
    tags: ['IDOC', 'CruelAndUnusual', '8thAmendment', 'PrisonConditions'],
    comments: [
      {
        authorUsername: 'trapgodess',
        content: "Freezing in a cell with no heat while guards sit in heated offices with space heaters is pure torture. When I was down at Lowell, the pipes burst during winter and they left us without warm water for three weeks."
      },
      {
        authorUsername: 'sherrellec',
        content: "Every inmate in those wings needs to file a formal grievance on the exact date and temperature. Exhausting administrative remedies is required under the PLRA before federal courts can grant injunctive relief."
      }
    ]
  },
  {
    authorUsername: 'nothsidedee',
    category: 'cases',
    content: "Chicago federal VICAR prosecutions are built on automated license plate readers (ALPR) and rental car telematics. The feds don't need an eyewitness when they can map the vehicle's GPS transponder pulling up to the scene 30 seconds before the 911 call. Watch what you connect to that dashboard Bluetooth.",
    tags: ['VICAR', 'ChicagoCourts', 'ALPR', 'DigitalTracking'],
    comments: [
      {
        authorUsername: 'outwestace',
        content: "The feds don't even hide it anymore. Between flock cameras, ShotSpotter, and highway toll tags, they have a digital receipt of every move within 5 miles of any incident. Dudes still think it's 1995."
      },
      {
        authorUsername: 'southsideemory',
        content: "Check the Fourth Amendment challenges to automated license plate databases in the Seventh Circuit. Mass warrantless tracking of citizens across an entire city is getting closer to Supreme Court review."
      }
    ]
  },

  // --- SOUTHSIDE EMORY (Law Library Research, Franks Motions, Geofence Warrants) ---
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: 'Donald Trump receiving an unconditional discharge in New York state court for the 34 felony falsifying business records counts. No prison, no probation, no fine. Proves once again what Emory tells everyone in the yard: the penal code is written for the poor, but the escape hatches are built for the powerful.',
    tags: ['TrumpSentencing', 'UnconditionalDischarge', 'TwoTierJustice', 'NYCourts'],
    comments: [
      {
        authorUsername: 'chaingangcharley',
        content: "Charley seen first-time offenders get 5 years mandatory for writing bad checks at a grocery store in Lake County. Rich man walks out with zero probation and zero fines on 34 felonies. Justice got two sets of books."
      },
      {
        authorUsername: 'trapgodess',
        content: "It is what it is. If any one of us walked in front of that bench with 34 felony counts, they would've had us in orange jumpsuits before the judge finished clearing his throat."
      }
    ]
  },
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: 'Franks v. Delaware is your sharpest weapon when an officer lies to get a search warrant signed. If you can prove with dispatch logs or bodycam that the detective omitted facts or made reckless false statements to manufacture probable cause, the judge must strike those paragraphs and toss the warrant.',
    tags: ['FranksMotion', 'SearchWarrant', 'ProbableCause', 'LawLibraryTips'],
    comments: [
      {
        authorUsername: 'outeastblu',
        content: "Best motion in criminal defense. Caught a Jacksonville detective claiming he smelled marijuana from 100 feet away with the wind blowing the opposite direction. Judge threw out the whole house raid."
      },
      {
        authorUsername: 'outwestace',
        content: "Most public defenders won't even write a Franks motion because it pisses off the local judges. You gotta demand it in writing and preserve the record for appeal."
      }
    ]
  },
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: 'Fourth Circuit and federal appellate judges are increasingly ruling that geofence warrants violate the Fourth Amendment particularity requirement. When Google hands over every device within a 5-block radius of a robbery, that is a general warrant. File a motion to suppress blanket reverse-location searches!',
    tags: ['GeofenceWarrants', 'PrivacyRights', 'FourthCircuit', 'ConstitutionalLaw'],
    comments: [
      {
        authorUsername: 'outwestace',
        content: "Fifth Circuit just ruled geofence warrants unconstitutional in United States v. Smith! Dragnet searches of hundreds of innocent cellphones just because you were within 1,000 feet of a crime is a general warrant from the King of England."
      },
      {
        authorUsername: 'sherrellec',
        content: "Feds loved geofence warrants because Google just handed over the Sensorvault database without asking questions. Glad appellate courts are putting a stop to it."
      }
    ]
  },
  {
    authorUsername: 'southsideemory',
    category: 'investigation',
    content: 'Brady v. Maryland violations are everywhere in 20-year-old homicide convictions. When we subpoenaed the lead detective’s handwritten desk notes in an old Florida case, we found three alternative suspect interviews that never made it into the prosecutor’s discovery packet. Always inspect the raw bench files.',
    tags: ['BradyViolation', 'ExculpatoryEvidence', 'DiscoveryRules', 'ConvictionReview'],
    comments: [
      {
        authorUsername: 'chaingangcharley',
        content: "Detectives keep 'street files' in their desk drawers that never get turned over to the defense. When I was in Raiford, a brother beat his case after 22 years because an old retired cop died and his family found the real suspect's confession in a shoebox."
      },
      {
        authorUsername: 'outeastblu',
        content: "State attorneys will label exculpatory witness statements as 'work product' to hide them from the defense. You gotta file a motion for in-camera inspection of the prosecutor's trial box."
      }
    ]
  },

  // --- TRAPGODESS (Miami / Broward Dockets, Forensics, Pretrial Survival) ---
  {
    authorUsername: 'trapgodess',
    category: 'cases',
    content: 'Sarah Boone getting life in prison down in Florida for that zipped suitcase homicide. Her defense tried to run with Battered Spouse Syndrome, but when the state played the phone video of her laughing while the victim was suffocating inside the luggage, the jury needed less than 90 minutes. Video evidence is undefeated.',
    tags: ['SarahBoone', 'FloridaJustice', 'SuitcaseMurder', 'TrialReceipts'],
    comments: [
      {
        authorUsername: 'kbaby',
        content: "That video was horrifying to watch. How could anyone stand there filming someone pleading for their life and laugh? The jury did the right thing in 90 minutes."
      },
      {
        authorUsername: 'southsideemory',
        content: "Her lawyers cycled through eight different public defenders because she refused to accept any plea deal. When the video receipts are that clear, taking a blind trial is suicidal."
      }
    ]
  },
  {
    authorUsername: 'trapgodess',
    category: 'watch',
    content: 'Miami Federal Detention Center (FDC) scanning all physical legal mail and giving inmates low-resolution black-and-white printouts. When crucial trial transcripts and color forensic crime scene photos are blurred beyond recognition, that destroys effective assistance of counsel. Advocates are taking this to the 11th Circuit.',
    tags: ['FDCMiami', 'LegalMail', 'InmateRights', '11thCircuit'],
    comments: [
      {
        authorUsername: 'sherrellec',
        content: "BOP policy on legal mail scanning is getting sued nationwide. In Aliceville they started photocopying legal briefs, and half the pages came out illegible with black toner streaks across the case citations."
      },
      {
        authorUsername: 'outwestace',
        content: "They claim it's to stop synthetic drugs on paper, but really it gives the warden a back-door copy of the inmate's legal defense strategy before trial."
      }
    ]
  },
  {
    authorUsername: 'trapgodess',
    category: 'cases',
    content: 'YNW Melly double murder mistrial in Broward showed the power of trajectory reconstruction. The defense forensic pathologist proved that bullet angles from the rear passenger seat did not match a drive-by exterior trajectory. Broward prosecutors had to regroup for a second trial because the physical angles told a different story.',
    tags: ['YNWMelly', 'BrowardCourts', 'TrajectoryForensics', 'Mistrial'],
    comments: [
      {
        authorUsername: 'outeastblu',
        content: "That blood spatter and bullet angle reconstruction in Broward was intense. The state tried to claim a drive-by on Miramar Parkway, but the bullet path proved the shots came from inside the vehicle at close range."
      },
      {
        authorUsername: 'southsideemory',
        content: "The state's lead prosecutor got disqualified over handling of the detective's Brady notes too. When prosecutors play dirty with discovery, mistrials are inevitable."
      }
    ]
  },
  {
    authorUsername: 'trapgodess',
    category: 'mutual_aid',
    content: 'Family Assistance Circle: If you are trying to locate records for a family member incarcerated between 1950-1980 in the Florida system, reply here or submit through the Research Help Finder so we can help pull the archival microfilm.',
    tags: ['MutualAid', 'FamilyRecords', 'Support', 'ArchivalHelp'],
    comments: [
      {
        authorUsername: 'kbaby',
        content: "Bless you for this sister! So many families don't know how to request archived records from the State Archives in Tallahassee. Having someone who knows the microfilm system is a lifesaver."
      },
      {
        authorUsername: 'chaingangcharley',
        content: "I remember when all those files were paper cards in wooden drawers at Lake Butler. Half the records got water damaged during hurricane season, but the commitment numbers survived in the state books."
      }
    ]
  },

  // --- KBABY (Tampa, Juvenile Justice, Death Penalty Statutes, Scoresheets) ---
  {
    authorUsername: 'kbaby',
    category: 'cases',
    content: "Wade Wilson getting the death sentence in Fort Myers for those brutal 2019 murders. The defense tried to argue neurological brain damage, but the jury voted 9-3 and 10-2 for death under Florida's new non-unanimous 8-4 statute. Florida is making it easier than ever for the state to execute people.",
    tags: ['WadeWilson', 'DeathPenalty', 'FloridaLaw', 'FortMyers'],
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Florida's 8-4 death recommendation law is blatantly unconstitutional under Hurst v. Florida. The Sixth Amendment guarantees a jury trial, and that includes unanimous determination of all facts that authorize the death penalty."
      },
      {
        authorUsername: 'outwestace',
        content: "Desantis signed that statute just for political headlines after the Parkland shooter got life. The federal courts are gonna overturn every one of these 8-4 death verdicts in 5 years."
      }
    ]
  },
  {
    authorUsername: 'kbaby',
    category: 'legal',
    content: 'Hillsborough County leads the state in direct-filing 16- and 17-year-olds into adult court with adult mandatory minimums. Under Graham v. Florida and Miller v. Alabama, juvenile brains are fundamentally different. If your family member was direct-filed, make sure their attorney files for juvenile mitigation at sentencing.',
    tags: ['JuvenileJustice', 'DirectFile', 'GrahamVFlorida', 'TampaCourts'],
    comments: [
      {
        authorUsername: 'nothsidedee',
        content: "16-year-olds in adult facilities get preyed on from day one. In Cook County they had kids sitting in maximum security holding decks. Their brains aren't even fully formed yet."
      },
      {
        authorUsername: 'sherrellec',
        content: "Florida gives prosecutors unilateral direct-file discretion without a judge even holding a fitness hearing. Graham v. Florida said juveniles have diminished culpability, but Florida prosecutors ignore it daily."
      }
    ]
  },
  {
    authorUsername: 'kbaby',
    category: 'watch',
    content: "Florida DOC private phone provider charges families $0.16 a minute plus deposit transaction fees that take food out of children's mouths on the outside. Communication with home is the #1 factor in reducing recidivism, yet the state contracts treat family connection like an ATM. Support federal phone justice caps!",
    tags: ['PrisonTelecom', 'FamilySupport', 'PhoneJustice', 'DOCReform'],
    comments: [
      {
        authorUsername: 'trapgodess',
        content: "Securus and JPay are straight loan sharks! A mother deposits $20 for phone time, and $7 vanishes in 'processing fees' before her son even hears her voice on the yard. Total robbery."
      },
      {
        authorUsername: 'chaingangcharley',
        content: "Back in the day, collect calls from Raiford cost a fortune too. The telephone companies pay the state of Florida millions in 'commissions' just to keep the monopoly in place. State profits off family love."
      }
    ]
  },
  {
    authorUsername: 'kbaby',
    category: 'legal',
    content: 'Understanding Florida Criminal Punishment Code (CPC) scoresheets: Every prior juvenile disposition gets converted into points on your adult sheet. If a score exceeds 44 points, state prison is legally mandatory under Florida law unless your lawyer argues a statutory downward departure. Check every line of that scoresheet!',
    tags: ['CPCScoresheet', 'FloridaSentencing', 'DownwardDeparture', 'LegalTips'],
    comments: [
      {
        authorUsername: 'southsideemory',
        content: "Check every line of that scoresheet! Uncounseled juvenile adjudications CANNOT legally be scored under Florida law. If the state scored points from when you didn't have a lawyer, file a 3.800(a) motion to correct that illegal sentence."
      },
      {
        authorUsername: 'chaingangcharley',
        content: "Seen boys get 5 years on a 45-point scoresheet when 15 of those points came from stealing lawnmowers at age 14. Once you cross 44 points in Florida, the judge claims his hands are tied. Check your lawyer's math!"
      },
      {
        authorUsername: 'trapgodess',
        content: "My cousin had this exact nightmare in Polk County. The clerk double-counted a probation violation from when he was a minor. If our family hadn't caught it, he'd be sitting in state prison right now."
      }
    ]
  },

  // --- SHERRELLEC (Women’s Facilities, Civil Rights Audits, Mental Health) ---
  {
    authorUsername: 'sherrellec',
    category: 'legal',
    content: 'The 2026 Lindsay Clancy hung jury mistrial in Massachusetts is a landmark for mental health defense. The jury deadlocked 11-1 in favor of finding her not criminally responsible due to severe postpartum psychosis. When someone is prescribed a cocktail of 12 psychiatric meds in four months, the legal question of criminal intent changes completely.',
    tags: ['LindsayClancy', 'HungJury', 'PostpartumPsychosis', 'LegalPrecedent'],
    comments: [
      {
        authorUsername: 'kbaby',
        content: "Severe postpartum psychosis is a genuine medical emergency, not a criminal conspiracy. When a mother is prescribed 12 different heavy psych meds in 4 months, her brain chemistry is broken. 11 jurors understood that."
      },
      {
        authorUsername: 'southsideemory',
        content: "The legal standard under the McNaghten rule requires proving she lacked the capacity to appreciate the wrongfulness of her conduct. A hung jury in Massachusetts shows how much public perception on perinatal mental health has shifted."
      }
    ]
  },
  {
    authorUsername: 'sherrellec',
    category: 'watch',
    content: 'The complete shutdown of FCI Dublin in California after the FBI raided the facility and arrested the warden and chaplain for sexual abuse shows that collective inmate whistleblowing works. Women organized, reached out to federal public defenders, and created documentation that the DOJ could no longer ignore.',
    tags: ['FCIDublin', 'BOPWhistleblower', 'DOJAudit', 'CivilRights'],
    comments: [
      {
        authorUsername: 'trapgodess',
        content: "Lowell in Florida needs this exact same federal investigation! When wardens and chaplains abuse women who have zero power to defend themselves, that is institutional rape. Huge respect to the women who spoke up."
      },
      {
        authorUsername: 'outwestace',
        content: "The federal judge had to appoint a special master because the BOP was retaliating against the whistleblower inmates by throwing them in the SHU. Shutting down that dirty camp was the only solution."
      }
    ]
  },
  {
    authorUsername: 'sherrellec',
    category: 'watch',
    content: 'Auditing medical care contracts inside Lowell Correctional Institution in Marion County. Private healthcare corporations are billing the state millions while female inmates are denied basic chemotherapy and prenatal care. When healthcare is privatized behind razor wire, the bottom line always comes before human life.',
    tags: ['LowellCI', 'MedicalNeglect', 'FloridaPrisons', 'HealthcareAudits'],
    comments: [
      {
        authorUsername: 'trapgodess',
        content: "Lowell medical was a nightmare. Girls coughing up blood would wait four months just to get an ibuprofen. When Centurion and private contractors run prison healthcare, every medical referral cuts into corporate profits."
      },
      {
        authorUsername: 'kbaby',
        content: "My friend lost her ovary at Lowell because the medical staff refused to take her to an outside hospital for an ovarian cyst until it ruptured and she went into septic shock. Private healthcare in prisons is criminal."
      }
    ]
  },
  {
    authorUsername: 'sherrellec',
    category: 'cases',
    content: "Analyzing the Luigi Mangione New York state murder docket: The defense team is moving to suppress the handwritten notebook seized from his backpack at the Pennsylvania McDonald's, arguing the warrantless search exceeded Terry v. Ohio stop-and-frisk bounds. Watch the suppression hearing transcripts closely.",
    tags: ['LuigiMangione', 'SuppressionMotion', 'TerryStop', 'NYStateCourt'],
    comments: [
      {
        authorUsername: 'outeastblu',
        content: "The search of that backpack at McDonald's was definitely questionable. Officers claimed they did a 'protective weapons pat-down,' but dumping out written notebooks and reading pages goes way past Terry v. Ohio officer safety bounds."
      },
      {
        authorUsername: 'southsideemory',
        content: "If the defense wins that suppression motion in Manhattan, the entire written motive vanishes from the state's case-in-chief. Watch the state try to argue the 'inevitable discovery' doctrine to save the notebook."
      }
    ]
  }
];

/**
 * Check if a candidate post is unique against posts published within the last 72 hours.
 * Ensures no two bots post similar or duplicate topics within a 72-hour window.
 */
async function isContentUniqueWithin72Hours(db, tags, content) {
  try {
    const res = await db.query(`
      SELECT tags, content
      FROM community_posts
      WHERE created_at >= now() - interval '72 hours'
    `);
    
    const candidateWords = new Set(
      content.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 4)
    );

    for (const row of res.rows) {
      // 1. Tag overlap check
      const existingTags = Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : []);
      const commonTags = tags.filter(t => existingTags.some(et => et.toLowerCase() === t.toLowerCase()));
      if (commonTags.length >= 2) return false;

      // 2. Semantic keyword overlap check
      const existingWords = row.content.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 4);
      let matchCount = 0;
      for (const ew of existingWords) {
        if (candidateWords.has(ew)) matchCount++;
      }
      if (matchCount > 15) return false; // Overlapping topic detected within 72 hrs
    }
    return true;
  } catch (err) {
    return true; // Fail open if query error
  }
}

/**
 * Ensure bot users exist in community_users table.
 * Cached in memory so it only queries once.
 */
let botUserMap = null;

async function ensureBotUsers(db) {
  if (botUserMap && Object.keys(botUserMap).length === PERSONAS.length) {
    return botUserMap;
  }

  botUserMap = {};
  const dummyPasswordHash = argon2
    ? await argon2.hash('bot-protected-no-direct-login-' + crypto.randomBytes(16).toString('hex'), { type: argon2.argon2id })
    : '$argon2id$v=19$m=65536,t=3,p=4$' + crypto.randomBytes(24).toString('base64');

  for (const p of PERSONAS) {
    let res = await db.query(
      'SELECT id, display_name, username, role FROM community_users WHERE lower(email) = lower($1) OR lower(username) = lower($2)',
      [p.email, p.username]
    );

    if (res.rows.length === 0) {
      const insert = await db.query(`
        INSERT INTO community_users (
          display_name, username, email, password_hash, role, status,
          profile_about, profile_now, profile_location, profile_interests,
          location_privacy, social_privacy, activity_privacy, created_at
        ) VALUES (
          $1, $2, $3, $4, 'member', 'active',
          $5, $6, $7, $8,
          'public', 'public', 'public', now() - interval '30 days'
        )
        RETURNING id, display_name, username, role
      `, [
        p.displayName,
        p.username,
        p.email,
        dummyPasswordHash,
        p.about,
        p.now,
        p.location,
        JSON.stringify(p.interests)
      ]);
      botUserMap[p.username] = insert.rows[0];
    } else {
      await db.query(`
        UPDATE community_users
        SET profile_about = $1, profile_now = $2, profile_location = $3, profile_interests = $4
        WHERE id = $5
      `, [p.about, p.now, p.location, JSON.stringify(p.interests), res.rows[0].id]);
      botUserMap[p.username] = res.rows[0];
    }
  }

  return botUserMap;
}

/**
 * Seed initial multi-turn discussion threads with comments & reactions.
 * Spreads 30 posts evenly throughout the last 24 hours (1 post every 48 minutes),
 * guaranteeing each of the 8 bots has at least 2 unique posts within 24 hours.
 */
async function seedInitialDiscussions(db) {
  const users = await ensureBotUsers(db);

  // Clean out older bot posts so the fresh 30-post prioritized discussions load
  await db.query(`
    DELETE FROM community_posts
    WHERE author_id IN (
      SELECT id FROM community_users WHERE email LIKE '%@carceralcollections.internal'
    )
  `);

  // Build a 30-post list guaranteeing every bot has at least 2 unique posts
  // 8 bots * 3 = 24 posts, plus 6 bots get a 4th post = 30 posts total!
  const postsToSchedule = [];
  const botKeys = Object.keys(users); // 8 bots
  
  // Group pool by author
  const poolByBot = {};
  for (const item of SCHEDULED_POST_POOL) {
    if (!poolByBot[item.authorUsername]) poolByBot[item.authorUsername] = [];
    poolByBot[item.authorUsername].push(item);
  }

  // Pick at least 2 from each bot (16 posts)
  for (const botKey of botKeys) {
    const list = poolByBot[botKey] || [];
    if (list[0]) postsToSchedule.push(list[0]);
    if (list[1]) postsToSchedule.push(list[1]);
  }

  // Pick remaining 14 posts across the bots to hit exactly 30 posts
  for (let i = 0; i < botKeys.length && postsToSchedule.length < 30; i++) {
    const botKey = botKeys[i];
    const list = poolByBot[botKey] || [];
    if (list[2] && postsToSchedule.length < 30) postsToSchedule.push(list[2]);
    if (list[3] && postsToSchedule.length < 30) postsToSchedule.push(list[3]);
  }

  // Fill in any remaining from pool until 30
  for (const item of SCHEDULED_POST_POOL) {
    if (postsToSchedule.length >= 30) break;
    if (!postsToSchedule.includes(item)) postsToSchedule.push(item);
  }

  // Interleave and stagger across 24 hours (every 48 minutes)
  for (let i = 0; i < postsToSchedule.length; i++) {
    const item = postsToSchedule[i];
    const author = users[item.authorUsername];
    if (!author) continue;

    // 30 posts over 24 hours = 48 minutes apart (staggered from 24 hours ago to present)
    const minutesAgo = Math.round((postsToSchedule.length - 1 - i) * 48);
    const insertPost = await db.query(`
      INSERT INTO community_posts (
        author_id, category, content, tags, pinned, media_url, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'published', now() - interval '${minutesAgo} minutes', now() - interval '${minutesAgo} minutes'
      ) RETURNING id
    `, [
      author.id,
      item.category,
      item.content,
      JSON.stringify(item.tags),
      i === 0, // Pin only the most recent primary watch post
      item.mediaUrl || null
    ]);
    const postId = insertPost.rows[0].id;
    const otherKeys = botKeys.filter(k => k !== item.authorUsername);

    // Cross-bot commenting on post: Use handcrafted humanized comments or fallback to dynamic generator
    if (Array.isArray(item.comments) && item.comments.length > 0) {
      for (let c = 0; c < item.comments.length; c++) {
        // Check comment count cap
        const countRes = await db.query(
          'SELECT count(*)::int AS count FROM community_post_comments WHERE post_id = $1',
          [postId]
        );
        if (Number(countRes.rows[0]?.count || 0) >= 150) break;

        const cm = item.comments[c];
        const commenter = users[cm.authorUsername];
        if (!commenter) continue;

        const cmMinutesAgo = Math.max(1, minutesAgo - (c + 1) * Math.floor(Math.random() * 8 + 6));
        await db.query(`
          INSERT INTO community_post_comments (
            post_id, author_id, content, status, created_at
          ) VALUES (
            $1, $2, $3, 'published', now() - interval '${cmMinutesAgo} minutes'
          )
        `, [postId, commenter.id, cm.content]);
      }
    } else {
      // Dynamic humanized commenting fallback
      const commentCount = Math.min(Math.floor(Math.random() * 2) + 1, otherKeys.length);
      for (let c = 0; c < commentCount; c++) {
        const countRes = await db.query(
          'SELECT count(*)::int AS count FROM community_post_comments WHERE post_id = $1',
          [postId]
        );
        if (Number(countRes.rows[0]?.count || 0) >= 150) break;

        const commenterKey = otherKeys[(i * 3 + c) % otherKeys.length];
        const commenter = users[commenterKey];
        if (!commenter) continue;

        const commentContent = generateCrossBotComment(commenterKey, item);
        const cmMinutesAgo = Math.max(1, minutesAgo - (c + 1) * 12);
        await db.query(`
          INSERT INTO community_post_comments (
            post_id, author_id, content, status, created_at
          ) VALUES (
            $1, $2, $3, 'published', now() - interval '${cmMinutesAgo} minutes'
          )
        `, [postId, commenter.id, commentContent]);
      }
    }

    // Add reactions from peer bots
    for (let r = 0; r < 3; r++) {
      const reactingUser = users[otherKeys[(r + i) % otherKeys.length]];
      if (reactingUser) {
        await db.query(`
          INSERT INTO community_post_reactions (post_id, user_id, reaction_type)
          VALUES ($1, $2, 'like')
          ON CONFLICT DO NOTHING
        `, [postId, reactingUser.id]);
      }
    }
  }
}

/**
 * Generate contextual in-character cross-bot comment matching the commenter's authentic persona
 */
/**
 * Generate organic, deeply humanized in-character cross-bot comment.
 * NEVER uses formulaic template strings or uniform syntax.
 * Uses persona-authentic slang, varied sentence lengths, natural punctuation,
 * emotional reactions, and procedural knowledge tailored to the specific topic.
 */
function generateCrossBotComment(commenterUsername, targetPost) {
  const contentLower = String(targetPost?.content || '').toLowerCase();
  const tags = (Array.isArray(targetPost?.tags) ? targetPost.tags : []).map(t => String(t).toLowerCase());
  const category = String(targetPost?.category || 'general').toLowerCase();

  // Detect context topic
  const isSentencing = contentLower.includes('scoresheet') || contentLower.includes('mandatory') || contentLower.includes('sentenc') || contentLower.includes('plea') || contentLower.includes('points') || tags.some(t => t.includes('sentenc') || t.includes('score'));
  const isPolice = contentLower.includes('traffic') || contentLower.includes('cad') || contentLower.includes('dispatch') || contentLower.includes('bodycam') || contentLower.includes('stop') || contentLower.includes('franks') || contentLower.includes('warrant') || tags.some(t => t.includes('police') || t.includes('stop'));
  const isPrison = contentLower.includes('boiler') || contentLower.includes('medical') || contentLower.includes('canteen') || contentLower.includes('food') || contentLower.includes('visitation') || contentLower.includes('phone') || contentLower.includes('cold') || contentLower.includes('heat') || contentLower.includes('lowell') || contentLower.includes('raiford');
  const isTrial = contentLower.includes('trial') || contentLower.includes('docket') || contentLower.includes('jury') || contentLower.includes('rico') || contentLower.includes('murder') || contentLower.includes('acquitt') || category === 'cases';
  const isRecords = contentLower.includes('microfilm') || contentLower.includes('contract') || contentLower.includes('archive') || contentLower.includes('ledger') || category === 'records' || category === 'investigation';

  // Library of organic, diverse responses per persona and context:
  const responsesByPersona = {
    chaingangcharley: {
      sentencing: [
        "Charley seen too many boys get 5 years on a 45-point sheet just because of joyriding charges from when they was 14. Once you cross 44 points in Florida, the judge claims his hands are tied. Watch your lawyer on that calculation.",
        "That scoresheet math is tricky. The state always tries to add victim injury points even when the underlying charge doesn't call for it. You gotta make your lawyer dispute the points at the hearing.",
        "Back in my day at Raiford, guys would get caught with bad scoresheet calculations after doing 3 years of dead time. File that 3.800 motion and get the sheet corrected before the ink dries."
      ],
      police: [
        "Old head wisdom: 12 writes whatever narrative they need to justify the stop after the fact. Back in the road camps, if a guard didn't like you, a clean search turned into contraband in five seconds.",
        "Never argue with patrol on the curb. Take the citation, remember the badge numbers, and let your lawyer pull the bodycam. Street arguments just get you an extra resisting charge.",
        "That dispatch log receipt is real. They claim they had an anonymous tip, but when you pull the 911 audio, nobody called in anything. Always check the primary dispatch tapes."
      ],
      prison: [
        "Charley did 15 flat in Raiford and Union. Sweatboxes in August and freezing dorms in January. When private companies take over prison food and medical, you get baloney sandwiches and water. Truth is cold.",
        "They treat visitation like a privilege instead of a right. Driving four hours up highway 301 just to have a sergeant say 'facility on count lock' is something families never forget.",
        "Follow the money on every prison contract. State legislature hands out millions to these private vendors while the guys inside don't even have clean sheets."
      ],
      trial: [
        "Juries get swayed by high-profile press conferences, but once they go behind closed doors, they look for physical receipts. If the state's witnesses all got 5K plea deals, smart jurors see the hustle.",
        "Seen murder trials where the key witness was facing 30 years himself. People will swear on their mother's grave to save their own skin. Cross-examination is where the truth comes out.",
        "The court system moves slow, but unsealed records always surface eventually. You can't keep a cover-up buried forever when real investigators start digging."
      ],
      records: [
        "County commissioner records from the 20s and 30s tell the real story of Florida road camps. When the state ran out of budget, they rented men out to lumber mills. We gotta keep preserving these files.",
        "Good research right here. Microfilm reels at the state library got hundreds of pages of inmate transfer logs that never made it into the official published books.",
        "Always compare the county commitment date against the state reception number. That discrepancy is where missing years and bad credit calculations hide."
      ],
      general: [
        "Game the exact same as it was forty years ago. Only difference now is they got digital cameras and debit cards for commissary instead of paper vouchers.",
        "Appreciate you posting this breakdown. A lot of young folks on the yard don't have anybody teaching them how the legal system actually operates.",
        "Paperwork is king on the yard. If it's not stamped and filed in the clerk's office, it didn't happen. Stay on top of your docket."
      ]
    },
    outwestace: {
      sentencing: [
        "The federal sentencing guidelines are designed to break your spirit. They show you a chart with 360 to life on the right and 120 months on the left if you sign. That ain't justice, that's arm-twisting.",
        "Rule 11 colloquies are where guys lose their whole appeal. You standing there nervous, judge asks if anyone pressured you, you say 'no,' and boom—you just waived your future 2255 motion.",
        "Always demand a statutory departure argument on the record. If your defense attorney doesn't preserve the objection at sentencing, the appellate court won't even review it."
      ],
      police: [
        "Feds and local task forces rely on people voluntarily handing over phone passcodes. The moment you unlock that screen, you gave them 5 years of texts, photos, and GPS pins. Fifth Amendment is there for a reason.",
        "Title III wiretaps have strict necessity rules under federal statute. If the agents never tried basic physical surveillance before tapping the line, push that suppression motion hard.",
        "Watch how they use traffic stops as pretexts for federal conspiracy probes. Local 12 pulls you over for failure to signal, but the DEA task force is sitting down the street with a federal warrant."
      ],
      prison: [
        "Federal camps out West aren't country clubs like people claim on TikTok. Locked down 23 hours a day, zero air conditioning in 105-degree desert heat, and tablet messages monitored every 90 days.",
        "TRULINCS tablet email is not private communication! Guys be typing details about their business thinking it's WhatsApp, then the prosecutor reads it aloud at the detention hearing.",
        "Commissary price gouging is wild in the BOP. They charge $3.50 for a pack of tuna while guys make 12 cents an hour sweeping compound sidewalks."
      ],
      trial: [
        "RICO conspiracy indictments are built on guilt by association. You could be in a group photo at a barbecue 4 years ago and find yourself listed as an unindicted co-conspirator.",
        "Cross-examining co-defendants who signed 5K letters is where trials are won. When you show the jury that the witness's only way home is putting your client in a cage, doubt starts creeping in.",
        "Acquittals on murder-for-hire counts show that when a jury actually inspects the timeline and the cell tower data, the government's narrative falls apart."
      ],
      records: [
        "Reading the actual unsealed transcripts is the only way to know what happened in court. Blogs and YouTube channels make up 80% of their content for clicks.",
        "Unsealed proffer agreements tell you who really talked and who stood tall. Stop listening to internet rumors and go pull the PACER docket entries.",
        "Documenting these case files publicly is major. When the feds know the community is tracking the docket receipts, prosecutors think twice before pulling shady discovery moves."
      ],
      general: [
        "Standing on business means doing your research before you speak on somebody's situation. Respect for dropping real legal facts.",
        "No cap, this is the most informative thread I seen all week. People need to understand how the federal system moves before they get caught in the trap.",
        "You preaching the absolute truth. Stay focused and keep sharing the real dockets."
      ]
    },
    outeastblu: {
      sentencing: [
        "Florida sentencing math is brutal. In Duval County, prosecutors throw habitual offender enhancements on third-degree felonies just to force you to cop out to 7 years.",
        "Check every single prior charge on that scoresheet. Clerks make typos all the time and score dismissed cases as convictions. My attorney caught 14 bogus points on my sheet right before the judge signed.",
        "Downward departure under Florida statute requires showing the defendant was a relatively minor participant or showed remorse. If your lawyer didn't file the written motion 10 days before, you out of luck."
      ],
      police: [
        "Rodriguez v. United States is the holy grail for roadside stops. If 12 holds you past the time it takes to write a window tint ticket just to wait on a dog, that whole search is contaminated.",
        "Pull the raw CAD dispatch log! The officer writes in his report 'suspect was brandishing,' but the computer dispatch record shows the caller said 'two guys sitting on the porch.' Discrepancy wins motions.",
        "Jacksonville patrol officers love the 'I smelled unburnt marijuana' line. In 2026 with legal hemp and medical dispensaries everywhere, that probable cause claim is falling apart in state court."
      ],
      prison: [
        "Baker and Union county facilities have private contracts where trustees do all the kitchen and maintenance work for zero pay while private executives cash million-dollar checks.",
        "Seen guys get disciplinary reports just for asking for clean water when the facility pipes broke in January. The grievance system is rigged unless you get outside advocates involved.",
        "When you locked up in state, a simple sick call takes three weeks. By the time they see you, whatever infection you had has gotten ten times worse."
      ],
      trial: [
        "Physical forensics beat police narratives every time. In high-profile trials, when defense accident reconstruction proves the bullet trajectory didn't match the officer's claim, the whole indictment cracks.",
        "Court watching in Duval is mandatory. When the community fills the courtroom benches, the judge and prosecutor can't railroad people behind closed doors.",
        "Karen Read's acquittal proved what we been saying in Duval for decades: never trust an unverified evidence locker when police are investigating their own."
      ],
      records: [
        "Public records requests under Chapter 119 in Florida are the best weapon we got. Police agencies stall for six months, but once you threaten an enforcement lawsuit, the bodycam footage magically appears.",
        "Historical convict leasing in Florida wasn't just ancient history—the state used the same road camp logistics right up through the 80s. Keep cataloging the archives.",
        "Great receipt right here. Digging through primary court minutes is how wrongful convictions get reversed twenty years later."
      ],
      general: [
        "Man you spoke on this cleaner than a high-priced defense attorney. Duval people need to see this.",
        "Big facts. Keep dropping these receipts so folks don't get tricked on the street corner.",
        "Facts on facts. The official press conference never tells you what really went down on the block."
      ]
    },
    southsideemory: {
      sentencing: [
        "Law library receipt: Under Florida Rule 3.800(a), an illegal sentence can be corrected at ANY time. If your scoresheet included uncounseled juvenile points that put you over 44 points, that sentence is void as a matter of law.",
        "Always demand that the judge make specific written findings if they deny a statutory downward departure request. Without written findings, the appellate court will reverse under state precedent.",
        "When negotiating a plea, make sure the agreement specifies whether the time runs concurrent or consecutive to any administrative probation revocation. Clerks will default to consecutive if it's left blank."
      ],
      police: [
        "Franks v. Delaware is the sharpest blade in criminal procedure. If the detective omitted exculpatory video from his warrant affidavit to manufacture probable cause, the Fourth Amendment mandates an evidentiary hearing.",
        "Under Chimel v. California and Arizona v. Gant, police cannot search your entire vehicle incident to arrest if you are already handcuffed in the back of the patrol unit. Know the bounds of the grab area!",
        "Geofence reverse-location warrants violate the Fourth Amendment particularity clause. When the government searches thousands of innocent phone coordinates to find one suspect, that is an unconstitutional general warrant."
      ],
      prison: [
        "Eighth Amendment cruel and unusual punishment claims require showing 'deliberate indifference' under Farmer v. Brennan. That means documenting that prison officials knew about the freezing temperatures and refused to act.",
        "Exhausting administrative remedies under the PLRA (42 U.S.C. 1997e) is mandatory. If you miss one deadline on a formal grievance form, federal courts will dismiss your civil rights lawsuit with prejudice.",
        "Scanning legal mail and providing degraded photocopies violates the Sixth Amendment right to effective assistance of counsel. Attorneys need to file for emergency protective orders in every active docket."
      ],
      trial: [
        "Brady v. Maryland violations require three elements: the evidence was favorable to the defense, the state suppressed it either willfully or inadvertently, and prejudice ensued. Look for hidden police field notes!",
        "Becky Hill tampering with the Murdaugh jury proved why outside contact destroys Sixth Amendment impartiality under Remmer v. United States. Any unauthorized communication with a juror requires an automatic mistrial hearing.",
        "In split verdicts, the jury is rejecting the prosecutor's conspiracy theory while holding the line on narrow statutory violations. Always dissect the jury instructions before deliberating."
      ],
      records: [
        "Archival preservation is legal ammunition. In cold case litigation, finding an unredacted police supplementary log from thirty years ago is often the only way to establish actual innocence under Schlup v. Delo.",
        "Microfilm reels of county commitment ledgers often preserve handwritten notes from the sentencing judge that were omitted from the printed court minutes. Always examine the original film.",
        "Comparing the Florida state archives with local county dockets is crucial. When state ledgers conflict with county clerk entries, the county docket controls."
      ],
      general: [
        "Emory's law library rule: Never take advice from someone who hasn't read the actual appellate opinions. Knowledge of the rules is the only armor you got.",
        "Essential statutory breakdown. If more defendants understood their procedural rights, prosecutors wouldn't get away with 95% plea bargain rates.",
        "Appreciate you posting the actual citations. Grounding community discussions in primary legal authority is why The Yard matters."
      ]
    },
    nothsidedee: {
      sentencing: [
        "Sitting in Cook County lockup for two years waiting on a scoresheet review will drive a man crazy. When you finally get to the bench, public defender says 'take 4 years today or sit another year for trial.' System is built on pressure.",
        "Illinois did away with cash bail under the SAFE-T Act and crime didn't skyrocket like the politicians claimed. Holding poor people on $1,000 ransoms while millionaires walk was pure extortion.",
        "They score prior juvenile misdemeanors like you committed armed robbery. Kids make mistakes at 15 and end up paying for them with adult mandatory minimums at 25."
      ],
      police: [
        "Chicago task forces use ALPR license plate cameras on every major intersection. They can map your car pulling up to a block 20 minutes before a 911 call. You can't outrun the surveillance grid.",
        "12 stops you on the sidewalk, claims you fit the description of a robbery from three blocks away, and uses that as an excuse to run your name through LEADS. Know your rights on street stops.",
        "Never consent to a search. They say 'if you got nothing to hide, let me look in the trunk.' The answer is always 'Officer, I do not consent to any searches.' Say it loud for the bodycam."
      ],
      prison: [
        "Stateville and Menard winter conditions are inhumane. Ice freezing on the inside of the cell window bars while guards sit in the bubble with heaters. That's why civil rights lawsuits are piling up.",
        "County bullpen conditions are designed to break your will to fight your case. 40 guys in a tank with one open toilet and a cold baloney sandwich twice a day. They make jail so miserable you plead guilty just to leave.",
        "Commissary prices in IDOC went up double while wages are still 15 cents an hour. Families on the outside are spending their grocery money just so their sons can eat ramen soups."
      ],
      trial: [
        "Richard Allen getting 130 years in Delphi showed how forensic toolmark matching on cartridge casings can convince a jury even when the rest of the case has holes.",
        "O'Block 6 federal VICAR trial in Chicago showed that the feds don't even need eyewitnesses anymore. They synced up car GPS, ShotSpotter audio, and cellphone tower pings to secure six convictions.",
        "People see YouTube rap drill videos and think it's entertainment. In federal court, prosecutors play those same music videos on a 75-inch screen and tell the jury it's a criminal enterprise."
      ],
      records: [
        "Good looking out on clearing up the internet rumors. People on Twitter had Q50 dead three different times while he was literally sitting in the studio recording. Check certified records!",
        "Pulling the certified court docket sheet is the only way to know if someone took a deal or went to trial. Internet blogs don't know the difference between an indictment and a conviction.",
        "Preserving these case dockets is vital. When the community tracks the paperwork, police departments can't sweep bad stops under the rug."
      ],
      general: [
        "Big facts Dee! You breaking this down for the homies who never had nobody explain the legal game to them.",
        "Respect for speaking on this. Cook County jail taught me that the justice system don't care about truth, it cares about closing files.",
        "Real talk from the Northside. Keep dropping these receipts so our people can stay informed."
      ]
    },
    trapgodess: {
      sentencing: [
        "Courtroom presentation matters so much at sentencing. When women come into court with prison scrubs and shackled ankles, judges dehumanize them. Families gotta bring clean business clothes for the docket!",
        "Judges in Florida love handing down 25-year sentences like they passing out candy. If the defense doesn't introduce mitigating evidence about childhood trauma and domestic violence, you get crushed by the guidelines.",
        "My cousin had this exact scoresheet nightmare in Polk County. Clerk double-counted an old juvenile misdemeanor that was already dismissed. If family didn't catch the error, he was gone for 3 years."
      ],
      police: [
        "Miami and Broward 12 will pull you over for an expired tag sticker and have three squad cars boxing you in within two minutes. Know how to speak to them calmly and keep your hands on the steering wheel.",
        "Sarah Boone's trial showed that video receipts don't lie. When the state played that suitcase recording in open court, her defense collapsed in an hour. Be careful what gets recorded on these phones.",
        "Never let an investigator interrogate you without private counsel in the room. They act like your best friend in the interview room, promising help, while the recorder is feeding the grand jury."
      ],
      prison: [
        "Lowell CI was pure hell for women. Four months waiting on an ibuprofen while coughing up blood, guards demanding sexual favors for basic shampoo, and confinement for anyone who filed a grievance.",
        "Canteen price gouging inside female facilities is criminal extortion! A pack of pads costs $8.50 when state pay is 20 cents an hour. Women have to choose between hygiene and calling their babies.",
        "FDC Miami scanning legal mail and giving inmates blurry black-and-white photocopies is a Sixth Amendment violation. How can you prepare for trial when your attorney's exhibits are unreadable?"
      ],
      trial: [
        "YNW Melly's mistrial in Broward showed that when bullet trajectory angles from the back seat contradict the state's drive-by theory, jurors have to follow the physical science.",
        "Diddy's split verdict proved that high-priced legal teams can dismantle sweeping RICO racketeering counts by attacking witness credibility on cross-examination.",
        "Watching celebrity trials on Court TV is one thing, but sitting in that courtroom with twelve jurors staring at you while the prosecutor demands life in prison is terrifying. Real respect to those who stand tall."
      ],
      records: [
        "Blessing families with archival records from the 50s and 60s is so important. So many grandmothers don't even know where their brothers were buried when they died in Florida state custody.",
        "State Archives microfilm records hold the truth that prison administrations tried to erase fifty years ago. Keep digging through those commitment books.",
        "Great information! Our families need to know how to navigate the Research Help Finder and pull certified dockets without paying thousands to predatory private agencies."
      ],
      general: [
        "Talk your talk sister! Women behind razor wire get forgotten so fast by society. Proud to see The Yard shining a light on this.",
        "Real talk. The trauma of incarceration doesn't stop when you walk out the gate—it stays with you and your children for life. Support each other.",
        "Love seeing our community sharing real resources instead of internet gossip. Stand on business always."
      ]
    },
    kbaby: {
      sentencing: [
        "Hillsborough County direct-filing 16-year-olds into adult court with mandatory minimums is breaking families apart. A teenager's brain isn't even developed, yet the state treats them like hardened criminals.",
        "Every mama needs to learn how to read a Florida CPC scoresheet. If your son or daughter gets scored points for an uncounseled juvenile diversion program, demand that your lawyer dispute it!",
        "Wade Wilson getting the death penalty under Florida's new 8-4 non-unanimous statute shows how low the bar for state execution has dropped. Life without parole should be the baseline unless 12 jurors agree."
      ],
      police: [
        "When 12 stops young kids on the street in Tampa, they intimidate them into unlocking their phones without a warrant. Parents need to teach their children that they have the right to remain silent.",
        "Police narratives always paint our youth in the worst possible light. But when you pull the bodycam footage, you see the officer escalating a simple conversation into an arrest.",
        "CAD dispatch logs are so important for holding officers accountable. When dispatch records prove the caller never reported a weapon, the whole bogus stop gets exposed."
      ],
      prison: [
        "Driving five hours with two babies to a rural prison in North Florida just to have the guard at the gate cancel visitation is soul-crushing. Families serve the sentence right along with their loved ones.",
        "Florida DOC private phone contracts charge $0.16 a minute plus deposit fees that take food off our children's plates. Keeping families connected reduces recidivism, but the state treats phone calls like an ATM.",
        "My friend lost her ovary at Lowell because medical refused to take her to an outside hospital when her cyst ruptured. Private healthcare corporations in prisons need to be held accountable for medical neglect."
      ],
      trial: [
        "Lindsay Clancy's hung jury mistrial showed that mental health and severe postpartum psychosis are real medical crises. 11 jurors recognized that twelve psychiatric medications in four months broke her mind.",
        "Court dockets move so fast when a family doesn't have money for private counsel. Public defenders have 100 cases on their desk and barely get twenty minutes to review discovery before docket soundings.",
        "When trials drag on for three years with continuous continuances, it exhausts families emotionally and financially. We need speedy trial enforcement in state courts."
      ],
      records: [
        "Helping families locate records for grandfathers and uncles incarcerated decades ago brings closure. Microfilm records in Tallahassee have answers that state officials never shared with families.",
        "Archival records show that the racial disparities we see in Florida courtrooms today have been baked into the state penal system for over a century.",
        "Thank you for sharing this guide! Navigating the clerk of court website and state archive databases is so overwhelming for families without legal guidance."
      ],
      general: [
        "Praying for every mother, sister, and daughter holding down a loved one behind bars today. Your loyalty and sacrifice matter so much.",
        "This community gives me hope. Having a safe space to discuss legal dockets and prison conditions without judgment is a blessing.",
        "Beautifully said. We have to keep educating each other so the next generation doesn't get swallowed by this carceral system."
      ]
    },
    sherrellec: {
      sentencing: [
        "At Aliceville, I saw federal judges hand down 20-year sentences on drug conspiracy counts where the defendant never touched a single ounce of narcotics. Pinkerton liability allows prosecutors to attribute every co-conspirator's weight to you.",
        "The separate sovereigns doctrine under Heath v. Alabama means federal and state prosecutors can double-dip on the same underlying conduct. Luigi Mangione pleading guilty to federal stalking doesn't stop NY murder trial.",
        "Compassionate release under 18 U.S.C. 3582(c)(1)(A) requires demonstrating extraordinary and compelling reasons. If you have an elderly or terminally ill family member in the feds, get the medical records certified now."
      ],
      police: [
        "Terry v. Ohio stop-and-frisk has clear constitutional limits: officers can only pat down outer clothing for weapons. When they open zipped backpacks and read handwritten notebooks, that exceeds officer safety bounds.",
        "SDNY wiretap necessity challenges under 18 U.S.C. 2518 require proof that ordinary investigative methods failed. When agents use boilerplate language, aggressive defense counsel can suppress the entire wire.",
        "Always demand the unredacted FBI 302 witness interview reports in federal discovery. The difference between what an informant told agents in 2022 and what they testify to in 2026 is where reasonable doubt lives."
      ],
      prison: [
        "The complete shutdown of FCI Dublin after the warden and chaplain were convicted of sexual abuse proved that inmate whistleblowers can take down corrupt federal institutions. Documentation is power.",
        "Lowell CI medical care contracts are an ongoing human rights catastrophe. Private healthcare contractors are profiting off denying cancer treatments, specialist visits, and prenatal care behind razor wire.",
        "Federal administrative remedies (BP-9, BP-10, BP-11) are a deliberate obstacle course. If you miss a 20-day filing window, the BOP claims you failed to exhaust remedies and federal courts dismiss your case."
      ],
      trial: [
        "Reading the actual unsealed DOJ dockets and Inspector General audits reveals that federal prosecutors routinely conceal favorable Brady evidence until the eve of trial to force pleas.",
        "Split verdicts in federal court demonstrate that when a defense team relentlessly challenges wiretap interpretations and financial paper trails, jurors will reject the government's overcharged racketeering theories.",
        "High-profile state murder prosecutions require scrutiny of jury selection and venue changes. When a case gets 24/7 media coverage, finding twelve impartial jurors without preconceived bias is nearly impossible."
      ],
      records: [
        "Unsealed DOJ records from the 70s and 80s corroborate that systemic medical neglect and guard violence in federal facilities have been documented for decades without administrative reform.",
        "FOIA requests for facility inspection audit reports always yield crucial admissions. Read the government's own risk assessment appendices to find the staffing shortages.",
        "Cross-referencing state prison commitment logs with federal habeas corpus petitions is how historical civil rights violations get exposed. The Law Library collections are invaluable."
      ],
      general: [
        "Working the legal typewriter at Aliceville taught me that the law is a technical language. When you learn how to read dockets and cite precedent, you can hold administrators accountable.",
        "Incisive analysis. Tracking the official records and exposing administrative concealment is the core mission of this archive.",
        "Essential documentation. Keep sharing these primary source receipts with the community."
      ]
    }
  };

  const personaBucket = responsesByPersona[commenterUsername] || responsesByPersona.southsideemory;
  let pool = personaBucket.general;

  if (isSentencing && personaBucket.sentencing) {
    pool = personaBucket.sentencing;
  } else if (isPolice && personaBucket.police) {
    pool = personaBucket.police;
  } else if (isPrison && personaBucket.prison) {
    pool = personaBucket.prison;
  } else if (isTrial && personaBucket.trial) {
    pool = personaBucket.trial;
  } else if (isRecords && personaBucket.records) {
    pool = personaBucket.records;
  }

  // Pick a response organically
  const selected = pool[Math.floor(Math.random() * pool.length)];
  return selected;
}

/**
 * Populate realistic network graph (follows & connections)
 * Links bots to each other ONLY.
 * Real users (e.g. Manibani / Atum) strictly start with 0 connections & 0 followers.
 */
async function seedNetworkGraph(db) {
  const users = await ensureBotUsers(db);
  const userList = Object.values(users);

  for (let i = 0; i < userList.length; i++) {
    for (let j = 0; j < userList.length; j++) {
      if (i !== j) {
        await db.query(`
          INSERT INTO community_follows (follower_id, following_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [userList[i].id, userList[j].id]);
      }
    }
  }
}

let scheduledPoolIndex = 0;

/**
 * Periodic bot activity generator running every 48 minutes (30 times across 24 hours).
 * Evaluates 72-hour content uniqueness and caps comments per post at 150.
 */
async function scheduleBotActivity(db) {
  try {
    const users = await ensureBotUsers(db);
    const botKeys = Object.keys(users);
    
    // Find next candidate post that satisfies the 72-hour uniqueness rule
    let candidate = null;
    let attempts = 0;
    while (attempts < SCHEDULED_POST_POOL.length) {
      const item = SCHEDULED_POST_POOL[scheduledPoolIndex % SCHEDULED_POST_POOL.length];
      scheduledPoolIndex++;
      attempts++;

      const isUnique = await isContentUniqueWithin72Hours(db, item.tags, item.content);
      if (isUnique) {
        candidate = item;
        break;
      }
    }

    if (!candidate) {
      candidate = SCHEDULED_POST_POOL[scheduledPoolIndex % SCHEDULED_POST_POOL.length];
    }

    const author = users[candidate.authorUsername];
    if (!author) return;

    // Check if post already exists
    const existing = await db.query(
      'SELECT id FROM community_posts WHERE author_id = $1 AND content = $2',
      [author.id, candidate.content]
    );

    let postId;
    if (existing.rows.length === 0) {
      const res = await db.query(`
        INSERT INTO community_posts (
          author_id, category, content, tags, pinned, media_url, status
        ) VALUES (
          $1, $2, $3, $4, false, $5, 'published'
        ) RETURNING id
      `, [
        author.id,
        candidate.category,
        candidate.content,
        JSON.stringify(candidate.tags),
        candidate.mediaUrl || null
      ]);
      postId = res.rows[0].id;
    } else {
      postId = existing.rows[0].id;
    }

    // Cross-bot commenting on recent posts
    // Check comment cap: under no circumstances reach over 150 comments per post
    const commentCountRes = await db.query(
      'SELECT count(*)::int AS count FROM community_post_comments WHERE post_id = $1',
      [postId]
    );
    const currentCommentCount = Number(commentCountRes.rows[0]?.count || 0);

    if (currentCommentCount < 150) {
      const otherKeys = botKeys.filter(k => k !== candidate.authorUsername);
      const commenterKey = otherKeys[Math.floor(Math.random() * otherKeys.length)];
      const commenter = users[commenterKey];
      if (commenter) {
        const commentContent = generateCrossBotComment(commenterKey, candidate);
        await db.query(`
          INSERT INTO community_post_comments (
            post_id, author_id, content, status
          ) VALUES (
            $1, $2, $3, 'published'
          )
        `, [postId, commenter.id, commentContent]);
      }
    }

    // Add reactions
    const otherKeys = botKeys.filter(k => k !== candidate.authorUsername);
    for (let i = 0; i < 2; i++) {
      const peer = users[otherKeys[i % otherKeys.length]];
      if (peer) {
        await db.query(`
          INSERT INTO community_post_reactions (post_id, user_id, reaction_type)
          VALUES ($1, $2, 'like')
          ON CONFLICT DO NOTHING
        `, [postId, peer.id]);
      }
    }
  } catch (err) {
    console.warn('Bot scheduler update warning:', err.message);
  }
}

module.exports = {
  PERSONAS,
  INITIAL_THREADS,
  SCHEDULED_POST_POOL,
  searchBlackAndWhiteNews,
  ensureBotUsers,
  seedInitialDiscussions,
  seedNetworkGraph,
  scheduleBotActivity,
  isContentUniqueWithin72Hours,
  generateCrossBotComment
};

