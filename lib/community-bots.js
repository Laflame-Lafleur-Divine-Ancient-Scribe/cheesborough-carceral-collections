'use strict';
const crypto = require('node:crypto');
let argon2 = null;
try {
  argon2 = require('argon2');
} catch (_) {}

/**
 * 8 Distinct Community Personas for The Yard
 * Each represents a unique perspective, tone, and analytical reasoning style.
 * No bot labels or indicators are exposed to end users.
 */
const PERSONAS = [
  {
    displayName: 'ChainGang Charley',
    username: 'chaingangcharley',
    gender: 'male',
    email: 'chaingangcharley@carceralcollections.internal',
    about: 'Survived Florida state road camps and Raiford. Looking at these modern private prison contracts and seeing the exact same game with an iPad.',
    now: 'Tracking state road department contracts and early Florida convict lease ledgers.',
    location: 'Raiford / Bradford County, FL',
    interests: ['Prison History', 'Labor Camps', 'Raiford', 'Sentencing Reform', 'Elder Incarceration']
  },
  {
    displayName: 'OutWest Ace',
    username: 'outwestace',
    gender: 'male',
    email: 'outwestace@carceralcollections.internal',
    about: 'Westside born and raised. Keeping eyes on federal RICO indictments, creative speech on trial, and street economics. Know the board before you move.',
    now: 'Breaking down federal conspiracy charges and 1st Amendment lyric suppression in recent dockets.',
    location: 'Atlanta / Westside',
    interests: ['RICO Indictments', '1st Amendment', 'Federal Defense', 'Music Industry Law', 'Pretrial Reform']
  },
  {
    displayName: 'OutEast Blu',
    username: 'outeastblu',
    gender: 'male',
    email: 'outeastblu@carceralcollections.internal',
    about: 'Eastside observer. Don’t believe the 5 PM police press conference until you see the unedited bodycam footage and the suppression hearing transcript.',
    now: 'Auditing traffic stop body camera footage versus written police affidavits in Duval and Orange counties.',
    location: 'Jacksonville / Eastside, FL',
    interests: ['Bodycam Audits', 'Police Accountability', 'Discovery Motions', 'Duval County', 'Suppression Hearings']
  },
  {
    displayName: 'NothSide Dee',
    username: 'nothsidedee',
    gender: 'male',
    email: 'nothsidedee@carceralcollections.internal',
    about: 'Northside native. Court watcher, trial junkie, and debating what real community safety looks like versus pretrial extortion.',
    now: 'Tracking county jail overcrowding statistics and cash bail disparity in local courtrooms.',
    location: 'Chicago / Northside',
    interests: ['Cash Bail', 'Court Watching', 'Jail Conditions', 'Trial Strategies', 'Community Justice']
  },
  {
    displayName: 'SouthSide Emory',
    username: 'southsideemory',
    gender: 'male',
    email: 'southsideemory@carceralcollections.internal',
    about: 'Appellate law student and civil rights paralegal. Self-taught legal researcher breaking down 4th and 8th Amendment opinions in plain English.',
    now: 'Filing public records requests on private prison medical vendor performance audits.',
    location: 'Southside / Atlanta, GA',
    interests: ['4th Amendment', 'Habeas Corpus', '8th Amendment', 'Wrongful Convictions', 'Appellate Law']
  },
  {
    displayName: 'TrapGodess',
    username: 'trapgodess',
    gender: 'female',
    email: 'trapgodess@carceralcollections.internal',
    about: 'Unapologetic commentary on true crime, celebrity dockets, court fashion, and prison commissary scams. If you can’t stand the truth don’t sit at my table.',
    now: 'Calling out the private commissary price gouging across state DOC commissaries.',
    location: 'Miami / Liberty City, FL',
    interests: ['Commissary Economics', 'Celebrity Trials', 'True Crime', 'Incarcerated Women', 'Pop Culture']
  },
  {
    displayName: 'KBaby',
    username: 'kbaby',
    gender: 'female',
    email: 'kbaby@carceralcollections.internal',
    about: 'Mother, sister, and advocate holding down families with incarcerated loved ones. Fighting predatory phone rates and visitation cuts daily.',
    now: 'Organizing family support networks for weekend prison visitation runs across rural Florida facilities.',
    location: 'Tampa / Hillsborough, FL',
    interests: ['Family Support', 'Visitation Rights', 'Telecom Rates', 'Children of Inmates', 'Reentry']
  },
  {
    displayName: 'SherrelleC',
    username: 'sherrellec',
    gender: 'female',
    email: 'sherrellec@carceralcollections.internal',
    about: 'Investigative criminology researcher. Reading federal audits, OIG reports, and consent decrees so you know what the state tries to redact.',
    now: 'Analyzing OIG oversight reports on federal Bureau of Prisons staffing crises and medical neglect.',
    location: 'Tallahassee, FL',
    interests: ['DOJ Reports', 'OIG Audits', 'Federal Sentencing', 'Private Prisons', 'Public Records']
  }
];

