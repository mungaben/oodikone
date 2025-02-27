// Map programme codes to "letter indentifier"

const codes = {
  KH10_001: 'tuk',
  MH10_001: 'tum',
  KH20_001: 'on',
  MH20_001: 'otm',
  MH20_002: 'ibl',
  MH20_003: 'ggl',
  KH30_001: 'psyk',
  MH30_004: 'psym',
  KH30_002: 'logk',
  MH30_005: 'logm',
  MH30_001: 'll',
  MH30_002: 'tmed',
  MH30_003: 'hll',
  KH40_001: 'filk',
  KH40_002: 'ttk',
  KH40_003: 'kik',
  KH40_004: 'kok',
  KH40_005: 'kuka',
  KH40_006: 'hisk',
  MH40_001: 'ttm',
  MH40_002: 'kim',
  MH40_003: 'eng',
  MH40_004: 'rus',
  MH40_005: 'lingdig',
  MH40_006: 'tra',
  MH40_007: 'suku',
  MH40_008: 'nor',
  MH40_009: 'kir',
  MH40_010: 'kuma',
  MH40_011: 'ice',
  MH40_012: 'alku',
  MH40_014: 'spt',
  MH40_015: 'hism',
  KH50_001: 'mat',
  KH50_002: 'fys',
  KH50_003: 'kemk',
  KH50_004: 'mfkk',
  KH50_005: 'tkt',
  KH50_006: 'geok',
  KH50_007: 'maa',
  KH50_008: 'bsc',
  MH50_001: 'mast',
  MH50_002: 'lsi',
  MH50_003: 'tcm',
  MH50_004: 'paras',
  MH50_005: 'matres',
  MH50_006: 'atm',
  MH50_007: 'kem',
  MH50_008: 'mfkm',
  MH50_009: 'csm',
  MH50_010: 'data',
  MH50_011: 'geom',
  MH50_012: 'geog',
  MH50_013: 'usp',
  KH55_001: 'farm',
  MH55_001: 'prov',
  MH55_002: 'mpharm',
  KH57_001: 'bio',
  KH57_002: 'mole',
  KH57_003: 'env',
  MH57_001: 'eeb',
  MH57_002: 'ips',
  MH57_003: 'gmb',
  MH57_004: 'neuro',
  MH57_005: 'ecgs',
  KH60_001: 'eduk',
  MH60_001: 'edum',
  MH60_002: 'ce',
  KH70_001: 'pvk',
  KH70_002: 'yk',
  KH70_003: 'sosk',
  KH70_004: 'ecok',
  MH70_001: 'film',
  MH70_002: 'pvm',
  MH70_003: 'gpc',
  MH70_004: 'ym',
  MH70_005: 'cos',
  MH70_006: 'ens',
  MH70_007: 'msv',
  MH70_008: 'sosm',
  MH70_009: 'econ',
  MH70_011: 'sote',
  KH74_001: 'ksv',
  KH80_001: 'maatk',
  KH80_002: 'metsak',
  KH80_003: 'etk',
  KH80_004: 'yet',
  MH80_001: 'agri',
  MH80_002: 'agere',
  MH80_003: 'for',
  MH80_004: 'food',
  MH80_005: 'hnfb',
  MH80_006: 'ekm',
  MH80_007: 'mmb',
  KH90_001: 'elk',
  MH90_001: 'ell',
  T920101: 'dptheol',
  T920102: 'dplaw',
  T920111: 'philartsoc',
  T920103: 'dphistcult',
  T920104: 'dplang',
  T920105: 'sky',
  T920106: 'dpsocs',
  T920107: 'pyam',
  T920108: 'dpe',
  T920109: 'seduce',
  T920110: 'clic',
  T921101: 'dpbm',
  T921102: 'klto',
  T921103: 'docpop',
  T921104: 'findos',
  T921105: 'dpdr',
  T921106: 'ils',
  T921107: 'bandm',
  T921108: 'cvm',
  T921109: 'dphub',
  T922101: 'luova',
  T922102: 'dpps',
  T922103: 'denvi',
  T922104: 'agforee',
  T922105: 'mbdp',
  T922106: 'foodhealth',
  T923101: 'papu',
  T923102: 'geodoc',
  T923103: 'atm-dp',
  T923104: 'chems',
  T923105: 'domast',
  T923106: 'matrena',
  T923107: 'docs',
  // manually added programs with no IAM, either abolished, or special co-operation programmes
  MH50_014: 'ech',
  MH40_013: 'mkk',
  MH70_010: 'imes',
}

module.exports = { codes }
