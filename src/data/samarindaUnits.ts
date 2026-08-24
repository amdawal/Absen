export interface SamarindaUnit {
  id: string;
  name: string;
  category: 'Sekretariat & Pengawasan' | 'Badan' | 'Dinas' | 'Kecamatan' | 'Layanan Kesehatan';
  code?: string;
}

export const SAMARINDA_UNIT_KERJA: SamarindaUnit[] = [
  // 1. Sekretariat & Pengawasan
  {
    id: 'sekda',
    name: 'Sekretariat Daerah Kota Samarinda',
    category: 'Sekretariat & Pengawasan',
    code: 'SETDA',
  },
  {
    id: 'sekwan',
    name: 'Sekretariat DPRD Kota Samarinda',
    category: 'Sekretariat & Pengawasan',
    code: 'SETWAN',
  },
  {
    id: 'itda',
    name: 'Inspektorat Daerah Kota Samarinda',
    category: 'Sekretariat & Pengawasan',
    code: 'INSPEKTORAT',
  },

  // 2. Badan Daerah
  {
    id: 'bappedalitbang',
    name: 'Badan Perencanaan Pembangunan Daerah, Penelitian dan Pengembangan (Bappedalitbang)',
    category: 'Badan',
    code: 'BAPPEDALITBANG',
  },
  {
    id: 'bpkad',
    name: 'Badan Pengelolaan Keuangan dan Aset Daerah (BPKAD)',
    category: 'Badan',
    code: 'BPKAD',
  },
  {
    id: 'bapenda',
    name: 'Badan Pendapatan Daerah (Bapenda)',
    category: 'Badan',
    code: 'BAPENDA',
  },
  {
    id: 'bkpsdm',
    name: 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia (BKPSDM)',
    category: 'Badan',
    code: 'BKPSDM',
  },
  {
    id: 'bpbd',
    name: 'Badan Penanggulangan Bencana Daerah (BPBD)',
    category: 'Badan',
    code: 'BPBD',
  },
  {
    id: 'bakesbangpol',
    name: 'Badan Kesatuan Bangsa dan Politik (Bakesbangpol)',
    category: 'Badan',
    code: 'BAKESBANGPOL',
  },

  // 3. Dinas Daerah
  {
    id: 'disdikbud',
    name: 'Dinas Pendidikan dan Kebudayaan',
    category: 'Dinas',
    code: 'DISDIKBUD',
  },
  {
    id: 'dinkes',
    name: 'Dinas Kesehatan',
    category: 'Dinas',
    code: 'DINKES',
  },
  {
    id: 'dpupr',
    name: 'Dinas Pekerjaan Umum dan Penataan Ruang (PUPR)',
    category: 'Dinas',
    code: 'DPUPR',
  },
  {
    id: 'disperkim',
    name: 'Dinas Perumahan dan Kawasan Permukiman (Disperkim)',
    category: 'Dinas',
    code: 'DISPERKIM',
  },
  {
    id: 'dinsos',
    name: 'Dinas Sosial dan Pemberdayaan Masyarakat',
    category: 'Dinas',
    code: 'DINSOS',
  },
  {
    id: 'disnaker',
    name: 'Dinas Tenaga Kerja',
    category: 'Dinas',
    code: 'DISNAKER',
  },
  {
    id: 'dkpp',
    name: 'Dinas Ketahanan Pangan dan Pertanian',
    category: 'Dinas',
    code: 'DKPP',
  },
  {
    id: 'dlh',
    name: 'Dinas Lingkungan Hidup (DLH)',
    category: 'Dinas',
    code: 'DLH',
  },
  {
    id: 'disdukcapil',
    name: 'Dinas Kependudukan dan Pencatatan Sipil (Disdukcapil)',
    category: 'Dinas',
    code: 'DISDUKCAPIL',
  },
  {
    id: 'dp2pa',
    name: 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak (DP2PA)',
    category: 'Dinas',
    code: 'DP2PA',
  },
  {
    id: 'dppkb',
    name: 'Dinas Pengendalian Penduduk dan Keluarga Berencana (DPPKB)',
    category: 'Dinas',
    code: 'DPPKB',
  },
  {
    id: 'dishub',
    name: 'Dinas Perhubungan (Dishub)',
    category: 'Dinas',
    code: 'DISHUB',
  },
  {
    id: 'diskominfo',
    name: 'Dinas Komunikasi dan Informatika (Diskominfo)',
    category: 'Dinas',
    code: 'DISKOMINFO',
  },
  {
    id: 'diskukmp',
    name: 'Dinas Koperasi, Usaha Kecil Menengah dan Perindustrian',
    category: 'Dinas',
    code: 'DISKUKMP',
  },
  {
    id: 'disdag',
    name: 'Dinas Perdagangan (Disdag)',
    category: 'Dinas',
    code: 'DISDAG',
  },
  {
    id: 'disporapar',
    name: 'Dinas Pemuda, Olahraga dan Pariwisata (Disporapar)',
    category: 'Dinas',
    code: 'DISPORAPAR',
  },
  {
    id: 'disarpus',
    name: 'Dinas Perpustakaan dan Kearsipan',
    category: 'Dinas',
    code: 'DISARPUS',
  },
  {
    id: 'disdamkar',
    name: 'Dinas Pemadam Kebakaran dan Penyelamatan (Disdamkar)',
    category: 'Dinas',
    code: 'DISDAMKAR',
  },
  {
    id: 'dpmptsp',
    name: 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu (DPMPTSP)',
    category: 'Dinas',
    code: 'DPMPTSP',
  },
  {
    id: 'diskan',
    name: 'Dinas Perikanan',
    category: 'Dinas',
    code: 'DISKAN',
  },
  {
    id: 'satpolpp',
    name: 'Satuan Polisi Pamong Praja (Satpol PP)',
    category: 'Dinas',
    code: 'SATPOLPP',
  },

  // 4. Layanan Kesehatan / RSUD
  {
    id: 'rsud-iamoeis',
    name: 'RSUD I.A. Moeis Kota Samarinda',
    category: 'Layanan Kesehatan',
    code: 'RSUD',
  },

  // 5. 10 Kecamatan di Kota Samarinda
  {
    id: 'kec-samarinda-kota',
    name: 'Kecamatan Samarinda Kota',
    category: 'Kecamatan',
    code: 'KEC-KOTA',
  },
  {
    id: 'kec-samarinda-ilir',
    name: 'Kecamatan Samarinda Ilir',
    category: 'Kecamatan',
    code: 'KEC-ILIR',
  },
  {
    id: 'kec-samarinda-seberang',
    name: 'Kecamatan Samarinda Seberang',
    category: 'Kecamatan',
    code: 'KEC-SEBERANG',
  },
  {
    id: 'kec-samarinda-ulu',
    name: 'Kecamatan Samarinda Ulu',
    category: 'Kecamatan',
    code: 'KEC-ULU',
  },
  {
    id: 'kec-samarinda-utara',
    name: 'Kecamatan Samarinda Utara',
    category: 'Kecamatan',
    code: 'KEC-UTARA',
  },
  {
    id: 'kec-sungai-kunjang',
    name: 'Kecamatan Sungai Kunjang',
    category: 'Kecamatan',
    code: 'KEC-KUNJANG',
  },
  {
    id: 'kec-sambutan',
    name: 'Kecamatan Sambutan',
    category: 'Kecamatan',
    code: 'KEC-SAMBUTAN',
  },
  {
    id: 'kec-palaran',
    name: 'Kecamatan Palaran',
    category: 'Kecamatan',
    code: 'KEC-PALARAN',
  },
  {
    id: 'kec-loa-janan-ilir',
    name: 'Kecamatan Loa Janan Ilir',
    category: 'Kecamatan',
    code: 'KEC-LJI',
  },
  {
    id: 'kec-sungai-pinang',
    name: 'Kecamatan Sungai Pinang',
    category: 'Kecamatan',
    code: 'KEC-PINANG',
  },
];
