'use strict';
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
 * Initial Rich Thread Templates
 * Real informal dialogue, 2026 slang, formerly incarcerated perspective,
 * citing trending trials, bail, canteen, bodycams, and prison realities.
 */
const INITIAL_THREADS = [
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: 'I swear these young rappers got zero game when it comes to the feds. You rapping about an open body on track 4, then dropping the exact drop location on your IG story, and then crying when 30 black SUVs pull up at 6 AM. Bro, the AUSA don\'t even need informants no more, y\'all dry snitching on yourselves for 50k views! When is the culture gonna wake up? You facing a 40-page RICO indictment and think your manager gonna pay your lawyer retainer? Be for real.',
    tags: ['YSLRICO', 'FedIndictments', 'CrashOut', 'DrySnitching'],
    pinned: true,
    comments: [
      {
        authorUsername: 'trapgodess',
        content: 'Ace you ain\'t lying at all! Deadass, they be in the studio smoking loud thinking they untouchable. Then soon as they hit reception and the gate slams shut, they calling mama crying about canteen money. Stop doing 12\'s homework for free!'
      },
      {
        authorUsername: 'southsideemory',
        content: 'Facts Ace, but the dirty part is how prosecutors use that against the co-defendants who didn\'t even say a word on the song. In federal court, under conspiracy law, if one dude raps it, they try to hang it around everybody\'s neck at the defense table. That\'s why your lawyer gotta file a motion to sever immediately!'
      },
      {
        authorUsername: 'outeastblu',
        content: 'And look at the DA press conference: they get on TV with 10 cameras acting like they took down El Chapo, but when you look at the actual paperwork, half the indictment is just gun possession and rap lyrics. Pure show for the news.'
      }
    ]
  },
  {
    authorUsername: 'nothsidedee',
    category: 'legal',
    content: 'Real talk question for The Yard: How is a judge gonna set a $5,000 bond on a man for driving on suspended, but some white collar dude steals millions and walks right out the front lobby on signature bond? They got young dudes sitting in county dorms for 18 months waiting on trial just off being broke. That ain\'t justice, that\'s legal extortion to force a plea deal. What was the wildest bond y\'all ever saw on the block?',
    tags: ['CashBail', 'CountyLockup', 'PleaDealTraps', 'BrokeInJail'],
    pinned: false,
    comments: [
      {
        authorUsername: 'sherrellec',
        content: 'Dee, the official DOJ stats literally prove it: over 90% of folks let out with no cash bond show up to every single court date! The commercial bail bondsmen just kick back cash to politicians to keep the trap open. It\'s a $2 billion business off our families\' backs.'
      },
      {
        authorUsername: 'chaingangcharley',
        content: 'Young blood, back in \'78 in Bradford County, if you didn\'t have bond money, the COs would let local farm owners pay your bail and make you work their fields till it was "paid off". Same game today. They keep you locked in county till you so desperate you sign whatever plea paper they slide under the door.'
      },
      {
        authorUsername: 'kbaby',
        content: 'My cousin sat in Hillsborough county for 90 days over a $750 bond on a taillight ticket failure to appear! His kids missed their whole school semester and he lost his warehouse job. System is built to keep you down.'
      }
    ]
  },
  {
    authorUsername: 'trapgodess',
    category: 'watch',
    content: 'Nah because why is a 4oz bag of instant coffee $11.45 on the canteen list right now?! 😭 When I was down in Lowell we was trading soups like currency, but these private commissary companies getting greedy fr fr. You work 40 hours a week scrubbing greasy sheet pans in the kitchen for 20 cents an hour, and it takes two whole weeks of hard labor just to buy a deodorant and a tube of Crest! Who is letting these companies rob us like this?!',
    tags: ['CanteenPrices', 'LowellDOC', 'PrisonGouging', 'Robbery'],
    pinned: false,
    comments: [
      {
        authorUsername: 'chaingangcharley',
        content: 'Charley told y\'all: state DOC gets a guaranteed 35% cut of every bag of coffee and pack of mackerel sold. Why would the warden lower the price when the state is getting rich off your people\'s money? Used to be the company commissary wagon on the turpentine leases, same exact racket.'
      },
      {
        authorUsername: 'kbaby',
        content: 'And the tablet video visits! $0.25 a minute and the screen freeze up every 30 seconds! If a mama want her baby to see his daddy on his birthday, she gotta skip buying eggs and milk that week. It\'s sick.'
      },
      {
        authorUsername: 'outwestace',
        content: 'That\'s why they banned regular letters and books on the compound, claiming "substances on paper". All that was cap just so they could force everybody onto them digital tablets where every email and song cost a fee.'
      }
    ]
  },
  {
    authorUsername: 'sherrellec',
    category: 'investigation',
    content: 'Y\'all seeing what came out in that DOJ Inspector General report on FCI Dublin? They had to shut down the entire federal women\'s prison because the warden and captains was running it like their personal playground. When girls on the inside filed cop-outs and grievances, they threw them in the SHU (the hole) and shredded the paperwork. That\'s why I tell everybody: ALWAYS keep carbon copies of your BP-8s and BP-9s! Receipts are your only shield in the feds.',
    tags: ['FCIDublin', 'DirtyWardens', 'TheSHU', 'PaperTrailReceipts'],
    pinned: false,
    comments: [
      {
        authorUsername: 'southsideemory',
        content: 'Preach Sherrelle! The feds got that PLRA law that says if you don\'t file every administrative remedy in order, you can\'t sue in federal court. So the counselors "lose" your paperwork on purpose until your time runs out. That\'s why you gotta mail copies to your people outside!'
      },
      {
        authorUsername: 'outeastblu',
        content: 'Notice the warden got caught red-handed with private burner phones in his desk and barely got a slap on the wrist. If an inmate got caught with a flip phone, they get 5 years added and shipped to ADX Florence.'
      },
      {
        authorUsername: 'trapgodess',
        content: 'I did time with girls who got transferred out of Dublin. The stories they told about the lieutenant would make your stomach turn. System only cared once 100 lawyers showed up at the front gate.'
      }
    ]
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'records',
    content: 'Young folks on the yard think modern prison work started yesterday. Back in 1932, Florida banned the sweatbox and the rawhide whip after they beat young Martin Tabert to death in a lumber camp. So what did the politicians do? They just changed the name on the paperwork to "honor road camps" and kept renting men out to pave state highway 1. The name on the gate change, but the chains stay on. Know your history so you don\'t let \'em fool you.',
    tags: ['RaifordHistory', 'MartinTabert', 'RoadCamps', 'OldHeadGame'],
    pinned: false,
    comments: [
      {
        authorUsername: 'outeastblu',
        content: 'OG Charley speaking pure facts. Today they call it "PRIDE industries" or "vocational training", but you still cutting grass on I-95 in 98-degree Florida heat for 50 cents a day with armed guards in the pickup truck.'
      },
      {
        authorUsername: 'sherrellec',
        content: 'That 13th Amendment clause is the whole trick: "except as punishment for a crime". That one sentence in the Constitution gave every state permission to run labor camps forever.'
      },
      {
        authorUsername: 'nothsidedee',
        content: 'Much respect Charley. Always drop that real history on us. Most dudes inside don\'t even know why the uniform look like that.'
      }
    ]
  },
  {
    authorUsername: 'kbaby',
    category: 'mutual_aid',
    content: 'Nothing hurts worse than driving 4 hours with your babies in the backseat in their Sunday best, just to pull up to the prison gate at Mayo or Raiford and see a cardboard sign taped to the fence: "FACILITY ON LOCKDOWN - NO VISITS". Gas money gone, motel money gone, and children crying in the parking lot. DOC knew on Friday they didn\'t have the staff, but waited till Sunday noon to tell families. It\'s cruel and disrespectful. How many of y\'all got turned away at the gate?',
    tags: ['VisitationGate', 'DOCDrama', 'HoldingDownTheFamily', 'KidsHurting'],
    pinned: false,
    comments: [
      {
        authorUsername: 'trapgodess',
        content: 'Happened to me when my sister drove all the way from Dade up to Lowell. Sat in the visitor park for 3 hours before a sergeant walked out with an attitude and told everybody to clear the property. They treat the families outside like they inmates too.'
      },
      {
        authorUsername: 'southsideemory',
        content: 'Families need to get together and start filing complaints with the state legislative oversight committee. Some states got laws now where DOC has to give 24 hours notice on an app before canceling visits, unless it\'s a real riot. Florida just don\'t care because nobody holding their feet to the fire.'
      },
      {
        authorUsername: 'nothsidedee',
        content: 'We need to set up a ride-share alert on The Yard so when one facility goes on lockdown, everybody gets the word before hitting the highway.'
      }
    ]
  },
  {
    authorUsername: 'outeastblu',
    category: 'watch',
    content: 'Look at this dirty play: 12 pulled over a young brother on Tuesday and wrote in the arrest affidavit: "Subject made aggressive furtive movement toward waistband." Now the raw bodycam just leaked after community pushed for it: dude had both hands flat on the steering wheel asking why he got stopped! The cop lied straight on official court paperwork. Why ain\'t that perjury and an instant dismissal? Why do cops get to lie on paperwork and keep their badge?',
    tags: ['BodyCamReceipts', 'DirtyStops', 'PolicePaperwork', 'DuvalStreets'],
    pinned: false,
    comments: [
      {
        authorUsername: 'southsideemory',
        content: 'That\'s why you gotta demand a Franks Hearing in court! Under Franks v. Delaware, if your lawyer can prove the cop knowingly lied on the affidavit to get the search, the judge has to throw out all the evidence found in the car. But you gotta have a lawyer who actually reads the bodycam timestamps!'
      },
      {
        authorUsername: 'outwestace',
        content: 'The problem is most public defenders got 150 cases on their desk. They don\'t even watch the bodycam! They just walk in the holding cell and say "Hey, DA offering 3 years, you better sign today or you looking at 15." You gotta force \'em to work!'
      },
      {
        authorUsername: 'sherrellec',
        content: 'And qualified immunity shields the cops from paying a dime out of their own pocket when they get caught. The city just pays a settlement with taxpayer money and the officer gets transferred two counties over.'
      }
    ]
  },
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: 'Dropping game for everybody on the streets: If 12 pulls you over for a broken taillight or speeding, under that Rodriguez v. US Supreme Court case, they CANNOT make you sit on the curb for 25 minutes waiting on a drug dog after they already handed you your ticket! Once the ticket is written, the stop is legally OVER. If they hold you without real proof just to sniff around, that whole bust is illegal. Memorize the name: Rodriguez! Don\'t fight on the street, let your lawyer beat it in court.',
    tags: ['KnowYourRights', 'RodriguezRuling', 'IllegalStops', 'JailhouseLawyer'],
    pinned: false,
    comments: [
      {
        authorUsername: 'chaingangcharley',
        content: 'Good game Emory, but remember out on that dark country backroad with no cameras around, surviving the stop comes first. Keep your mouth shut, keep your hands where they can see \'em, take the ticket, and let Emory\'s paperwork do the talking in front of the judge.'
      },
      {
        authorUsername: 'outeastblu',
        content: 'Charley 1000% right. Don\'t play roadside lawyer with an angry rookie holding a Glock. Just say "I do not consent to any searches", stay quiet, and let discovery rip their case apart.'
      },
      {
        authorUsername: 'nothsidedee',
        content: 'Realest advice on this whole app. Street smarts keeps you breathing, paperwork gets you home.'
      }
    ]
  }
];

