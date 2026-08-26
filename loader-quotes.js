/* Shared homepage loading epigraphs. Source list: user-supplied quotes 1–200. */
(() => {
  "use strict";

  const loaderQuotes = Object.freeze([
  {
    "text": "“Law is order, and good law is good order.”",
    "attribution": "Aristotle"
  },
  {
    "text": "“Where there is no law, there is no freedom.”",
    "attribution": "John Locke"
  },
  {
    "text": "“The safety of the people shall be the highest law.”",
    "attribution": "Marcus Tullius Cicero"
  },
  {
    "text": "“We are servants of the law in order that we may be free.”",
    "attribution": "Cicero"
  },
  {
    "text": "“An unjust law is no law at all.”",
    "attribution": "St. Augustine"
  },
  {
    "text": "“Justice is the constant and perpetual will to allot to every man his due.”",
    "attribution": "Justinian I"
  },
  {
    "text": "“The law is reason, free from passion.”",
    "attribution": "Aristotle"
  },
  {
    "text": "“The end of law is not to abolish or restrain, but to preserve and enlarge freedom.”",
    "attribution": "John Locke"
  },
  {
    "text": "“Laws are like cobwebs, which may catch small flies, but let wasps and hornets break through.”",
    "attribution": "Jonathan Swift"
  },
  {
    "text": "“Where law ends, tyranny begins.”",
    "attribution": "John Locke"
  },
  {
    "text": "“It is better to risk saving a guilty man than to condemn an innocent one.”",
    "attribution": "Voltaire"
  },
  {
    "text": "“Law and order exist for the purpose of establishing justice.”",
    "attribution": "Martin Luther King Jr."
  },
  {
    "text": "“Injustice anywhere is a threat to justice everywhere.”",
    "attribution": "Martin Luther King Jr."
  },
  {
    "text": "“Justice too long delayed is justice denied.”",
    "attribution": "Martin Luther King Jr."
  },
  {
    "text": "“The first duty of society is justice.”",
    "attribution": "Alexander Hamilton"
  },
  {
    "text": "“The law must be stable, but it must not stand still.”",
    "attribution": "Roscoe Pound"
  },
  {
    "text": "“The life of the law has not been logic; it has been experience.”",
    "attribution": "Oliver Wendell Holmes Jr."
  },
  {
    "text": "“The law embodies beliefs that have triumphed in the battle of ideas.”",
    "attribution": "Oliver Wendell Holmes Jr."
  },
  {
    "text": "“Liberty can have nothing to fear from the judiciary alone.”",
    "attribution": "Alexander Hamilton"
  },
  {
    "text": "“If men were angels, no government would be necessary.”",
    "attribution": "James Madison"
  },
  {
    "text": "“Crimes are more effectually prevented by the certainty than the severity of punishment.”",
    "attribution": "Cesare Beccaria"
  },
  {
    "text": "“Every punishment which does not arise from absolute necessity is tyrannical.”",
    "attribution": "Cesare Beccaria"
  },
  {
    "text": "“It is better to prevent crimes than to punish them.”",
    "attribution": "Cesare Beccaria"
  },
  {
    "text": "“The purpose of punishment is not to torment a sentient being.”",
    "attribution": "Cesare Beccaria"
  },
  {
    "text": "“The punishment of death is the war of a nation against a citizen.”",
    "attribution": "Cesare Beccaria"
  },
  {
    "text": "“Laws are the conditions under which men, naturally independent, united themselves in society.”",
    "attribution": "Cesare Beccaria"
  },
  {
    "text": "“The greatest happiness of the greatest number is the foundation of morals and legislation.”",
    "attribution": "Jeremy Bentham"
  },
  {
    "text": "“Nature has placed mankind under the governance of two sovereign masters, pain and pleasure.”",
    "attribution": "Jeremy Bentham"
  },
  {
    "text": "“The question is not, Can they reason? nor, Can they talk? but, Can they suffer?”",
    "attribution": "Jeremy Bentham"
  },
  {
    "text": "“Every crime is born of necessity.”",
    "attribution": "Cesare Beccaria"
  },
  {
    "text": "“He who does not prevent a crime when he can, encourages it.”",
    "attribution": "Seneca"
  },
  {
    "text": "“Poverty is the parent of revolution and crime.”",
    "attribution": "Aristotle"
  },
  {
    "text": "“Opportunity makes a thief.”",
    "attribution": "Francis Bacon"
  },
  {
    "text": "“A society should be judged not by how it treats its outstanding citizens but by how it treats its criminals.”",
    "attribution": "Fyodor Dostoevsky, commonly translated from his writings on imprisonment"
  },
  {
    "text": "“The degree of civilization in a society can be judged by entering its prisons.”",
    "attribution": "Fyodor Dostoevsky, commonly attributed from The House of the Dead"
  },
  {
    "text": "“Crime is contagious. If the Government becomes a lawbreaker, it breeds contempt for law.”",
    "attribution": "Louis D. Brandeis, Olmstead v. United States"
  },
  {
    "text": "“The criminal is the creative artist; the detective only the critic.”",
    "attribution": "G. K. Chesterton"
  },
  {
    "text": "“The criminal law is a blunt instrument.”",
    "attribution": "Lord Atkin"
  },
  {
    "text": "“Punishment is justice for the unjust.”",
    "attribution": "St. Augustine"
  },
  {
    "text": "“The fault, dear Brutus, is not in our stars, but in ourselves.”",
    "attribution": "William Shakespeare, Julius Caesar"
  },
  {
    "text": "“It is better that ten guilty persons escape than that one innocent suffer.”",
    "attribution": "William Blackstone"
  },
  {
    "text": "“The proof of guilt must exclude every reasonable hypothesis except that of guilt.”",
    "attribution": "Traditional formulation of the reasonable doubt principle"
  },
  {
    "text": "“The presumption of innocence is a basic component of a fair trial.”",
    "attribution": "U.S. Supreme Court, Estelle v. Williams"
  },
  {
    "text": "“The principle that there is a presumption of innocence in favor of the accused is the undoubted law.”",
    "attribution": "U.S. Supreme Court, Coffin v. United States"
  },
  {
    "text": "“The presumption in favor of innocence is not to be redargued by mere suspicion.”",
    "attribution": "Lord Gillies, quoted in Coffin v. United States"
  },
  {
    "text": "“Suspicion, however strong, cannot take the place of proof.”",
    "attribution": "Common judicial formulation"
  },
  {
    "text": "“It is more important that innocence be protected than it is that guilt be punished.”",
    "attribution": "John Adams"
  },
  {
    "text": "“Facts are stubborn things.”",
    "attribution": "John Adams"
  },
  {
    "text": "“The innocent and the beautiful have no enemy but time.”",
    "attribution": "William Butler Yeats"
  },
  {
    "text": "“No man is to be judged unheard.”",
    "attribution": "Traditional maxim, audi alteram partem"
  },
  {
    "text": "“No one shall be condemned unheard.”",
    "attribution": "Classical due process principle"
  },
  {
    "text": "“The burden of proof is on him who declares, not on him who denies.”",
    "attribution": "Roman law maxim"
  },
  {
    "text": "“No man should be deprived of his liberty merely because he is unable to prove his innocence.”",
    "attribution": "Principle reflected in Anglo American due process jurisprudence"
  },
  {
    "text": "“A reasonable doubt is one based on reason.”",
    "attribution": "Common American jury instruction formulation"
  },
  {
    "text": "“The law presumes every man innocent until he is proved guilty.”",
    "attribution": "Traditional common law formulation"
  },
  {
    "text": "“Better that a guilty person should escape than that an innocent person should suffer.”",
    "attribution": "English common law tradition"
  },
  {
    "text": "“The accused has the benefit of every reasonable doubt.”",
    "attribution": "Traditional criminal law principle"
  },
  {
    "text": "“Proof beyond a reasonable doubt is indispensable to command the respect and confidence of the community.”",
    "attribution": "U.S. Supreme Court, In re Winship"
  },
  {
    "text": "“The reasonable doubt standard plays a vital role in the American scheme of criminal procedure.”",
    "attribution": "U.S. Supreme Court, In re Winship"
  },
  {
    "text": "“The accused during a criminal prosecution has at stake interests of immense importance.”",
    "attribution": "U.S. Supreme Court, In re Winship"
  },
  {
    "text": "“Facts are stubborn things.”",
    "attribution": "John Adams"
  },
  {
    "text": "“Evidence is the basis of justice.”",
    "attribution": "Jeremy Bentham, principle underlying his writings on judicial evidence"
  },
  {
    "text": "“There is no worse torture than the torture of laws.”",
    "attribution": "Francis Bacon"
  },
  {
    "text": "“If we are to keep our democracy, there must be one commandment: Thou shalt not ration justice.”",
    "attribution": "Learned Hand"
  },
  {
    "text": "“The spirit of liberty is the spirit which is not too sure that it is right.”",
    "attribution": "Learned Hand"
  },
  {
    "text": "“Words are not transparent and unchanged crystals.”",
    "attribution": "Oliver Wendell Holmes Jr."
  },
  {
    "text": "“A page of history is worth a volume of logic.”",
    "attribution": "Oliver Wendell Holmes Jr."
  },
  {
    "text": "“The best test of truth is the power of the thought to get itself accepted in the competition of the market.”",
    "attribution": "Oliver Wendell Holmes Jr., Abrams v. United States"
  },
  {
    "text": "“Sunlight is said to be the best of disinfectants.”",
    "attribution": "Louis D. Brandeis"
  },
  {
    "text": "“Publicity is justly commended as a remedy for social and industrial diseases.”",
    "attribution": "Louis D. Brandeis"
  },
  {
    "text": "“Cross examination is beyond any doubt the greatest legal engine ever invented for the discovery of truth.”",
    "attribution": "John Henry Wigmore"
  },
  {
    "text": "“There is always a well known solution to every human problem, neat, plausible, and wrong.”",
    "attribution": "H. L. Mencken"
  },
  {
    "text": "“What can be asserted without evidence can also be dismissed without evidence.”",
    "attribution": "Christopher Hitchens"
  },
  {
    "text": "“Extraordinary claims require extraordinary evidence.”",
    "attribution": "Carl Sagan"
  },
  {
    "text": "“Absence of evidence is not evidence of absence.”",
    "attribution": "Martin Rees, popularized by Carl Sagan"
  },
  {
    "text": "“It is a capital mistake to theorize before one has data.”",
    "attribution": "Arthur Conan Doyle, A Scandal in Bohemia"
  },
  {
    "text": "“Insensibly one begins to twist facts to suit theories, instead of theories to suit facts.”",
    "attribution": "Arthur Conan Doyle, A Scandal in Bohemia"
  },
  {
    "text": "“There is nothing more deceptive than an obvious fact.”",
    "attribution": "Arthur Conan Doyle, The Boscombe Valley Mystery"
  },
  {
    "text": "“When you have eliminated the impossible, whatever remains, however improbable, must be the truth.”",
    "attribution": "Arthur Conan Doyle, The Sign of Four"
  },
  {
    "text": "“You see, but you do not observe.”",
    "attribution": "Arthur Conan Doyle, A Scandal in Bohemia"
  },
  {
    "text": "“Thou shalt not kill.”",
    "attribution": "Exodus 20:13, traditional King James rendering"
  },
  {
    "text": "“Whoever fights monsters should see to it that in the process he does not become a monster.”",
    "attribution": "Friedrich Nietzsche"
  },
  {
    "text": "“An eye for an eye only ends up making the whole world blind.”",
    "attribution": "Commonly attributed to Mahatma Gandhi"
  },
  {
    "text": "“Returning violence for violence multiplies violence.”",
    "attribution": "Martin Luther King Jr."
  },
  {
    "text": "“Hate cannot drive out hate; only love can do that.”",
    "attribution": "Martin Luther King Jr."
  },
  {
    "text": "“Violence is the last refuge of the incompetent.”",
    "attribution": "Isaac Asimov"
  },
  {
    "text": "“Murder most foul, as in the best it is.”",
    "attribution": "William Shakespeare, Hamlet"
  },
  {
    "text": "“Blood will have blood.”",
    "attribution": "William Shakespeare, Macbeth"
  },
  {
    "text": "“Will all great Neptune’s ocean wash this blood clean from my hand?”",
    "attribution": "William Shakespeare, Macbeth"
  },
  {
    "text": "“I am in blood stepped in so far.”",
    "attribution": "William Shakespeare, Macbeth"
  },
  {
    "text": "“For murder, though it have no tongue, will speak.”",
    "attribution": "William Shakespeare, Hamlet"
  },
  {
    "text": "“Mercy but murders, pardoning those that kill.”",
    "attribution": "William Shakespeare, Romeo and Juliet"
  },
  {
    "text": "“The quality of mercy is not strained.”",
    "attribution": "William Shakespeare, The Merchant of Venice"
  },
  {
    "text": "“Earth provides enough to satisfy every man’s need, but not every man’s greed.”",
    "attribution": "Commonly attributed to Mahatma Gandhi"
  },
  {
    "text": "“Violence breeds violence.”",
    "attribution": "Martin Luther King Jr."
  },
  {
    "text": "“Nothing good ever comes of violence.”",
    "attribution": "Martin Luther"
  },
  {
    "text": "“Force is all conquering, but its victories are short lived.”",
    "attribution": "Abraham Lincoln"
  },
  {
    "text": "“The death penalty is the special and eternal sign of barbarism.”",
    "attribution": "Victor Hugo"
  },
  {
    "text": "“What says the law? You will not kill. How does it say it? By killing!”",
    "attribution": "Victor Hugo"
  },
  {
    "text": "“Capital punishment is the most premeditated of murders.”",
    "attribution": "Albert Camus"
  },
  {
    "text": "“Thou shalt not steal.”",
    "attribution": "Exodus 20:15"
  },
  {
    "text": "“Property is theft!”",
    "attribution": "Pierre Joseph Proudhon"
  },
  {
    "text": "“Possession is nine points of the law.”",
    "attribution": "Traditional English proverb"
  },
  {
    "text": "“Opportunity makes a thief.”",
    "attribution": "Francis Bacon"
  },
  {
    "text": "“If poverty is the mother of crime, lack of sense is the father.”",
    "attribution": "Jean de La Bruyère"
  },
  {
    "text": "“A thief believes everybody steals.”",
    "attribution": "E. W. Howe"
  },
  {
    "text": "“Who steals my purse steals trash.”",
    "attribution": "William Shakespeare, Othello"
  },
  {
    "text": "“But he that filches from me my good name robs me of that which not enriches him.”",
    "attribution": "William Shakespeare, Othello"
  },
  {
    "text": "“No legacy is so rich as honesty.”",
    "attribution": "William Shakespeare, All’s Well That Ends Well"
  },
  {
    "text": "“Honesty is the best policy.”",
    "attribution": "Benjamin Franklin"
  },
  {
    "text": "“He that steals an egg will steal an ox.”",
    "attribution": "Traditional proverb"
  },
  {
    "text": "“The love of money is the root of all evil.”",
    "attribution": "1 Timothy 6:10, traditional rendering"
  },
  {
    "text": "“Avarice is the root of all evil.”",
    "attribution": "Geoffrey Chaucer, The Pardoner’s Tale"
  },
  {
    "text": "“Money often costs too much.”",
    "attribution": "Ralph Waldo Emerson"
  },
  {
    "text": "“The lack of money is the root of all evil.”",
    "attribution": "George Bernard Shaw"
  },
  {
    "text": "“There are two times in a man’s life when he should not speculate: when he can’t afford it and when he can.”",
    "attribution": "Mark Twain"
  },
  {
    "text": "“It is not the man who has too little, but the man who craves more, that is poor.”",
    "attribution": "Seneca"
  },
  {
    "text": "“No man can serve two masters.”",
    "attribution": "Matthew 6:24"
  },
  {
    "text": "“Content makes poor men rich; discontent makes rich men poor.”",
    "attribution": "Benjamin Franklin"
  },
  {
    "text": "“A great fortune is a great slavery.”",
    "attribution": "Seneca"
  },
  {
    "text": "“Justice must not only be done, but must also be seen to be done.”",
    "attribution": "Lord Hewart, R v. Sussex Justices, ex parte McCarthy"
  },
  {
    "text": "“Hard cases make bad law.”",
    "attribution": "Traditional legal maxim, associated with Winterbottom v. Wright"
  },
  {
    "text": "“Ignorance of the law excuses no man.”",
    "attribution": "Traditional legal maxim"
  },
  {
    "text": "“No man is above the law.”",
    "attribution": "Principle of the rule of law"
  },
  {
    "text": "“No man is entitled to the blessings of freedom unless he be vigilant in its preservation.”",
    "attribution": "General Douglas MacArthur"
  },
  {
    "text": "“The Constitution is not a suicide pact.”",
    "attribution": "Justice Robert H. Jackson, Terminiello v. Chicago dissent"
  },
  {
    "text": "“The Constitution is color blind.”",
    "attribution": "Justice John Marshall Harlan, Plessy v. Ferguson dissent"
  },
  {
    "text": "“Our Constitution is color blind, and neither knows nor tolerates classes among citizens.”",
    "attribution": "Justice John Marshall Harlan, Plessy v. Ferguson"
  },
  {
    "text": "“The Constitution protects us from our own best intentions.”",
    "attribution": "Justice Antonin Scalia"
  },
  {
    "text": "“The Constitution is not an instrument for the government to restrain the people.”",
    "attribution": "Patrick Henry, commonly attributed"
  },
  {
    "text": "“The judiciary has neither force nor will, but merely judgment.”",
    "attribution": "Alexander Hamilton, Federalist No. 78"
  },
  {
    "text": "“No legislative act contrary to the Constitution can be valid.”",
    "attribution": "Alexander Hamilton"
  },
  {
    "text": "“The interpretation of the laws is the proper and peculiar province of the courts.”",
    "attribution": "Alexander Hamilton"
  },
  {
    "text": "“It is emphatically the province and duty of the judicial department to say what the law is.”",
    "attribution": "Chief Justice John Marshall, Marbury v. Madison"
  },
  {
    "text": "“The government of the United States has been emphatically termed a government of laws, and not of men.”",
    "attribution": "Chief Justice John Marshall, Marbury v. Madison"
  },
  {
    "text": "“Power concedes nothing without a demand.”",
    "attribution": "Frederick Douglass"
  },
  {
    "text": "“Where justice is denied, where poverty is enforced, neither persons nor property will be safe.”",
    "attribution": "Frederick Douglass"
  },
  {
    "text": "“Right is of no sex, truth is of no color.”",
    "attribution": "Frederick Douglass"
  },
  {
    "text": "“The law knows no finer hour than when it cuts through formal concepts and transitory emotions to protect unpopular citizens.”",
    "attribution": "Justice William O. Douglas"
  },
  {
    "text": "“The history of liberty has largely been the history of observance of procedural safeguards.”",
    "attribution": "Justice Felix Frankfurter"
  },
  {
    "text": "“Equal justice under law.”",
    "attribution": "Inscription on the U.S. Supreme Court Building"
  },
  {
    "text": "“Justice is not to be taken by storm. She is to be wooed by slow advances.”",
    "attribution": "Justice Benjamin Cardozo"
  },
  {
    "text": "“The judge, even when he is free, is still not wholly free.”",
    "attribution": "Benjamin Cardozo"
  },
  {
    "text": "“We are not final because we are infallible, but we are infallible only because we are final.”",
    "attribution": "Justice Robert H. Jackson"
  },
  {
    "text": "“The Supreme Court is not and never has been primarily concerned with the correction of errors in lower court decisions.”",
    "attribution": "Chief Justice William Rehnquist"
  },
  {
    "text": "“Judges are not politicians, even when they come to the bench by way of the ballot.”",
    "attribution": "Chief Justice William Rehnquist"
  },
  {
    "text": "“The Constitution does not enact Mr. Herbert Spencer’s Social Statics.”",
    "attribution": "Justice Oliver Wendell Holmes Jr., Lochner v. New York dissent"
  },
  {
    "text": "“Great cases like hard cases make bad law.”",
    "attribution": "Justice Oliver Wendell Holmes Jr."
  },
  {
    "text": "“General propositions do not decide concrete cases.”",
    "attribution": "Justice Oliver Wendell Holmes Jr."
  },
  {
    "text": "“A word is not a crystal, transparent and unchanged.”",
    "attribution": "Justice Oliver Wendell Holmes Jr."
  },
  {
    "text": "“The most stringent protection of free speech would not protect a man in falsely shouting fire in a theatre.”",
    "attribution": "Justice Oliver Wendell Holmes Jr., Schenck v. United States"
  },
  {
    "text": "“The Constitution is not intended to embody a particular economic theory.”",
    "attribution": "Justice Oliver Wendell Holmes Jr."
  },
  {
    "text": "“The right to be let alone is indeed the beginning of all freedom.”",
    "attribution": "Justice William O. Douglas"
  },
  {
    "text": "“The right to be heard would be, in many cases, of little avail if it did not comprehend the right to be heard by counsel.”",
    "attribution": "Justice George Sutherland, Powell v. Alabama"
  },
  {
    "text": "“The right of one charged with crime to counsel may not be deemed fundamental in some countries, but it is in ours.”",
    "attribution": "Justice Hugo Black, Gideon v. Wainwright"
  },
  {
    "text": "“Lawyers in criminal courts are necessities, not luxuries.”",
    "attribution": "Justice Hugo Black, Gideon v. Wainwright"
  },
  {
    "text": "“The basic purpose of a trial is the determination of truth.”",
    "attribution": "U.S. Supreme Court, Tehan v. Shott"
  },
  {
    "text": "“Society wins not only when the guilty are convicted but when criminal trials are fair.”",
    "attribution": "Justice William Brennan, Brady v. Maryland"
  },
  {
    "text": "“Our system of the administration of justice suffers when any accused is treated unfairly.”",
    "attribution": "U.S. Supreme Court"
  },
  {
    "text": "“Courts are not representative bodies. They are not designed to be a good reflex of a democratic society.”",
    "attribution": "Justice Felix Frankfurter"
  },
  {
    "text": "“It is not the prisoners who need reformation. It is the prisons.”",
    "attribution": "Oscar Wilde"
  },
  {
    "text": "“One of the tragedies of prison life is that it turns a man’s heart to stone.”",
    "attribution": "Oscar Wilde"
  },
  {
    "text": "“Many men on their release carry their prison about with them into the air.”",
    "attribution": "Oscar Wilde"
  },
  {
    "text": "“Every prisoner suffers day and night from hunger.”",
    "attribution": "Oscar Wilde"
  },
  {
    "text": "“The present prison system seems almost to have for its aim the wrecking and destruction of the mental faculties.”",
    "attribution": "Oscar Wilde"
  },
  {
    "text": "“There are three permanent punishments authorised by law in English prisons: Hunger. Insomnia. Disease.”",
    "attribution": "Oscar Wilde"
  },
  {
    "text": "“The mood and temper of the public in regard to the treatment of crime and criminals is one of the most unfailing tests of civilization.”",
    "attribution": "Winston Churchill"
  },
  {
    "text": "“Men are not hanged for stealing horses, but that horses may not be stolen.”",
    "attribution": "George Savile, Marquess of Halifax"
  },
  {
    "text": "“The object of punishment is prevention from evil.”",
    "attribution": "Plato"
  },
  {
    "text": "“Punishment is not for revenge, but to lessen crime and reform the criminal.”",
    "attribution": "Elizabeth Fry, principle associated with her prison reform work"
  },
  {
    "text": "“There is no person so severely punished as those who subject themselves to the whip of their own remorse.”",
    "attribution": "Seneca"
  },
  {
    "text": "“He who opens a school door closes a prison.”",
    "attribution": "Victor Hugo"
  },
  {
    "text": "“To open a school is to close a prison.”",
    "attribution": "Victor Hugo, alternate translation"
  },
  {
    "text": "“The worst prison would be a closed heart.”",
    "attribution": "Pope John Paul II"
  },
  {
    "text": "“No one truly knows a nation until one has been inside its jails.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“A nation should not be judged by how it treats its highest citizens, but its lowest ones.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“Prison itself is a tremendous education in the need for patience and perseverance.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“In prison, illusions can offer comfort.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“I had read that prison is a place where a man has time to think.”",
    "attribution": "Malcolm X"
  },
  {
    "text": "“The most important thing I learned in prison was that I had to change.”",
    "attribution": "Malcolm X, reflecting on his incarceration and education"
  },
  {
    "text": "“There is no easy walk to freedom anywhere.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“To be free is not merely to cast off one’s chains.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“I learned that courage was not the absence of fear, but the triumph over it.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“Education is the most powerful weapon which you can use to change the world.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“I have cherished the ideal of a democratic and free society.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“I am prepared to die.”",
    "attribution": "Nelson Mandela, Rivonia Trial statement"
  },
  {
    "text": "“I knew as well as I knew anything that the oppressor must be liberated just as surely as the oppressed.”",
    "attribution": "Nelson Mandela"
  },
  {
    "text": "“Once a man has been in prison, he appreciates freedom.”",
    "attribution": "Malcolm X"
  },
  {
    "text": "“My alma mater was books, a good library.”",
    "attribution": "Malcolm X"
  },
  {
    "text": "“I have often reflected upon the new vistas that reading opened to me.”",
    "attribution": "Malcolm X"
  },
  {
    "text": "“People don’t realize how a man’s whole life can be changed by one book.”",
    "attribution": "Malcolm X"
  },
  {
    "text": "“Without education, you’re not going anywhere in this world.”",
    "attribution": "Malcolm X"
  },
  {
    "text": "“I never saw a man who looked with such a wistful eye upon that little tent of blue which prisoners call the sky.”",
    "attribution": "Oscar Wilde, The Ballad of Reading Gaol"
  },
  {
    "text": "“Each man kills the thing he loves.”",
    "attribution": "Oscar Wilde, The Ballad of Reading Gaol"
  },
  {
    "text": "“For all men kill the thing they love.”",
    "attribution": "Oscar Wilde, The Ballad of Reading Gaol"
  },
  {
    "text": "“The vilest deeds like poison weeds bloom well in prison air.”",
    "attribution": "Oscar Wilde, The Ballad of Reading Gaol"
  },
  {
    "text": "“Something was dead in each of us, and what was dead was Hope.”",
    "attribution": "Oscar Wilde, The Ballad of Reading Gaol"
  },
  {
    "text": "“The man had killed the thing he loved, and so he had to die.”",
    "attribution": "Oscar Wilde, The Ballad of Reading Gaol"
  },
  {
    "text": "“Every stone one lifts by day becomes one’s heart by night.”",
    "attribution": "Oscar Wilde, The Ballad of Reading Gaol"
  },
  {
    "text": "“Yet each man does not die.”",
    "attribution": "Oscar Wilde, The Ballad of Reading Gaol"
  }
]);
  const quoteElement = document.querySelector("[data-loader-quote]");
  const attributionElement = document.querySelector("[data-loader-attribution]");
  const panel = quoteElement && quoteElement.closest(".page-loader-panel");

  if (!quoteElement || !attributionElement || !loaderQuotes.length) return;

  const selection = loaderQuotes[Math.floor(Math.random() * loaderQuotes.length)];
  quoteElement.textContent = selection.text;
  attributionElement.textContent = "— " + selection.attribution;

  if (panel) {
    const epigraphLength = selection.text.length + selection.attribution.length;
    panel.classList.toggle("has-long-epigraph", epigraphLength > 150);
    panel.classList.toggle("has-extended-epigraph", epigraphLength > 180);
  }
})();
