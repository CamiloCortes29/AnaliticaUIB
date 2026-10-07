/**
 * UIB Plataforma de Planeación Presupuestal 2027 - Application Controller
 */

document.addEventListener("DOMContentLoaded", () => {
    // Current State
    let currentView = "dashboard";
    let currentArea = "Agricola";

    // DOM Selectors
    const userSelector = document.getElementById("userSelector");
    const areaSelector = document.getElementById("areaSelector");
    const dashTitleArea = document.getElementById("dashTitleArea");
    const badgeRoleAccess = document.getElementById("badgeRoleAccess");
    const navLinkConsolidated = document.getElementById("navLinkConsolidated");

    // Views
    const viewDashboard = document.getElementById("viewDashboard");
    const viewBrokerageModule = document.getElementById("viewBrokerageModule");
    const viewExpensesModule = document.getElementById("viewExpensesModule");
    const viewConsolidated = document.getElementById("viewConsolidated");

    // Brokerage DOM Elements
    const brokerageTitleArea = document.getElementById("brokerageTitleArea");
    const brokerageTableBody = document.getElementById("brokerageTableBody");
    const brokerageTableFoot = document.getElementById("brokerageTableFoot");
    const kpiBrokRenovation = document.getElementById("kpiBrokRenovation");
    const kpiBrokNewBusiness = document.getElementById("kpiBrokNewBusiness");
    const kpiBrokTotal = document.getElementById("kpiBrokTotal");
    const kpiBrokMonthlyAvg = document.getElementById("kpiBrokMonthlyAvg");

    // Expense DOM Elements
    const expenseTitleModule = document.getElementById("expenseTitleModule");
    const expenseTableBody = document.getElementById("expenseTableBody");
    const expenseTableFoot = document.getElementById("expenseTableFoot");
    const kpiExpExecuted = document.getElementById("kpiExpExecuted");
    const kpiExpBudget = document.getElementById("kpiExpBudget");
    const kpiExpVarAmount = document.getElementById("kpiExpVarAmount");
    const kpiExpVarPct = document.getElementById("kpiExpVarPct");

    // Consolidated Elements
    const consolidatedTableBody = document.getElementById("consolidatedTableBody");
    const consolidatedTableFoot = document.getElementById("consolidatedTableFoot");

    // Modals
    const modalRenewalsDetail = new bootstrap.Modal(document.getElementById("modalRenewalsDetail"));

    // Action Buttons
    const btnExportExcel = document.getElementById("btnExportExcel");
    const btnExportConsolidatedExcel = document.getElementById("btnExportConsolidatedExcel");
    const lblExportExcel = document.getElementById("lblExportExcel");
    const btnSaveDraft = document.getElementById("btnSaveDraft");
    const btnReset = document.getElementById("btnReset");

    function showToast(msg, type = "primary") {
        const toastEl = document.getElementById("uibToast");
        const toastMsg = document.getElementById("toastMessage");
        if (toastEl && toastMsg) {
            toastMsg.textContent = msg;
            toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }
    }

    function formatCurrency(val) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val || 0);
    }

    // Initialize User / Role Selector
    function initUserSelector() {
        userSelector.innerHTML = "";
        UIB_USERS.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.id;
            opt.textContent = u.name;
            userSelector.appendChild(opt);
        });

        if (window.planningDataManager.loadFromLocalStorage()) {
            showToast("Se cargó un borrador de presupuesto guardado localmente.", "info");
        }

        userSelector.value = window.authManager.getCurrentUser().id;
        refreshAreaSelector();
    }

    // Refresh Area Selector based on Role / Admin Permissions
    function refreshAreaSelector() {
        areaSelector.innerHTML = "";
        const allowed = window.authManager.getAvailableAreas();

        if (window.authManager.isAdmin()) {
            const corpOpt = document.createElement("option");
            corpOpt.value = "CORPORATIVO";
            corpOpt.textContent = "CONSOLIDADO CORPORATIVO";
            areaSelector.appendChild(corpOpt);
            navLinkConsolidated.classList.remove("d-none");
            lblExportExcel.textContent = "Exportar Consolidado Excel";
        } else {
            navLinkConsolidated.classList.add("d-none");
            lblExportExcel.textContent = "Exportar Área Excel";
        }

        allowed.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            areaSelector.appendChild(opt);
        });

        if (allowed.length > 0) {
            currentArea = allowed[0];
            areaSelector.value = currentArea;
        }

        badgeRoleAccess.textContent = `Acceso: ${window.authManager.getCurrentUser().role}`;
    }

    // View Navigation Switcher
    function switchView(viewName) {
        currentView = viewName;

        document.querySelectorAll(".uib-nav-link").forEach(link => {
            if (link.getAttribute("data-view") === viewName) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        viewDashboard.classList.add("d-none");
        viewBrokerageModule.classList.add("d-none");
        viewExpensesModule.classList.add("d-none");
        viewConsolidated.classList.add("d-none");

        if (viewName === "dashboard") {
            viewDashboard.classList.remove("d-none");
            dashTitleArea.textContent = `Dashboard Ejecutivo - ${currentArea}`;
            window.dashboardController.renderDashboard(currentArea, window.planningDataManager);
        } else if (viewName === "brokerage") {
            viewBrokerageModule.classList.remove("d-none");
            renderBrokerageModule();
        } else if (viewName === "consolidated") {
            viewConsolidated.classList.remove("d-none");
            renderConsolidatedView();
        } else {
            viewExpensesModule.classList.remove("d-none");
            renderExpenseModule(viewName);
        }
    }

    // Render Brokerage Module (Renovaciones + Negocio Nuevo + Sugerido 5%)
    function renderBrokerageModule() {
        const area = currentArea === 'CORPORATIVO' ? UIB_AREAS[0] : currentArea;
        brokerageTitleArea.textContent = `1. Brokerage - ${area}`;
        const monthsData = window.planningDataManager.budgetData[area]?.['brokerage'] || {};

        brokerageTableBody.innerHTML = "";

        MONTHS.forEach(month => {
            const entry = monthsData[month] || { renovation2026: 0, suggested2027: 0, newBusiness2027: 0, totalBrokerage: 0 };
            const tr = document.createElement("tr");

            // Month
            const tdMonth = document.createElement("td");
            tdMonth.className = "fw-bold text-dark";
            tdMonth.textContent = month;
            tr.appendChild(tdMonth);

            // Renovación 2026 (Automática)
            const tdRenov = document.createElement("td");
            tdRenov.className = "text-end font-monospace fw-semibold text-secondary";
            tdRenov.textContent = formatCurrency(entry.renovation2026);
            tr.appendChild(tdRenov);

            // Sugerido 2027 (5% Referencia)
            const tdSug = document.createElement("td");
            tdSug.className = "text-end font-monospace text-muted small";
            tdSug.textContent = formatCurrency(entry.suggested2027);
            tr.appendChild(tdSug);

            // Negocio Nuevo 2027 (Editable por el Usuario)
            const tdNew = document.createElement("td");
            tdNew.className = "text-end";
            const inputNew = document.createElement("input");
            inputNew.type = "number";
            inputNew.step = "500000";
            inputNew.className = "form-control form-control-sm text-end fw-bold text-success table-input";
            inputNew.value = entry.newBusiness2027;
            inputNew.addEventListener("input", (e) => {
                window.planningDataManager.updateBrokerageNewBusiness(area, month, e.target.value);
                updateBrokerageTotals(area);
            });
            tdNew.appendChild(inputNew);
            tr.appendChild(tdNew);

            // Total Brokerage ($)
            const tdTotal = document.createElement("td");
            tdTotal.className = "text-end font-monospace fw-bold text-primary fs-6";
            tdTotal.id = `brok_total_${month}`;
            tdTotal.textContent = formatCurrency(entry.totalBrokerage);
            tr.appendChild(tdTotal);

            // Acciones / Ver Detalle
            const tdTrace = document.createElement("td");
            tdTrace.className = "text-center";
            const btnDetail = document.createElement("button");
            btnDetail.className = "btn btn-outline-primary btn-sm px-2 py-0";
            btnDetail.innerHTML = `<i class="bi bi-search me-1"></i>Ver Detalle`;
            btnDetail.addEventListener("click", () => {
                openRenewalsModal(area, month);
            });
            tdTrace.appendChild(btnDetail);
            tr.appendChild(tdTrace);

            brokerageTableBody.appendChild(tr);
        });

        updateBrokerageTotals(area);
    }

    function updateBrokerageTotals(area) {
        const kpis = window.planningDataManager.getBrokerageKPIs(area);
        kpiBrokRenovation.textContent = formatCurrency(kpis.totalRenovation);
        kpiBrokNewBusiness.textContent = formatCurrency(kpis.totalNewBusiness);
        kpiBrokTotal.textContent = formatCurrency(kpis.totalBrokerage);
        kpiBrokMonthlyAvg.textContent = formatCurrency(kpis.monthlyAverage);

        MONTHS.forEach(m => {
            const el = document.getElementById(`brok_total_${m}`);
            const entry = window.planningDataManager.budgetData[area]?.['brokerage']?.[m];
            if (el && entry) el.textContent = formatCurrency(entry.totalBrokerage);
        });

        brokerageTableFoot.innerHTML = `
            <tr>
                <td class="fw-bold text-uppercase">TOTAL BROKERAGE 2027</td>
                <td class="text-end font-monospace fw-bold fs-6">${formatCurrency(kpis.totalRenovation)}</td>
                <td class="text-end text-muted">-</td>
                <td class="text-end font-monospace fw-bold fs-6 text-success">${formatCurrency(kpis.totalNewBusiness)}</td>
                <td class="text-end font-monospace fw-bold fs-6 text-primary">${formatCurrency(kpis.totalBrokerage)}</td>
                <td class="text-center text-muted small">Promedio: ${formatCurrency(kpis.monthlyAverage)}</td>
            </tr>
        `;
    }

    // Render Expense Modules (Ejecutado 2026, Presupuesto 2027, Variación $, Variación %, Justificación)
    function renderExpenseModule(moduleId) {
        const area = currentArea === 'CORPORATIVO' ? UIB_AREAS[0] : currentArea;
        const modObj = UIB_MODULES.find(m => m.id === moduleId);
        expenseTitleModule.textContent = `${modObj ? modObj.name : 'Gastos'} - ${area}`;

        const monthsData = window.planningDataManager.budgetData[area]?.[moduleId] || {};
        expenseTableBody.innerHTML = "";

        MONTHS.forEach(month => {
            const entry = monthsData[month] || { executed2026: 0, budget2027: 0, variationAmount: 0, variationPct: 0, justification: "" };
            const tr = document.createElement("tr");

            // Mes
            const tdMonth = document.createElement("td");
            tdMonth.className = "fw-bold text-dark";
            tdMonth.textContent = month;
            tr.appendChild(tdMonth);

            // Valor Ejecutado 2026
            const tdExec = document.createElement("td");
            tdExec.className = "text-end font-monospace fw-semibold text-secondary";
            tdExec.textContent = formatCurrency(entry.executed2026);
            tr.appendChild(tdExec);

            // Presupuesto 2027 (Editable)
            const tdBud = document.createElement("td");
            tdBud.className = "text-end";
            const inputBud = document.createElement("input");
            inputBud.type = "number";
            inputBud.step = "500000";
            inputBud.className = "form-control form-control-sm text-end fw-bold text-primary table-input";
            inputBud.value = entry.budget2027;
            inputBud.addEventListener("input", (e) => {
                window.planningDataManager.updateExpenseBudget(area, moduleId, month, e.target.value);
                updateExpenseTotals(area, moduleId);
            });
            tdBud.appendChild(inputBud);
            tr.appendChild(tdBud);

            // Variación $
            const tdVarAmt = document.createElement("td");
            tdVarAmt.className = `text-end font-monospace fw-bold ${entry.variationAmount >= 0 ? 'text-success' : 'text-danger'}`;
            tdVarAmt.id = `exp_var_amt_${month}`;
            tdVarAmt.textContent = formatCurrency(entry.variationAmount);
            tr.appendChild(tdVarAmt);

            // Variación %
            const tdVarPct = document.createElement("td");
            tdVarPct.className = "text-center font-monospace fw-bold";
            tdVarPct.id = `exp_var_pct_${month}`;
            tdVarPct.textContent = `${entry.variationPct.toFixed(1)}%`;
            tr.appendChild(tdVarPct);

            // Justificación Input Text
            const tdJust = document.createElement("td");
            const inputJust = document.createElement("input");
            inputJust.type = "text";
            inputJust.className = "form-control form-control-sm table-input";
            inputJust.placeholder = "Añadir justificación...";
            inputJust.value = entry.justification || "";
            inputJust.addEventListener("change", (e) => {
                window.planningDataManager.updateExpenseJustification(area, moduleId, month, e.target.value);
            });
            tdJust.appendChild(inputJust);
            tr.appendChild(tdJust);

            expenseTableBody.appendChild(tr);
        });

        updateExpenseTotals(area, moduleId);
    }

    function updateExpenseTotals(area, moduleId) {
        const kpis = window.planningDataManager.getExpenseModuleKPIs(area, moduleId);

        kpiExpExecuted.textContent = formatCurrency(kpis.totalExecuted2026);
        kpiExpBudget.textContent = formatCurrency(kpis.totalBudget2027);
        kpiExpVarAmount.textContent = formatCurrency(kpis.variationAmount);
        kpiExpVarPct.textContent = `${kpis.variationPct.toFixed(1)}%`;

        MONTHS.forEach(m => {
            const entry = window.planningDataManager.budgetData[area]?.[moduleId]?.[m];
            if (entry) {
                const amtEl = document.getElementById(`exp_var_amt_${m}`);
                const pctEl = document.getElementById(`exp_var_pct_${m}`);
                if (amtEl) {
                    amtEl.textContent = formatCurrency(entry.variationAmount);
                    amtEl.className = `text-end font-monospace fw-bold ${entry.variationAmount >= 0 ? 'text-success' : 'text-danger'}`;
                }
                if (pctEl) pctEl.textContent = `${entry.variationPct.toFixed(1)}%`;
            }
        });

        expenseTableFoot.innerHTML = `
            <tr>
                <td class="fw-bold text-uppercase">TOTAL ANUAL 2027</td>
                <td class="text-end font-monospace fw-bold fs-6">${formatCurrency(kpis.totalExecuted2026)}</td>
                <td class="text-end font-monospace fw-bold fs-6 text-primary">${formatCurrency(kpis.totalBudget2027)}</td>
                <td class="text-end font-monospace fw-bold fs-6 ${kpis.variationAmount >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(kpis.variationAmount)}</td>
                <td class="text-center font-monospace fw-bold fs-6">${kpis.variationPct.toFixed(1)}%</td>
                <td class="text-muted small">Promedio: ${formatCurrency(kpis.monthlyAverage)} / mes</td>
            </tr>
        `;
    }

    // Modal Renewals Detail
    function openRenewalsModal(area, month) {
        const policies = window.planningDataManager.getMonthlyRenewalPolicies(area, month);
        const tbody = document.getElementById("modalRenewalsTableBody");
        const totalEl = document.getElementById("modalRenewalsTotal");
        document.getElementById("modalRenewalsLabel").textContent = `Detalle de Renovaciones Pólizas - ${month} 2027 (${area})`;

        tbody.innerHTML = "";
        let totalCom = 0;

        policies.forEach(p => {
            totalCom += p.commission;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-dark">${p.client}</td>
                <td>${p.product}</td>
                <td class="text-end font-monospace">${formatCurrency(p.premium)}</td>
                <td class="text-end font-monospace fw-bold text-primary">${formatCurrency(p.commission)}</td>
                <td class="text-center font-monospace small">${p.endDate}</td>
            `;
            tbody.appendChild(tr);
        });

        if (policies.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay pólizas registradas para renovar en este mes.</td></tr>`;
        }

        totalEl.textContent = formatCurrency(totalCom);
        modalRenewalsDetail.show();
    }

    // Render Administrator Consolidated View
    function renderConsolidatedView() {
        const corpSummary = window.planningDataManager.getCorporateConsolidatedSummary();
        consolidatedTableBody.innerHTML = "";

        corpSummary.areaSummaries.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-dark">${s.area}</td>
                <td class="text-end font-monospace fw-semibold">${formatCurrency(s.totalBrokerage)}</td>
                <td class="text-end font-monospace text-secondary">${formatCurrency(s.legalProfessional)}</td>
                <td class="text-end font-monospace text-secondary">${formatCurrency(s.producerCosts)}</td>
                <td class="text-end font-monospace text-secondary">${formatCurrency(s.training)}</td>
                <td class="text-end font-monospace text-secondary">${formatCurrency(s.travel)}</td>
                <td class="text-end font-monospace fw-bold text-primary table-primary fs-6">${formatCurrency(s.totalGeneral2027)}</td>
            `;
            consolidatedTableBody.appendChild(tr);
        });

        consolidatedTableFoot.innerHTML = `
            <tr class="table-dark text-white fw-bold">
                <td class="text-uppercase">TOTAL CONSOLIDADO CORPORATIVO</td>
                <td class="text-end font-monospace fs-6">${formatCurrency(corpSummary.totalBrokerage)}</td>
                <td class="text-end font-monospace fs-6">${formatCurrency(corpSummary.totalLegal)}</td>
                <td class="text-end font-monospace fs-6">${formatCurrency(corpSummary.totalProducer)}</td>
                <td class="text-end font-monospace fs-6">${formatCurrency(corpSummary.totalTraining)}</td>
                <td class="text-end font-monospace fs-6">${formatCurrency(corpSummary.totalTravel)}</td>
                <td class="text-end font-monospace fs-5 text-warning">${formatCurrency(corpSummary.totalGeneral2027)}</td>
            </tr>
        `;
    }

    // Event Handlers
    userSelector.addEventListener("change", (e) => {
        window.authManager.setCurrentUserById(e.target.value);
        refreshAreaSelector();
        switchView(currentView);
        showToast(`Usuario cambiado a ${window.authManager.getCurrentUser().name}.`, "info");
    });

    areaSelector.addEventListener("change", (e) => {
        currentArea = e.target.value;
        switchView(currentView);
    });

    document.querySelectorAll(".uib-nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const viewTarget = link.getAttribute("data-view");
            switchView(viewTarget);
        });
    });

    btnSaveDraft.addEventListener("click", () => {
        window.planningDataManager.saveToLocalStorage();
        showToast("Borrador del presupuesto guardado localmente.", "success");
    });

    btnReset.addEventListener("click", () => {
        if (confirm("¿Desea reiniciar todos los datos presupuestales a los valores iniciales?")) {
            window.planningDataManager.reset();
            switchView(currentView);
            showToast("Presupuesto restablecido.", "warning");
        }
    });

    const triggerExcelExport = async () => {
        const isCorp = currentArea === 'CORPORATIVO' || currentView === 'consolidated';
        try {
            if (isCorp) {
                showToast("Generando Libro Excel Consolidado Corporativo...", "info");
                await window.excelService.exportConsolidatedExcel(window.planningDataManager);
            } else {
                showToast(`Generando Presupuesto Excel para ${currentArea}...`, "info");
                await window.excelService.exportAreaExcel(currentArea, window.planningDataManager);
            }
            showToast("Archivo Excel generado con éxito.", "success");
        } catch (e) {
            console.error("Error exportando a Excel:", e);
            showToast("Error al generar el archivo Excel.", "danger");
        }
    };

    btnExportExcel.addEventListener("click", triggerExcelExport);
    btnExportConsolidatedExcel.addEventListener("click", triggerExcelExport);

    // Initial Setup
    initUserSelector();
    switchView("dashboard");
});
