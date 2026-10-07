/**
 * UIB Plataforma de Planeación Presupuestal 2027 - Data Layer & Renewal Master
 */

const UIB_AREAS = [
    "Agricola",
    "Aviacion",
    "Cyber",
    "Salud y Vida",
    "Líneas Financieras",
    "Marine",
    "Property Estatales",
    "Property Privados",
    "Casuality"
];

const UIB_MODULES = [
    { id: "brokerage", name: "Brokerage", isRevenue: true },
    { id: "legal_professional", name: "Legal & Professional", isRevenue: false },
    { id: "producer_costs", name: "Producer Costs / Commission Paid Away", isRevenue: false },
    { id: "training", name: "Training / Seminars / Conferences", isRevenue: false },
    { id: "travel", name: "Travel & Entertaining", isRevenue: false }
];

const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Sample Clients and Insurers for realistic renewal generator
const SAMPLE_CLIENTS = [
    "ECOPETROL S.A.", "GRUPO ARGOS", "BANCOLOMBIA S.A.", "ISA S.A. E.S.P.",
    "CEMENTOS ARGOS", "NUTRESA S.A.", "AVIANCA S.A.", "EPM E.S.P.",
    "TERPEL S.A.", "ALPINA S.A.", "CORFICOLOMBIANA", "AMAZON COLOMBIA",
    "SURA EPS", "INVERSIONES SURA", "CREMIL", "SATENA S.A."
];

const SAMPLE_PRODUCTS = {
    "Agricola": ["Seguro Parámetrico Agrícola", "Multiriesgo Agrícola", "Seguro Todo Riesgo Pecuario"],
    "Aviacion": ["Casco y Responsabilidad Civil", "Responsabilidad Civil Aeroportuaria", "Pérdida de Licencia"],
    "Cyber": ["Cyber Risk & Data Privacy", "Responsabilidad Tecnológica", "Extorsión Cyber"],
    "Salud y Vida": ["Póliza Colectiva Vida", "Salud Global Ejecutiva", "Accidentes Personales Group"],
    "Líneas Financieras": ["D&O Directors & Officers", "E&O Errors & Omissions", "DDD Infidelidad y Riesgos Financieros"],
    "Marine": ["Carga Transporte Internacional", "Casco Marítimo y Fluvial", "P&I Protection and Indemnity"],
    "Property Estatales": ["Todo Riesgo Daños Materiales Estado", "Sabotaje y Terrorismo", "Lucro Cesante Estatal"],
    "Property Privados": ["Todo Riesgo Industrial & Comercial", "Pérdida Consecuencial", "Rotura de Maquinaria"],
    "Casuality": ["Responsabilidad Civil Extracontractual", "RC Productos y Operaciones", "RC Contaminación"]
};

// Generate Master Renewal Database for 2027
function generateMasterRenewals() {
    const records = [];
    let idCounter = 1000;

    UIB_AREAS.forEach(area => {
        const prods = SAMPLE_PRODUCTS[area] || ["Póliza Especializada"];

        MONTHS.forEach((month, monthIndex) => {
            // Generate 2 to 4 renewal policies per month per area
            const count = 2 + (monthIndex % 3);
            for (let i = 0; i < count; i++) {
                idCounter++;
                const client = SAMPLE_CLIENTS[(idCounter + i) % SAMPLE_CLIENTS.length];
                const product = prods[i % prods.length];
                const premium = Math.round((150000000 + ((idCounter * 17) % 350000000)) / 1000) * 1000;
                const commissionRate = area === "Aviacion" || area === "Marine" ? 0.12 : 0.10;
                const commission = Math.round(premium * commissionRate);

                const monthNumStr = String(monthIndex + 1).padStart(2, '0');
                const lastDay = new Date(2027, monthIndex + 1, 0).getDate();

                records.push({
                    id: `POL-${idCounter}`,
                    area: area,
                    client: client,
                    product: product,
                    premium: premium,
                    commission: commission,
                    startDate: `2026-${monthNumStr}-01`,
                    endDate: `2027-${monthNumStr}-${lastDay}`,
                    month: month
                });
            }
        });
    });

    return records;
}

class PlanningDataManager {
    constructor() {
        this.currentArea = "Agricola";
        this.masterRenewals = generateMasterRenewals();
        this.budgetData = {};
        this.initBudgetData();
    }

    initBudgetData() {
        this.budgetData = {};
        UIB_AREAS.forEach(area => {
            this.budgetData[area] = {};
            UIB_MODULES.forEach(mod => {
                this.budgetData[area][mod.id] = {};
                MONTHS.forEach(month => {
                    // For Brokerage, renewal comes from calculated renewals master
                    let renewalVal = 0;
                    if (mod.id === 'brokerage') {
                        renewalVal = this.getMonthlyRenewalCommission(area, month);
                    } else {
                        // Expenses base budget for renewals/base operational cost
                        const baseCosts = {
                            'legal_professional': 12000000,
                            'producer_costs': 25000000,
                            'training': 5000000,
                            'travel': 15000000
                        };
                        renewalVal = baseCosts[mod.id] || 0;
                    }

                    // Default New Business suggestion (~10% of renewal)
                    const newBizDefault = Math.round(renewalVal * 0.10);

                    this.budgetData[area][mod.id][month] = {
                        renovation: renewalVal,
                        newBusiness: newBizDefault,
                        totalBudget: renewalVal + newBizDefault,
                        justification: "",
                        observations: ""
                    };
                });
            });
        });
    }

