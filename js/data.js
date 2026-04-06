// Data loading and management module

const DataManager = {
  graduates: [],
  stats: null,
  blsData: null,
  byuProgram: null,
  byuWeb: null,
  loaded: false,

  async loadAll() {
    if (this.loaded) return;

    try {
      const [graduatesData, blsData, byuProgram, gradGuide, phdPlacements, byuWeb] = await Promise.all([
        fetch('data/graduates.json').then(r => r.json()),
        fetch('data/bls-outlook.json').then(r => r.json()),
        fetch('data/byu-program.json').then(r => r.json()),
        fetch('data/grad-school-guide-summary.json').then(r => r.json()),
        fetch('data/phd-placements.json').then(r => r.json()),
        fetch('data/byu-web-summaries.json').then(r => r.json())
      ]);

      // De-duplicate graduates by LinkedIn URL (keeps the first occurrence).
      const rawGraduates = graduatesData.graduates || [];
      const seen = new Set();
      this.graduates = rawGraduates.filter((g) => {
        const url = (g.linkedinUrl || '').toString().trim().toLowerCase();
        if (!url) return true;
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
      this.stats = graduatesData.stats;
      this.blsData = blsData;
      this.byuProgram = byuProgram;
      this.gradGuide = gradGuide;
      this.phdPlacements = phdPlacements;
      this.byuWeb = byuWeb;
      this.loaded = true;

      console.log(`Loaded ${this.graduates.length} graduates`);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  },

  // Get all unique industries (first job)
  getIndustries() {
    const industries = new Set();
    this.graduates.forEach(g => {
      if (g.firstIndustry) industries.add(g.firstIndustry);
    });
    return Array.from(industries).sort();
  },

  // Get all unique companies (first job)
  getCompanies() {
    const companies = new Set();
    this.graduates.forEach(g => {
      if (g.firstCompany) companies.add(g.firstCompany);
    });
    return Array.from(companies).sort();
  },

  // Get top first job companies with counts
  getFirstJobCompanies() {
    const companies = {};
    this.graduates.forEach(g => {
      if (g.firstCompany) {
        companies[g.firstCompany] = (companies[g.firstCompany] || 0) + 1;
      }
    });
    return Object.entries(companies).sort((a, b) => b[1] - a[1]);
  },

  // Get top first job locations with counts
  getFirstJobLocations() {
    const locations = {};
    this.graduates.forEach(g => {
      if (g.firstLocation) {
        const normalized = normalizeFirstJobLocation(g.firstLocation);
        if (!normalized) return;
        locations[normalized] = (locations[normalized] || 0) + 1;
      }
    });
    return Object.entries(locations).sort((a, b) => b[1] - a[1]);
  },

  // Get first job industry breakdown
  getFirstJobIndustries() {
    const industries = {};
    this.graduates.forEach(g => {
      if (g.firstIndustry) {
        industries[g.firstIndustry] = (industries[g.firstIndustry] || 0) + 1;
      }
    });
    return Object.entries(industries).sort((a, b) => b[1] - a[1]);
  },

  // Get all unique locations (first job)
  getLocations() {
    const locations = new Set();
    this.graduates.forEach(g => {
      const normalized = normalizeFirstJobLocation(g.firstLocation);
      if (normalized) locations.add(normalized);
    });
    return Array.from(locations).sort();
  },

  // Get all unique grad schools
  getGradSchools() {
    const schools = new Set();
    this.graduates.forEach(g => {
      if (g.gradSchool) schools.add(g.gradSchool);
    });
    return Array.from(schools).sort();
  },

  // Filter graduates based on criteria (uses first job data)
  filterGraduates(filters = {}) {
    return this.graduates.filter(g => {
      if (filters.industry && g.firstIndustry !== filters.industry) return false;
      if (filters.company && g.firstCompany !== filters.company) return false;
      if (filters.location) {
        const normalized = normalizeFirstJobLocation(g.firstLocation);
        if (normalized !== filters.location) return false;
      }
      if (filters.gradSchool && g.gradSchool !== filters.gradSchool) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = `${g.firstName || ''} ${g.lastName || ''}`.toLowerCase();
        const firstCompany = (g.firstCompany || '').toLowerCase();
        const matches =
          fullName.includes(searchLower) ||
          firstCompany.includes(searchLower);
        if (!matches) return false;
      }
      return true;
    });
  },

  // Search graduates by any field
  searchGraduates(query) {
    const queryLower = query.toLowerCase();
    return this.graduates.filter(g => {
      return (
        g.firstName?.toLowerCase().includes(queryLower) ||
        g.lastName?.toLowerCase().includes(queryLower) ||
        g.currentCompany?.toLowerCase().includes(queryLower) ||
        g.currentJobTitle?.toLowerCase().includes(queryLower) ||
        g.currentIndustry?.toLowerCase().includes(queryLower) ||
        g.gradSchool?.toLowerCase().includes(queryLower)
      );
    });
  },

  // Get graduates by industry
  getGraduatesByIndustry(industry) {
    return this.graduates.filter(g => g.currentIndustry === industry);
  },

  // Get graduates by company
  getGraduatesByCompany(company) {
    return this.graduates.filter(g =>
      g.currentCompany?.toLowerCase().includes(company.toLowerCase())
    );
  },

  // Get BLS occupation data
  getOccupationOutlook(occupation) {
    if (!this.blsData) return null;
    return this.blsData.occupations.find(o =>
      o.title.toLowerCase().includes(occupation.toLowerCase())
    );
  },

  // Build context for AI chat
  buildChatContext() {
    const industryBreakdown = this.stats.industries
      .map(([ind, count]) => `${ind}: ${count} graduates (${Math.round(count/this.stats.totalGraduates*100)}%)`)
      .join('\n');

    const topCompanies = this.stats.topCompanies
      .slice(0, 20)
      .map(([company, count]) => `${company}: ${count} graduates`)
      .join('\n');

    const topGradSchools = this.stats.topGradSchools
      .slice(0, 15)
      .map(([school, count]) => `${school}: ${count} graduates`)
      .join('\n');

    const topLocations = this.stats.topLocations
      .slice(0, 15)
      .map(([loc, count]) => `${loc}: ${count} graduates`)
      .join('\n');

    const degreeTypes = this.stats.degreeTypes
      .slice(0, 10)
      .map(([type, count]) => `${type}: ${count} graduates`)
      .join('\n');

    const blsOutlook = this.blsData.occupations
      .map(o => {
        let info = `${o.title}:\n`;
        info += `  - Median Salary: ${o.medianSalary ? '$' + o.medianSalary.toLocaleString() : 'varies'}\n`;
        if (o.salaryRange) {
          if (o.salaryRange.low10) info += `  - Salary Range: $${o.salaryRange.low10.toLocaleString()} - $${o.salaryRange.high10.toLocaleString()}\n`;
        }
        info += `  - Job Growth (2024-2034): ${o.jobGrowth || o.jobGrowthNote || 'varies'} (${o.growthDescription || ''})\n`;
        if (o.annualOpenings) info += `  - Annual Openings: ${o.annualOpenings.toLocaleString()}\n`;
        if (o.totalJobs) info += `  - Total Jobs: ${o.totalJobs.toLocaleString()}\n`;
        info += `  - Education: ${o.education || 'Bachelor\'s degree'}\n`;
        if (o.description) info += `  - Description: ${o.description}\n`;
        if (o.skills) info += `  - Key Skills: ${o.skills.join(', ')}\n`;
        if (o.topFirms) info += `  - Top Firms: ${o.topFirms.join(', ')}\n`;
        return info;
      })
      .join('\n');

    // Get sample graduates for each industry (3 examples each)
    const samplesByIndustry = {};
    this.stats.industries.forEach(([industry]) => {
      const grads = this.graduates
        .filter(g => g.currentIndustry === industry && g.currentJobTitle && g.currentCompany)
        .slice(0, 3)
        .map(g => `  - ${g.firstName} ${g.lastName}: ${g.currentJobTitle} at ${g.currentCompany}`)
        .join('\n');
      if (grads) samplesByIndustry[industry] = grads;
    });

    const industryExamples = Object.entries(samplesByIndustry)
      .map(([ind, examples]) => `${ind}:\n${examples}`)
      .join('\n\n');

    const phdSummary = buildPhdSummary(this.phdPlacements);
    const byuWebSummaries = this.byuWeb || {};

    return {
      summary: `Total BYU Economics graduates in dataset: ${this.stats.totalGraduates}`,
      industryBreakdown,
      topCompanies,
      topGradSchools,
      topLocations,
      degreeTypes,
      blsOutlook,
      industryExamples,
      byuProgram: JSON.stringify(this.byuProgram, null, 2),
      gradSchoolGuide: this.gradGuide,
      phdSummary,
      byuWeb: byuWebSummaries
    };
  }
};

function normalizeFirstJobLocation(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw
    .normalize('NFKC')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase().replace(/\.+$/g, '').trim();
  const countryOnly = new Set(['united states', 'usa', 'u.s.a.', 'u.s.', 'us']);
  if (countryOnly.has(lower)) return null;

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  let normalizedParts = [...parts];
  const usTail = new Set(['united states', 'usa', 'u.s.a.', 'u.s.', 'us']);

  // Remove country suffix when city/state is already present.
  if (normalizedParts.length >= 3 && usTail.has((normalizedParts[normalizedParts.length - 1] || '').toLowerCase())) {
    normalizedParts = normalizedParts.slice(0, -1);
  }

  const usStates = new Set([
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
    'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
    'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri',
    'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york',
    'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island',
    'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
    'west virginia', 'wisconsin', 'wyoming', 'district of columbia'
  ]);

  // Drop broad state-only rows like "Utah, United States" or "Utah".
  if (normalizedParts.length === 1 && usStates.has(normalizedParts[0].toLowerCase())) return null;
  if (
    normalizedParts.length === 2 &&
    usStates.has(normalizedParts[0].toLowerCase()) &&
    usTail.has(normalizedParts[1].toLowerCase())
  ) {
    return null;
  }

  // Canonicalize Salt Lake variants.
  if (
    /(^|\b)slc(\b|,)/i.test(cleaned) ||
    (lower.includes('salt lake') && (
      lower.includes('city') ||
      lower.includes('metro') ||
      lower.includes('metropolitan') ||
      lower.includes('area') ||
      lower.includes('county')
    ))
  ) {
    return 'Salt Lake City';
  }

  // Canonicalize common city variants that split counts in the list.
  if (lower.includes('provo')) return 'Provo, Utah';
  if (lower.includes('lehi')) return 'Lehi, Utah';
  if (lower.includes('washington') && lower.includes('district of columbia')) return 'Washington, District of Columbia';
  if (lower.includes('new york') && !lower.includes('state')) return 'New York, New York';

  return normalizedParts.join(', ');
}

function buildPhdSummary(phdData) {
  if (!phdData || !Array.isArray(phdData.placements)) return 'Not available';
  const placements = phdData.placements;

  const total = placements.length;
  const counts = {};
  placements.forEach(p => {
    const prog = (p.phdProgram || '').trim();
    if (!prog) return;
    counts[prog] = (counts[prog] || 0) + 1;
  });

  const topPrograms = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([prog, count]) => `${prog}: ${count} students`)
    .join('\n');

  return `Total documented PhD placements: ${total}

Top PhD programs for BYU-connected students:
${topPrograms}`;
}

// Export for use in other modules
window.DataManager = DataManager;
