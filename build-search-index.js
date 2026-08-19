const fs = require('fs');

const SEARCH_INDEX = [
  // 1. RESEARCH BRIEFS & CASE STUDIES
  {
    id: "brief-dozier",
    title: "The Arthur G. Dozier School for Boys: A History of Institutional Terror, Forensic Excavation, and Historical Reckoning",
    url: "DOZIER-RESEARCH.html",
    category: "Research Brief",
    badge: "Research Brief",
    icon: "📖",
    date: "1900–2016",
    author: "Cheesborough Research Desk",
    description: "Comprehensive historical and forensic investigation into the Arthur G. Dozier School for Boys in Marianna, Florida. Details the White House beatings, USF forensic exhumations at Boot Hill, the 1914 fire, racialized labor regimes, Tampa Bay Times findings, and state apology.",
    tags: ["Dozier", "Arthur G. Dozier School for Boys", "Marianna", "USF Investigation", "White House Boys", "Boot Hill Cemetery", "The Nickel Boys", "Colson Whitehead", "Tampa Bay Times", "1914 Fire", "Juvenile Justice", "Institutional Violence", "Forensic Findings", "Florida Reform Schools"],
    keywords: ["dozier", "dozier school", "arthur g dozier", "marianna", "florida industrial school for boys", "usf", "erin kimmerle", "white house boys", "boot hill", "cemetery", "graves", "reform school", "reformatory", "juvenile detention", "abuse", "deaths", "visiting committee", "corporal punishment", "florida", "burial records", "handbook 1958", "1969 report", "jackson county", "the nickel boys", "colson whitehead", "for their own good", "tampa bay times", "1914 fire"],
    actionLabel: "Read Research Brief →"
  },
  {
    id: "brief-newberry-ferguson",
    title: "The Newberry Six, Fortune Ferguson, and the Political Climate of Alachua County, Florida",
    url: "CENSUS-AND-CAMP.html",
    category: "Research Brief",
    badge: "Research Brief",
    icon: "📖",
    date: "1916–1927",
    author: "Cheesborough Research Desk",
    description: "Deep archival study connecting the August 1916 Newberry lynching of six Black residents with the 1927 electrocution of Fortune Ferguson Jr., illustrating systemic racial terror and carceral power in Alachua County, Florida.",
    tags: ["Newberry Six", "Fortune Ferguson", "Alachua County", "1916 Lynching", "Boisey Long", "George Wynne", "Bert Dennis", "Mary Dennis", "Stella Young", "Andrew McHenry", "Joshua Baskin", "Abraham Wilson", "Electric Chair", "Racial Terror"],
    keywords: ["newberry", "newberry six", "fortune ferguson", "alachua county", "boisey long", "lynching", "1916", "racial violence", "gainesville", "newberry florida", "electric chair", "capital punishment", "jim crow", "racial terror", "george wynne", "bert dennis", "mary dennis", "stella young", "andrew mchenry", "joshua baskin", "abraham wilson", "florida history"],
    actionLabel: "Read Research Brief →"
  },
  {
    id: "brief-fortune-ferguson",
    title: "Fortune Ferguson Jr. and the Record of Racialized Punishment",
    url: "FORTUNE-FERGUSON-RESEARCH.html",
    category: "Research Brief",
    badge: "Research Brief",
    icon: "📖",
    date: "1923–1927",
    author: "Cheesborough Research Desk",
    description: "Archival research brief examining Fortune Ferguson Jr., executed by electric chair in 1927 at age 18. Details trial irregularities, racial dynamics in Alachua County, prison registers, and Brandon Jett's scholarship.",
    tags: ["Fortune Ferguson Jr.", "Alachua County", "Florida Death Penalty", "Electric Chair", "Racialized Punishment", "Brandon Jett", "Juvenile Execution", "State Prison Register", "Capital Punishment"],
    keywords: ["fortune ferguson", "ferguson jr", "alachua county", "electric chair", "death penalty", "juvenile execution", "brandon jett", "1927", "execution", "state prison register", "capital punishment", "racialized justice", "gainesville", "raiford"],
    actionLabel: "Read Research Brief →"
  }
];
SEARCH_INDEX.push(
  {
    id: "brief-florida-prison",
    title: "The Prison System Florida Called Progress (Convict Lease History)",
    url: "FLORIDA-PRISON-SYSTEM.html",
    category: "Research Brief",
    badge: "Research Brief",
    icon: "📖",
    date: "1877–1923",
    author: "Cheesborough Research Desk",
    description: "Investigation into the Florida convict leasing era, naval stores, turpentine camps, Chattahoochee penitentiary, and the commodification of incarcerated labor across the post-Reconstruction South.",
    tags: ["Florida Prison System", "Convict Leasing", "American Siberia", "J.C. Powell", "Prison Labor", "Turpentine Camps", "Chattahoochee", "Raiford", "Penal History", "Forced Labor"],
    keywords: ["florida prison system", "convict leasing", "american siberia", "j c powell", "prison labor", "camp administration", "state penal history", "naval stores", "turpentine camps", "chattahoochee", "raiford", "forced labor", "chain gang", "labor camps"],
    actionLabel: "Read Research Brief →"
  },
  {
    id: "brief-powell-siberia",
    title: "The Insider's Ghost: J. C. Powell's The American Siberia",
    url: "POWELL-AMERICAN-SIBERIA.html",
    category: "Research Brief",
    badge: "Research Brief",
    icon: "📖",
    date: "1891",
    author: "Cheesborough Research Desk",
    description: "Archival critique and cross-examination of convict captain J.C. Powell's 1891 memoir. Unpacks the reality of convict leasing, escapes by Si Williams, hound tracking, thumb hanging, self-mutilation, and labor camp cruelty.",
    tags: ["J.C. Powell", "The American Siberia", "1891 Memoir", "Convict Leasing", "Si Williams", "Cy Williams", "Cyrus Wilson", "Sing Sing Breakout", "Corporal Punishment", "Thumb Hanging", "Turpentine", "Malachi Martin"],
    keywords: ["powell", "j c powell", "american siberia", "1891 memoir", "convict leasing", "si williams", "cy williams", "cyrus wilson", "prisoner no 1", "prisoner no 11", "sing sing breakout", "columbus see", "dick evans", "hounds", "corporal punishment", "thumb hanging", "self mutilation", "turpentine camp", "malachi martin", "jerald jarquis cheesborough", "bloodhounds", "escapes"],
    actionLabel: "Read Research Brief →"
  },
  {
    id: "brief-institutional-census",
    title: "Counting Confinement: Institutional Census & Demographic Records",
    url: "INSTITUTIONAL-CENSUS.html",
    category: "Research Brief",
    badge: "Research Brief",
    icon: "📊",
    date: "1910–1940",
    author: "Cheesborough Research Desk",
    description: "Analysis of institutional census data, girls' industrial schools, Mary McLeod Bethune household records, Anita Pinckney, and how state institutions classified and erased incarcerated Black youth.",
    tags: ["Institutional Census", "Mary McLeod Bethune", "Anita Pinckney", "Daytona Beach", "1910 Census", "1940 Census", "Alachua County", "Girls Industrial School", "Demographics", "Inmate Enumeration"],
    keywords: ["institutional census", "counting confinement", "mary mcleod bethune", "anita pinckney", "daytona beach", "1910 census", "1940 census", "alachua county", "girls industrial school", "juvenile detention", "prison census", "demographic records", "inmate count", "reformatory census"],
    actionLabel: "Read Research Brief →"
  }
);
SEARCH_INDEX.push(
  // 2. PRIMARY DOCUMENTS & TRANSCRIPTIONS
  {
    id: "doc-1969-dozier-report",
    title: "Report of the Visiting Committee, Arthur G. Dozier School for Boys (1969)",
    url: "DOC-1969-DOZIER-REPORT.html",
    category: "Primary Document",
    badge: "Transcribed Document",
    icon: "📄",
    date: "1969",
    author: "FSU Visiting Committee (W. L. Maloy, Chair)",
    description: "Full verbatim transcription of the official 1969 Visiting Committee report evaluating academic curricula, vocational training, custodial routine, house fathers, and administrative conditions at Dozier School.",
    tags: ["1969 Dozier Report", "Arthur G. Dozier", "Visiting Committee", "Florida State University", "Marianna Florida", "Custodial Routine", "Vocational Training", "Reform School"],
    keywords: ["1969 dozier report", "visiting committee", "florida state university", "fsu", "w l maloy", "marianna florida", "academic curriculum", "vocational training", "house fathers", "custodial routine", "educational administration", "inspection report"],
    actionLabel: "Read Transcribed Report →"
  },
  {
    id: "doc-jett-fortune-ferguson",
    title: "The State of Florida v. Fortune Ferguson Jr. (Brandon T. Jett, 2024)",
    url: "DOC-FORTUNE-FERGUSON-JETT.html",
    category: "Primary Document",
    badge: "Legal Scholarship",
    icon: "⚖️",
    date: "2024",
    author: "Dr. Brandon T. Jett",
    description: "Comprehensive scholarly study published in the American Journal of Legal History examining the trial and execution of Fortune Ferguson Jr., state-level execution centralization, and Jim Crow criminal justice.",
    tags: ["Brandon Jett", "Fortune Ferguson", "American Journal of Legal History", "Electric Chair", "Criminal Justice Centralization", "Jim Crow Legal History", "Alachua County"],
    keywords: ["brandon jett", "state of florida v fortune ferguson jr", "american journal of legal history", "electric chair 1923", "criminal justice centralization", "espy file", "death penalty information center", "reva siegel", "preservation through transformation", "jim crow legal history"],
    actionLabel: "Read Scholarly Analysis →"
  },
  {
    id: "doc-wapo-juvenile-death-penalty",
    title: "History of the Juvenile Death Penalty: Key Events in the United States (Washington Post, 1988)",
    url: "DOC-FORTUNE-FERGUSON-WAPO.html",
    category: "Primary Document",
    badge: "Historical Chronology",
    icon: "📰",
    date: "1988",
    author: "The Washington Post",
    description: "Historical timeline and case chronology documenting juvenile capital punishment in America from colonial executions (1642) through Furman, Gregg, Thompson v. Oklahoma, and modern Eighth Amendment jurisprudence.",
    tags: ["Juvenile Death Penalty", "Washington Post 1988", "Thompson v. Oklahoma", "Furman v. Georgia", "Gregg v. Georgia", "Roper v. Simmons", "Eighth Amendment", "Capital Punishment"],
    keywords: ["juvenile death penalty", "washington post 1988", "thompson v oklahoma", "furman v georgia", "gregg v georgia", "eddings v oklahoma", "roper v simmons", "atkins v virginia", "fortune ferguson", "thomas graunger", "james arcene", "george stinney", "juvenile executions timeline"],
    actionLabel: "Read Historical Chronology →"
  }
);
SEARCH_INDEX.push(
  // 3. PRIMARY ARCHIVAL PDFS
  {
    id: "pdf-usf-dozier-2016",
    title: "USF 2016 Final Dozier Summary Report: Deaths and Burials Investigation",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FDozier%2FDozierArchives%2Fusf-final-dozier-summary-2016.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "2016",
    author: "University of South Florida (Dr. Erin Kimmerle)",
    description: "Complete 2016 USF forensic anthropology final report documenting 51 burials, unrecorded graves, DNA identifications, and death patterns at the Arthur G. Dozier School for Boys in Marianna, FL.",
    tags: ["USF Report", "Dozier School", "Forensic Anthropology", "Erin Kimmerle", "Boot Hill Cemetery", "Burials", "Unrecorded Deaths", "Primary PDF Scan"],
    keywords: ["usf final dozier summary 2016", "usf report pdf", "erin kimmerle", "forensic anthropology", "boot hill burials", "unrecorded graves", "dozier deaths", "2016 summary", "marianna graves pdf"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-1969-dozier-report",
    title: "1969 Visiting Committee Report: Arthur G. Dozier School for Boys (Original Scan)",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FDozier%2FDozierArchives%2F1969RptDozier.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "1969",
    author: "Florida State University Visiting Committee",
    description: "Original facsimile scan of the 1969 Visiting Committee Report on the Florida School for Boys at Marianna, inspecting institutional administration and custodial discipline.",
    tags: ["1969 Dozier Report", "Primary Scan", "Dozier School", "Marianna", "Visiting Committee", "Primary PDF Scan"],
    keywords: ["1969 report pdf", "1969rptdozier pdf", "visiting committee scan", "dozier report pdf", "marianna school inspection scan"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-1958-dozier-handbook",
    title: "1958 Dozier School Student Handbook: Rules, Daily Routine, & Administration",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FDozier%2FDozierArchives%2FDozier%20School%20Handbook%2Fhandbook1958.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "1958",
    author: "Florida Industrial School for Boys (Marianna)",
    description: "Official 1958 handbook distributed to boys committed to Marianna. Details cottage assignments, daily routines, merits/demerits, discipline, work details, and institutional rules.",
    tags: ["1958 Handbook", "Dozier Handbook", "Student Rules", "Reform School Routine", "Discipline", "Marianna", "Primary PDF Scan"],
    keywords: ["handbook 1958 pdf", "dozier handbook pdf", "rules and regulations", "student guide", "discipline", "daily routine", "marianna florida", "reform school rules"],
    actionLabel: "Open PDF in Reader ↗"
  }
);
SEARCH_INDEX.push(
  {
    id: "pdf-boot-hill-cemetery-2012",
    title: "Boot Hill Cemetery Interim Report (USF Forensic Investigation, 2012)",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FDozier%2FDozierArchives%2F5042-boot-hill-cemetery-interim-report-12-12.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "2012",
    author: "USF Forensic Anthropology",
    description: "Interim archaeological and forensic report documenting ground-penetrating radar findings, burial anomalies, and clandestine grave markers at Dozier's Boot Hill cemetery.",
    tags: ["Boot Hill Cemetery", "Interim Report 2012", "USF Forensics", "Burial Anomalies", "Clandestine Graves", "Primary PDF Scan"],
    keywords: ["boot hill cemetery interim report", "5042 boot hill pdf", "dozier graves", "marianna cemetery report", "ground penetrating radar", "usf 2012 pdf"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-dozier-campus-maps",
    title: "Historical Dozier School Campus Maps & Architectural Blueprints",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FDozier%2FDozierArchives%2FMap%20Campus%20Map%20Florida%20School%20for%20Boys%20at%20Marianna%20October%2028.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "🗺️",
    date: "1928–1960s",
    author: "State of Florida / Architecture Division",
    description: "Historical site blueprints and campus maps of the Florida School for Boys at Marianna, showing cottage locations, White House solitary building, farmland, and cemetery grounds.",
    tags: ["Dozier Maps", "Campus Map", "White House Location", "Architectural Blueprints", "Marianna Site Plan", "Primary PDF Scan"],
    keywords: ["dozier maps pdf", "campus map florida school for boys marianna", "white house location", "cottages", "renovations map", "site blueprints"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-byrd-senate-testimony",
    title: "Dr. Eugene Byrd U.S. Senate Testimony on Dozier School Conditions",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FDozier%2FTranscript%20Testimony%20of%20Dr.%20Eugene%20Byrd%20before%20the%20U.S.%20Senates.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "1950s",
    author: "U.S. Senate Subcommittee / Dr. Eugene Byrd",
    description: "Sworn testimony of clinical psychologist Dr. Eugene Byrd before the U.S. Senate Subcommittee detailing psychological trauma, institutional abuse, and corporal punishment at Dozier.",
    tags: ["Senate Testimony", "Dr. Eugene Byrd", "Dozier Abuse", "Congressional Hearing", "Juvenile Delinquency", "Primary PDF Scan"],
    keywords: ["eugene byrd testimony pdf", "senate subcommittee transcript", "juvenile delinquency hearing", "congressional testimony dozier", "clinical psychologist"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-for-their-own-good-tbt",
    title: "Tampa Bay Times: For Their Own Good (Complete Investigative Series PDF)",
    url: "PDF-READER.html?file=03_Research%2F03_Archival-Notes%2FDozierArchives%2FFOR%20THEIR%20OWN%20GOOD.pdf",
    category: "Primary PDF",
    badge: "Investigative Series",
    icon: "📰",
    date: "2009–2010",
    author: "Tampa Bay Times (Ben Montgomery, Waveney Ann Moore, Curtis Krueger)",
    description: "Complete Pulitzer Prize-finalist investigative report chronicling the 111-year history of abuse, child labor, White House beatings, and unrecorded deaths at the Arthur G. Dozier School for Boys.",
    tags: ["For Their Own Good", "Tampa Bay Times", "Ben Montgomery", "White House Boys", "Dozier School", "Investigative Journalism", "Primary PDF Scan"],
    keywords: ["for their own good pdf", "tbt marianna pdf", "tampa bay times dozier investigation", "st petersburg times dozier", "for their own good st pete times", "white house boys investigation"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-congressional-juvenile-report",
    title: "Congressional Juvenile Delinquency Committee Report on State Reformatories",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FDozier%2FDozierArchives%2FCongressional%20Report%20Juvenile%20Delinquency%20Report%20of%20the%20Committe.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "1950s",
    author: "U.S. Senate Committee on the Judiciary",
    description: "Official federal report on juvenile delinquency, state training schools, reformatory conditions, and federal reform proposals across Southern juvenile institutions.",
    tags: ["Congressional Report", "Juvenile Delinquency", "Federal Investigation", "Reform Schools", "Primary PDF Scan"],
    keywords: ["congressional report juvenile delinquency pdf", "committee report", "federal investigation reform schools", "senate judiciary"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-powell-american-siberia",
    title: "J. C. Powell, The American Siberia (1891 Complete Book Scan)",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F01_Primary-Texts%2FThe%20American%20Siberia%20p.1891_CompleteBook.pdf",
    category: "Manuscript & Book",
    badge: "Primary Book",
    icon: "📚",
    date: "1891",
    author: "J.C. Powell (Convict Captain)",
    description: "Complete 355-page primary book scan of Captain J.C. Powell's 1891 memoir: 'The American Siberia: Or, Fourteen Years' Experience in a Southern Convict Lease Camp'.",
    tags: ["Books and Manuscripts", "The American Siberia", "J.C. Powell", "1891 Book", "Convict Leasing", "Memoir", "Turpentine Camps", "Primary Text"],
    keywords: ["american siberia book pdf", "americansiberia complete book", "j c powell book", "1891 convict lease book", "fourteen years experience in a southern convict lease camp", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-rebel-prisons",
    title: "Robert H. Kellogg, Life and Death in Rebel Prisons (1865 Complete Book)",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F01_Primary-Texts%2FLife%20and%20Death%20in%20Rebel%20Prisons_CompleteBooks.pdf",
    category: "Manuscript & Book",
    badge: "Primary Book",
    icon: "📚",
    date: "1865",
    author: "Robert H. Kellogg (16th Connecticut Volunteers)",
    description: "Complete 399-page primary book scan describing military imprisonment, survival, disease, and camp administration at Andersonville and Florence stockades.",
    tags: ["Books and Manuscripts", "Life and Death in Rebel Prisons", "Robert H. Kellogg", "1865 Book", "Andersonville", "Civil War", "Primary Text"],
    keywords: ["life and death in rebel prisons pdf", "robert kellogg book", "andersonville prison narrative", "civil war prison book", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-georgia-prison",
    title: "Lewis W. Paine, Six Years in a Georgia Prison (1851 Complete Book)",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F01_Primary-Texts%2FSix%20Years%20In%20Gerogia%20Prison%20p.1851_CompleteBook.pdf",
    category: "Manuscript & Book",
    badge: "Primary Book",
    icon: "📚",
    date: "1851",
    author: "Lewis W. Paine",
    description: "Complete 187-page antebellum prison narrative documenting six years in the Georgia State Penitentiary at Milledgeville for aiding an escaped enslaved man.",
    tags: ["Books and Manuscripts", "Six Years in a Georgia Prison", "Lewis W. Paine", "1851 Book", "Abolitionist", "Antebellum South", "Primary Text"],
    keywords: ["six years in a georgia prison pdf", "lewis paine book", "georgia state penitentiary 1851", "antebellum prison memoir", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-black-child-savers",
    title: "Geoff K. Ward, The Black Child-Savers: Racial Democracy and Juvenile Justice (2012)",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2FThe%20Black%20Child-Savers_CompleteBook.pdf",
    category: "Manuscript & Book",
    badge: "Academic Monograph",
    icon: "📚",
    date: "2012",
    author: "Dr. Geoff K. Ward (University of Chicago Press)",
    description: "Scholarly monograph examining African American reformers' struggle against the Jim Crow juvenile justice system and the creation of separate rehabilitative institutions.",
    tags: ["Books and Manuscripts", "The Black Child-Savers", "Geoff Ward", "Juvenile Justice", "Jim Crow", "Secondary Scholarship"],
    keywords: ["the black child savers pdf", "geoff ward book", "racial democracy and juvenile justice", "black club women reform", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-coxsackie",
    title: "Coxsackie: Youth, Reform, and Mass Incarceration in Upstate New York",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2FCoxsackie_CompleteBook.pdf",
    category: "Manuscript & Book",
    badge: "Institutional History",
    icon: "📚",
    date: "20th Century",
    author: "Carceral Studies Collective",
    description: "Monograph analyzing the New York State Vocational Institution at Coxsackie and the evolution of youth reformatories into modern custodial prisons.",
    tags: ["Books and Manuscripts", "Coxsackie", "Youth Reformatory", "New York", "Mass Incarceration", "Secondary Scholarship"],
    keywords: ["coxsackie book pdf", "new york state vocational institution", "youth reformatory mass incarceration", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-florida-biennial",
    title: "Biennial Report of the Department of Agriculture: Prison Division (1913–1916)",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F01_Primary-Texts%2F1913-1916_Biennial%20report%20of%20the%20Department%20of%20Agriculture%20of%20the%20State%20of%20Florida%2C%20Prison%20Division.pdf",
    category: "Manuscript & Book",
    badge: "State Report",
    icon: "📚",
    date: "1916",
    author: "State of Florida Department of Agriculture",
    description: "Official biennial report documenting Florida convict camp inspections, state prison farm management, inmate mortality, and administrative records.",
    tags: ["Books and Manuscripts", "Florida Prison Division", "Biennial Report", "State Penitentiary", "Primary Text"],
    keywords: ["florida prison division report pdf", "biennial report department of agriculture prison division", "books and manuscripts"],
    actionLabel: "Read Report Online ↗"
  },
  {
    id: "book-angela-davis",
    title: "Angela Y. Davis, Are Prisons Obsolete? (2003 Complete Text)",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2Fangela-y-davis-are-prisons-obsolete_CompleteBook.pdf",
    category: "Manuscript & Book",
    badge: "Critical Theory",
    icon: "📚",
    date: "2003",
    author: "Angela Y. Davis",
    description: "Complete scholarly text examining the prison-industrial complex, gendered carceral violence, slavery and penal history, and abolitionist frameworks.",
    tags: ["Books and Manuscripts", "Angela Davis", "Are Prisons Obsolete", "Prison Abolition", "Critical Theory", "Secondary Scholarship"],
    keywords: ["angela davis are prisons obsolete pdf", "prison industrial complex book", "abolitionist theory", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-os-cangaceiros",
    title: "A Crime Called Freedom: The Writings of Os Cangaceiros",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2FA%20Crime%20Called%20Freedom_The%20Writings%20of%20Os%20Cangaceiros_CompleteBook.pdf",
    category: "Manuscript & Book",
    badge: "Resistance Texts",
    icon: "📚",
    date: "Late 20th Century",
    author: "Os Cangaceiros",
    description: "Complete collected communiqués, prison revolt records, and autonomist critical analyses of maximum-security confinement.",
    tags: ["Books and Manuscripts", "A Crime Called Freedom", "Os Cangaceiros", "Prison Resistance", "Secondary Scholarship"],
    keywords: ["a crime called freedom pdf", "os cangaceiros writings", "prison resistance collective", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-correctional-bookshelf",
    title: "Correctional Bookshelf: A Bibliography of the U.S. Bureau of Prisons Library",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2FCorrectional%20bookshelf_a%20bibliography%20%20U.S.%20Bureau%20of%20Prisons%20Library.pdf",
    category: "Manuscript & Book",
    badge: "Federal Bibliography",
    icon: "📚",
    date: "20th Century",
    author: "U.S. Bureau of Prisons Library",
    description: "Official bibliographic catalog of penological treatises, institutional management texts, and criminological reference works.",
    tags: ["Books and Manuscripts", "Correctional Bookshelf", "Bureau of Prisons", "Bibliography", "Reference"],
    keywords: ["correctional bookshelf bibliography pdf", "bureau of prisons library", "penological reference catalog", "books and manuscripts"],
    actionLabel: "Read Catalog Online ↗"
  },
  {
    id: "book-hiphop-jimcrow",
    title: "Hip Hop and the New Jim Crow: Rap Music's Insight on Mass Incarceration",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2FHip%20Hop%20and%20the%20New%20Jim%20Crow_%20Rap%20Music_s%20Insight%20on%20Mass%20Incarce.pdf",
    category: "Manuscript & Book",
    badge: "Cultural Scholarship",
    icon: "📚",
    date: "Contemporary",
    author: "Critical Criminology & Cultural Studies Group",
    description: "Scholarly monograph analyzing hip hop lyricism and cultural production as critical counter-narratives to hyper-policing, mandatory sentencing, and mass incarceration.",
    tags: ["Books and Manuscripts", "Hip Hop and the New Jim Crow", "Rap Music", "Mass Incarceration", "Cultural Studies"],
    keywords: ["hip hop and the new jim crow pdf", "rap music mass incarceration scholarship", "critical criminology hip hop", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-hiphop-pedagogy",
    title: "Exploring Hip Hop Pedagogy in the Lives of African American Youth",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2FExploring%20Hip%20Hop%20Pedagogy%20in%20the%20Lives%20of%20Four%20African%20American.pdf",
    category: "Manuscript & Book",
    badge: "Pedagogy Monograph",
    icon: "📚",
    date: "Contemporary",
    author: "Educational Research Initiative",
    description: "Qualitative research study investigating culturally sustaining hip hop pedagogical methods and agency for system-impacted African American youth.",
    tags: ["Books and Manuscripts", "Hip Hop Pedagogy", "Youth Justice", "African American Youth", "Education"],
    keywords: ["exploring hip hop pedagogy pdf", "culturally sustaining pedagogy", "youth justice education", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-rap-lyrics",
    title: "Rap Music Lyrics and the Construction of Violent Identities",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2FRap%20Music%20Lyrics%20and%20the%20Construction%20of%20Violent%20Identities.pdf",
    category: "Manuscript & Book",
    badge: "Legal & Evidence Monograph",
    icon: "📚",
    date: "Contemporary",
    author: "Legal Criminology Faculty",
    description: "Legal and evidentiary monograph examining prosecutorial use of rap lyrics in criminal trials, evidentiary rules, racial bias, and First Amendment concerns.",
    tags: ["Books and Manuscripts", "Rap Lyrics as Evidence", "Legal Evidence", "Evidentiary Bias", "Criminal Law"],
    keywords: ["rap music lyrics construction of violent identities pdf", "rap lyrics criminal trial evidence", "evidentiary bias rap", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  },
  {
    id: "book-youth-chicago",
    title: "Understanding the Relationship Between Black Youth and the Carceral State",
    url: "PDF-READER.html?file=02_Books-and-Manuscripts%2FBooks%2F02_Secondary-Scholarship%2FUnderstanding%20the%20Relationship%20Between%20Black%20Chicago%20Youth%20and%20Ch.pdf",
    category: "Manuscript & Book",
    badge: "Sociological Field Study",
    icon: "📚",
    date: "Contemporary",
    author: "Urban Criminology Faculty",
    description: "Empirical study on how everyday policing, curfew enforcement, neighborhood surveillance, and juvenile court contact affect Black youth and families.",
    tags: ["Books and Manuscripts", "Black Youth and Carceral State", "Urban Criminology", "Policing", "Juvenile Justice"],
    keywords: ["understanding relationship between black chicago youth carceral state pdf", "urban policing youth", "juvenile court contact study", "books and manuscripts"],
    actionLabel: "Read Book Online ↗"
  }
);
SEARCH_INDEX.push(
  {
    id: "pdf-fortune-ferguson-jett",
    title: "Fortune Ferguson Jr. by Brandon T. Jett (Scholarly PDF Article)",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FFORTUNE%20FERGUSON%20JR%2FBrandon_Jett_State_of_Florida_v_Fortune_Ferguson_Jr_2024.pdf",
    category: "Primary PDF",
    badge: "Scholarly PDF",
    icon: "📄",
    date: "2024",
    author: "Dr. Brandon T. Jett",
    description: "Scholarly research paper PDF on Fortune Ferguson Jr., exploring legal defense strategies, racialized capital punishment, and state execution centralization in Florida.",
    tags: ["Brandon Jett PDF", "Fortune Ferguson", "Legal History", "Electric Chair", "Scholarly PDF"],
    keywords: ["brandon jett pdf", "fortune ferguson jr by brandon jett pdf", "capital punishment scholarship pdf"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-wapo-juvenile-death-penalty",
    title: "History of the Juvenile Death Penalty (Washington Post 1988 Original PDF)",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FFORTUNE%20FERGUSON%20JR%2FHistory_of_Juvenile_Death_Penalty_Washington_Post_1988.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📰",
    date: "1988",
    author: "The Washington Post",
    description: "Archival PDF scan of the July 3, 1988 Washington Post feature chronicling every juvenile execution in American history alongside major Supreme Court rulings.",
    tags: ["Washington Post PDF", "Juvenile Death Penalty", "Execution Timeline", "Supreme Court", "Primary PDF Scan"],
    keywords: ["washington post juvenile death penalty pdf", "wapo 1988 pdf", "juvenile executions archive scan"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-fortune-ferguson-card",
    title: "Fortune Ferguson Archival Card (M.E. Grenander Special Collections)",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FFORTUNE%20FERGUSON%20JR%2FFortune_Ferguson_1927_Execution_Record_Card_Grenander_Archives.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "1927",
    author: "M.E. Grenander Department of Special Collections",
    description: "Primary archival index card documenting the April 27, 1927 electric chair execution of Fortune Ferguson Jr. at Florida State Prison (Raiford).",
    tags: ["Fortune Ferguson Card", "Grenander Collections", "Execution Record 1927", "Raiford Prison", "Primary PDF Scan"],
    keywords: ["grenander special collections pdf", "fortune ferguson 1927 record card", "execution record scan"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-florida-prison-register",
    title: "Florida State Prison Register, 1875–1959 (Facsimile Scan)",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FFORTUNE%20FERGUSON%20JR%2FFlorida_State_Prison_Register_Fortune_Ferguson_1924_1927.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "1875–1959",
    author: "Florida State Penitentiary / Ancestry Archive",
    description: "Primary register scan showing inmate admissions, racial demographics, crimes charged, sentencing length, and discharge or execution records.",
    tags: ["Florida Prison Register", "Inmate Ledgers", "State Prison Records", "Raiford", "Primary PDF Scan"],
    keywords: ["florida state prison register pdf", "prison register 1875 1959 scan", "inmate ledger scan", "ancestry prison register"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-newberry-six-transcript",
    title: "Newberry Six Memorial Record & Historical Inquest Transcript",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FFORTUNE%20FERGUSON%20JR%2FNewberry_Six_1916_Memorial_Service_Transcript_AAHP.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "1916",
    author: "Alachua County Archive / Historical Memorial",
    description: "Archival transcript and memorial document chronicling the extrajudicial lynching of six African Americans in Newberry, Florida in August 1916.",
    tags: ["Newberry Six", "1916 Lynching", "Memorial Transcript", "Alachua County", "Inquest Records", "Primary PDF Scan"],
    keywords: ["newberry six pdf", "newberry 6 pdf scan", "1916 lynching transcript", "alachua county inquest"],
    actionLabel: "Open PDF in Reader ↗"
  },
  {
    id: "pdf-1870-florida-prison-census",
    title: "1870 Florida Prison Census Master Scan (Chattahoochee Penitentiary)",
    url: "PDF-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FCensus%20Data%2F1870%20Florida%20Prison%20Census%20Master%20PDF.pdf",
    category: "Primary PDF",
    badge: "Primary PDF Scan",
    icon: "📄",
    date: "1870",
    author: "U.S. Federal Census Bureau",
    description: "Master high-resolution scan of the 1870 Federal Population Schedule enumerating incarcerated men and prison guards at Chattahoochee State Penitentiary under Warden Malachi Martin.",
    tags: ["1870 Census", "Florida Prison Census", "Gadsden County", "Chattahoochee Penitentiary", "Malachi Martin", "Primary PDF Scan"],
    keywords: ["1870 florida prison census master pdf", "1870 census scan", "chattahoochee penitentiary census", "gadsden county 1870 scan"],
    actionLabel: "Open PDF in Reader ↗"
  }
);
SEARCH_INDEX.push(
  // 4. DATA & SPREADSHEETS
  {
    id: "data-1880-staff-roster",
    title: "1880 Florida State Prison Staff Census Roster (Transcribed Workbook)",
    url: "DATA-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FCensus%20Data%2F1880_State_Prison_Staff_Census.xlsx",
    category: "Data & Spreadsheet",
    badge: "Spreadsheet Dataset",
    icon: "📊",
    date: "1880",
    author: "Cheesborough Carceral Data Desk",
    description: "Interactive transcribed spreadsheet of prison guards, captains, medical staff, and administrators from the 1880 Florida State Prison census.",
    tags: ["1880 Census", "Prison Staff Roster", "Excel Workbook", "Spreadsheet Reader", "Guards & Wardens"],
    keywords: ["1880 state prison staff census xlsx", "guard roster", "warden staff", "1880 census data reader", "spreadsheet", "excel dataset"],
    actionLabel: "View in Spreadsheet Reader ↗"
  },
  {
    id: "data-1880-turpentine-convicts",
    title: "1880 State Prison Census: Staff & 150 Turpentine Workers and Prisoners",
    url: "DATA-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FCensus%20Data%2F1880_State_Prison_Census_Staff_150_Turpentine_Workers_and_Prisoners.xlsx",
    category: "Data & Spreadsheet",
    badge: "Spreadsheet Dataset",
    icon: "📊",
    date: "1880",
    author: "Cheesborough Carceral Data Desk",
    description: "Complete transcription workbook of 150 leased convicts, turpentine laborers, camp guards, and supervisors in Florida convict lease camps.",
    tags: ["1880 Census", "Turpentine Workers", "Convict Lease Roster", "Forced Labor Dataset", "Spreadsheet Reader"],
    keywords: ["1880 state prison census staff 150 turpentine workers and prisoners xlsx", "convict lease roster", "forced labor dataset", "spreadsheet reader", "turpentine camp convicts"],
    actionLabel: "View in Spreadsheet Reader ↗"
  },
  {
    id: "data-malachi-martin-1870",
    title: "Malachi Martin Household & Penitentiary 1870 Census Records",
    url: "DATA-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FCensus%20Data%2FMalachi_Martin_Household_and_Penitentiary_1870_Census_Households_Preserved.xlsx",
    category: "Data & Spreadsheet",
    badge: "Spreadsheet Dataset",
    icon: "📊",
    date: "1870",
    author: "Cheesborough Carceral Data Desk",
    description: "Detailed census dataset recording Warden Malachi Martin's personal household, guards, and penitentiary inmates at Chattahoochee in 1870.",
    tags: ["Malachi Martin", "1870 Census", "Penitentiary Data", "Chattahoochee Warden", "Spreadsheet Reader"],
    keywords: ["malachi martin preserved household and penitentiary 1870 census xlsx", "warden household", "chattahoochee warden", "gadsden county spreadsheet"],
    actionLabel: "View in Spreadsheet Reader ↗"
  },
  {
    id: "data-1870-gadsden-census",
    title: "1870 Federal Census: Gadsden County, Florida (District 141 Context)",
    url: "DATA-READER.html?file=RESEARCH%20WEBSITE%20HERO%2FCensus%20Data%2F1870%20United%20States%20Federal%20Census_%20Gadsden%2C%20Florida%20%28District%20141%29.xlsx",
    category: "Data & Spreadsheet",
    badge: "Spreadsheet Dataset",
    icon: "📊",
    date: "1870",
    author: "Cheesborough Carceral Data Desk",
    description: "Full district demographic workbook providing socio-economic and racial context for Gadsden County surrounding the Chattahoochee state prison.",
    tags: ["1870 Census", "Gadsden County", "District 141", "Demographic Workbook", "Spreadsheet Reader"],
    keywords: ["1870 united states federal census gadsden florida district 141 xlsx", "gadsden demographic workbook", "district 141 spreadsheet"],
    actionLabel: "View in Spreadsheet Reader ↗"
  },

  // 5. LAW LIBRARY & LEGAL REFORM
  {
    id: "hub-law-library",
    title: "Law Library & Carceral Legal Reform Hub",
    url: "LAW-LIBRARY.html",
    category: "Law Library",
    badge: "Law Library",
    icon: "⚖️",
    date: "Jurisprudence",
    author: "Cheesborough Legal Archive",
    description: "Reading room for case law, appellate decisions, sentencing proportionality precedents, due process briefs, Florida statutes, and legal reform literature.",
    tags: ["Law Library", "Case Law", "Due Process", "Sentencing Proportionality", "People v. Calder", "Access to Counsel", "Statutes"],
    keywords: ["law library", "case law", "due process", "right to counsel", "appellate briefs", "sentencing proportionality", "people v calder", "in re access to counsel", "reform history", "statutes", "judicial review", "legal authorities"],
    actionLabel: "Browse Law Library →"
  },
  {
    id: "hub-news-review",
    title: "The Cheesborough Review: News, Field Notes, & Public Memory",
    url: "NEWS.html",
    category: "News & Review",
    badge: "The Review",
    icon: "📰",
    date: "Current / Dispatches",
    author: "The Cheesborough Review",
    description: "Critical commentary, court watch reports, investigative field notes, studies on juvenile solitary confinement, and oral histories of carceral survival.",
    tags: ["News", "The Review", "Solitary Confinement", "Juvenile Facilities", "Supreme Court Rulings", "Court Watch", "Field Notes"],
    keywords: ["news", "the review", "solitary confinement in juvenile facilities", "supreme court rulings", "court watch", "field notes", "public memory", "juvenile brain science", "carceral journalism", "dispatch"],
    actionLabel: "Read The Review →"
  }
);
SEARCH_INDEX.push(
  {
    id: "hub-research-desk",
    title: "Research Desk: Working Papers & Critical Methodologies",
    url: "RESEARCH.html",
    category: "Research Desk",
    badge: "Research Desk",
    icon: "📚",
    date: "Methodology",
    author: "Cheesborough Research Collective",
    description: "Working papers on solitary confinement, adolescent brain science in criminal law, access to counsel, and critical methods for reading carceral archives.",
    tags: ["Research Desk", "Working Papers", "Solitary Confinement", "Adolescent Brain", "Access to Counsel", "Archive Methodology"],
    keywords: ["research desk", "working papers", "solitary confinement", "adolescent development", "access to counsel", "archive methods", "carceral scholarship", "research starters"],
    actionLabel: "Visit Research Desk →"
  },
  {
    id: "guide-research-starters",
    title: "Research Starters: Methodological Guides for Carceral Inquiry",
    url: "RESEARCH-STARTERS.html",
    category: "Research Guide",
    badge: "Research Guide",
    icon: "🧭",
    date: "Guides",
    author: "Cheesborough Education Desk",
    description: "Practical guides on how to read institutional timelines, analyze archival photographs as evidence, locate rights within silence, and conduct ethical oral histories.",
    tags: ["Research Starters", "Inquiry Guides", "Archival Photos as Evidence", "Timeline Analysis", "Oral History Prompts"],
    keywords: ["research starters", "how to read institutional timeline", "where does a right begin", "oral history prompts", "reading photographs as evidence", "inquiry guides", "methods"],
    actionLabel: "Open Research Starters →"
  },

  // 6. COLLECTIONS, PHOTOGRAPHY, & MANUSCRIPTS
  {
    id: "hub-collections",
    title: "Archival Collections Hub: Photography, Manuscripts, & Papers",
    url: "COLLECTIONS.html",
    category: "Archival Collection",
    badge: "Collections Hub",
    icon: "🏛️",
    date: "Master Catalog",
    author: "The Cheesborough Carceral Collections",
    description: "Central gateway to Digital Photography, Research Starters, Rare Books & Manuscripts, and Personal Inmate Collections.",
    tags: ["Collections", "Master Catalog", "Digital Photography", "Books & Manuscripts", "Personal Collections", "Finding Aids"],
    keywords: ["collections", "archival catalog", "digital photography", "research starters", "books and manuscripts", "personal collections", "finding aids", "primary sources", "catalog hub"],
    actionLabel: "Explore Collections Hub →"
  },
  {
    id: "col-digital-photography",
    title: "Digital Photography Collections: Historic & Contemporary Carceral Images",
    url: "DIGITAL-PHOTOGRAPHY-COLLECTIONS.html",
    category: "Photo Archive",
    badge: "Photo Archive",
    icon: "📷",
    date: "1890s–Present",
    author: "Visual Archival Division",
    description: "Curated galleries of historic and contemporary photographs depicting incarcerated men, women, and juveniles, chain gangs, San Quentin, and California Youth Authority.",
    tags: ["Digital Photography", "San Quentin", "California Youth Authority", "Historic Photos", "Contemporary Photos", "Juvenile Facilities", "Chain Gangs"],
    keywords: ["digital photography", "photo archive", "san quentin", "california youth authority", "juvenile facilities", "prison photography", "chain gangs", "historic photos men women juveniles", "pictures", "image gallery"],
    actionLabel: "View Photography Galleries →"
  },
  {
    id: "col-photography-states",
    title: "Carceral Photography by State Index (All 50 Jurisdictions)",
    url: "PHOTOGRAPHY-STATES.html",
    category: "Photo Archive",
    badge: "State Visual Index",
    icon: "🗺️",
    date: "All 50 States",
    author: "Visual Archival Division",
    description: "State-by-state index organizing carceral photographs, regional finding aids, and case image collections across all 50 U.S. states.",
    tags: ["Photography by State", "State Index", "All 50 States", "Regional Archives", "Florida", "California", "New York", "Texas", "Alabama", "Georgia"],
    keywords: ["photography by state", "state index", "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware", "florida", "georgia", "illinois", "new york", "texas", "state carceral photos", "state cases"],
    actionLabel: "Explore State Photos →"
  },
  {
    id: "col-florida-juvenile-photos",
    title: "Florida Juvenile Institutions Photographic Collection (Dozier School & State Archives)",
    url: "PHOTOGRAPHY-STATES.html?state=Florida",
    category: "Photo Archive",
    badge: "State Photo Index",
    icon: "📷",
    date: "1940s–1950s",
    author: "State Archives of Florida / Dozier Collection",
    description: "Curated collection of 10+ archival photographs documenting student life, dining halls, vocational trades, infirmary exams, and institutional events at the Florida Industrial School for Boys in Marianna.",
    tags: ["Florida Photos", "Dozier School", "Juvenile Photography", "Marianna", "State Archives", "Photo Archive"],
    keywords: ["florida juvenile photo", "dozier school photos", "marianna florida photos", "florida industrial school for boys photographs", "state photo index"],
    actionLabel: "View Florida Photos ↗"
  },
  {
    id: "col-dozier-newspapers",
    title: "The Dozier School Newspaper Collection - Florida: The Yellow Jacket (1933–1960)",
    url: "DOZIER-NEWSPAPERS.html",
    category: "Archival Collection",
    badge: "Newspaper Archive",
    icon: "📰",
    date: "1933–1960",
    author: "Florida Industrial School for Boys (Print Shop)",
    description: "Over 520 digitized primary issues of The Yellow Jacket, the official student and institutional newspaper printed at the Florida Industrial School for Boys in Marianna.",
    tags: ["Dozier Newspapers", "The Yellow Jacket", "Student Newspapers", "Marianna Florida", "Primary Print Archive", "1930s", "1940s", "1950s", "1960s"],
    keywords: ["dozier school newspaper collection", "yellow jacket", "the yellow jacket", "marianna newspaper", "student print shop", "florida industrial school for boys paper", "dozier paper", "1933", "1960", "dozier newspapers"],
    actionLabel: "Browse Newspaper Issues →"
  },
  {
    id: "col-books-manuscripts",
    title: "Books and Manuscripts Collection: Rare Treatises & Prisoner Writings",
    url: "BOOKS-AND-MANUSCRIPTS.html",
    category: "Manuscript & Book",
    badge: "Rare Manuscripts",
    icon: "📚",
    date: "1934–1989",
    author: "Special Collections Reading Room",
    description: "Rare monographs, legal treatises, handwritten inmate notebooks, and reform literature, including The Education Question (1934) and Letters from the Seventh Floor (1978).",
    tags: ["Books and Manuscripts", "Rare Books", "The Education Question 1934", "Letters from the Seventh Floor 1978", "A History of Reform 1968", "Inmate Writings"],
    keywords: ["books and manuscripts", "rare books", "the education question 1934", "letters from the seventh floor 1978", "a history of reform 1968", "notes for a hearing 1989", "archival literature", "monographs", "treatises"],
    actionLabel: "Browse Manuscripts →"
  },
  {
    id: "col-personal-collections",
    title: "Personal Collections & Community Voices: Inmate Letters & Oral Histories",
    url: "PERSONAL-COLLECTIONS.html",
    category: "Personal Papers",
    badge: "Personal Archive",
    icon: "✉️",
    date: "1978–2004",
    author: "Community Archival Project",
    description: "Oral histories, inmate correspondence, family archives, and community narratives documenting the lived realities of incarceration across generations.",
    tags: ["Personal Collections", "Community Voices", "Oral Histories", "Inmate Letters", "Bus Ride Home 1982", "Community Memory"],
    keywords: ["personal collections", "community voices", "oral histories", "family letters", "bus ride home 1982", "dear sister i found a book 1978", "what the hallway sounded like 2004", "correspondence", "survivor stories"],
    actionLabel: "Read Personal Papers →"
  },
  {
    id: "hub-evidence-index",
    title: "Evidence Index: Guided Master Catalogue of Primary Sources",
    url: "EVIDENCE-INDEX.html",
    category: "Finding Aid",
    badge: "Evidence Index",
    icon: "🗂️",
    date: "Primary Sources",
    author: "Cheesborough Carceral Collections",
    description: "Master finding aid linking directly to all PDF scans, census spreadsheets, high-resolution photographs, maps, and court dockets across the archive.",
    tags: ["Evidence Index", "Primary Records", "PDF Scans", "Census Spreadsheets", "Maps", "Court Dockets", "Finding Aid"],
    keywords: ["evidence index", "primary records", "scan catalogue", "finding aid", "dozier evidence", "powell evidence", "ferguson evidence", "census spreadsheets", "primary source catalog"],
    actionLabel: "Open Evidence Index →"
  },
  {
    id: "page-about",
    title: "About The Cheesborough Carceral Collections: Mission & Stewardship",
    url: "ABOUT.html",
    category: "Archive Info",
    badge: "About Archive",
    icon: "🏛️",
    date: "Preservation",
    author: "The Cheesborough Carceral Collections",
    description: "Learn about the mission, stewardship ethics, and public memory commitment of The Cheesborough Carceral Collections.",
    tags: ["About", "Mission", "Open Civic Archive", "Archival Stewardship", "Public Memory"],
    keywords: ["about", "mission", "cheesborough carceral collections", "open civic archive", "public memory", "historical evidence", "archival stewardship", "about the archive"],
    actionLabel: "Read About Mission →"
  },
  {
    id: "page-donate",
    title: "Support the Archive: Independent Preservation & Digital Stewardship",
    url: "DONATE.html",
    category: "Archive Info",
    badge: "Support",
    icon: "🤝",
    date: "Stewardship",
    author: "The Cheesborough Carceral Collections",
    description: "Support independent digitization, free public access, and ongoing preservation of carceral history and primary sources.",
    tags: ["Donate", "Support Archive", "Preservation", "Public Access", "Independent Stewardship"],
    keywords: ["donate", "support", "contribution", "preservation fund", "independent archive", "support the archive"],
    actionLabel: "Support Archive →"
  },
  {
    id: "page-contact",
    title: "Contact & Research Desk: Ask a Librarian or Submit Materials",
    url: "CONTACT.html",
    category: "Archive Info",
    badge: "Contact",
    icon: "✉️",
    date: "Inquiries",
    author: "Reference & Research Desk",
    description: "Connect with archive curators, submit historical records or oral histories, and request research assistance.",
    tags: ["Contact", "Research Inquiries", "Ask a Librarian", "Submit Materials", "Reference Desk"],
    keywords: ["contact", "research help", "ask a librarian", "submit records", "oral history inquiries", "contact the archive", "reference desk"],
    actionLabel: "Contact Reference Desk →"
  }
);
const searchDataModuleCode = `/**
 * The Cheesborough Carceral Collections - Master Search Index & Engine
 * Auto-generated & verified search database and querying module.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CheesboroughSearch = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const SEARCH_INDEX = ` + JSON.stringify(SEARCH_INDEX, null, 2) + `;

  const SYNONYMS = {
    "dozier": ["marianna", "white house boys", "boot hill", "industrial school", "reform school", "kimmerle", "visiting committee"],
    "powell": ["american siberia", "convict leasing", "si williams", "cy williams", "sing sing", "chattahoochee", "turpentine"],
    "ferguson": ["fortune ferguson", "newberry", "electric chair", "jett", "capital punishment", "alachua"],
    "newberry": ["newberry six", "boisey long", "lynching", "alachua county", "1916"],
    "census": ["demographics", "spreadsheet", "workbook", "roster", "1870", "1880", "1910", "1940", "bethune", "data"],
    "solitary": ["confinement", "isolation", "white house", "punishment"],
    "law": ["case law", "statutes", "due process", "sentencing", "appellate", "calder", "counsel"],
    "photo": ["photography", "photographs", "images", "pictures", "san quentin", "gallery"],
    "photos": ["photography", "photographs", "images", "pictures", "san quentin", "gallery"],
    "photography": ["photos", "pictures", "gallery", "images"],
    "juvenile": ["youth", "boys", "girls", "children", "adolescent", "reformatory", "dozier"],
    "death penalty": ["electric chair", "execution", "capital punishment", "ferguson", "wapo"],
    "execution": ["electric chair", "death penalty", "capital punishment", "ferguson"]
  };

  const STOP_WORDS = new Set(["a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "by", "with", "is", "it", "as", "from"]);

  function normalizeText(text) {
    if (!text) return "";
    return String(text).toLowerCase().replace(/[.,\\/#!$%\\^&\\*;:{}=\\-_'’“”"\\(\\)\\[\\]?]/g, " ").replace(/\\s+/g, " ").trim();
  }

  function tokenize(query) {
    const clean = normalizeText(query);
    if (!clean) return [];
    return clean.split(" ").filter(term => term.length > 0 && !STOP_WORDS.has(term));
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
  }

  function highlightMatches(text, query) {
    if (!text || !query) return text || "";
    const tokens = tokenize(query);
    if (tokens.length === 0) return text;

    const pattern = new RegExp("(" + tokens.map(escapeRegExp).join("|") + ")", "gi");
    return String(text).replace(pattern, '<mark class="search-highlight">$1</mark>');
  }

  function scoreItem(item, query, tokens) {
    const rawQuery = normalizeText(query);
    if (!rawQuery) return 0;

    const titleNorm = normalizeText(item.title);
    const descNorm = normalizeText(item.description);
    const catNorm = normalizeText(item.category + " " + item.badge);
    const tagsNorm = normalizeText(item.tags.join(" "));
    const kwNorm = normalizeText(item.keywords.join(" "));
    const authorNorm = normalizeText(item.author || "");
    const dateNorm = normalizeText(item.date || "");

    let score = 0;
    let matchedTokens = 0;

    if (titleNorm === rawQuery) score += 150;
    else if (titleNorm.includes(rawQuery)) score += 90;

    if (tagsNorm.includes(rawQuery)) score += 80;
    if (kwNorm.includes(rawQuery)) score += 70;
    if (catNorm.includes(rawQuery)) score += 50;
    if (descNorm.includes(rawQuery)) score += 40;

    tokens.forEach(token => {
      let tokenMatched = false;

      if (titleNorm.includes(token)) {
        score += 35;
        tokenMatched = true;
      }
      if (tagsNorm.includes(token)) {
        score += 25;
        tokenMatched = true;
      }
      if (kwNorm.includes(token)) {
        score += 20;
        tokenMatched = true;
      }
      if (catNorm.includes(token)) {
        score += 15;
        tokenMatched = true;
      }
      if (descNorm.includes(token)) {
        score += 10;
        tokenMatched = true;
      }
      if (authorNorm.includes(token) || dateNorm.includes(token)) {
        score += 8;
        tokenMatched = true;
      }

      if (SYNONYMS[token]) {
        SYNONYMS[token].forEach(syn => {
          if (titleNorm.includes(syn) || tagsNorm.includes(syn) || kwNorm.includes(syn) || descNorm.includes(syn)) {
            score += 12;
            tokenMatched = true;
          }
        });
      }

      if (tokenMatched) matchedTokens++;
    });

    if (tokens.length > 1 && matchedTokens === tokens.length) {
      score += 40;
    }

    return score;
  }

  function searchArchive(query, options) {
    options = options || {};
    const q = (query || "").trim();
    const categoryFilter = options.category || "all";
    const tagFilter = options.tag || null;
    const sortBy = options.sortBy || "relevance";

    let pool = SEARCH_INDEX;

    if (categoryFilter && categoryFilter !== "all") {
      pool = pool.filter(item => item.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (tagFilter) {
      const normTag = normalizeText(tagFilter);
      pool = pool.filter(item => item.tags.some(t => normalizeText(t) === normTag));
    }

    if (!q) {
      return pool.map(item => ({
        ...item,
        score: 1,
        highlightedTitle: item.title,
        highlightedDescription: item.description
      }));
    }

    const tokens = tokenize(q);
    const scored = [];

    pool.forEach(item => {
      const score = scoreItem(item, q, tokens);
      if (score > 0) {
        scored.push({
          ...item,
          score: score,
          highlightedTitle: highlightMatches(item.title, q),
          highlightedDescription: highlightMatches(item.description, q)
        });
      }
    });

    if (sortBy === "title") {
      scored.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "date") {
      scored.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    } else {
      scored.sort((a, b) => b.score - a.score);
    }

    return scored;
  }

  function getAllTags() {
    const tagMap = new Map();
    SEARCH_INDEX.forEach(item => {
      item.tags.forEach(t => {
        tagMap.set(t, (tagMap.get(t) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  function getCategories() {
    const catMap = new Map();
    SEARCH_INDEX.forEach(item => {
      catMap.set(item.category, (catMap.get(item.category) || 0) + 1);
    });
    return Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  return {
    index: SEARCH_INDEX,
    search: searchArchive,
    highlight: highlightMatches,
    getTags: getAllTags,
    getCategories: getCategories,
    tokenize: tokenize
  };

}));
`;

fs.writeFileSync('search-data.js', searchDataModuleCode, 'utf8');
console.log('Successfully generated search-data.js with ' + SEARCH_INDEX.length + ' items.');
