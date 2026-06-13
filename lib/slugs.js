/** Shared slug helpers for ATS probing and company matching. */

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const SLUG_ALIASES = {
  "urban company": ["urbancompany"],
  "apollo.io": ["apolloio", "apollo"],
  "cognida.ai": ["cognida"],
  "observe.ai": ["observeai"],
  "murf.ai": ["murf"],
  "smiles.ai": ["smilesai", "smiles"],
  "myways.ai": ["myways", "mywaysai"],
  "infra.market": ["inframarket"],
  "synthio labs": ["synthiolabs", "synthio"],
  "sarvam ai": ["sarvam"],
  "skyroot aerospace": ["skyroot"],
  "go digit": ["godigit"],
  "bright money": ["brightmoney"],
  "clear feed": ["clearfeed"],
  "induced ai": ["induced", "inducedai"],
  "pulse energy": ["pulseenergy"],
  "chaos genius": ["chaosgenius"],
  "bobble ai": ["bobble", "bobbleai"],
  appsforbharat: ["appsforbharat", "srimandir"],
  "aye finance": ["ayefinance"],
  crowdanalytix: ["crowdanalytix"],
  "cosmoserve space": ["cosmoserve"],
  "sanyark space": ["sanyark"],
  "sharang shakti": ["sharangshakti"],
  "gimbal space": ["gimbalspace"],
  "fenix technologies": ["fenix"],
  "esports xo": ["esportsxo"],
  "validus fintech": ["validus"],
  loop: ["loophealth", "loopclub"],
  comet: ["cometshoes", "comet"],
  snabbit: ["snabbit"],
  giga: ["gigaai", "giga"],
  avoca: ["avoca", "avocaai"],
  promptql: ["promptql"],
  jify: ["jify"],
  venwiz: ["venwiz"],
  covvalent: ["covvalent"],
  investmint: ["investmint"],
  daolens: ["daolens"],
  metaforms: ["metaforms"],
  zoplar: ["zoplar"],
  mitigata: ["mitigata"],
  cellcolabs: ["cellcolabs"],
  languify: ["languify"],
  flint: ["flintmoney", "flint"],
  uniqus: ["uniqusconsultech", "uniqus"],
  globalfair: ["globalfair"],
  llumo: ["llumo"],
  swirepay: ["swirepay"],
  helogen: ["helogen"],
  krayonnz: ["krayonnz"],
  presolv360: ["presolv360"],
  zfunds: ["zfunds"],
  plotline: ["plotline"],
  curelink: ["curelink"],
  citymall: ["citymall"],
  atlys: ["atlys"],
  autoninja: ["autoninja"],
  axio: ["axio"],
  belong: ["belong"],
  airblack: ["airblack"],
  alle: ["alle"],
  "adopt ai": ["adoptai"],
  chaayos: ["chaayos"],
  boxs: ["boxs"],
  karban: ["karban"],
  zorro: ["zorro"],
  swish: ["swish"],
  lemmebe: ["lemmebe"],
  "true diamond": ["truediamond"],
  "inner fit": ["innerfit"],
  "second ocean": ["secondocean"],
  firstsense: ["firstsense"],
  neurowyzr: ["neurowyzr"],
  youshd: ["youshd"],
  "de shaw": ["deshaw", "deshawresearch"],
  "jp morgan": ["jpmorgan", "jpmorganchase"],
  "neuron7.ai": ["neuron7", "neuron7ai"],
  "branch international": ["branch", "branchco"],
  "stable money": ["stablemoney"],
  "network science": ["networkscience"],
  "confido health": ["confidohealth"],
  "greylabs ai": ["greylabs", "greylabsai"],
  "finster ai": ["finsterai", "finster"],
  openobserve: ["openobserve-careers", "openobserve"],
  neysa: ["neysanetwork", "neysa"],
  "relevance ai": ["relevanceai", "relevance"],
  "latent ai": ["latent", "latentai"],
  alaan: ["alaan-careers", "alaan"],
};

export function slugCandidates(name) {
  const slugs = new Set([slugify(name)]);
  const key = name.toLowerCase();

  if (SLUG_ALIASES[key]) {
    SLUG_ALIASES[key].forEach((s) => slugs.add(s));
  }

  name
    .toLowerCase()
    .split(/[\s./]+/)
    .filter((w) => w.length > 2)
    .forEach((w) => slugs.add(slugify(w)));

  return [...slugs];
}