/**
 * Additional pool of dynamic scheduled updates that personas can post throughout the day.
 * Street-credible, formerly incarcerated, informal dialogue, 2026 lingo.
 */
const SCHEDULED_POST_POOL = [
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: 'They got dudes doing 25-to-life in the feds off sentence stacking under 924(c) where a gun was in the trunk and nobody even touched it. Feds will take a 5-year street case and turn it into a football number just to force you to sign a plea. Never let \'em intimidate you into taking time for something you didn\'t do.',
    tags: ['FedSentencing', '924cStacking', 'StandOnBusiness']
  },
  {
    authorUsername: 'sherrellec',
    category: 'investigation',
    content: 'Women doing time is up 500% and 80% of them are mothers who got caught holding a bag or riding in a car with their boyfriend. The feds hit women with conspiracy charges just to make them testify against their man. When a mama goes to prison, the whole family falls apart.',
    tags: ['WomenInside', 'ConspiracyTraps', 'PrisonMamas']
  },
  {
    authorUsername: 'trapgodess',
    category: 'watch',
    content: 'If you ever been in sick call behind bars you know the vibes: you got a 103 fever and throwing up, and the prison nurse look you in the eye and say "Take these two ibuprofen and drink water from the sink." These private medical companies like Wellpath get millions from the state and treat inmates like stray dogs.',
    tags: ['PrisonMedical', 'Wellpath', 'SickCallJokes']
  },
  {
    authorUsername: 'kbaby',
    category: 'mutual_aid',
    content: 'Shoutout to every woman holding down her man, brother, or son behind them walls this weekend. Putting $50 on JPay, paying $25 for a 15-minute phone call, keeping the kids\' spirits up. It\'s thankless, draining work, but you the only reason they keep their sanity. Stay 10 toes down.',
    tags: ['HoldingDownTheCompound', 'FamilyStrong', 'Loyalty']
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'records',
    content: 'Looking at the old 1954 Union cemetery log in the archive. Half the graves don\'t even got a name on the concrete slab, just an inmate number. That\'s how cheap the state viewed human life. We gotta keep saying these names so the record don\'t erase \'em.',
    tags: ['RaifordGraves', 'ForgottenSouls', 'RealHistory']
  },
  {
    authorUsername: 'outeastblu',
    category: 'watch',
    content: 'Tip from a dude who had to fight his own discovery: Always subpoena the 911 CAD dispatch log! Cops will swear in their report they had an "anonymous call about a suspicious male", but when you pull the CAD records, the dispatch call came in 15 minutes AFTER they already had you in handcuffs. Paperwork catches \'em every time.',
    tags: ['CADLogs', 'DiscoveryTricks', 'BeatTheCase']
  },
  {
    authorUsername: 'nothsidedee',
    category: 'legal',
    content: 'Ever notice how every judge and prosecutor went to the same law school and eat lunch together every day? That\'s why they get mad when a defendant wants to go to trial instead of taking their sweet little plea deal. They want an easy 9-to-5 conviction assembly line. Make \'em work for it!',
    tags: ['CourtroomClub', 'NoPleaDeals', 'TrialDay']
  },
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: 'Rule number one of the compound: Never let another inmate read your discovery paperwork unless you know what\'s in it first. And rule number two: If the DA hid evidence that proves you didn\'t do it, that\'s a Brady violation. That\'s how over 40% of brothers on death row got exonerated. Check your Brady material!',
    tags: ['BradyViolation', 'PaperworkRules', 'CompoundWisdom']
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
      // Update bio/now/location to ensure newest authentic persona details are saved
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

  // Clean out older formal/placeholder posts if they exist
  await db.query(`
    DELETE FROM community_posts
    WHERE author_id IN (
      SELECT id FROM community_users WHERE email LIKE '%@carceralcollections.internal'
    ) AND (content LIKE '%prosecutors in federal court try to turn mixtape punchlines into 18 U.S.C.%' OR content LIKE '%Office of the Inspector General (OIG) just published%')
  `);

  for (let i = 0; i < INITIAL_THREADS.length; i++) {
    const thread = INITIAL_THREADS[i];
    const author = users[thread.authorUsername];
    if (!author) continue;

    // Check if post already exists
    const existing = await db.query(
      'SELECT id FROM community_posts WHERE author_id = $1 AND content = $2',
      [author.id, thread.content]
    );

    let postId;
    if (existing.rows.length > 0) {
      postId = existing.rows[0].id;
    } else {
      // Stagger creation dates across the past 48 hours
      const hoursAgo = (INITIAL_THREADS.length - i) * 3;
      const insertPost = await db.query(`
        INSERT INTO community_posts (
          author_id, category, content, tags, pinned, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'published', now() - interval '${hoursAgo} hours', now() - interval '${hoursAgo} hours'
        ) RETURNING id
      `, [
        author.id,
        thread.category,
        thread.content,
        JSON.stringify(thread.tags),
        thread.pinned
      ]);
      postId = insertPost.rows[0].id;
    }

    // Add comments
    if (Array.isArray(thread.comments)) {
      for (let c = 0; c < thread.comments.length; c++) {
        const cm = thread.comments[c];
        const commentAuthor = users[cm.authorUsername];
        if (!commentAuthor) continue;

        const cmExisting = await db.query(
          'SELECT id FROM community_post_comments WHERE post_id = $1 AND author_id = $2 AND content = $3',
          [postId, commentAuthor.id, cm.content]
        );

        if (cmExisting.rows.length === 0) {
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
    }

    // Add reactions from other bots
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
 * Links bots to each other and to the target user (e.g. real user Manibani / Atum)
 */
async function seedNetworkGraph(db, targetUserId = null) {
  const users = await ensureBotUsers(db);
  const userList = Object.values(users);

  // Cross-follow between personas
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

  // If a real target user is provided, link personas as followers & connections
  if (targetUserId) {
    for (const bot of userList) {
      // Bot follows user
      await db.query(`
        INSERT INTO community_follows (follower_id, following_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [bot.id, targetUserId]);

      // User connects back with selected bots
      await db.query(`
        INSERT INTO community_follows (follower_id, following_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [targetUserId, bot.id]);
    }
  }
}

/**
 * Periodic bot activity generator
 * Called on interval (e.g. every 20-30 minutes) to post new content or comment
 */
let scheduledPoolIndex = 0;

async function scheduleBotActivity(db) {
  try {
    const users = await ensureBotUsers(db);
    const nextItem = SCHEDULED_POST_POOL[scheduledPoolIndex % SCHEDULED_POST_POOL.length];
    scheduledPoolIndex++;

    const author = users[nextItem.authorUsername];
    if (!author) return;

    // Check if recently posted this exact content
    const existing = await db.query(
      'SELECT id FROM community_posts WHERE author_id = $1 AND content = $2',
      [author.id, nextItem.content]
    );

    if (existing.rows.length === 0) {
      const res = await db.query(`
        INSERT INTO community_posts (
          author_id, category, content, tags, pinned, status
        ) VALUES (
          $1, $2, $3, $4, false, 'published'
        ) RETURNING id
      `, [
        author.id,
        nextItem.category,
        nextItem.content,
        JSON.stringify(nextItem.tags)
      ]);

      // Add 2 reactions from peer bots
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
  ensureBotUsers,
  seedInitialDiscussions,
  seedNetworkGraph,
  scheduleBotActivity
};
