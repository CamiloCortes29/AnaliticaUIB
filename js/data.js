/**
 * UIB Plataforma de Planeación Presupuestal 2027 - Data Model & Business Logic
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
    { id: "brokerage", name: "Brokerage", isBrokerage: true },
    { id: "legal_professional", name: "Legal & Professional", isBrokerage: false },
    { id: "producer_costs", name: "Producer Costs / Commission Paid Away", isBrokerage: false },
    { id: "training", name: "Training / Seminars / Conferences", isBrokerage: false },
    { id: "travel", name: "Travel & Entertaining", isBrokerage: false }
];

const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Sample Clients and Insurers for master renewal generator
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

// Generate Master Renewal Database for 2027 Expirations
function generateMasterRenewals() {
    const records = [];
    let idCounter = 1000;

    UIB_AREAS.forEach(area => {
        const prods = SAMPLE_PRODUCTS[area] || ["Póliza Especializada"];

        MONTHS.forEach((month, monthIndex) => {
            const count = 2 + (monthIndex % 3);
            for (let i = 0; i < count; i++) {
                idCounter++;
                const client = SAMPLE_CLIENTS[(idCounter + i) % SAMPLE_CLIENTS.length];
                const product = prods[i % prods.length];
                const premium = Math.round((150000000 + ((idCounter * 17) % 350000000)) / 1000) * 1000;
                const commissionRate = (area === "Aviacion" || area === "Marine") ? 0.12 : 0.10;
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
        this.masterRenewals = generateMasterRenewals();
        this.budgetData = {};
        this.initBudgetData();
    }

    initBudgetData() {
        this.budgetData = {};
        UIB_AREAS.forEach(area => {
            this.budgetData[area] = {};

            // 1. BROKERAGE MODULE (Renovación automática + Negocio Nuevo + Sugerido 5%)
            this.budgetData[area]['brokerage'] = {};
            MONTHS.forEach(month => {
                const renovation = this.getMonthlyRenewalCommission(area, month);
                const suggested5Pct = Math.round(renovation * 1.05);
                const defaultNewBiz = Math.round(renovation * 0.10);
                const totalBrokerage = renovation + defaultNewBiz;

                this.budgetData[area]['brokerage'][month] = {
                    renovation2026: renovation,
                    suggested2027: suggested5Pct,
                    newBusiness2027: defaultNewBiz,
                    totalBrokerage: totalBrokerage
                };
            });

            // 2. OTHER CRITERIA MODULES (Ejecutado 2026, Presupuesto 2027, Variación $, Variación %, Justificación)
            const expenseBase = {
                'legal_professional': 12000000,
                'producer_costs': 25000000,
                'training': 5000000,
                'travel': 15000000
            };

            ['legal_professional', 'producer_costs', 'training', 'travel'].forEach(modId => {
                this.budgetData[area][modId] = {};
                const baseVal = expenseBase[modId] || 10000000;

                MONTHS.forEach((month, idx) => {
                    const executed2026 = baseVal + (idx * 500000);
                    const budget2027 = Math.round(executed2026 * 1.08); // Default 8% growth for expenses
                    const varAmount = budget2027 - executed2026;
                    const varPct = executed2026 > 0 ? (varAmount / executed2026) * 100 : 0;

                    this.budgetData[area][modId][month] = {
                        executed2026: executed2026,
                        budget2027: budget2027,
                        variationAmount: varAmount,
                        variationPct: varPct,
                        justification: ""
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

    // Brokerage update: user modifies Negocio Nuevo
    updateBrokerageNewBusiness(area, month, newBizVal) {
        if (!this.budgetData[area] || !this.budgetData[area]['brokerage']?.[month]) return;
        const entry = this.budgetData[area]['brokerage'][month];
        entry.newBusiness2027 = parseFloat(newBizVal) || 0;
        entry.totalBrokerage = entry.renovation2026 + entry.newBusiness2027;
    }

    // Expense module update: user modifies Presupuesto 2027 or Justification
    updateExpenseBudget(area, moduleId, month, budgetVal) {
        if (!this.budgetData[area] || !this.budgetData[area][moduleId]?.[month]) return;
        const entry = this.budgetData[area][moduleId][month];
        entry.budget2027 = parseFloat(budgetVal) || 0;
        entry.variationAmount = entry.budget2027 - entry.executed2026;
        entry.variationPct = entry.executed2026 > 0 ? (entry.variationAmount / entry.executed2026) * 100 : 0;
    }

    updateExpenseJustification(area, moduleId, month, text) {
        if (!this.budgetData[area] || !this.budgetData[area][moduleId]?.[month]) return;
        this.budgetData[area][moduleId][month].justification = text || "";
    }

    // Get KPIs for Brokerage Module
    getBrokerageKPIs(area) {
        const monthsData = this.budgetData[area]?.['brokerage'] || {};
        let totalRenovation = 0;
        let totalNewBusiness = 0;
        let totalBrokerage = 0;

        MONTHS.forEach(m => {
            const entry = monthsData[m] || { renovation2026: 0, newBusiness2027: 0, totalBrokerage: 0 };
            totalRenovation += entry.renovation2026;
            totalNewBusiness += entry.newBusiness2027;
            totalBrokerage += entry.totalBrokerage;
        });

        return {
            totalRenovation,
            totalNewBusiness,
            totalBrokerage,
            monthlyAverage: totalBrokerage / 12
        };
    }

    // Get KPIs for Expense Modules
    getExpenseModuleKPIs(area, moduleId) {
        const monthsData = this.budgetData[area]?.[moduleId] || {};
        let totalExecuted2026 = 0;
        let totalBudget2027 = 0;

        MONTHS.forEach(m => {
            const entry = monthsData[m] || { executed2026: 0, budget2027: 0 };
            totalExecuted2026 += entry.executed2026;
            totalBudget2027 += entry.budget2027;
        });

        const variationAmount = totalBudget2027 - totalExecuted2026;
        const variationPct = totalExecuted2026 > 0 ? (variationAmount / totalExecuted2026) * 100 : 0;

        return {
            totalExecuted2026,
            totalBudget2027,
            variationAmount,
            variationPct,
            monthlyAverage: totalBudget2027 / 12
        };
    }

    // Get Total Expenses for an Area
    getAreaTotalExpenses(area) {
        let total = 0;
        ['legal_professional', 'producer_costs', 'training', 'travel'].forEach(modId => {
            total += this.getExpenseModuleKPIs(area, modId).totalBudget2027;
        });
        return total;
    }

    // Summary per Area for Dashboard & Admin View
    getAreaSummary(area) {
        const brokKpis = this.getBrokerageKPIs(area);
        const legalKpis = this.getExpenseModuleKPIs(area, 'legal_professional');
        const producerKpis = this.getExpenseModuleKPIs(area, 'producer_costs');
        const trainingKpis = this.getExpenseModuleKPIs(area, 'training');
        const travelKpis = this.getExpenseModuleKPIs(area, 'travel');

        const totalExpenses = legalKpis.totalBudget2027 + producerKpis.totalBudget2027 + trainingKpis.totalBudget2027 + travelKpis.totalBudget2027;
        const netBudget = brokKpis.totalBrokerage - totalExpenses;

        return {
            area,
            totalBrokerage: brokKpis.totalBrokerage,
            renovations: brokKpis.totalRenovation,
            newBusiness: brokKpis.totalNewBusiness,
            legalProfessional: legalKpis.totalBudget2027,
            producerCosts: producerKpis.totalBudget2027,
            training: trainingKpis.totalBudget2027,
            travel: travelKpis.totalBudget2027,
            totalExpenses: totalExpenses,
            totalGeneral2027: brokKpis.totalBrokerage, // Total Revenue Budget 2027
            netBudget: netBudget
        };
    }

    // Consolidated Summary across ALL 9 Areas
    getCorporateConsolidatedSummary() {
        let totalBrokerage = 0;
        let totalRenovations = 0;
        let totalNewBusiness = 0;
        let totalLegal = 0;
        let totalProducer = 0;
        let totalTraining = 0;
        let totalTravel = 0;
        let totalExpenses = 0;

        const areaSummaries = UIB_AREAS.map(area => {
            const summary = this.getAreaSummary(area);
            totalBrokerage += summary.totalBrokerage;
            totalRenovations += summary.renovations;
            totalNewBusiness += summary.newBusiness;
            totalLegal += summary.legalProfessional;
            totalProducer += summary.producerCosts;
            totalTraining += summary.training;
            totalTravel += summary.travel;
            totalExpenses += summary.totalExpenses;
            return summary;
        });

        return {
            areaSummaries,
            totalBrokerage,
            totalRenovations,
            totalNewBusiness,
            totalLegal,
            totalProducer,
            totalTraining,
            totalTravel,
            totalExpenses,
            totalGeneral2027: totalBrokerage
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
            console.error("Error loading saved draft:", e);
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
