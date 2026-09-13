const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org", "sharklasers.com",
  "grr.la", "spam4.me", "trashmail.com", "trashmail.me", "trashmail.net",
  "trashmail.org", "trashmail.at", "trashmail.io", "trashmail.xyz", "trashmail.de",
  "trashmail.es", "dispostable.com", "yopmail.com", "yopmail.fr", "maildrop.cc",
  "mailnull.com", "spaml.com", "tempr.email", "discard.email", "throwaway.email",
  "temp-mail.org", "temp-mail.io", "temp-mail.ru", "tempmail.com", "tempmail.eu",
  "tempmail.de", "tempmail.it", "tempail.com", "tempe-mail.com", "tempemail.com",
  "tempemail.net", "tempinbox.com", "temporaryemail.com", "temporaryemail.net",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minutemail.de",
  "my10minutemail.com", "minutemail.com", "spamgourmet.com", "spamgourmet.net",
  "spamgourmet.org", "binkmail.com", "devnullmail.com", "fakedemail.com",
  "filzmail.com", "getonemail.com", "getonemail.net", "hailmail.net", "hmamail.com",
  "ieatspam.eu", "ieatspam.info", "junk1.tk", "kasmail.com", "killmail.com",
  "killmail.net", "maileimer.de", "mailexpire.com", "mailfreeonline.com",
  "mailguard.me", "mailimate.com", "mailinater.com", "mailinator.net",
  "mailinator2.com", "mailme.ir", "mailme.lv", "mailme24.com", "mailmetrash.com",
  "mailmoat.com", "mailnew.com", "mailnull.com", "mailquack.com", "mailrock.biz",
  "mailseal.de", "mailshell.com", "mailspam.me", "mailspam.xyz", "mailtemp.info",
  "mailtome.de", "mailtothis.com", "mailtrash.net", "mailtv.net", "mailtv.tv",
  "mailzilla.com", "mailzilla.org", "meltmail.com", "mintemail.com",
  "mytrashmail.com", "nospam.ze.tc", "nomail.pw", "nospammail.net",
  "objectmail.com", "owlpic.com", "pancakemail.com", "pmp.today",
  "postbot.cc", "proxymail.eu", "rcpt.at", "recode.me", "reconmail.com",
  "recyclemail.dk", "rejectmail.com", "rootfest.net", "safetymail.info",
  "selfdestructingmail.com", "sendspamhere.com", "shiftmail.com", "shortmail.net",
  "sibmail.com", "slapsfromlastnight.com", "slopsbox.com", "smashmail.de",
  "snkmail.com", "sofimail.com", "sofort-mail.de", "spam.la", "spam.mn",
  "spambob.com", "spambob.net", "spambob.org", "spambog.com", "spambog.de",
  "spambog.ru", "spamcannon.com", "spamcannon.net", "spamcero.com",
  "spamcon.org", "spamday.com", "spamex.com", "spamfree24.de", "spamfree24.eu",
  "spamfree24.info", "spamfree24.net", "spamfree24.org", "spamhole.com",
  "spamify.com", "spamkill.info", "spaml.de", "spammotel.com", "spamobox.com",
  "spamsalad.in", "spamslicer.com", "spamspot.com", "spamtroll.net",
  "spoofmail.de", "squizzy.de", "squizzy.eu", "squizzy.net",
  "supergreatmail.com", "tafmail.com", "talkinator.com", "teml.net",
  "throwam.com", "throwaways.ga", "tilien.com", "tmail.com", "tmail.io",
  "tmail.ws", "tmailinator.com", "trash-mail.at", "trash-mail.com",
  "trash-mail.de", "trash-mail.ga", "trash-mail.io", "trash-mail.xyz",
  "trashmailer.com", "trashwarden.com", "trbvm.com", "turual.com",
  "ursulaallenbach.de", "veryrealemail.com", "wegwerf-email.de",
  "wegwerfadresse.de", "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "whyspam.me", "xsmail.com", "yapped.net", "yomail.info", "zehnminuten.de",
  "zehnminutenmail.de", "zetmail.com", "zomg.info", "mailnesia.com",
  "fakeinbox.com", "spamfree.eu", "tempomail.fr",
  "getnada.com", "nada.email", "mohmal.com",
  "33mail.com", "armyspy.com", "cuvox.de", "dayrep.com", "einrot.com",
  "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com",
  "teleworm.us", "einrot.de",
  "eelmail.com", "netmails.com", "netmails.net", "nervmich.net",
  "no-spam.ws", "nobulk.com", "noclickemail.com", "noref.in",
  "opayq.com", "otherinbox.com", "ovpn.to", "pop3.xyz", "postfach2go.de",
  "quickinbox.com", "quickmail.in", "rklips.com", "rmqkr.net",
  "s0ny.net", "sandelf.de", "secure-mail.biz", "secure-mail.cc",
  "sinnlos-mail.de", "sogetthis.com", "soodonims.com", "spam.su",
  "spamcorptastic.com", "spamcowboy.com", "spamcowboy.net", "spamcowboy.org",
  "spamherelots.com", "spamhereplease.com", "spaminator.de", "spamoff.de",
  "spamthis.co.uk", "spamthis.info", "spamthisplease.com", "spamtrail.com",
  "ssoia.com", "startkeys.com", "stinkefinger.net", "stop-my-spam.com",
  "superstachel.de", "suremail.info", "svk.jp", "sweetxxx.de",
  "tapchicuoihoi.com", "thank-you.net", "thankyou2010.com", "thisisnotmyrealemail.com",
  "tittbit.in", "trash2009.com", "tyldd.com", "umail.net", "uroid.com",
  "us.af", "vidchart.com", "viditag.com", "vinbazar.com", "vkcode.ru",
  "vmailing.info", "vomoto.com", "vpn.st", "vubby.com", "webemail.me",
  "webm4il.info", "willhackforfood.biz", "willselfdestruct.com", "winemaven.info",
  "wronghead.com", "wuzup.net", "wuzupmail.net", "xagloo.com", "xemaps.com",
  "xents.com", "xmaily.com", "xoxy.net", "y7mail.com", "yesey.net",
  "yuurok.com", "z1p.biz", "zoaxe.com", "zoemail.com", "zoemail.net",
  "zoemail.org", "zippymail.info", "top9top.com", "inboxbear.com",
  "spamwc.de", "spamwc.cf", "spamwc.ga", "spamwc.gq", "spamwc.ml",
  "mvrht.com", "mvrht.net", "mvrht.org", "mvrht.de", "mail7.io",
  "tempmailer.com", "tempmailer.de", "tempmailer.net", "spamgoes.in",
  "emailondeck.com", "dropmail.me", "fakemailgenerator.com", "spamfree24.org",
  "mailismagic.com", "mailbidon.com", "mailbucket.org",
  "mailcat.biz", "mailcatch.com", "mailbiz.biz", "spamwc.com",
  "guerrillamailblock.com", "yopmail.pp.ua", "sharklasers.com", "spam.care",
  "dispostable.com", "jetable.fr.nf", "trashmail.fr", "mailscrap.com",
  "spamgoes.in", "spamoff.de", "mt2014.com", "mt2015.com", "mega.zik.dj",
  "epochchat.com", "dispostable.com", "baxomale.ht.cx", "bobmail.info",
  "chammy.info", "devnullmail.com", "dingbone.com", "fudgerub.com",
  "lookugly.com", "yroid.com", "filzmail.com", "tradermail.info",
  "maileimer.de", "uggsrock.com", "getairmail.com", "spamfree24.de",
  "dontreg.com", "dontsendmespam.de", "dumpandfuck.com", "email60.com",
  "emailias.com", "emailinfive.com", "emailmiser.com", "emailsensei.com",
  "emailtemporario.com.br", "emailwarden.com", "emailx.at.hm",
  "emailxfer.com", "emz.net", "explodemail.com", "fast-email.com",
  "fast-mail.fr", "fastem.com", "fastemail.us", "fastemailer.com",
  "fastemails.us", "fastermail.com", "fastest.cc", "fastmail.cn",
  "frapmail.com", "front14.org", "fugitiveemail.com", "fux0ringduh.com",
  "ged.lol.com", "getonemail.com", "gigmail.com", "gishpuppy.com",
  "giveh2o.info", "go2net.com", "goemailgo.com", "greencafe24.com",
  "greensloth.com", "hak.dk", "hatespam.org", "herp.in",
  "hidemail.de", "hidzz.com", "hmamail.com", "hopemail.biz",
  "i-hate-spam.com", "ihateyoualot.info", "iheartspam.org", "imails.info",
  "inoutmail.de", "inoutmail.eu", "inoutmail.info", "inoutmail.net",
  "instant-email.org", "instantemailaddress.com", "instantlyemail.com",
  "ip4.pp.ua", "iroid.com", "it2mail.com", "itunesgiftcodegenerator.com",
  "jetable.com", "jetable.fr.nf", "jetable.net", "jetable.org",
  "klzlk.com", "koszmail.pl", "kulturbetrieb.info", "kurzepost.de",
  "lazyinbox.com", "letthemeatspam.com", "lhsdv.com", "lifebyfood.com",
  "link2mail.net", "litedrop.com", "lol.ovpn.to", "lolfreak.net",
  "lookugly.com", "lopl.co.cc", "lortemail.dk", "lucky.myftp.name",
  "maildrop.cc", "mailfreeonline.com", "mailguard.me", "mailimate.com",
  "mailincubator.com", "mailinater.com", "mailismagic.com", "mailmate.com",
  "mailme.ir", "mailme.lv", "mailme24.com", "mailmetrash.com",
  "mailmoat.com", "mailnew.com", "mailnull.com", "mailquack.com",
  "mailrock.biz", "mailscrap.com", "mailseal.de", "mailshell.com",
  "mailslapping.com", "mailspam.me", "mailspam.xyz", "mailtemp.info",
  "mailtome.de", "mailtothis.com", "mailtrash.net", "mailtv.net",
  "mailtv.tv", "mailzilla.com", "mailzilla.org", "mbx.cc", "meinspamschutz.de",
  "mfsa.ru", "mierdamail.com", "mintemail.com", "misterpinball.de",
  "mjukglass.nu", "mlsend2.com", "mm.st", "moncourrier.fr.nf",
  "monemail.fr.nf", "monmail.fr.nf", "monumentmail.com", "msa.minsmail.com",
  "mt2009.com", "myalias.pw", "mypartyclip.de", "myphantomemail.com",
  "mytrashmail.com", "neomailbox.com", "nepwk.com", "nervmich.net",
  "nervtmich.net", "netmails.com", "netmails.net", "newbpotato.tk",
  "nice-4u.com", "nincsmail.hu", "nnh.com", "no-spam.ws",
  "nobulk.com", "noclickemail.com", "nogmailspam.info", "nomail.pw",
  "nomail.xl.cx", "nomail2me.com", "nomorespamemails.com", "nonspam.eu",
  "nonspammer.de", "noref.in", "norsefire.info", "nospam.ze.tc",
  "nospam4.us", "nospamfor.us", "nospammail.net", "nospamthanks.info",
  "nothingtoseehere.ca", "notmailinator.com", "nowhere.org",
]);

