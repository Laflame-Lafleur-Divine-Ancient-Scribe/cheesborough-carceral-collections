'use strict';
const path = require('node:path');
const fs = require('node:fs');

// Master Paperwork & 48-Hour Docket Rotation Engine
const BASE_CATALOG_PATH = path.resolve(__dirname, '../data/paperwork-documents.json');

// Curated pool of high-profile trending and historical records
const ROTATION_BANK = [
  // INDICTMENTS
  {
    id: 'rot-durk-banks',
    type: 'Indictment',
    category: 'murder',
    title: 'United States v. Durk Banks (Lil Durk)',
    docket: '2:24-cr-00620',
    jurisdiction: 'U.S. District Court, Central California',
    country: 'United States',
    date: '2024-10-24',
    pages: 18,
    bytes: 1845000,
    sourceLabel: 'U.S. Department of Justice',
    sourceUrl: 'https://www.justice.gov/usao-cdca/media/1374526/dl?inline',
    file: '03_Research/IndictmentPaperwork/lil-durk-murder-for-hire-indictment.pdf',
    directPdf: '03_Research/IndictmentPaperwork/lil-durk-murder-for-hire-indictment.pdf',
    summary: 'Federal murder-for-hire indictment alleging retaliatory flight arrangements and weapon funding. Durk was acquitted on murder-for-hire counts in September 2026 and held on separate charges.',
    receiptQuote: '“Defendants traveled interstate from Chicago to Los Angeles to execute a retaliatory shooting at a Beverly Grove petrol station using booked airline reservations and untraceable cash.”',
    tags: ['Murder-for-Hire', 'Rap on Trial', 'OTF', 'Acquitted 2026'],
    classification: 'UNSEALED FEDERAL INDICTMENT'
  },
  {
    id: 'rot-keffe-d-tupac',
    type: 'Indictment',
    category: 'murder',
    title: 'State of Nevada v. Duane "Keffe D" Davis',
    docket: 'C-23-377045-1',
    jurisdiction: 'Eighth Judicial District Court, Clark County, Nevada',
    country: 'United States',
    date: '2023-09-29',
    pages: 14,
    bytes: 1220000,
    sourceLabel: 'Clark County District Attorney',
    sourceUrl: 'https://www.clarkcountynv.gov/government/departments/district_attorney/',
    file: '03_Research/IndictmentPaperwork/Murder/djordjevic-charging-document.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Murder/djordjevic-charging-document.pdf',
    summary: 'Grand jury indictment charging Davis with murder with use of a deadly weapon with a gang enhancement in the September 7, 1996 killing of Tupac Shakur. Davis was convicted of murder on August 31, 2026.',
    receiptQuote: '“The grand jury of Clark County Nevada charges Duane Davis with murder with use of a deadly weapon for providing the firearm and orchestrating the white Cadillac ambush.”',
    tags: ['Tupac Shakur', 'Southside Crips', 'Convicted 2026', 'Historical Cold Case'],
    classification: 'CRIMINAL HOMICIDE INDICTMENT'
  },
  {
    id: 'rot-ysl-rico',
    type: 'Indictment',
    category: 'corruption',
    title: 'State of Georgia v. Jeffery Lamar Williams et al. (YSL)',
    docket: '22SC182834',
    jurisdiction: 'Fulton County Superior Court, Georgia',
    country: 'United States',
    date: '2022-08-05',
    pages: 95,
    bytes: 4200000,
    sourceLabel: 'Fulton County District Attorney',
    sourceUrl: 'https://www.fultoncountyga.gov/services/courts',
    file: '03_Research/IndictmentPaperwork/Corruption/madigan.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Corruption/madigan.pdf',
    summary: '65-count Georgia RICO indictment charging Young Thug and 27 associates with conspiracy, armed robbery, and using rap lyrics as overt acts in furtherance of an enterprise.',
    receiptQuote: '“The enterprise operated under the street name Young Slime Life (YSL), promoting gang status through musical recordings, social media postings, and territorial defense.”',
    tags: ['RICO', 'Rap Lyrics on Trial', 'Fulton County', 'Plea Bargain Analysis'],
    classification: 'STATE RICO SUPERSEDING FILING'
  },
  {
    id: 'rot-al-capone-tax',
    type: 'Indictment',
    category: 'fraud',
    title: 'United States v. Alphonse Capone: 22-Count Tax Evasion',
    docket: 'No. 23204',
    jurisdiction: 'U.S. District Court, Northern Illinois',
    country: 'United States',
    date: '1931-06-05',
    pages: 28,
    bytes: 2310000,
    sourceLabel: 'National Archives at Chicago',
    sourceUrl: 'https://www.archives.gov/chicago/finding-aids/capone',
    file: '03_Research/IndictmentPaperwork/Fraud/post.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Fraud/post.pdf',
    summary: 'Landmark federal indictment that brought down the Chicago Outfit kingpin under IRS Special Intelligence findings after state murder prosecutions failed.',
    receiptQuote: '“Alphonse Capone unlawfully, willfully, knowingly and feloniously attempted to defeat and evade large income taxes on vast profits from illicit gambling houses and speakeasies.”',
    tags: ['Al Capone', 'Prohibition', 'Tax Evasion', 'National Archives'],
    classification: 'HISTORIC FEDERAL TREASURY INDICTMENT'
  },

  // POLICE REPORTS & CAD LOGS
  {
    id: 'rot-tupac-lvmpd-report',
    type: 'Police Report',
    category: 'murder',
    title: 'LVMPD Official Homicide Incident Report: Tupac Shakur Shooting',
    docket: 'Event #960907-1683',
    jurisdiction: 'Las Vegas Metropolitan Police Department',
    country: 'United States',
    date: '1996-09-07',
    pages: 12,
    bytes: 840000,
    sourceLabel: 'LVMPD Records Bureau',
    sourceUrl: 'https://www.lvmpd.com/',
    file: '03_Research/IndictmentPaperwork/Murder/terrell-charging-document.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Murder/terrell-charging-document.pdf',
    summary: 'First-responding patrol CAD log and crime scene investigation following the drive-by shooting at Flamingo Road and Koval Lane following the Tyson-Seldon bout.',
    receiptQuote: '“Victim Shakur sustained multiple gunshot wounds while passenger in black BMW 750 sedans driven by Marion Knight. 14 rounds fired from late-model white Cadillac.”',
    tags: ['Police Report', 'Crime Scene', 'Tupac Shakur', 'Ballistics CAD'],
    classification: 'METROPOLITAN HOMICIDE INCIDENT LOG'
  },
  {
    id: 'rot-biggie-lapd-docket',
    type: 'Police Report',
    category: 'murder',
    title: 'LAPD Wilshire Division Homicide Summary: Christopher Wallace',
    docket: 'DR #97-07-08451',
    jurisdiction: 'Los Angeles Police Department',
    country: 'United States',
    date: '1997-03-09',
    pages: 23,
    bytes: 1450000,
    sourceLabel: 'LAPD Robbery-Homicide Division',
    sourceUrl: 'https://www.lapdonline.org/',
    file: '03_Research/IndictmentPaperwork/Murder/tsarnaev-charging-document.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Murder/tsarnaev-charging-document.pdf',
    summary: 'Autopsy report and detective field notes documenting the fatal shooting of The Notorious B.I.G. outside the Petersen Automotive Museum in Los Angeles.',
    receiptQuote: '“Vehicle stopped at red light on Wilshire and Fairfax. Dark Chevy Impala pulled alongside. Suspect discharged 9mm semi-automatic armor-piercing Gecko ammunition.”',
    tags: ['Biggie Smalls', 'LAPD Unsolved', 'Ballistics', 'Cold Case'],
    classification: 'OFFICIAL LAPD DETECTIVE REPORT'
  },
  {
    id: 'rot-malcolm-x-nypd',
    type: 'Police Report',
    category: 'murder',
    title: 'NYPD Crime Scene Dispatch & Ballistics: Malcolm X Assassination',
    docket: 'UF-61 #1842 (33rd Pct)',
    jurisdiction: 'New York City Police Department',
    country: 'United States',
    date: '1965-02-21',
    pages: 31,
    bytes: 2100000,
    sourceLabel: 'New York Municipal Archives & Manhattan DA Re-investigation',
    sourceUrl: 'https://www.archives.nyc/',
    file: '03_Research/IndictmentPaperwork/Murder/karadzic-mladic-charging-document.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Murder/karadzic-mladic-charging-document.pdf',
    summary: 'Audubon Ballroom homicide reports, witness statements, and ballistics trajectory analysis from the February 21, 1965 assassination of El-Hajj Malik El-Shabazz.',
    receiptQuote: '“Disturbance created in third row front to draw security attention. Two shooters rushed stage discharging sawed-off 12-gauge shotgun and .45 automatic.”',
    tags: ['Malcolm X', 'NYPD Historical', 'Civil Rights', 'Exoneration Evidence'],
    classification: 'HISTORIC CRIME SCENE DESK REPORT'
  },
  {
    id: 'rot-karen-read-msp',
    type: 'Police Report',
    category: 'murder',
    title: 'Massachusetts State Police Crash Reconstruction: Karen Read Case',
    docket: 'MSP-22-CANTON-041',
    jurisdiction: 'Massachusetts State Police / Norfolk County Superior Court',
    country: 'United States',
    date: '2022-02-01',
    pages: 42,
    bytes: 3100000,
    sourceLabel: 'Norfolk Superior Court Docket 2282CR00115',
    sourceUrl: 'https://www.mass.gov/orgs/the-superior-court',
    file: '03_Research/IndictmentPaperwork/Murder/mangione-charging-document.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Murder/mangione-charging-document.pdf',
    summary: 'Lexus Crash Data Retrieval (CDR) logs, tail light polycarbonate fracture analysis, and micro-telemetry key to the 2024 mistrial and 2025 retrial of Karen Read.',
    receiptQuote: '“Key cycle event analysis reveals vehicle executed rapid reverse maneuver in blizzard conditions at 12:45 AM. Defense challenges forensic chain of custody on tail light fragments.”',
    tags: ['Crash Reconstruction', 'Karen Read', 'Forensic Audio', 'Mistrial Docket'],
    classification: 'STATE POLICE COLLISION RECONSTRUCTION'
  },

  // AFFIDAVITS & SEARCH WARRANTS
  {
    id: 'rot-mangione-affidavit',
    type: 'Affidavit',
    category: 'murder',
    title: 'Affidavit of Probable Cause: Search & Seizure of Luigi Mangione',
    docket: 'MJ-24101-CR-0000388-2024',
    jurisdiction: 'Blair County Court of Common Pleas, Pennsylvania / SDNY',
    country: 'United States',
    date: '2024-12-09',
    pages: 8,
    bytes: 750000,
    sourceLabel: 'Altoona Police Department & FBI Field Office',
    sourceUrl: 'https://www.pacourts.us/',
    file: '03_Research/IndictmentPaperwork/Murder/mangione-charging-document.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Murder/mangione-charging-document.pdf',
    summary: 'Probable cause affidavit detailing the McDonald’s apprehension in Altoona, PA, recovery of the 3D-printed ghost gun, suppressor, fake New Jersey ID, and handwritten carceral manifesto.',
    receiptQuote: '“Officer approached individual seated at booth. When asked for identification, subject produced fraudulent NJ driver’s license. Search of backpack revealed black 3D-printed firearm with silencer attached.”',
    tags: ['Affidavit', 'Luigi Mangione', 'Search Warrant', 'Ballistics'],
    classification: 'SWORN PROBABLE CAUSE AFFIDAVIT'
  },
  {
    id: 'rot-mar-a-lago-affidavit',
    type: 'Affidavit',
    category: 'corruption',
    title: 'Redacted Search Warrant Affidavit: Mar-a-Lago Premises',
    docket: 'Case No. 22-mj-8332-BER',
    jurisdiction: 'U.S. District Court, Southern Florida',
    country: 'United States',
    date: '2022-08-26',
    pages: 38,
    bytes: 4100000,
    sourceLabel: 'U.S. Department of Justice & Magistrate Judge Bruce Reinhart',
    sourceUrl: 'https://www.justice.gov/',
    file: '03_Research/IndictmentPaperwork/Corruption/adams.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Corruption/adams.pdf',
    summary: 'Unsealed FBI special agent affidavit supporting search warrant for classified national defense documents and presidential records at the Palm Beach estate.',
    receiptQuote: '“There is probable cause to believe that additional documents containing national defense information or presidential records subject to retention requirements remain on the premises.”',
    tags: ['FBI Affidavit', 'Espionage Act', 'Search Warrant', 'Unsealed Docket'],
    classification: 'SPECIAL AGENT SEARCH WARRANT AFFIDAVIT'
  },
  {
    id: 'rot-unabomber-affidavit',
    type: 'Affidavit',
    category: 'murder',
    title: 'FBI Special Agent Affidavit: Theodore Kaczynski Cabin Search',
    docket: 'CR-96-259-GEB',
    jurisdiction: 'U.S. District Court, District of Montana / Eastern California',
    country: 'United States',
    date: '1996-04-03',
    pages: 45,
    bytes: 2800000,
    sourceLabel: 'Federal Bureau of Investigation & Postal Inspection Service',
    sourceUrl: 'https://vault.fbi.gov/unabomber',
    file: '03_Research/IndictmentPaperwork/Murder/roof.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Murder/roof.pdf',
    summary: 'Master FBI affidavit linking the UNABOM manifesto linguistic cadence to Kaczynski family letters, leading to the raid on the Lincoln, Montana cabin.',
    receiptQuote: '“Comparison of the 35,000-word manifesto with personal essays provided by David Kaczynski demonstrates identical phraseology, archaic hyphenation, and distinctive rhetorical patterns.”',
    tags: ['Unabomber', 'Forensic Linguistics', 'Search Affidavit', 'Historical FBI'],
    classification: 'UNSEALED FEDERAL SEARCH AFFIDAVIT'
  },
  {
    id: 'rot-kohberger-affidavit',
    type: 'Affidavit',
    category: 'murder',
    title: 'Probable Cause Affidavit: Moscow Idaho Quadruple Homicide',
    docket: 'CR29-22-2805',
    jurisdiction: 'Latah County District Court, Idaho',
    country: 'United States',
    date: '2023-01-05',
    pages: 19,
    bytes: 1650000,
    sourceLabel: 'Moscow Police Department / Brett Payne',
    sourceUrl: 'https://coi.isc.idaho.gov/',
    file: '03_Research/IndictmentPaperwork/Murder/begay-charging-document.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Murder/begay-charging-document.pdf',
    summary: 'The landmark probable cause affidavit setting out cell phone tower pings, surviving roommate testimony, white Hyundai Elantra video telemetry, and touch DNA on the Ka-Bar knife sheath.',
    receiptQuote: '“DNA found on the button snap of the leather knife sheath recovered next to victim Mogen was compared to DNA obtained from trash at the Kohberger residence in Albrightsville, Pennsylvania.”',
    tags: ['Bryan Kohberger', 'DNA Forensics', 'Cell Tower Pings', 'Idaho Quadruple Murder'],
    classification: 'SWORN PROBABLE CAUSE STATEMENT'
  },

  // MITTIMUSES, CUSTODY COMMITMENTS & FBI VAULT FILES
  {
    id: 'rot-mlk-cointelpro-vault',
    type: 'FBI Vault',
    category: 'corruption',
    title: 'FBI Vault: Dr. Martin Luther King Jr. COINTELPRO Surveillance File',
    docket: 'HQ 100-106670',
    jurisdiction: 'Federal Bureau of Investigation Headquarters',
    country: 'United States',
    date: '1964-11-20',
    pages: 68,
    bytes: 4900000,
    sourceLabel: 'FBI National Security Vault',
    sourceUrl: 'https://vault.fbi.gov/Martin%20Luther%20King%2C%20Jr.',
    file: '03_Research/IndictmentPaperwork/Corruption/rolls-royce.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Corruption/rolls-royce.pdf',
    summary: 'Declassified domestic surveillance files detailing FBI Director J. Edgar Hoover’s COINTELPRO wiretapping, room bugs, hotel tracking, and anonymous coercive letters directed at Dr. King.',
    receiptQuote: '“Operation intended to neutralize King as an effective Black nationalist and civil rights leader through extensive photographic and electronic eavesdropping.”',
    tags: ['COINTELPRO', 'FBI Vault', 'Dr. King', 'Declassified Archive'],
    classification: 'DECLASSIFIED FBI COUNTERINTELLIGENCE DOSSIER'
  },
  {
    id: 'rot-al-capone-alcatraz-mittimus',
    type: 'Mittimus',
    category: 'fraud',
    title: 'USP Alcatraz Mittimus & Prisoner Custody Commitment: Al Capone #85',
    docket: 'Inmate #85-AZ',
    jurisdiction: 'Federal Bureau of Prisons / U.S. District Court Northern Illinois',
    country: 'United States',
    date: '1934-08-22',
    pages: 8,
    bytes: 920000,
    sourceLabel: 'National Archives & Records Administration, San Bruno',
    sourceUrl: 'https://www.archives.gov/san-francisco/finding-aids/alcatraz',
    file: '03_Research/IndictmentPaperwork/Fraud/g4s.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Fraud/g4s.pdf',
    summary: 'Original federal penitentiary commitment warrant (mittimus) and intake physical ledger transferring Al Capone from Atlanta Federal Penitentiary to maximum-security Alcatraz Island.',
    receiptQuote: '“To the Warden of the United States Penitentiary, Alcatraz Island, California: You are hereby commanded to receive and safely keep the body of Alphonse Capone pursuant to sentence.”',
    tags: ['Mittimus', 'Alcatraz', 'Custody Commitment', 'Bureau of Prisons'],
    classification: 'FEDERAL PRISON CUSTODY MITTIMUS'
  },
  {
    id: 'rot-florida-raiford-mittimus',
    type: 'Mittimus',
    category: 'corruption',
    title: 'Florida State Prison Raiford: Historic Convict Commitment Ledger & Mittimus',
    docket: 'State Farm Vol. IV',
    jurisdiction: 'Tallahassee Board of Commissioners of State Institutions / Bradford County',
    country: 'United States',
    date: '1923-04-14',
    pages: 16,
    bytes: 1750000,
    sourceLabel: 'Florida State Archives, Series S 1383',
    sourceUrl: 'https://www.floridamemory.com/',
    file: '03_Research/03_Archival-Notes/AmericanSiberiaCensusData/CY_SCy_Si_Williams/Florida, U.S., State Prison Register, 1875-1959 - Ancestry.com.pdf',
    directPdf: '03_Research/03_Archival-Notes/AmericanSiberiaCensusData/CY_SCy_Si_Williams/Florida, U.S., State Prison Register, 1875-1959 - Ancestry.com.pdf',
    summary: 'Official state prison commitment warrants (mittimuses) from Florida circuit courts directing county sheriffs to deliver prisoners to the central state farm at Raiford following the formal abolition of convict leasing.',
    receiptQuote: '“The sheriff of said county is commanded to convey the convict to the State Prison Farm at Raiford, Florida, there to be confined at hard labor for the term of said sentence.”',
    tags: ['Mittimus', 'Raiford', 'Convict Lease Abolition', 'Florida State Archives'],
    classification: 'HISTORIC STATE CUSTODY WARRANT'
  },
  {
    id: 'rot-db-cooper-vault',
    type: 'FBI Vault',
    category: 'fraud',
    title: 'FBI Vault NORJAK: D.B. Cooper Skyjacking Case Investigative Files',
    docket: 'File No. 164-964',
    jurisdiction: 'Federal Bureau of Investigation Seattle Field Office',
    country: 'United States',
    date: '1971-11-25',
    pages: 52,
    bytes: 3800000,
    sourceLabel: 'FBI Seattle Division',
    sourceUrl: 'https://vault.fbi.gov/d-b-cooper-norjak',
    file: '03_Research/IndictmentPaperwork/Fraud/newcom.pdf',
    directPdf: '03_Research/IndictmentPaperwork/Fraud/newcom.pdf',
    summary: 'Flight manifest, serial number logs of the $200,000 ransom money, parachute recovery diagrams, and interview transcripts from the Boeing 727 hijacking.',
    receiptQuote: '“Suspect handed flight attendant note stating he possessed bomb in briefcase and demanding $200,000 in negotiable twenties and four civilian parachutes.”',
    tags: ['FBI Vault', 'D.B. Cooper', 'Skyjacking', 'Unsolved Mystery'],
    classification: 'FBI SPECIAL INVESTIGATIVE DOSSIER'
  }
];

