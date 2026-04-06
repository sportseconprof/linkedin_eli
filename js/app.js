// Main application module

const App = {
  currentView: 'chat',
  industryChart: null,
  industryBarChart: null,

  async init() {
    // Load data
    try {
      await DataManager.loadAll();
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load application data. Please refresh the page.');
      return;
    }

    // Initialize chat
    ChatManager.init();

    // Setup navigation
    this.setupNavigation();

    // Setup explorer
    this.setupExplorer();

    // Setup stats
    this.setupStats();
  },

  setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });
  },

  switchView(view) {
    this.currentView = view;

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === `${view}-view`);
    });

    // Initialize charts and map if stats view
    if (view === 'stats') {
      if (!this.industryChart || !this.industryBarChart) {
        this.initCharts();
      }
      if (window.MapManager) {
        setTimeout(() => window.MapManager.init(), 50);
      }
    }
  },

  setupExplorer() {
    // Populate filter dropdowns
    const industryFilter = document.getElementById('industry-filter');
    const companyFilter = document.getElementById('company-filter');
    const locationFilter = document.getElementById('location-filter');
    const gradschoolFilter = document.getElementById('gradschool-filter');
    const searchFilter = document.getElementById('search-filter');
    const clearBtn = document.getElementById('clear-filters');

    // Populate industries (first job)
    DataManager.getFirstJobIndustries().forEach(([industry, count]) => {
      const option = document.createElement('option');
      option.value = industry;
      option.textContent = `${industry} (${count})`;
      industryFilter.appendChild(option);
    });

    // Populate companies (first job, top 50 by count)
    const topCompanies = DataManager.getFirstJobCompanies().slice(0, 50);
    topCompanies.forEach(([company, count]) => {
      const option = document.createElement('option');
      option.value = company;
      option.textContent = `${company} (${count})`;
      companyFilter.appendChild(option);
    });

    // Populate locations (first job, top 30)
    const topLocations = DataManager.getFirstJobLocations().slice(0, 30);
    topLocations.forEach(([location, count]) => {
      const option = document.createElement('option');
      option.value = location;
      option.textContent = location;
      locationFilter.appendChild(option);
    });

    // Populate grad schools
    DataManager.getGradSchools().forEach(school => {
      const option = document.createElement('option');
      option.value = school;
      option.textContent = school;
      gradschoolFilter.appendChild(option);
    });

    // Filter change handlers
    const applyFilters = () => {
      const filters = {
        industry: industryFilter.value,
        company: companyFilter.value,
        location: locationFilter.value,
        gradSchool: gradschoolFilter.value,
        search: searchFilter.value
      };
      this.renderGraduates(DataManager.filterGraduates(filters));
    };

    industryFilter.addEventListener('change', applyFilters);
    companyFilter.addEventListener('change', applyFilters);
    locationFilter.addEventListener('change', applyFilters);
    gradschoolFilter.addEventListener('change', applyFilters);
    searchFilter.addEventListener('input', applyFilters);

    clearBtn.addEventListener('click', () => {
      industryFilter.value = '';
      companyFilter.value = '';
      locationFilter.value = '';
      gradschoolFilter.value = '';
      searchFilter.value = '';
      applyFilters();
    });

    // Initial render
    this.renderGraduates(DataManager.graduates);
  },

  renderGraduates(graduates) {
    const container = document.getElementById('results-list');
    const countEl = document.getElementById('filter-count');

    countEl.textContent = graduates.length;

    if (graduates.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
          No graduates match your filters.
        </div>
      `;
      return;
    }

    container.innerHTML = graduates.map(g => `
      <div class="graduate-card">
        <div class="graduate-name">
          ${g.linkedinUrl
            ? `<a href="${g.linkedinUrl}" target="_blank" rel="noopener">${g.firstName} ${g.lastName}</a>`
            : `${g.firstName} ${g.lastName}`
          }
        </div>
        ${g.firstJobTitle ? `<div class="graduate-title">${g.firstJobTitle}</div>` : '<div class="graduate-title" style="color: var(--gray-400);">No first job data</div>'}
        ${g.firstCompany ? `<div class="graduate-company">${g.firstCompany}</div>` : ''}
        <div class="graduate-meta">
          ${g.firstIndustry ? `<span class="graduate-tag">${g.firstIndustry}</span>` : ''}
          ${g.firstLocation ? `<span class="graduate-tag">${this.formatLocation(g.firstLocation)}</span>` : ''}
        </div>
        ${g.gradSchool ? `
          <div class="graduate-gradschool">
            <strong>Grad School:</strong> ${g.gradSchool}
            ${g.degreeType ? `(${g.degreeType}` : ''}${g.fieldOfStudy ? ` in ${g.fieldOfStudy})` : g.degreeType ? ')' : ''}
          </div>
        ` : ''}
      </div>
    `).join('');
  },

  formatLocation(location) {
    // Shorten location display
    if (!location) return '';
    const parts = location.split(',');
    if (parts.length >= 2) {
      return parts.slice(0, 2).join(',').trim();
    }
    return location;
  },

  setupStats() {
    // Use first job data for consistency with Graduate Explorer
    const firstJobIndustries = DataManager.getFirstJobIndustries();
    const firstJobCompanies = DataManager.getFirstJobCompanies();
    const firstJobLocations = DataManager.getFirstJobLocations();
    const stats = DataManager.stats;
    const gradSchools = DataManager.getGradSchools();

    // Count graduates with first job data
    const gradsWithFirstJob = DataManager.graduates.filter(g => g.firstIndustry || g.firstCompany).length;

    // Overview stats
    document.getElementById('total-grads').textContent = gradsWithFirstJob;
    document.getElementById('total-industries').textContent = firstJobIndustries.length;
    document.getElementById('total-companies').textContent = firstJobCompanies.length;
    // Count unique grad schools from graduate rows (not just \"top\" list length)
    document.getElementById('total-gradschools').textContent = gradSchools.length;

    // Top companies list (first job)
    const companiesList = document.getElementById('top-companies');
    companiesList.innerHTML = firstJobCompanies.slice(0, 15).map(([name, count]) => `
      <div class="top-list-item">
        <span class="name">${name}</span>
        <span class="count">${count}</span>
      </div>
    `).join('');

    // Top locations list (first job)
    const locationsList = document.getElementById('top-locations');
    locationsList.innerHTML = firstJobLocations.slice(0, 15).map(([name, count]) => `
      <div class="top-list-item">
        <span class="name">${this.formatLocation(name)}</span>
        <span class="count">${count}</span>
      </div>
    `).join('');

    // Grad schools list (this stays the same - not related to first job)
    const gradschoolsList = document.getElementById('top-gradschools');
    gradschoolsList.innerHTML = stats.topGradSchools.slice(0, 15).map(([name, count]) => `
      <div class="top-list-item">
        <span class="name">${name}</span>
        <span class="count">${count}</span>
      </div>
    `).join('');

    // Degree types (this stays the same - not related to first job)
    const degreeTypes = document.getElementById('degree-types');
    const normalizeDegreeTypes = (raw) => {
      if (!raw || typeof raw !== 'string') return [];
      const s = raw.trim();
      if (!s) return [];
      const upper = s.toUpperCase();
      if (upper === 'N / A' || upper === 'N/A' || upper === 'NA' || upper === 'NONE') return [];
      return upper
        .replace(/\band\b/gi, '/')
        .replace(/\+/g, '/')
        .split(/\s*[/,;&]+\s*/g)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          if (p === 'M.S.' || p === 'MS.') return 'MS';
          if (p === 'M.A.' || p === 'MA.') return 'MA';
          if (p === 'PH.D.' || p === 'PHD.') return 'PHD';
          if (p === 'J.D.' || p === 'JD.') return 'JD';
          return p;
        });
    };

    const degreeCounts = {};
    DataManager.graduates.forEach((g) => {
      normalizeDegreeTypes(g.degreeType).forEach((d) => {
        degreeCounts[d] = (degreeCounts[d] || 0) + 1;
      });
    });

    const degreeEntries = Object.entries(degreeCounts).sort((a, b) => b[1] - a[1]);
    const maxBadges = 10;
    const shown = degreeEntries.slice(0, maxBadges);
    const otherTotal = degreeEntries.slice(maxBadges).reduce((sum, [, c]) => sum + c, 0);

    degreeTypes.innerHTML = [
      ...shown.map(([type, count]) => `
        <div class="degree-badge">
          <span class="type">${type}</span>
          <span class="count">${count}</span>
        </div>
      `),
      ...(otherTotal ? [`
        <div class="degree-badge">
          <span class="type">Other</span>
          <span class="count">${otherTotal}</span>
        </div>
      `] : [])
    ].join('');
  },

  initCharts() {
    const doughnutCanvas = document.getElementById('industry-chart');
    const barCanvas = document.getElementById('industry-bar-chart');
    if (!doughnutCanvas || !barCanvas) return;

    const ctx = doughnutCanvas.getContext('2d');
    const barCtx = barCanvas.getContext('2d');
    // Use first job industries for consistency
    const firstJobIndustries = DataManager.getFirstJobIndustries();
    const totalFirstJobs = firstJobIndustries.reduce((sum, [, count]) => sum + count, 0);
    const industryLabels = firstJobIndustries.map(([name]) => name);
    const industryCounts = firstJobIndustries.map(([, count]) => count);
    const industryPercents = firstJobIndustries.map(([, count]) =>
      totalFirstJobs ? Math.round((count / totalFirstJobs) * 100) : 0
    );

    // Draw clean percentage labels directly on slices.
    const slicePercentPlugin = {
      id: 'slicePercentPlugin',
      afterDatasetsDraw: (chart) => {
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;

        const values = chart.data.datasets[0].data || [];
        const total = values.reduce((a, b) => a + b, 0);
        if (!total) return;

        const minPctToLabel = 4; // Avoid clutter on tiny slices
        const c = chart.ctx;
        c.save();
        c.font = '600 12px Inter, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#ffffff';
        c.shadowColor = 'rgba(0, 0, 0, 0.45)';
        c.shadowBlur = 3;
        c.shadowOffsetX = 0;
        c.shadowOffsetY = 1;

        meta.data.forEach((arc, i) => {
          const value = values[i];
          if (!value) return;
          const pct = Math.round((value / total) * 100);
          if (pct < minPctToLabel) return;

          const angle = (arc.startAngle + arc.endAngle) / 2;
          const radius = (arc.innerRadius + arc.outerRadius) / 2;
          const x = arc.x + Math.cos(angle) * radius;
          const y = arc.y + Math.sin(angle) * radius;
          c.fillText(`${pct}%`, x, y);
        });
        c.restore();
      }
    };

    const colors = [
      '#002E5D', // BYU Navy
      '#0062B8', // BYU Royal
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Violet
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
    ];

    this.industryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: firstJobIndustries.map(([name, count]) => {
          const pct = totalFirstJobs ? Math.round((count / totalFirstJobs) * 100) : 0;
          return `${name} (${pct}%)`;
        }),
        datasets: [{
          data: industryCounts,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      },
      plugins: [slicePercentPlugin]
    });

    this.industryBarChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: industryLabels,
        datasets: [{
          label: 'Percent of first jobs',
          data: industryPercents,
          backgroundColor: colors.map((c) => `${c}CC`),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 6,
          barThickness: 16
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: Math.max(30, Math.max(...industryPercents) + 3),
            ticks: {
              callback: (value) => `${value}%`
            },
            grid: {
              color: '#e5e7eb'
            }
          },
          y: {
            ticks: {
              font: { size: 11 }
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const pct = context.raw;
                const count = industryCounts[context.dataIndex] || 0;
                return `${count} grads (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