    getMonthlyRenewalCommission(area, month) {
        const matches = this.getMonthlyRenewalPolicies(area, month);
        return matches.reduce((sum, item) => sum + item.commission, 0);
    }

    getMonthlyRenewalPolicies(area, month) {
        return this.masterRenewals.filter(r => r.area === area && r.month === month);
    }

    updateNewBusiness(area, moduleId, month, val, justification = "", observations = "") {
        if (!this.budgetData[area] || !this.budgetData[area][moduleId] || !this.budgetData[area][moduleId][month]) return;
        const entry = this.budgetData[area][moduleId][month];
        entry.newBusiness = parseFloat(val) || 0;
        entry.totalBudget = entry.renovation + entry.newBusiness;
        if (justification !== undefined) entry.justification = justification;
        if (observations !== undefined) entry.observations = observations;
    }

    updateJustification(area, moduleId, month, justification, observations) {
        if (!this.budgetData[area] || !this.budgetData[area][moduleId] || !this.budgetData[area][moduleId][month]) return;
        const entry = this.budgetData[area][moduleId][month];
        entry.justification = justification || "";
        entry.observations = observations || "";
    }

    getModuleKPIs(area, moduleId) {
        const monthsData = this.budgetData[area]?.[moduleId] || {};
        let totalRenovation = 0;
        let totalNewBusiness = 0;
        let totalBudget = 0;

        MONTHS.forEach(m => {
            const row = monthsData[m] || { renovation: 0, newBusiness: 0, totalBudget: 0 };
            totalRenovation += row.renovation;
            totalNewBusiness += row.newBusiness;
            totalBudget += row.totalBudget;
        });

        const variationAmount = totalBudget - totalRenovation;
        const variationPct = totalRenovation > 0 ? (variationAmount / totalRenovation) * 100 : 0;
        const monthlyAverage = totalBudget / 12;

        return {
            totalRenovation,
            totalNewBusiness,
            totalBudget,
            variationAmount,
            variationPct,
            monthlyAverage
        };
    }

    getAreaDashboardSummary(area) {
        let brokerageRevenue = 0;
        let totalRenovations = 0;
        let totalNewBusiness = 0;
        let totalExpenses = 0;

        UIB_MODULES.forEach(mod => {
            const kpis = this.getModuleKPIs(area, mod.id);
            if (mod.id === 'brokerage') {
                brokerageRevenue += kpis.totalBudget;
                totalRenovations += kpis.totalRenovation;
                totalNewBusiness += kpis.totalNewBusiness;
            } else {
                totalExpenses += kpis.totalBudget;
            }
        });

        const netMargin = brokerageRevenue - totalExpenses;
        const compliancePct = totalRenovations > 0 ? (brokerageRevenue / totalRenovations) * 100 : 100;

        return {
            area,
            brokerageRevenue,
            totalRenovations,
            totalNewBusiness,
            totalExpenses,
            netMargin,
            compliancePct
        };
    }

    getCorporateConsolidatedSummary() {
        let totalBrokerage = 0;
        let totalRenovations = 0;
        let totalNewBusiness = 0;
        let totalExpenses = 0;

        UIB_AREAS.forEach(area => {
            const summary = this.getAreaDashboardSummary(area);
            totalBrokerage += summary.brokerageRevenue;
            totalRenovations += summary.totalRenovations;
            totalNewBusiness += summary.totalNewBusiness;
            totalExpenses += summary.totalExpenses;
        });

        const netMargin = totalBrokerage - totalExpenses;
        const compliancePct = totalRenovations > 0 ? (totalBrokerage / totalRenovations) * 100 : 100;

        return {
            totalBrokerage,
            totalRenovations,
            totalNewBusiness,
            totalExpenses,
            netMargin,
            compliancePct
        };
    }

    saveToLocalStorage() {
        const payload = {
            budgetData: this.budgetData,
            masterRenewals: this.masterRenewals
        };
        localStorage.setItem("UIB_PLANEACION_2027_DRAFT", JSON.stringify(payload));
    }

    loadFromLocalStorage() {
        const raw = localStorage.getItem("UIB_PLANEACION_2027_DRAFT");
        if (!raw) return false;
        try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.budgetData) {
                this.budgetData = parsed.budgetData;
                if (parsed.masterRenewals) this.masterRenewals = parsed.masterRenewals;
                return true;
            }
        } catch (e) {
            console.error("Error loading saved state:", e);
        }
        return false;
    }

    reset() {
        localStorage.removeItem("UIB_PLANEACION_2027_DRAFT");
        this.masterRenewals = generateMasterRenewals();
        this.initBudgetData();
    }
}

window.planningDataManager = new PlanningDataManager();