const APPROVED_TLDS = new Set([
  "com", "org", "net", "edu", "gov", "mil", "int",
  "io", "co", "me", "app", "dev", "ai", "tech", "info",
  "biz", "online", "site", "store", "shop", "cloud",
  "uk", "us", "ca", "au", "nz", "de", "fr", "nl",
  "be", "ch", "at", "se", "no", "dk", "fi", "it",
  "es", "pt", "pl", "cz", "sk", "hu", "ro", "gr",
  "in", "za", "ke", "ng", "gh", "sg", "my", "ph",
  "id", "jp", "kr", "cn", "hk", "tw", "br", "mx",
  "ar", "cl", "pe", "co", "ac", "pro", "name",
]);

const COMPOUND_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk",
  "co.nz", "co.au", "com.au", "net.au", "org.au",
  "co.in", "ac.in", "com.ng", "com.gh", "co.za",
  "co.ke", "com.sg", "com.my", "com.ph", "co.id",
  "co.jp", "co.kr", "com.cn", "com.hk", "com.tw",
  "com.br", "com.mx", "com.ar", "com.cl", "com.pe",
  "com.co",
]);

const ALWAYS_ALLOWED = new Set(["gestontech.online"]);

export function isDisposableEmail(emailOrDomain: string): boolean {
  const domain = emailOrDomain.includes("@")
    ? emailOrDomain.split("@")[1].toLowerCase().trim()
    : emailOrDomain.toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(domain);
}

export function isAcceptableEmail(emailOrDomain: string): boolean {
  const domain = emailOrDomain.includes("@")
    ? emailOrDomain.split("@")[1].toLowerCase().trim()
    : emailOrDomain.toLowerCase().trim();

  if (ALWAYS_ALLOWED.has(domain)) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return false;

  const parts = domain.split(".");
  if (parts.length < 2) return false;

  const tld = parts[parts.length - 1].toLowerCase();
  if (APPROVED_TLDS.has(tld)) return true;

  if (parts.length >= 3) {
    const compound = parts[parts.length - 2] + "." + parts[parts.length - 1];
    if (COMPOUND_TLDS.has(compound)) return true;
  }

  return false;
}
