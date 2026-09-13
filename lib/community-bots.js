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
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: 'Watching Bryan Kohberger take that guilty plea in Idaho in July 2025 to dodge the death needle. When the state has sheath touch DNA, cell tower pings, and a white Elantra circling the house on video, your lawyers gotta make you look reality in the eye. Pleading to save your life is the only card left when forensics got you locked down.',
    tags: ['BryanKohberger', 'IdahoMurders', 'PleaDeal', 'ForensicDNA']
  },
  {
    authorUsername: 'sherrellec',
    category: 'legal',
    content: 'The 2026 Lindsay Clancy hung jury mistrial in Massachusetts is a landmark for mental health defense. The jury deadlocked 11-1 in favor of finding her not criminally responsible due to severe postpartum psychosis. When someone is prescribed a cocktail of 12 psychiatric meds in four months, the legal question of criminal intent changes completely.',
    tags: ['LindsayClancy', 'HungJury', 'PostpartumPsychosis', 'LegalPrecedent']
  },
  {
    authorUsername: 'trapgodess',
    category: 'cases',
    content: 'Sarah Boone getting life in prison down in Florida for that zipped suitcase homicide. Her defense tried to run with Battered Spouse Syndrome, but when the state played the phone video of her laughing while the victim was suffocating inside the luggage, the jury needed less than 90 minutes. Video evidence is undefeated.',
    tags: ['SarahBoone', 'FloridaJustice', 'SuitcaseMurder', 'TrialReceipts']
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'records',
    content: 'Erik and Lyle Menendez getting resentenced in May 2025 down to 50 years to life after 35 years behind bars. The unsealed letters and corroborating testimony from Roy Rosselló finally forced the state to recognize the sexual abuse evidence they suppressed in the 1996 trial. The truth takes decades, but it always crawls out the dirt.',
    tags: ['MenendezBrothers', 'Resentencing', 'ParoleEligible', 'UnsealedEvidence']
  },
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: 'Donald Trump receiving an unconditional discharge in New York state court on January 10, 2025 for the 34 felony falsifying business records counts. No prison, no probation, no fine. Proves once again what Emory tells everyone in the yard: the penal code is written for the poor, but the escape hatches are built for the powerful.',
    tags: ['TrumpSentencing', 'UnconditionalDischarge', 'TwoTierJustice', 'NYCourts']
  },
  {
    authorUsername: 'outeastblu',
    category: 'cases',
    content: 'Donna Adelson following her son Charlie Adelson straight to life without parole in Florida for the Dan Markel murder-for-hire conspiracy. The FBI tapped WhatsApp calls and Dolce Vita restaurant recordings broke that whole family apart. Murder-for-hire always leaves a paper trail, no matter how many millions you got in the bank.',
    tags: ['AdelsonFamily', 'DanMarkel', 'MurderForHire', 'Wiretaps']
  },
  {
    authorUsername: 'kbaby',
    category: 'cases',
    content: 'Wade Wilson getting the death sentence in Fort Myers for those brutal 2019 murders. The defense tried to argue neurological brain damage, but the jury voted 9-3 and 10-2 for death under Florida\'s new non-unanimous 8-4 statute. Florida is making it easier than ever for the state to execute people.',
    tags: ['WadeWilson', 'DeathPenalty', 'FloridaLaw', 'FortMyers']
  },
  {
    authorUsername: 'nothsidedee',
    category: 'legal',
    content: 'Richard Allen getting 130 years in the Delphi murders in Indiana. Defense fought hard on Odinism and alternate suspects, but the unspent .40 caliber bullet cycle extraction marks tied directly to his Sig Sauer handgun sealed his fate. Forensics on extractors and ejectors is serious science.',
    tags: ['DelphiMurders', 'RichardAllen', 'BallisticForensics', 'IndianaTrial']
  }
];

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
 * Replaces any old formal placeholder posts with the authentic formerly incarcerated voice.
 */
async function seedInitialDiscussions(db) {
  const users = await ensureBotUsers(db);

  // Clean out older bot posts so the fresh prioritized case discussions load
  await db.query(`
    DELETE FROM community_posts
    WHERE author_id IN (
      SELECT id FROM community_users WHERE email LIKE '%@carceralcollections.internal'
    )
  `);

  for (let i = 0; i < INITIAL_THREADS.length; i++) {
    const thread = INITIAL_THREADS[i];
    const author = users[thread.authorUsername];
    if (!author) continue;

    const hoursAgo = (INITIAL_THREADS.length - i) * 3;
    const insertPost = await db.query(`
      INSERT INTO community_posts (
        author_id, category, content, tags, pinned, media_url, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'published', now() - interval '${hoursAgo} hours', now() - interval '${hoursAgo} hours'
      ) RETURNING id
    `, [
      author.id,
      thread.category,
      thread.content,
      JSON.stringify(thread.tags),
      thread.pinned,
      thread.mediaUrl || null
    ]);
    const postId = insertPost.rows[0].id;

    if (Array.isArray(thread.comments)) {
      for (let c = 0; c < thread.comments.length; c++) {
        const cm = thread.comments[c];
        const commentAuthor = users[cm.authorUsername];
        if (!commentAuthor) continue;

        const cmHoursAgo = Math.max(1, ((INITIAL_THREADS.length - i) * 3) - (c + 1));
        await db.query(`
          INSERT INTO community_post_comments (
            post_id, author_id, content, status, created_at
          ) VALUES (
            $1, $2, $3, 'published', now() - interval '${cmHoursAgo} hours'
          )
        `, [postId, commentAuthor.id, cm.content]);
      }
    }

    const otherUserKeys = Object.keys(users).filter(k => k !== thread.authorUsername);
    const reactionCount = 3 + (i % 5);
    for (let r = 0; r < reactionCount; r++) {
      const reactingUser = users[otherUserKeys[r % otherUserKeys.length]];
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
 * Populate realistic network graph (follows & connections)
 * Links bots to each other ONLY.
 * NOTE: Real users (e.g. Manibani / Atum) strictly start with 0 connections & 0 followers.
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

async function scheduleBotActivity(db) {
  try {
    const users = await ensureBotUsers(db);
    const nextItem = SCHEDULED_POST_POOL[scheduledPoolIndex % SCHEDULED_POST_POOL.length];
    scheduledPoolIndex++;

    const author = users[nextItem.authorUsername];
    if (!author) return;

    const existing = await db.query(
      'SELECT id FROM community_posts WHERE author_id = $1 AND content = $2',
      [author.id, nextItem.content]
    );

    if (existing.rows.length === 0) {
      const res = await db.query(`
        INSERT INTO community_posts (
          author_id, category, content, tags, pinned, media_url, status
        ) VALUES (
          $1, $2, $3, $4, false, $5, 'published'
        ) RETURNING id
      `, [
        author.id,
        nextItem.category,
        nextItem.content,
        JSON.stringify(nextItem.tags),
        nextItem.mediaUrl || null
      ]);

      const postId = res.rows[0].id;
      const peerKeys = Object.keys(users).filter(k => k !== nextItem.authorUsername);
      for (let i = 0; i < 2; i++) {
        const peer = users[peerKeys[i % peerKeys.length]];
        if (peer) {
          await db.query(`
            INSERT INTO community_post_reactions (post_id, user_id, reaction_type)
            VALUES ($1, $2, 'like')
            ON CONFLICT DO NOTHING
          `, [postId, peer.id]);
        }
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
  scheduleBotActivity
};
