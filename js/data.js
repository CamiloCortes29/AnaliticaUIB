/**
 * UIB Presupuesto Comercial 2027 - Data Layer
 */

const AREAS_LIST = [
    "Agrícola",
    "Aviación",
    "Cyber",
    "Salud y Vida",
    "Líneas Financieras",
    "Marine",
    "Property Estatales",
    "Property Privados",
    "Casuality"
];

const MONTHS_LIST = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Base sample execution data for 2026 (in COP) per area
const INITIAL_EXECUTION_2026 = {
    "Agrícola": [120000000, 115000000, 130000000, 125000000, 140000000, 135000000, 150000000, 145000000, 160000000, 155000000, 170000000, 180000000],
    "Aviación": [250000000, 240000000, 260000000, 255000000, 270000000, 280000000, 290000000, 285000000, 300000000, 310000000, 320000000, 350000000],
    "Cyber": [80000000, 85000000, 90000000, 95000000, 100000000, 105000000, 110000000, 115000000, 120000000, 125000000, 130000000, 140000000],
    "Salud y Vida": [300000000, 295000000, 310000000, 305000000, 320000000, 325000000, 330000000, 335000000, 340000000, 350000000, 360000000, 380000000],
    "Líneas Financieras": [180000000, 185000000, 190000000, 195000000, 200000000, 205000000, 210000000, 215000000, 220000000, 225000000, 230000000, 245000000],
    "Marine": [150000000, 145000000, 155000000, 160000000, 165000000, 170000000, 175000000, 180000000, 185000000, 190000000, 195000000, 210000000],
    "Property Estatales": [400000000, 420000000, 410000000, 430000000, 450000000, 440000000, 460000000, 470000000, 480000000, 490000000, 500000000, 520000000],
    "Property Privados": [350000000, 360000000, 355000000, 370000000, 380000000, 390000000, 400000000, 410000000, 420000000, 430000000, 440000000, 460000000],
    "Casuality": [200000000, 205000000, 210000000, 215000000, 220000000, 225000000, 230000000, 235000000, 240000000, 245000000, 250000000, 265000000]
};

class BudgetDataManager {
    constructor() {
        this.globalIncrementPct = 5.0;
        this.currentArea = AREAS_LIST[0];
        this.data = {};
        this.initDefaultData();
    }

    initDefaultData() {
        this.data = {};
        AREAS_LIST.forEach(area => {
            this.data[area] = {};
            const baseMonthly = INITIAL_EXECUTION_2026[area] || Array(12).fill(100000000);

            MONTHS_LIST.forEach((month, idx) => {
                const executed2026 = baseMonthly[idx];
                const suggestedIncrementPct = this.globalIncrementPct;
                const budget2027 = Math.round(executed2026 * (1 + suggestedIncrementPct / 100));

                this.data[area][month] = {
                    executed2026: executed2026,
                    suggestedIncrementPct: suggestedIncrementPct,
                    budget2027: budget2027,
                    variationAmount: budget2027 - executed2026,
                    variationPct: suggestedIncrementPct,
                    justification: ""
                };
            });
        });
    }

    setGlobalIncrement(pct) {
        this.globalIncrementPct = parseFloat(pct) || 0;
        AREAS_LIST.forEach(area => {
            MONTHS_LIST.forEach(month => {
                const mData = this.data[area][month];
                mData.suggestedIncrementPct = this.globalIncrementPct;
                mData.budget2027 = Math.round(mData.executed2026 * (1 + this.globalIncrementPct / 100));
                this.recalculateMonth(area, month);
            });
        });
    }

    updateMonthBudget(area, month, newBudget2027) {
        if (!this.data[area] || !this.data[area][month]) return;
        const val = parseFloat(newBudget2027);
        this.data[area][month].budget2027 = isNaN(val) ? 0 : val;
        this.recalculateMonth(area, month);
    }

    updateMonthJustification(area, month, text) {
        if (!this.data[area] || !this.data[area][month]) return;
        this.data[area][month].justification = text || "";
    }