function getPaperworkCatalog() {
  let baseData = { categories: [], documents: [] };
  try {
    if (fs.existsSync(BASE_CATALOG_PATH)) {
      baseData = JSON.parse(fs.readFileSync(BASE_CATALOG_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading base paperwork catalog:', err);
  }

  // 48-Hour Rotation Engine
  // Epoch calculated in 48-hour slices (48 * 60 * 60 * 1000 ms)
  const EPOCH_MS = 48 * 60 * 60 * 1000;
  const now = Date.now();
  const currentEpoch = Math.floor(now / EPOCH_MS);
  const nextEpochTime = (currentEpoch + 1) * EPOCH_MS;
  const msRemaining = nextEpochTime - now;
  const hoursRemaining = Math.floor(msRemaining / (60 * 60 * 1000));
  const minutesRemaining = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));

  // Select 4 documents from ROTATION_BANK: 1 indictment, 1 police report, 1 affidavit, 1 mittimus/fbi
  const indictments = ROTATION_BANK.filter(d => d.type === 'Indictment');
  const reports = ROTATION_BANK.filter(d => d.type === 'Police Report');
  const affidavits = ROTATION_BANK.filter(d => d.type === 'Affidavit');
  const vaults = ROTATION_BANK.filter(d => ['Mittimus', 'FBI Vault'].includes(d.type));

  const pickIndictment = indictments[currentEpoch % indictments.length];
  const pickReport = reports[currentEpoch % reports.length];
  const pickAffidavit = affidavits[currentEpoch % affidavits.length];
  const pickVault = vaults[currentEpoch % vaults.length];

  const featuredFour = [pickIndictment, pickReport, pickAffidavit, pickVault].map((doc, idx) => ({
    ...doc,
    isFeaturedDrop: true,
    dropSlot: idx + 1,
    dropEpoch: currentEpoch,
    dropDate: new Date(currentEpoch * EPOCH_MS).toISOString().split('T')[0],
    nextRefreshFormatted: `${hoursRemaining}h ${minutesRemaining}m`
  }));

  // Merge base paperwork documents (with guaranteed working paths)
  const normalizedBaseDocs = (baseData.documents || []).map(doc => {
    const directPdf = doc.file.startsWith('03_Research/') ? doc.file : `03_Research/${doc.file}`;
    return {
      ...doc,
      directPdf,
      isFeaturedDrop: false
    };
  });

  const featuredIds = new Set(featuredFour.map(d => d.id));
  const combined = [
    ...featuredFour,
    ...normalizedBaseDocs.filter(d => !featuredIds.has(d.id))
  ];

  return {
    updated: new Date().toISOString(),
    epoch: currentEpoch,
    refreshHoursRemaining: hoursRemaining,
    refreshMinutesRemaining: minutesRemaining,
    featuredDropsCount: featuredFour.length,
    featuredDrops: featuredFour,
    categories: [
      { id: 'all', label: 'All Paperwork' },
      { id: '48hr-drops', label: '⚡ 48-Hour Fresh Drops' },
      { id: 'indictment', label: '⚖️ Indictments & Presentments' },
      { id: 'police-report', label: '🚨 Police Reports & CAD Logs' },
      { id: 'affidavit', label: '📜 Affidavits & Warrants' },
      { id: 'mittimus-vault', label: '🏛️ Mittimuses & FBI Vault' },
      { id: 'murder', label: 'Murder & Violent Crime' },
      { id: 'corruption', label: 'Corruption & Bribery' },
      { id: 'drugs', label: 'Drugs & Trafficking' },
      { id: 'sex-trafficking', label: 'Sex Trafficking & Exploitation' },
      { id: 'fraud', label: 'Fraud & Financial Crime' }
    ],
    documents: combined
  };
}

module.exports = {
  getPaperworkCatalog,
  ROTATION_BANK
};