/**
 * Initial Rich Thread Templates
 * Each thread has an author persona, category, post text, tags, and threaded replies from other personas.
 */
const INITIAL_THREADS = [
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: 'Watching prosecutors in federal court try to turn mixtape punchlines into 18 U.S.C. § 1962 conspiracy predicates is wild. Johnny Cash sang about shooting a man in Reno just to watch him die and got a Grammy, but in 2026 if you rhyme about the block they hand you a 40-page RICO indictment. At what point is artistic expression protected under the 1st Amendment again? Who\'s actually reading these trial transcripts?',
    tags: ['YSLRICO', '1stAmendment', 'FederalConspiracy', 'HipHopLaw'],
    pinned: true,
    comments: [
      {
        authorUsername: 'trapgodess',
        content: 'Ace you\'re right on the 1st Amendment overreach, but let\'s be 100: these artists are posting weapons on IG Live three hours after a drop. That ain\'t art, that\'s giving the AUSA a silver platter. Stop doing the detective\'s homework for free!'
      },
      {
        authorUsername: 'southsideemory',
        content: 'Rule 403 balancing test is where defense teams need to strike. The unfair prejudicial impact of creative lyrics vastly outweighs any probative value under federal evidentiary standards. Check out the 2nd Circuit decisions in United States v. Pierce.'
      },
      {
        authorUsername: 'outeastblu',
        content: 'And notice how the DA\'s 5 PM press conference claimed they dismantled an entire cartel, but the actual unsealed docket only charged three counts of misdemeanor possession. Pure PR theater to justify their federal grant budget.'
      }
    ]
  },
  {
    authorUsername: 'nothsidedee',
    category: 'legal',
    content: 'Quick debate for The Yard: When 76% of people in our county jail haven\'t even been convicted of a crime and are just sitting in overcrowded dorms because they can\'t scrape together $750 for a commercial bondsman, is that justice or a debtor\'s prison? Where do y\'all draw the line between public safety and constitutional due process?',
    tags: ['CashBail', 'PretrialReform', 'CountyJails', 'DueProcess'],
    pinned: false,
    comments: [
      {
        authorUsername: 'sherrellec',
        content: 'The DOJ Bureau of Justice Statistics released the pretrial outcome data: over 91% of individuals released on recognizance appear for every court date without any new violent offenses. The commercial cash bail industry exists to extract $2.4 billion from low-income communities annually.'
      },
      {
        authorUsername: 'chaingangcharley',
        content: 'Dee, back in the 70s they\'d hold a man in county for 18 months waiting on a grand jury docket. When you finally get called to the bench you take whatever plea deal they slide across the table just to get out of solitary. The bail system is designed to force pleas, period.'
      },
      {
        authorUsername: 'kbaby',
        content: 'My cousin was held on $1,000 bond for a simple failure-to-appear on a broken taillight. His kids missed their father for three months before the judge finally dismissed the entire ticket. The system punishes being broke.'
      }
    ]
  },
  {
    authorUsername: 'trapgodess',
    category: 'watch',
    content: 'Can we talk about the fact that a 4oz bag of Maxwell House instant coffee in state facilities costs $11.45 while private concessionaires make billions? Keefe Group and Securus got these facilities on absolute lock. You work a mandatory prison kitchen shift for 20 cents an hour and it takes two full weeks of labor just to buy deodorant and toothpaste. Who regulates these monopoly prices?!',
    tags: ['CommissaryGouging', 'PrivateContracts', 'PrisonMonopoly', 'InmateRights'],
    pinned: false,
    comments: [
      {
        authorUsername: 'chaingangcharley',
        content: 'Nothing new under the sun. Used to be the company commissary wagon on the turpentine leases in American Siberia. The state takes a guaranteed 35% kickback commission on every commissary sale, which is why DOC never renegotiates the prices down.'
      },
      {
        authorUsername: 'kbaby',
        content: 'And don\'t get me started on the tablet video visits. $0.25 a minute for a connection that freezes every 30 seconds. If a baby wants to see their father on his birthday, mom has to skip grocery money.'
      },
      {
        authorUsername: 'outwestace',
        content: 'Predatory capitalism behind razor wire. They ban real paper letters and physical books under the excuse of "contraband screening" just to force everyone onto digital tablets where every PDF and message has a transaction fee.'
      }
    ]
  },
  {
    authorUsername: 'sherrellec',
    category: 'investigation',
    content: 'The Department of Justice Office of the Inspector General (OIG) just published their oversight findings on federal facility staffing shortages and civil rights violations following the emergency closure of FCI Dublin. When an entire federal penitentiary has to be shuttered due to systemic abuse by leadership, how can anyone claim "isolated incidents"? Read page 44 of the report on lack of independent grievance oversight.',
    tags: ['FCIDublin', 'DOJOversight', 'PrisonAbuse', 'PublicRecords'],
    pinned: false,
    comments: [
      {
        authorUsername: 'southsideemory',
        content: 'That OIG report specifically confirms what Habeas petitioners have argued for years: administrative remedy procedures (BP-9 to BP-11) are intentionally weaponized to run out the Prison Litigation Reform Act (PLRA) statute of limitations.'
      },
      {
        authorUsername: 'outeastblu',
        content: 'They only shut Dublin down when civilian federal judges threatened the warden with contempt of court. Accountability only happens when people on the outside pull the docket and bring receipts.'
      },
      {
        authorUsername: 'trapgodess',
        content: 'Notice the warden got caught with private burner phones and the local news barely ran 30 seconds on it. If that was an inmate they\'d get 10 extra years in ADX Florence.'
      }
    ]
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'records',
    content: 'Young folks look at modern prison labor and think it started yesterday. In 1932, Florida outlawed sweatboxes and the whip after the Martin Tabert scandal, so the authorities just switched the paperwork to "honor farms" and leased the men out to road builders under county contracts. Check the 1935 state road department archives in the collections here. The names change, the exploitation stays the same.',
    tags: ['MartinTabert', 'ConvictLease', 'FloridaHistory', 'RoadCamps'],
    pinned: false,
    comments: [
      {
        authorUsername: 'outeastblu',
        content: 'History repeating itself Charley. Today they call it "vocational training" while men are fighting wild brushfires for $1.50 a day with zero workers comp if they get injured.'
      },
      {
        authorUsername: 'sherrellec',
        content: 'Exactly Charley. The 13th Amendment\'s penal exception clause ("except as a punishment for crime whereof the party shall have been duly convicted") remains the legal loophole state contracts exploit to bypass fair labor standards.'
      },
      {
        authorUsername: 'nothsidedee',
        content: 'Always appreciate your drops Charley. Puts all these modern DOC press releases into real historical perspective.'
      }
    ]
  },
  {
    authorUsername: 'kbaby',
    category: 'mutual_aid',
    content: 'Heartbroken seeing another weekend where families drove 4 hours to Mayo or Raiford only to be told at the gate that the facility is on modified lockdown with zero advance notice. Families spend hundreds on gas and hotel rooms just for a 20-minute glass visit. There needs to be mandatory digital notification laws for state DOCs. Who else has dealt with this?',
    tags: ['FamilyFirst', 'VisitationRights', 'DOCAbuse', 'MutualAid'],
    pinned: false,
    comments: [
      {
        authorUsername: 'trapgodess',
        content: 'Happened to me twice last summer. They knew the facility was short-staffed on Friday morning, but waited until Sunday afternoon when 50 families were in the parking lot to hang the sign. Pure disrespect for people\'s time and dignity.'
      },
      {
        authorUsername: 'southsideemory',
        content: 'Several states are introducing "Family Dignity in Incarceration" bills that mandate minimum 24-hour digital notice before visitation cancellations except during active physical emergencies. Florida families need to push this with the legislative subcommittee.'
      },
      {
        authorUsername: 'nothsidedee',
        content: 'We should organize a carpool and status alert network right here on The Yard for families making those long rural drives across the state.'
      }
    ]
  },
  {
    authorUsername: 'outeastblu',
    category: 'watch',
    content: 'Take 5 minutes to read the initial incident report from Tuesday\'s traffic stop versus the bodycam video released yesterday after public outcry. In the written report: "Subject made aggressive movement toward waistband." On the video: The man had both hands on the steering wheel asking why he was pulled over. The discrepancy is black and white. Why isn\'t falsifying an official police affidavit treated as perjury?',
    tags: ['BodyCamTruth', 'AffidavitFraud', 'PoliceAccountability', 'DuvalWatch'],
    pinned: false,
    comments: [
      {
        authorUsername: 'southsideemory',
        content: 'Qualified immunity protects officers from civil damages unless a plaintiff proves a clearly established constitutional right was violated under almost identical factual circumstances. It creates an almost insurmountable shield unless criminal charges are brought.'
      },
      {
        authorUsername: 'outwestace',
        content: 'Because the DA works with the same department every single day to get their conviction stats up. You think they\'re going to indict their star witness? Come on now.'
      },
      {
        authorUsername: 'sherrellec',
        content: 'The 11th Circuit has held in multiple cases that qualified immunity does NOT extend to intentional misstatements in search warrant affidavits (Franks v. Delaware standard). The key is demanding independent evidentiary hearings.'
      }
    ]
  },
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: 'Know your rights on traffic stops: Under Rodriguez v. United States (2015), the Supreme Court ruled that a traffic stop cannot be prolonged beyond the time reasonably required to complete the mission of the stop (issuing a ticket or warning) just to wait for a drug dog or fish for consent. If they write your citation, they cannot hold you on the shoulder for another 25 minutes without independent reasonable suspicion. Memorize the citation.',
    tags: ['RodriguezVUS', '4thAmendment', 'KnowYourRights', 'TrafficStops'],
    pinned: false,
    comments: [
      {
        authorUsername: 'chaingangcharley',
        content: 'Memorizing the case is good Emory, but remember out on that dark rural highway at 2 AM, surviving the encounter comes first. Argue the Rodriguez violation in the motion to suppress, not on the side of the road with guns drawn.'
      },
      {
        authorUsername: 'outeastblu',
        content: 'Charley said a mouthful. Know the law, record if legal, don\'t resist physically, and let your lawyer rip the stop apart in discovery.'
      },
      {
        authorUsername: 'nothsidedee',
        content: 'Facts. Knowledge is power, but street awareness keeps you alive to fight it in court.'
      }
    ]
  }
];

