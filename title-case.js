(() => {
  const pageNotes = {
    "ABOUT.html": "Every archive makes choices about what can be found and what remains difficult to see. These collections place institutional records beside legal decisions, photographs, and testimony so researchers can ask who produced the record, whose account was authorized, and what history changes when the evidence is read against the official story.",
    "BOOKS-AND-MANUSCRIPTS.html": "Books and manuscripts reveal how punishment has been explained, defended, challenged, and revised. Compare institutional language with later scholarship and handwritten evidence to investigate when reform becomes policy, when it remains rhetoric, and how ideas about confinement travel across generations.",
    "COLLECTIONS.html": "This is not a neutral pile of documents. It is a working evidence base for asking how the justice system records power, how institutions describe themselves, and what incarcerated people and their families preserved outside official channels. Follow a collection, then test its story against another.",
    "CONTACT.html": "The gaps in a record are often the beginning of the best question. Contact the collection about an unidentified person, a contradictory date, a missing source, or a connection between a legal document and lived experience. Independent research improves when uncertainty is documented instead of concealed.",
    "PHOTOGRAPHY.html": "A photograph can show a building, a uniform, a work detail, or a carefully staged moment. It cannot explain itself. Study who made the image, who commissioned it, what falls outside the frame, and how the picture changes when compared with records of custody, labor, education, or violence.",
    "DONATE.html": "Open research depends on unglamorous work: scanning, description, file preservation, rights review, and time spent checking a claim against an original source. Independent support keeps that work accountable to researchers and communities rather than to commercial attention cycles.",
    "DOZIER-RESEARCH.html": "The Dozier record asks a difficult question: what happens when an institution's public language of education and discipline is read beside forensic findings about deaths and burials? This brief separates administrative description from later investigation and lets the evidence, including its silences, remain visible.",
    "FORTUNE-FERGUSON.html": "A prison record can reduce a person to a name, date, and disposition. The Ferguson materials ask what is lost in that compression, and what becomes visible when the individual record is placed beside Florida's racialized history of capital punishment.",
    "index.html": "The visual entry point opens onto an archive about incarceration, law, and historical memory. Begin with the image, then ask what documentation sits behind it, whose perspective is missing, and which primary sources could challenge the first impression.",
    "index2.html": "The visual entry point opens onto an archive about incarceration, law, and historical memory. Begin with the image, then ask what documentation sits behind it, whose perspective is missing, and which primary sources could challenge the first impression.",
    "LAW-LIBRARY.html": "Law is often presented as settled text. These materials invite a harder reading: how did a rule operate in practice, who could invoke it, and what happened between a court's language and a confined person's life? Compare cases, statutes, and reform documents across time and jurisdiction.",
    "NEWS.html": "The Review treats news as a first draft of the historical record. Its investigations connect current legal disputes and public memory to older files, photographs, and testimony, asking which familiar explanations survive contact with the archive.",
    "PERSONAL-COLLECTIONS.html": "Institutional records rarely preserve the whole life they describe. Letters, memories, and family materials return voice, uncertainty, and consequence to the historical record. Read them carefully: testimony is evidence, but it also carries context, consent, memory, and the right to withhold.",
    "PHOTOGRAPHY-BY-STATE.html": "Place changes the meaning of a record. A state index lets researchers compare jurisdiction, facility design, local policy, and public memory without assuming that one state's history stands for another's. Use the map to find patterns, then investigate the exceptions.",
    "RESEARCH-STARTERS.html": "A strong research question is narrower than a subject and more difficult than a search term. These starters help turn broad concerns into testable inquiries by naming the source, the tension, and the evidence that could prove an interpretation wrong.",
    "RESEARCH.html": "The research desk gathers working arguments, methods, and case materials before they become settled conclusions. Use it to compare interpretations, track the limits of a source, and connect legal records with institutional documents and testimony from people directly affected.",
  };

  const pageName = window.location.pathname.split("/").pop() || "index2.html";
  const noteKey = Object.keys(pageNotes).find((k) => k.toLowerCase() === pageName.toLowerCase()) || "index2.html";
  const note = pageNotes[noteKey];
  if (note && !document.querySelector(".research-context")) {
    const context = document.createElement("section");
    context.className = "research-context";
    context.setAttribute("aria-labelledby", "research-context-title");
    const title = document.createElement("h2");
    title.id = "research-context-title";
    title.textContent = "Research and archival use";
    const body = document.createElement("p");
    body.textContent = note;
    context.append(title, body);
    const target = document.querySelector("main") || document.body;
    target.append(context);
    context.style.cssText = "background: linear-gradient(135deg, #091e36, #102c4c); border-top: 8px solid #c29b53; color: #fff; margin: 3rem 0 0; padding: clamp(2.5rem, 6vw, 5rem) max(1.3rem, calc((100% - 1100px) / 2));";
    title.style.cssText = "color: #c29b53; font: 700 clamp(1.6rem, 3vw, 2.6rem) 'Libre Baskerville', serif; margin: 0 0 1rem;";
    body.style.cssText = "color: #e6dfd1; font-size: 1.1rem; line-height: 1.7; margin: 0; max-width: 760px;";
  }

  const normalizeNavigationLabel = (value) => value.split(/(\s+)/).map((word) => {
    if (!/[A-Za-z]/.test(word) || word === "CCC") return word;
    const firstLetter = word.search(/[A-Za-z]/);
    return word.slice(0, firstLetter) + word[firstLetter].toUpperCase() + word.slice(firstLetter + 1).toLowerCase();
  }).join("");

  const titleCaseSelectors = "h1, h2, h3, h4, h5, nav a, button, .archive-link, .explore-card a, .news-more-link, .prison-hero-link, .topic-card a, .source";
  document.querySelectorAll(titleCaseSelectors).forEach((element) => {
    if (element.dataset.titleCaseApplied === "true" || element.children.length > 0) return;
    element.textContent = normalizeNavigationLabel(element.textContent.trim());
    element.dataset.titleCaseApplied = "true";
  });

  document.querySelectorAll("nav a").forEach((link) => {
    link.textContent = normalizeNavigationLabel(link.textContent.trim());
  });
})();
