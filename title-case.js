(() => {
  const rotatingQuotes = [
    ["Justice is the constant and perpetual will to render to each his due.", "Justinian"],
    ["It is better that ten guilty persons escape than that one innocent suffer.", "William Blackstone"],
    ["Where there is no law, there is no freedom.", "John Locke"],
    ["The life of the law has not been logic; it has been experience.", "Oliver Wendell Holmes Jr."],
    ["Justice delayed is justice denied.", "Legal maxim commonly associated with William E. Gladstone"],
    ["The law is reason, free from passion.", "Aristotle"],
    ["An unjust law is no law at all.", "Augustine of Hippo"],
    ["Injustice anywhere is a threat to justice everywhere.", "Martin Luther King Jr."],
    ["The arc of the moral universe is long, but it bends toward justice.", "Martin Luther King Jr., adapting Theodore Parker"],
    ["The first duty of society is justice.", "Alexander Hamilton"],
    ["Equal justice under law.", "Inscription on the U.S. Supreme Court Building"],
    ["No man is above the law.", "Theodore Roosevelt"],
    ["The law must be stable, but it must not stand still.", "Roscoe Pound"],
    ["Justice is the end of government. It is the end of civil society.", "James Madison"],
    ["The administration of justice is the firmest pillar of government.", "George Washington"],
    ["Law and order exist for the purpose of establishing justice.", "Martin Luther King Jr."],
    ["The history of liberty has largely been the history of observance of procedural safeguards.", "Felix Frankfurter"],
    ["The Constitution is not a suicide pact.", "Robert H. Jackson"],
    ["The Constitution protects us from our own best intentions.", "Louis D. Brandeis"],
    ["Sunlight is said to be the best of disinfectants.", "Louis D. Brandeis"],
    ["Crime is contagious. If the government becomes a lawbreaker, it breeds contempt for law.", "Louis D. Brandeis"],
    ["Our government is the potent, the omnipresent teacher.", "Louis D. Brandeis"],
    ["The greatest dangers to liberty lurk in insidious encroachment by men of zeal, well meaning but without understanding.", "Louis D. Brandeis"],
    ["Experience should teach us to be most on our guard to protect liberty when the government's purposes are beneficent.", "Louis D. Brandeis"],
    ["The prosecutor has more control over life, liberty, and reputation than any other person in America.", "Robert H. Jackson"],
    ["The qualities of a good prosecutor are as elusive and as impossible to define as those which mark a gentleman.", "Robert H. Jackson"],
    ["The citizen's safety lies in the prosecutor who tempers zeal with human kindness.", "Robert H. Jackson"],
    ["Courts are the mere instruments of the law.", "John Marshall"],
    ["It is emphatically the province and duty of the judicial department to say what the law is.", "John Marshall"],
    ["We must never forget that it is a constitution we are expounding.", "John Marshall"],
    ["The law will not suffer a wrong without a remedy.", "Traditional legal maxim"],
    ["No one should be a judge in his own cause.", "Traditional legal maxim"],
    ["Hear the other side.", "Audi alteram partem, ancient legal maxim"],
    ["Let justice be done though the heavens fall.", "Fiat justitia ruat caelum"],
    ["The burden of proof lies upon the one who asserts, not the one who denies.", "Traditional legal maxim"],
    ["The thing speaks for itself.", "Res ipsa loquitur"],
    ["No crime without law.", "Nullum crimen sine lege"],
    ["No punishment without law.", "Nulla poena sine lege"],
    ["Ignorance of the law excuses no one.", "Traditional legal maxim"],
    ["The law does not concern itself with trifles.", "De minimis non curat lex"],
    ["Hard cases make bad law.", "Traditional legal maxim"],
    ["Possession is nine points of the law.", "Traditional proverb"],
    ["Justice should not only be done, but should manifestly and undoubtedly be seen to be done.", "Lord Hewart"],
    ["A man's house is his castle.", "Traditional English legal maxim"],
    ["Every man's evidence is to be weighed according to its worth.", "Principle of evidence law"],
    ["Facts are stubborn things.", "John Adams"],
    ["Facts do not cease to exist because they are ignored.", "Aldous Huxley"],
    ["The truth is rarely pure and never simple.", "Oscar Wilde"],
    ["There are two sides to every question.", "Proverbial expression"],
    ["It is the spirit and not the form of law that keeps justice alive.", "Earl Warren"],
    ["The police must obey the law while enforcing the law.", "Earl Warren"],
    ["The right of the people to be secure in their persons, houses, papers, and effects ... shall not be violated.", "Fourth Amendment, U.S. Constitution"],
    ["No person shall ... be deprived of life, liberty, or property, without due process of law.", "Fifth Amendment, U.S. Constitution"],
    ["In all criminal prosecutions, the accused shall enjoy the right to a speedy and public trial.", "Sixth Amendment, U.S. Constitution"],
    ["Excessive bail shall not be required ... nor cruel and unusual punishments inflicted.", "Eighth Amendment, U.S. Constitution"],
    ["Nor shall any State deprive any person of life, liberty, or property, without due process of law.", "Fourteenth Amendment, U.S. Constitution"],
    ["All persons born or naturalized in the United States ... are citizens of the United States.", "Fourteenth Amendment, U.S. Constitution"],
    ["The accused must be presumed to be innocent until his guilt is established by legal and competent evidence.", "Coffin v. United States"],
    ["The presumption of innocence ... is axiomatic and elementary.", "Coffin v. United States"],
    ["The requirement of proof beyond a reasonable doubt has this vital role in our criminal procedure.", "In re Winship"],
    ["Neither man nor child can be allowed to stand condemned by methods which flout constitutional requirements of due process of law.", "In re Gault"],
    ["Under our Constitution, the condition of being a boy does not justify a kangaroo court.", "In re Gault"],
    ["Juvenile Court history has again demonstrated that unbridled discretion, however benevolently motivated, is frequently a poor substitute for principle and procedure.", "In re Gault"],
    ["The child requires the guiding hand of counsel at every step in the proceedings against him.", "In re Gault"],
    ["A proceeding where the issue is whether the child will be found to be delinquent and subjected to the loss of his liberty for years is comparable in seriousness to a felony prosecution.", "In re Gault"],
    ["The basic purpose of a trial is the determination of truth.", "Tehan v. Shott"],
    ["The very integrity of the judicial system and public confidence in the system depend on full disclosure of all the facts.", "United States v. Nixon"],
    ["The public has a right to every man's evidence.", "United States v. Bryan"],
    ["A fair trial in a fair tribunal is a basic requirement of due process.", "In re Murchison"],
    ["Our system of law has always endeavored to prevent even the probability of unfairness.", "In re Murchison"],
    ["The right to counsel is the right to the effective assistance of counsel.", "McMann v. Richardson"],
    ["Lawyers in criminal courts are necessities, not luxuries.", "Gideon v. Wainwright"],
    ["The right of one charged with crime to counsel may not be deemed fundamental and essential to fair trials in some countries, but it is in ours.", "Gideon v. Wainwright"],
    ["The criminal justice system is for the accused as well as the accuser.", "Principle reflected in American constitutional law"],
    ["The purpose of punishment is the prevention of crime.", "Cesare Beccaria"],
    ["It is better to prevent crimes than to punish them.", "Cesare Beccaria"],
    ["Every punishment which does not arise from absolute necessity is tyrannical.", "Cesare Beccaria"],
    ["The certainty of punishment, even if moderate, will always make a stronger impression than the fear of another which is more terrible.", "Cesare Beccaria"],
    ["Crimes are more effectually prevented by the certainty than the severity of punishment.", "Cesare Beccaria"],
    ["The death penalty cannot be useful because of the example of barbarity it gives men.", "Cesare Beccaria"],
    ["The punishment of death is the war of a nation against a citizen.", "Cesare Beccaria"],
    ["Laws are the conditions under which independent and isolated men united to form a society.", "Cesare Beccaria"],
    ["Punishment is justice for the unjust.", "Augustine of Hippo"],
    ["Mercy bears richer fruits than strict justice.", "Abraham Lincoln"],
    ["I have always found that mercy bears richer fruits than strict justice.", "Abraham Lincoln"],
    ["Capital punishment is our society's recognition of the sanctity of human life.", "Orrin Hatch"],
    ["The death penalty is no more effective a deterrent than life imprisonment.", "Argument historically associated with capital-punishment opponents"],
    ["Death is different.", "Phrase repeatedly used in U.S. capital-punishment jurisprudence"],
    ["The penalty of death is qualitatively different from a sentence of imprisonment, however long.", "Woodson v. North Carolina"],
    ["Death, in its finality, differs more from life imprisonment than a 100-year prison term differs from one of only a year or two.", "Woodson v. North Carolina"],
    ["The Eighth Amendment must draw its meaning from the evolving standards of decency that mark the progress of a maturing society.", "Trop v. Dulles"],
    ["The basic concept underlying the Eighth Amendment is nothing less than the dignity of man.", "Trop v. Dulles"],
    ["When a juvenile offender commits a heinous crime, the State can exact forfeiture of some of the most basic liberties, but the State cannot extinguish his life and his potential to attain a mature understanding of his own humanity.", "Graham v. Florida"],
    ["The concept of proportionality is central to the Eighth Amendment.", "Graham v. Florida"],
    ["Children are constitutionally different from adults for purposes of sentencing.", "Miller v. Alabama"],
    ["Youth matters in determining the appropriateness of a lifetime of incarceration without the possibility of parole.", "Miller v. Alabama"],
    ["The case for retribution is not as strong with a minor as with an adult.", "Roper v. Simmons"],
    ["The susceptibility of juveniles to immature and irresponsible behavior means their irresponsible conduct is not as morally reprehensible as that of an adult.", "Roper v. Simmons"],
    ["A lawsuit is a fruit tree planted in a lawyer's garden.", "Italian proverb"],
    ["The law is a seamless web.", "Frederic William Maitland"]
  ];

  const pageName = window.location.pathname.split("/").pop() || "index2.html";
  const quoteEpoch = Math.floor(Date.now() / (15 * 24 * 60 * 60 * 1000));
  const quoteSeed = `${pageName}:${quoteEpoch}`;
  let quoteHash = 0;
  for (let index = 0; index < quoteSeed.length; index += 1) quoteHash = ((quoteHash << 5) - quoteHash) + quoteSeed.charCodeAt(index) | 0;
  const selectedQuote = rotatingQuotes[Math.abs(quoteHash) % rotatingQuotes.length];
  if (!document.querySelector(".research-context")) {
    const context = document.createElement("section");
    context.className = "research-context";
    context.setAttribute("aria-labelledby", "research-context-title");
    const title = document.createElement("h2");
    title.id = "research-context-title";
    title.textContent = "A Wise Person Once Said...";
    title.dataset.titleCaseApplied = "true";
    const body = document.createElement("p");
    body.textContent = `“${selectedQuote[0]}” — ${selectedQuote[1]}`;
    context.append(title, body);
    const footer = document.querySelector("footer");
    if (footer) footer.before(context);
    else (document.querySelector("main") || document.body).append(context);
    context.style.cssText = "background: linear-gradient(135deg, #091e36, #102c4c); border-left: 8px solid #c29b53; border-top: 0; color: #fff; margin: 3rem 0 0; padding: clamp(2.5rem, 6vw, 5rem) max(1.3rem, calc((100% - 1100px) / 2));";
    title.style.cssText = "color: #c29b53; font: 700 clamp(1.6rem, 3vw, 2.6rem) 'Libre Baskerville', serif; margin: 0 0 1rem;";
    body.style.cssText = "color: #e6dfd1; font-size: 1.1rem; line-height: 1.7; margin: 0; max-width: 760px;";
  }

  const romanValues = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const isRomanNumeral = (value) => {
    const letters = value.toUpperCase();
    if (!/^[IVXLCDM]+$/.test(letters)) return false;
    let total = 0;
    for (let index = 0; index < letters.length; index += 1) {
      const current = romanValues[letters[index]];
      const next = romanValues[letters[index + 1]] || 0;
      total += current < next ? -current : current;
    }
    return total > 0 && total <= 3999 && toRoman(total) === letters;
  };

  function toRoman(number) {
    const values = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let result = "";
    values.forEach(([value, numeral]) => {
      while (number >= value) {
        result += numeral;
        number -= value;
      }
    });
    return result;
  }

  const normalizeToken = (word) => {
    if (!/[A-Za-z]/.test(word) || word === "CCC" || /^(?:[A-Z]\.)+$/.test(word)) return word;
    const match = word.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
    if (!match) return word;
    const [, prefix, letters, suffix] = match;
    if (isRomanNumeral(letters)) return prefix + letters.toUpperCase() + suffix;
    if (/\d/.test(word)) return word;
    return prefix + letters[0].toUpperCase() + letters.slice(1).toLowerCase() + suffix;
  };

  const normalizeNavigationLabel = (value) => value.split(/(\s+)/).map(normalizeToken).join("");

  const titleCaseSelectors = "h1, h2, h3, h4, h5, nav a, button, .archive-link, .explore-card a, .news-more-link, .prison-hero-link, .topic-card a, .source";
  document.querySelectorAll(titleCaseSelectors).forEach((element) => {
    if (element.dataset.titleCaseApplied === "true") return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach((textNode) => {
      textNode.nodeValue = normalizeNavigationLabel(textNode.nodeValue);
    });
    element.dataset.titleCaseApplied = "true";
  });

  document.querySelectorAll("nav a").forEach((link) => {
    link.textContent = normalizeNavigationLabel(link.textContent.trim());
  });
})();