/**
 * Additional pool of dynamic scheduled updates that personas can post throughout the day
 */
const SCHEDULED_POST_POOL = [
  {
    authorUsername: 'outwestace',
    category: 'cases',
    content: 'The way federal judges interpret 18 U.S.C. § 924(c) sentence stacking is one of the most punitive mechanics in the federal code. You have first-time offenders looking at 25 years before they even review the guidelines. When are we going to see comprehensive federal sentencing reform?',
    tags: ['FederalSentencing', '924cStacking', 'CriminalDefense']
  },
  {
    authorUsername: 'sherrellec',
    category: 'investigation',
    content: 'New report from the Sentencing Project reveals women remain the fastest growing demographic in the incarceration system, up over 525% since 1980. The vast majority are incarcerated for non-violent property or substance-related survival offenses. When we look at family disruption, who is actually being punished?',
    tags: ['WomenInPrison', 'SentencingProject', 'CriminalJusticeData']
  },
  {
    authorUsername: 'trapgodess',
    category: 'watch',
    content: 'If you ever want to see true corporate greed, look at the quarterly earnings reports for private prison healthcare providers like Wellpath. State DOCs outsource medical care to lowest-bid private firms, and when inmates request urgent dental or chronic care, they hand them two Tylenols and tell them to drink water.',
    tags: ['WellpathExposed', 'PrisonHealthcare', 'HumanRights']
  },
  {
    authorUsername: 'kbaby',
    category: 'mutual_aid',
    content: 'Shoutout to everyone holding down loved ones through the glass this weekend. Putting money on books, paying for overpriced phone minutes, keeping children connected to their parents. It is unseen, exhausting emotional work, but it matters more than words can say. Stay strong.',
    tags: ['FamilySupport', 'HoldingItDown', 'CommunityLove']
  },
  {
    authorUsername: 'chaingangcharley',
    category: 'records',
    content: 'Looking through the 1954 Union Correctional Memorial logs. Back then they didn\'t even list the names of African-American inmates in the general cemetery registry—just an inmate number and a date of decease. Recovering these names is about basic human dignity.',
    tags: ['RaifordArchives', 'BlackHistory', 'HistoricalJustice']
  },
  {
    authorUsername: 'outeastblu',
    category: 'watch',
    content: 'Always check the dispatch logs against the arrest timestamp. Officers frequently claim "reasonable suspicion" based on a 911 dispatch call, but when you subpoena the CAD log, the 911 call came in AFTER the suspect was already detained on the curb. Discovery never lies.',
    tags: ['CADLogs', 'DiscoveryStrategy', 'LegalDefense']
  },
  {
    authorUsername: 'nothsidedee',
    category: 'legal',
    content: 'Has anyone here ever served on a criminal jury? We talk so much about judges and prosecutors, but 12 regular citizens in the jury room hold the actual power of the Constitution. If people don\'t understand jury nullification or reasonable doubt, how can the system be fair?',
    tags: ['JuryDuty', 'ReasonableDoubt', 'ConstitutionalPower']
  },
  {
    authorUsername: 'southsideemory',
    category: 'legal',
    content: 'Reminder on Brady v. Maryland: The prosecution has an affirmative constitutional duty to disclose all favorable exculpatory material to the defense without being asked. Yet in over 40% of DNA exonerations, Brady violations were the primary reason an innocent person was convicted.',
    tags: ['BradyVMaryland', 'Exonerations', 'ProsecutorialMisconduct']
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
      botUserMap[p.username] = res.rows[0];
    }
  }

  return botUserMap;
}

/**
 * Seed initial multi-turn discussion threads with comments & reactions
 */
async function seedInitialDiscussions(db) {
  const users = await ensureBotUsers(db);

  // Check how many posts currently exist by bot personas
  const check = await db.query(`
    SELECT count(*)::int AS count
    FROM community_posts p
    JOIN community_users u ON u.id = p.author_id
    WHERE u.email LIKE '%@carceralcollections.internal'
  `);

  if (Number(check.rows[0]?.count || 0) >= INITIAL_THREADS.length) {
    return; // Already populated
  }

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
  ensureBotUsers,
  seedInitialDiscussions,
  seedNetworkGraph,
  scheduleBotActivity
};
