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
        let summary;

        if (isCorporate) {
            const corp = dataMgr.getCorporateConsolidatedSummary();
            summary = {
                totalBrokerage: corp.totalBrokerage,
                renovations: corp.totalRenovations,
                newBusiness: corp.totalNewBusiness,
                totalExpenses: corp.totalExpenses,
                netBudget: corp.totalBrokerage - corp.totalExpenses
            };
        } else {
            summary = dataMgr.getAreaSummary(area);
        }

        // Update Dashboard KPIs
        document.getElementById("kpiDashTotalBudget").textContent = this.formatCurrency(summary.totalBrokerage);
        document.getElementById("kpiDashRenovations").textContent = this.formatCurrency(summary.renovations);
        document.getElementById("kpiDashNewBusiness").textContent = this.formatCurrency(summary.newBusiness);
        document.getElementById("kpiDashTotalExpenses").textContent = this.formatCurrency(summary.totalExpenses);

        const netEl = document.getElementById("kpiDashCompliance");
        netEl.textContent = this.formatCurrency(summary.netBudget);
        netEl.className = summary.netBudget >= 0 ? "kpi-value text-success" : "kpi-value text-danger";

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
            const brokKpis = dataMgr.getBrokerageKPIs(area);
            renov = brokKpis.totalRenovation;
            newBiz = brokKpis.totalNewBusiness;
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
                return UIB_AREAS.reduce((sum, a) => sum + (dataMgr.budgetData[a]?.brokerage?.[m]?.renovation2026 || 0), 0);
            }
            return dataMgr.budgetData[area]?.brokerage?.[m]?.renovation2026 || 0;
        });

        const newBizSeries = MONTHS.map(m => {
            if (area === 'CORPORATIVO') {
                return UIB_AREAS.reduce((sum, a) => sum + (dataMgr.budgetData[a]?.brokerage?.[m]?.newBusiness2027 || 0), 0);
            }
            return dataMgr.budgetData[area]?.brokerage?.[m]?.newBusiness2027 || 0;
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

        let labels = [];
        let dataValues = [];
        let bgColors = [];

        if (area === 'CORPORATIVO') {
            // Display distribution across all 9 areas for Admin
            labels = UIB_AREAS;
            dataValues = UIB_AREAS.map(a => dataMgr.getAreaSummary(a).totalBrokerage);
            bgColors = [
                '#005FAA', '#327FC2', '#04A0D9', '#23496D',
                '#84C44C', '#F57E21', '#DE2A2B', '#6C52A2', '#888880'
            ];
        } else {
            // Display distribution across financial criteria for the area
            const summary = dataMgr.getAreaSummary(area);
            labels = ['Brokerage', 'Legal & Professional', 'Producer Costs', 'Training', 'Travel'];
            dataValues = [
                summary.totalBrokerage,
                summary.legalProfessional,
                summary.producerCosts,
                summary.training,
                summary.travel
            ];
            bgColors = ['#005FAA', '#327FC2', '#04A0D9', '#23496D', '#F57E21'];
        }

        this.chartModules = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: bgColors,
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