    updateMonthIncrementPct(area, month, pct) {
        if (!this.data[area] || !this.data[area][month]) return;
        const pctVal = parseFloat(pct) || 0;
        const mData = this.data[area][month];
        mData.suggestedIncrementPct = pctVal;
        mData.budget2027 = Math.round(mData.executed2026 * (1 + pctVal / 100));
        this.recalculateMonth(area, month);
    }

    recalculateMonth(area, month) {
        const mData = this.data[area][month];
        mData.variationAmount = mData.budget2027 - mData.executed2026;
        if (mData.executed2026 !== 0) {
            mData.variationPct = (mData.variationAmount / mData.executed2026) * 100;
        } else {
            mData.variationPct = mData.budget2027 > 0 ? 100 : 0;
        }
    }

    recalculateAll() {
        AREAS_LIST.forEach(area => {
            MONTHS_LIST.forEach(month => {
                this.recalculateMonth(area, month);
            });
        });
    }

    getAreaTotals(area) {
        const targetArea = area || this.currentArea;
        const months = this.data[targetArea] || {};

        let totalExecuted2026 = 0;
        let totalBudget2027 = 0;

        MONTHS_LIST.forEach(m => {
            if (months[m]) {
                totalExecuted2026 += months[m].executed2026 || 0;
                totalBudget2027 += months[m].budget2027 || 0;
            }
        });

        const variationAmount = totalBudget2027 - totalExecuted2026;
        const variationPct = totalExecuted2026 > 0 ? (variationAmount / totalExecuted2026) * 100 : 0;

        return {
            totalExecuted2026,
            totalBudget2027,
            variationAmount,
            variationPct
        };
    }

    getCompanyTotals() {
        let totalExecuted2026 = 0;
        let totalBudget2027 = 0;

        AREAS_LIST.forEach(area => {
            const totals = this.getAreaTotals(area);
            totalExecuted2026 += totals.totalExecuted2026;
            totalBudget2027 += totals.totalBudget2027;
        });

        const variationAmount = totalBudget2027 - totalExecuted2026;
        const variationPct = totalExecuted2026 > 0 ? (variationAmount / totalExecuted2026) * 100 : 0;

        return {
            totalExecuted2026,
            totalBudget2027,
            variationAmount,
            variationPct
        };
    }

    getMonthlySummaryAllAreas() {
        const summary = MONTHS_LIST.map(month => {
            let executed2026 = 0;
            let budget2027 = 0;
            AREAS_LIST.forEach(area => {
                if (this.data[area] && this.data[area][month]) {
                    executed2026 += this.data[area][month].executed2026 || 0;
                    budget2027 += this.data[area][month].budget2027 || 0;
                }
            });
            return {
                month,
                executed2026,
                budget2027,
                variationAmount: budget2027 - executed2026,
                variationPct: executed2026 > 0 ? ((budget2027 - executed2026) / executed2026) * 100 : 0
            };
        });
        return summary;
    }

    saveToLocalStorage() {
        const payload = {
            globalIncrementPct: this.globalIncrementPct,
            currentArea: this.currentArea,
            data: this.data
        };
        localStorage.setItem("UIB_BUDGET_2027_DRAFT", JSON.stringify(payload));
    }

    loadFromLocalStorage() {
        const raw = localStorage.getItem("UIB_BUDGET_2027_DRAFT");
        if (!raw) return false;
        try {
            const payload = JSON.parse(raw);
            if (payload && payload.data) {
                this.globalIncrementPct = payload.globalIncrementPct || 5.0;
                this.currentArea = payload.currentArea || AREAS_LIST[0];
                this.data = payload.data;
                this.recalculateAll();
                return true;
            }
        } catch (e) {
            console.error("Error loading draft from localStorage:", e);
        }
        return false;
    }

    reset() {
        localStorage.removeItem("UIB_BUDGET_2027_DRAFT");
        this.globalIncrementPct = 5.0;
        this.currentArea = AREAS_LIST[0];
        this.initDefaultData();
    }
}

// Global instance
window.budgetManager = new BudgetDataManager();
