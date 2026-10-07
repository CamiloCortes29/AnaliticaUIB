/**
 * UIB Plataforma de Planeación Presupuestal 2027 - Executive Dashboard Controller
 */

window.dashboardController = {
    chartComposition: null,
    chartTrend: null,
    chartModules: null,

    formatCurrency: function(val) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val || 0);
    },

    renderDashboard: function(area, dataMgr) {
        const isCorporate = area === 'CORPORATIVO';
        const summary = isCorporate
            ? dataMgr.getCorporateConsolidatedSummary()
            : dataMgr.getAreaDashboardSummary(area);

        // Update KPI Cards
        document.getElementById("kpiDashTotalBudget").textContent = this.formatCurrency(summary.brokerageRevenue || summary.totalBrokerage);
        document.getElementById("kpiDashRenovations").textContent = this.formatCurrency(summary.totalRenovations);
        document.getElementById("kpiDashNewBusiness").textContent = this.formatCurrency(summary.totalNewBusiness);
        document.getElementById("kpiDashTotalExpenses").textContent = this.formatCurrency(summary.totalExpenses);

        const complianceEl = document.getElementById("kpiDashCompliance");
        complianceEl.textContent = `${(summary.compliancePct || 100).toFixed(1)}%`;
        complianceEl.className = summary.compliancePct >= 100 ? "kpi-value text-success" : "kpi-value text-warning";

        // Render Charts
        this.renderCompositionChart(area, dataMgr);
        this.renderTrendChart(area, dataMgr);
        this.renderModulesDistributionChart(area, dataMgr);
    },

    renderCompositionChart: function(area, dataMgr) {
        const ctx = document.getElementById("chartDashComposition").getContext("2d");
        if (this.chartComposition) this.chartComposition.destroy();

        let renov = 0;
        let newBiz = 0;

        if (area === 'CORPORATIVO') {
            const corp = dataMgr.getCorporateConsolidatedSummary();
            renov = corp.totalRenovations;
            newBiz = corp.totalNewBusiness;
        } else {
            const kpis = dataMgr.getModuleKPIs(area, 'brokerage');
            renov = kpis.totalRenovation;
            newBiz = kpis.totalNewBusiness;
        }

        this.chartComposition = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Renovaciones Existentes', 'Negocio Nuevo Esperado'],
                datasets: [{
                    data: [renov, newBiz],
                    backgroundColor: ['#005FAA', '#84C44C'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${this.formatCurrency(ctx.raw)}`
                        }
                    }
                }
            }
        });
    },

    renderTrendChart: function(area, dataMgr) {
        const ctx = document.getElementById("chartDashTrend").getContext("2d");
        if (this.chartTrend) this.chartTrend.destroy();

        const renovSeries = MONTHS.map(m => {
            if (area === 'CORPORATIVO') {
                return UIB_AREAS.reduce((s, a) => s + (dataMgr.budgetData[a]?.brokerage?.[m]?.renovation || 0), 0);
            }
            return dataMgr.budgetData[area]?.brokerage?.[m]?.renovation || 0;
        });

        const newBizSeries = MONTHS.map(m => {
            if (area === 'CORPORATIVO') {
                return UIB_AREAS.reduce((s, a) => s + (dataMgr.budgetData[a]?.brokerage?.[m]?.newBusiness || 0), 0);
            }
            return dataMgr.budgetData[area]?.brokerage?.[m]?.newBusiness || 0;
        });

        this.chartTrend = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: MONTHS.map(m => m.substring(0, 3)),
                datasets: [
                    {
                        label: 'Renovaciones',
                        data: renovSeries,
                        backgroundColor: '#005FAA',
                        stack: 'Combined'
                    },
                    {
                        label: 'Negocio Nuevo',
                        data: newBizSeries,
                        backgroundColor: '#84C44C',
                        stack: 'Combined'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${this.formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        stacked: true,
                        ticks: {
                            callback: (val) => '$' + (val / 1000000).toFixed(0) + 'M'
                        }
                    },
                    x: { stacked: true }
                }
            }
        });
    },

    renderModulesDistributionChart: function(area, dataMgr) {
        const ctx = document.getElementById("chartDashModules").getContext("2d");
        if (this.chartModules) this.chartModules.destroy();

        const labels = UIB_MODULES.map(m => m.name);
        const dataValues = UIB_MODULES.map(mod => {
            if (area === 'CORPORATIVO') {
                return UIB_AREAS.reduce((sum, a) => sum + dataMgr.getModuleKPIs(a, mod.id).totalBudget, 0);
            }
            return dataMgr.getModuleKPIs(area, mod.id).totalBudget;
        });

        this.chartModules = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: ['#005FAA', '#327FC2', '#04A0D9', '#23496D', '#F57E21'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${this.formatCurrency(ctx.raw)}`
                        }
                    }
                }
            }
        });
    }
};
